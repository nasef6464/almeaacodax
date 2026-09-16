import type { NextFunction, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import mongoose from "mongoose";
import { GroupModel } from "../../../models/Group.js";
import { SchoolMembershipModel } from "../../../models/SchoolMembership.js";
import { TeachingAssignmentModel } from "../../../models/TeachingAssignment.js";
import { UserModel } from "../../../models/User.js";

const idOf = (value: any) => String(value?.id || value?._id || value || "");

function requestedStudentIds(req: Request) {
  const single = typeof req.body?.studentId === "string" ? [req.body.studentId] : [];
  const many = Array.isArray(req.body?.studentIds)
    ? req.body.studentIds.filter((value: unknown): value is string => typeof value === "string")
    : [];
  return Array.from(new Set([...single, ...many].map(String).filter(Boolean)));
}

async function loadTargetScope(ids: string[]) {
  const objectIds = ids.filter((id) => mongoose.isValidObjectId(id));
  const students = (await UserModel.find({
    role: "student",
    $or: [
      { id: { $in: ids } },
      ...(objectIds.length ? [{ _id: { $in: objectIds } }] : []),
    ],
  })
    .select("_id id schoolId groupIds")
    .lean()) as any[];

  const studentIds = students.map(idOf).filter(Boolean);
  const referencedGroupIds = Array.from(
    new Set(students.flatMap((student) => (Array.isArray(student.groupIds) ? student.groupIds.map(String) : []))),
  );
  const referencedGroupObjectIds = referencedGroupIds.filter((id) => mongoose.isValidObjectId(id));
  const groups = studentIds.length
    ? ((await GroupModel.find({
        type: "CLASS",
        $or: [
          { studentIds: { $in: studentIds } },
          { id: { $in: referencedGroupIds } },
          ...(referencedGroupObjectIds.length ? [{ _id: { $in: referencedGroupObjectIds } }] : []),
        ],
      })
        .select("_id id parentId studentIds")
        .lean()) as any[])
    : [];

  const studentMemberships = studentIds.length
    ? ((await SchoolMembershipModel.find({ userId: { $in: studentIds }, role: "student" })
        .select("userId schoolId status")
        .lean()) as any[])
    : [];

  const classIdsByStudent = new Map<string, Set<string>>();
  const schoolIdsByStudent = new Map<string, Set<string>>();

  for (const student of students) {
    const studentId = idOf(student);
    const legacyGroupIds = new Set(
      Array.isArray(student.groupIds) ? student.groupIds.map(String).filter(Boolean) : [],
    );
    const matchingGroups = groups.filter((group) => {
      const groupId = idOf(group);
      const groupStudentIds = Array.isArray(group.studentIds) ? group.studentIds.map(String) : [];
      return legacyGroupIds.has(groupId) || groupStudentIds.includes(studentId);
    });
    classIdsByStudent.set(
      studentId,
      new Set(matchingGroups.map(idOf).filter(Boolean)),
    );

    const explicitMemberships = studentMemberships.filter(
      (membership) => String(membership.userId) === studentId,
    );
    const effectiveSchoolIds = new Set<string>();
    if (explicitMemberships.length) {
      explicitMemberships
        .filter((membership) => membership.status === "active")
        .forEach((membership) => effectiveSchoolIds.add(String(membership.schoolId)));
    } else {
      if (student.schoolId) effectiveSchoolIds.add(String(student.schoolId));
      matchingGroups.forEach((group) => {
        if (group.parentId) effectiveSchoolIds.add(String(group.parentId));
      });
    }
    schoolIdsByStudent.set(studentId, effectiveSchoolIds);
  }

  return { students, groups, classIdsByStudent, schoolIdsByStudent };
}

function deny(res: Response) {
  return res.status(StatusCodes.FORBIDDEN).json({
    message: "You do not have access to one or more students",
  });
}

async function enforceTeacherAuthority(req: Request, res: Response, next: NextFunction, ids: string[]) {
  const authUser = req.authUser!;
  const [membershipRows, assignmentRows, scope] = await Promise.all([
    SchoolMembershipModel.find({ userId: authUser.id, role: "teacher" })
      .select("schoolId status")
      .lean() as any,
    TeachingAssignmentModel.find({ teacherId: authUser.id })
      .select("schoolId classId status")
      .lean() as any,
    loadTargetScope(ids),
  ]);
  const memberships = membershipRows as any[];
  const assignments = assignmentRows as any[];
  const canonicalAuthorityPresent = memberships.length > 0 || assignments.length > 0;

  // Compatibility is intentionally one-way: once any canonical authority exists,
  // stale User.schoolId/groupIds must never resurrect access.
  if (!canonicalAuthorityPresent) return next();

  const activeSchoolIds = new Set(
    memberships
      .filter((membership) => membership.status === "active")
      .map((membership) => String(membership.schoolId)),
  );
  const activeAssignedClassIds = Array.from(
    new Set(
      assignments
        .filter(
          (assignment) =>
            assignment.status === "active" && activeSchoolIds.has(String(assignment.schoolId)),
        )
        .map((assignment) => String(assignment.classId))
        .filter(Boolean),
    ),
  );
  const assignedClasses = new Set(activeAssignedClassIds);
  const everyStudentIsAssigned = scope.students.every((student) => {
    const studentClasses = scope.classIdsByStudent.get(idOf(student)) || new Set<string>();
    return Array.from(studentClasses).some((classId) => assignedClasses.has(classId));
  });

  if (!scope.students.length || !everyStudentIsAssigned) return deny(res);

  authUser.groupIds = activeAssignedClassIds;
  authUser.schoolId = null;
  authUser.linkedStudentIds = [];
  return next();
}

async function enforceSupervisorAuthority(req: Request, res: Response, next: NextFunction, ids: string[]) {
  const authUser = req.authUser!;
  const [membershipRows, scope] = await Promise.all([
    SchoolMembershipModel.find({ userId: authUser.id, role: "supervisor" })
      .select("schoolId status")
      .lean() as any,
    loadTargetScope(ids),
  ]);
  const memberships = membershipRows as any[];
  const canonicalAuthorityPresent = memberships.length > 0;

  // A class supervisor that has not been migrated yet may continue through the
  // bounded legacy Group.supervisorIds path. Explicit canonical rows, including
  // inactive ones, always take precedence and therefore fail closed when revoked.
  if (!canonicalAuthorityPresent) return next();

  const activeSchoolIds = new Set(
    memberships
      .filter((membership) => membership.status === "active")
      .map((membership) => String(membership.schoolId)),
  );
  const everyStudentIsInActiveSchool = scope.students.every((student) => {
    const studentSchools = scope.schoolIdsByStudent.get(idOf(student)) || new Set<string>();
    return Array.from(studentSchools).some((schoolId) => activeSchoolIds.has(schoolId));
  });

  if (!scope.students.length || !everyStudentIsInActiveSchool) return deny(res);

  const targetClassIds = Array.from(
    new Set(
      scope.groups
        .filter((group) => group.parentId && activeSchoolIds.has(String(group.parentId)))
        .map(idOf)
        .filter(Boolean),
    ),
  );
  const commonSchoolId = Array.from(activeSchoolIds).find((schoolId) =>
    scope.students.every((student) =>
      (scope.schoolIdsByStudent.get(idOf(student)) || new Set<string>()).has(schoolId),
    ),
  );

  authUser.groupIds = targetClassIds;
  authUser.schoolId = commonSchoolId || null;
  authUser.linkedStudentIds = [];
  return next();
}

export async function requireCanonicalNotificationAudience(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const ids = requestedStudentIds(req);
    if (!ids.length || req.authUser?.role === "admin") return next();
    if (req.authUser?.role === "teacher") {
      return await enforceTeacherAuthority(req, res, next, ids);
    }
    if (req.authUser?.role === "supervisor") {
      return await enforceSupervisorAuthority(req, res, next, ids);
    }
    return next();
  } catch (error) {
    return next(error);
  }
}
