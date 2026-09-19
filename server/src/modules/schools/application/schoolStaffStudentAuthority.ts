import mongoose from "mongoose";
import type { AuthUser } from "../../auth/domain/auth-user.js";
import { GroupModel } from "../../../models/Group.js";
import { SchoolMembershipModel } from "../../../models/SchoolMembership.js";
import { TeachingAssignmentModel } from "../../../models/TeachingAssignment.js";

export type SchoolScopedStudent = {
  id?: unknown;
  _id?: unknown;
  schoolId?: unknown;
  groupIds?: unknown[];
};

const normalizeIds = (values: unknown[]) =>
  Array.from(new Set(values.map((value) => String(value || "").trim()).filter(Boolean)));

const studentIdOf = (student: SchoolScopedStudent) =>
  String(student.id || student._id || "").trim();

const groupObjectIds = (ids: string[]) =>
  ids
    .filter((id) => mongoose.isValidObjectId(id))
    .map((id) => new mongoose.Types.ObjectId(id));

const hasSharedSchool = (first: Set<string>, second: Set<string>) =>
  first.size > 0 && second.size > 0 && Array.from(first).some((schoolId) => second.has(schoolId));

export async function resolveStudentSchoolContexts(students: SchoolScopedStudent[]) {
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

async function resolveActorSchoolContext(actor: AuthUser) {
  const rows = await SchoolMembershipModel.find({
    userId: String(actor.id),
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

  return { hasCanonical: rows.length > 0, activeSchoolIds };
}

async function loadGroupsByIds(ids: string[]) {
  const normalized = normalizeIds(ids);
  const objectIds = groupObjectIds(normalized);
  if (!normalized.length) return [];
  return GroupModel.find({
    $or: [
      { id: { $in: normalized } },
      ...(objectIds.length ? [{ _id: { $in: objectIds } }] : []),
    ],
  })
    .select("_id id type parentId studentIds supervisorIds")
    .lean();
}

async function resolveTeacherStudentIds(
  actor: AuthUser,
  students: SchoolScopedStudent[],
  studentContexts: Awaited<ReturnType<typeof resolveStudentSchoolContexts>>,
  actorContext: Awaited<ReturnType<typeof resolveActorSchoolContext>>,
) {
  if (actorContext.hasCanonical && actorContext.activeSchoolIds.size === 0) return new Set<string>();

  const assignments = await TeachingAssignmentModel.find({ teacherId: String(actor.id) })
    .select("schoolId classId status")
    .lean();

  const canonicalClassIds = new Set(
    normalizeIds((assignments as any[]).map((assignment) => assignment.classId)),
  );
  const activeAssignments = (assignments as any[]).filter((assignment) => {
    if (String(assignment.status || "active") !== "active") return false;
    const schoolId = String(assignment.schoolId || "").trim();
    return schoolId && (!actorContext.activeSchoolIds.size || actorContext.activeSchoolIds.has(schoolId));
  });

  // Compatibility is per class: a canonical assignment row (active OR
  // inactive) tombstones the legacy groupIds value for that same class only.
  // Unmigrated classes may continue through groupIds until they receive their
  // own canonical row.
  const legacyClassIds = normalizeIds(actor.groupIds || []).filter(
    (classId) => !canonicalClassIds.has(classId),
  );
  const effectiveClassIds = normalizeIds([
    ...activeAssignments.map((assignment) => assignment.classId),
    ...legacyClassIds,
  ]);
  const groups = await loadGroupsByIds(effectiveClassIds);
  const groupById = new Map<string, any>();
  for (const group of groups as any[]) {
    groupById.set(String(group.id || group._id), group);
    groupById.set(String(group._id), group);
  }

  const authorized = new Set<string>();
  for (const student of students) {
    const studentId = studentIdOf(student);
    if (!studentId) continue;
    const targetSchools = studentContexts.activeSchoolIds.get(studentId) || new Set<string>();
    if (studentContexts.hasCanonical.has(studentId) && targetSchools.size === 0) continue;
    const studentGroups = new Set(normalizeIds(Array.isArray(student.groupIds) ? student.groupIds : []));

    const canonicalMatch = activeAssignments.some((assignment) => {
      const schoolId = String(assignment.schoolId || "");
      const classId = String(assignment.classId || "");
      if (targetSchools.size && !targetSchools.has(schoolId)) return false;
      const group = groupById.get(classId);
      const groupStudents = normalizeIds(Array.isArray(group?.studentIds) ? group.studentIds : []);
      return studentGroups.has(classId) || groupStudents.includes(studentId);
    });
    if (canonicalMatch) {
      authorized.add(studentId);
      continue;
    }

    const legacyMatch = legacyClassIds.some((classId) => {
      const group = groupById.get(classId);
      const groupSchoolId = String(group?.parentId || "");
      if (actorContext.activeSchoolIds.size && groupSchoolId && !actorContext.activeSchoolIds.has(groupSchoolId)) return false;
      if (targetSchools.size && groupSchoolId && !targetSchools.has(groupSchoolId)) return false;
      const groupStudents = normalizeIds(Array.isArray(group?.studentIds) ? group.studentIds : []);
      return studentGroups.has(classId) || groupStudents.includes(studentId);
    });
    if (legacyMatch) authorized.add(studentId);
  }

  return authorized;
}

async function resolveSupervisorStudentIds(
  actor: AuthUser,
  students: SchoolScopedStudent[],
  studentContexts: Awaited<ReturnType<typeof resolveStudentSchoolContexts>>,
  actorContext: Awaited<ReturnType<typeof resolveActorSchoolContext>>,
) {
  if (actorContext.hasCanonical && actorContext.activeSchoolIds.size === 0) return new Set<string>();

  const actorId = String(actor.id);
  const legacyGroupIds = normalizeIds(actor.groupIds || []);
  const objectIds = groupObjectIds(legacyGroupIds);
  const supervisedGroups = await GroupModel.find({
    $or: [
      { supervisorIds: actorId },
      { id: { $in: legacyGroupIds } },
      ...(objectIds.length ? [{ _id: { $in: objectIds } }] : []),
    ],
  })
    .select("_id id type parentId studentIds")
    .lean();

  const authorizedGroups = (supervisedGroups as any[]).filter((group) => {
    if (!actorContext.activeSchoolIds.size) return true;
    const groupSchoolId =
      String(group.type) === "SCHOOL"
        ? String(group.id || group._id || "")
        : String(group.parentId || "");
    return Boolean(groupSchoolId && actorContext.activeSchoolIds.has(groupSchoolId));
  });

  const schoolWideIds = new Set(
    normalizeIds(authorizedGroups
      .filter((group) => String(group.type) === "SCHOOL")
      .map((group) => group.id || group._id)),
  );
  const scopedGroups = authorizedGroups.filter((group) => String(group.type) !== "SCHOOL");
  const scopedGroupIds = new Set(normalizeIds(scopedGroups.map((group) => group.id || group._id)));
  const scopedStudents = new Set(
    normalizeIds(scopedGroups.flatMap((group) => Array.isArray(group.studentIds) ? group.studentIds : [])),
  );

  const authorized = new Set<string>();
  for (const student of students) {
    const studentId = studentIdOf(student);
    if (!studentId) continue;
    const targetSchools = studentContexts.activeSchoolIds.get(studentId) || new Set<string>();
    if (studentContexts.hasCanonical.has(studentId) && targetSchools.size === 0) continue;

    if (Array.from(targetSchools).some((schoolId) => schoolWideIds.has(schoolId))) {
      authorized.add(studentId);
      continue;
    }

    const studentGroups = new Set(normalizeIds(Array.isArray(student.groupIds) ? student.groupIds : []));
    if (scopedStudents.has(studentId) || Array.from(scopedGroupIds).some((groupId) => studentGroups.has(groupId))) {
      authorized.add(studentId);
    }
  }

  return authorized;
}

export async function getAuthorizedStudentIdsForSchoolStaffActor(
  actor: AuthUser,
  students: SchoolScopedStudent[],
) {
  const allStudentIds = new Set(normalizeIds(students.map(studentIdOf)));
  if (actor.role === "admin") return allStudentIds;
  if (!["teacher", "supervisor"].includes(actor.role)) return new Set<string>();

  const [studentContexts, actorContext] = await Promise.all([
    resolveStudentSchoolContexts(students),
    resolveActorSchoolContext(actor),
  ]);

  if (actor.role === "teacher") {
    return resolveTeacherStudentIds(actor, students, studentContexts, actorContext);
  }
  return resolveSupervisorStudentIds(actor, students, studentContexts, actorContext);
}
