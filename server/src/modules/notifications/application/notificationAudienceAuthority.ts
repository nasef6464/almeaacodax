import mongoose from "mongoose";
import type { AuthUser } from "../../auth/domain/auth-user.js";
import { GroupModel } from "../../../models/Group.js";
import { SchoolMembershipModel } from "../../../models/SchoolMembership.js";
import { TeachingAssignmentModel } from "../../../models/TeachingAssignment.js";

export type NotificationStudentScope = {
  id?: unknown;
  _id?: unknown;
  schoolId?: unknown;
  groupIds?: unknown[];
};

const normalizeIds = (values: unknown[]) =>
  Array.from(new Set(values.map((value) => String(value || "").trim()).filter(Boolean)));

const studentIdOf = (student: NotificationStudentScope) =>
  String(student.id || student._id || "").trim();

const groupObjectIds = (ids: string[]) =>
  ids
    .filter((id) => mongoose.isValidObjectId(id))
    .map((id) => new mongoose.Types.ObjectId(id));

async function loadStudentSchoolContexts(students: NotificationStudentScope[]) {
  const studentIds = normalizeIds(students.map(studentIdOf));
  const rows = studentIds.length
    ? await SchoolMembershipModel.find({
        userId: { $in: studentIds },
        role: "student",
      })
        .select("userId schoolId status")
        .lean()
    : [];

  const hasCanonical = new Set<string>();
  const activeSchoolIds = new Map<string, Set<string>>();
  for (const row of rows as any[]) {
    const userId = String(row.userId || "").trim();
    const schoolId = String(row.schoolId || "").trim();
    if (!userId) continue;
    hasCanonical.add(userId);
    if (String(row.status || "active") !== "active" || !schoolId) continue;
    const current = activeSchoolIds.get(userId) || new Set<string>();
    current.add(schoolId);
    activeSchoolIds.set(userId, current);
  }

  for (const student of students) {
    const studentId = studentIdOf(student);
    if (!studentId || hasCanonical.has(studentId)) continue;
    const legacySchoolId = String(student.schoolId || "").trim();
    if (legacySchoolId) activeSchoolIds.set(studentId, new Set([legacySchoolId]));
  }

  return { hasCanonical, activeSchoolIds };
}

async function loadActorSchoolContext(actor: AuthUser) {
  const actorId = String(actor.id || "").trim();
  const rows = await SchoolMembershipModel.find({
    userId: actorId,
    role: actor.role,
  })
    .select("schoolId status")
    .lean();

  const activeSchoolIds = new Set(
    (rows as any[])
      .filter((row) => String(row.status || "active") === "active")
      .map((row) => String(row.schoolId || "").trim())
      .filter(Boolean),
  );
  if (!rows.length) {
    const legacySchoolId = String(actor.schoolId || "").trim();
    if (legacySchoolId) activeSchoolIds.add(legacySchoolId);
  }

  return {
    hasCanonical: rows.length > 0,
    activeSchoolIds,
  };
}

const hasSharedSchool = (first: Set<string>, second: Set<string>) =>
  first.size > 0 && second.size > 0 && Array.from(first).some((schoolId) => second.has(schoolId));

async function loadGroupsByIds(ids: string[]) {
  const objectIds = groupObjectIds(normalizeIds(ids));
  if (!objectIds.length) return [];
  return GroupModel.find({ _id: { $in: objectIds } })
    .select("_id studentIds supervisorIds")
    .lean();
}

async function resolveTeacherStudentIds(
  actor: AuthUser,
  students: NotificationStudentScope[],
  studentContexts: Awaited<ReturnType<typeof loadStudentSchoolContexts>>,
  actorContext: Awaited<ReturnType<typeof loadActorSchoolContext>>,
) {
  if (actorContext.hasCanonical && actorContext.activeSchoolIds.size === 0) {
    return new Set<string>();
  }

  const actorId = String(actor.id);
  const assignments = await TeachingAssignmentModel.find({ teacherId: actorId })
    .select("schoolId classId status")
    .lean();

  const activeAssignments = (assignments as any[]).filter((assignment) => {
    if (String(assignment.status || "active") !== "active") return false;
    const schoolId = String(assignment.schoolId || "").trim();
    if (!schoolId) return false;
    if (actorContext.activeSchoolIds.size > 0 && !actorContext.activeSchoolIds.has(schoolId)) return false;
    return true;
  });

  // Canonical assignment rows tombstone legacy groupIds, including when all
  // assignments are inactive.
  if (assignments.length > 0) {
    const classIds = normalizeIds(activeAssignments.map((assignment) => assignment.classId));
    const groups = await loadGroupsByIds(classIds);
    const studentsByClass = new Map<string, Set<string>>();
    for (const group of groups as any[]) {
      studentsByClass.set(
        String(group._id),
        new Set(normalizeIds(Array.isArray(group.studentIds) ? group.studentIds : [])),
      );
    }

    const authorized = new Set<string>();
    for (const student of students) {
      const studentId = studentIdOf(student);
      if (!studentId) continue;
      const targetSchools = studentContexts.activeSchoolIds.get(studentId) || new Set<string>();
      if (studentContexts.hasCanonical.has(studentId) && targetSchools.size === 0) continue;
      const legacyStudentGroups = new Set(
        normalizeIds(Array.isArray(student.groupIds) ? student.groupIds : []),
      );

      const matches = activeAssignments.some((assignment) => {
        const schoolId = String(assignment.schoolId || "");
        const classId = String(assignment.classId || "");
        if (targetSchools.size > 0 && !targetSchools.has(schoolId)) return false;
        return legacyStudentGroups.has(classId) || studentsByClass.get(classId)?.has(studentId) === true;
      });
      if (matches) authorized.add(studentId);
    }
    return authorized;
  }

  // Compatibility only for teacher accounts that have never received a
  // TeachingAssignment row.
  const legacyClassIds = normalizeIds(actor.groupIds || []);
  const legacyGroups = await loadGroupsByIds(legacyClassIds);
  const groupStudents = new Set(
    normalizeIds(
      (legacyGroups as any[]).flatMap((group) =>
        Array.isArray(group.studentIds) ? group.studentIds : [],
      ),
    ),
  );
  const authorized = new Set<string>();
  for (const student of students) {
    const studentId = studentIdOf(student);
    if (!studentId) continue;
    const targetSchools = studentContexts.activeSchoolIds.get(studentId) || new Set<string>();
    if (studentContexts.hasCanonical.has(studentId) && targetSchools.size === 0) continue;
    if (
      actorContext.activeSchoolIds.size > 0 &&
      targetSchools.size > 0 &&
      !hasSharedSchool(actorContext.activeSchoolIds, targetSchools)
    ) {
      continue;
    }
    const studentGroupIds = new Set(normalizeIds(Array.isArray(student.groupIds) ? student.groupIds : []));
    if (groupStudents.has(studentId) || legacyClassIds.some((classId) => studentGroupIds.has(classId))) {
      authorized.add(studentId);
    }
  }
  return authorized;
}

async function resolveSupervisorStudentIds(
  actor: AuthUser,
  students: NotificationStudentScope[],
  studentContexts: Awaited<ReturnType<typeof loadStudentSchoolContexts>>,
  actorContext: Awaited<ReturnType<typeof loadActorSchoolContext>>,
) {
  if (actorContext.hasCanonical && actorContext.activeSchoolIds.size === 0) {
    return new Set<string>();
  }

  const authorized = new Set<string>();
  for (const student of students) {
    const studentId = studentIdOf(student);
    if (!studentId) continue;
    const targetSchools = studentContexts.activeSchoolIds.get(studentId) || new Set<string>();
    if (studentContexts.hasCanonical.has(studentId) && targetSchools.size === 0) continue;
    if (hasSharedSchool(actorContext.activeSchoolIds, targetSchools)) authorized.add(studentId);
  }

  // Compatibility for pre-membership supervisors only. Once an explicit
  // SchoolMembership row exists, its active/inactive state is authoritative.
  if (actorContext.hasCanonical) return authorized;

  const actorId = String(actor.id);
  const legacyGroupIds = normalizeIds(actor.groupIds || []);
  const objectIds = groupObjectIds(legacyGroupIds);
  const legacyGroups = await GroupModel.find({
    $or: [
      { supervisorIds: actorId },
      ...(objectIds.length ? [{ _id: { $in: objectIds } }] : []),
    ],
  })
    .select("_id studentIds")
    .lean();
  const legacyStudents = new Set(
    normalizeIds(
      (legacyGroups as any[]).flatMap((group) =>
        Array.isArray(group.studentIds) ? group.studentIds : [],
      ),
    ),
  );
  const legacyResolvedGroupIds = new Set((legacyGroups as any[]).map((group) => String(group._id)));

  for (const student of students) {
    const studentId = studentIdOf(student);
    if (!studentId || authorized.has(studentId)) continue;
    if (studentContexts.hasCanonical.has(studentId) && !(studentContexts.activeSchoolIds.get(studentId)?.size)) continue;
    const studentGroups = new Set(normalizeIds(Array.isArray(student.groupIds) ? student.groupIds : []));
    if (
      legacyStudents.has(studentId) ||
      Array.from(legacyResolvedGroupIds).some((groupId) => studentGroups.has(groupId))
    ) {
      authorized.add(studentId);
    }
  }
  return authorized;
}

export async function getAuthorizedStudentIdsForNotificationActor(
  actor: AuthUser,
  students: NotificationStudentScope[],
) {
  const allStudentIds = new Set(normalizeIds(students.map(studentIdOf)));
  if (actor.role === "admin") return allStudentIds;
  if (!["teacher", "supervisor"].includes(actor.role)) return new Set<string>();

  const [studentContexts, actorContext] = await Promise.all([
    loadStudentSchoolContexts(students),
    loadActorSchoolContext(actor),
  ]);

  if (actor.role === "teacher") {
    return resolveTeacherStudentIds(actor, students, studentContexts, actorContext);
  }
  return resolveSupervisorStudentIds(actor, students, studentContexts, actorContext);
}

export async function getAuthorizedSupervisorRecipientIdsForStudent(
  student: NotificationStudentScope,
) {
  const studentId = studentIdOf(student);
  if (!studentId) return [];

  const studentContexts = await loadStudentSchoolContexts([student]);
  const activeSchoolIds = studentContexts.activeSchoolIds.get(studentId) || new Set<string>();
  if (studentContexts.hasCanonical.has(studentId) && activeSchoolIds.size === 0) {
    return [];
  }

  const canonicalSupervisors = activeSchoolIds.size
    ? await SchoolMembershipModel.find({
        schoolId: { $in: Array.from(activeSchoolIds) },
        role: "supervisor",
        status: "active",
      })
        .select("userId")
        .lean()
    : [];
  const canonicalSupervisorIds = normalizeIds(
    (canonicalSupervisors as any[]).map((membership) => membership.userId),
  );

  const studentGroupIds = normalizeIds(Array.isArray(student.groupIds) ? student.groupIds : []);
  const objectIds = groupObjectIds(studentGroupIds);
  const legacyGroups = await GroupModel.find({
    $or: [
      { studentIds: studentId },
      ...(objectIds.length ? [{ _id: { $in: objectIds } }] : []),
    ],
  })
    .select("supervisorIds")
    .lean();
  const legacySupervisorIds = normalizeIds(
    (legacyGroups as any[]).flatMap((group) =>
      Array.isArray(group.supervisorIds) ? group.supervisorIds : [],
    ),
  );
  if (!legacySupervisorIds.length) return canonicalSupervisorIds;

  const canonicalPresence = await SchoolMembershipModel.find({
    userId: { $in: legacySupervisorIds },
    role: "supervisor",
  })
    .select("userId")
    .lean();
  const supervisorsWithCanonicalMembership = new Set(
    normalizeIds((canonicalPresence as any[]).map((membership) => membership.userId)),
  );

  return normalizeIds([
    ...canonicalSupervisorIds,
    ...legacySupervisorIds.filter((userId) => !supervisorsWithCanonicalMembership.has(userId)),
  ]);
}
