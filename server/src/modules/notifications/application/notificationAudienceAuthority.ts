import mongoose from "mongoose";
import { GroupModel } from "../../../models/Group.js";
import { SchoolMembershipModel } from "../../../models/SchoolMembership.js";
import {
  getAuthorizedStudentIdsForSchoolStaffActor,
  resolveStudentSchoolContexts,
  type SchoolScopedStudent,
} from "../../schools/application/schoolStaffStudentAuthority.js";

export type NotificationStudentScope = SchoolScopedStudent;

const normalizeIds = (values: unknown[]) =>
  Array.from(new Set(values.map((value) => String(value || "").trim()).filter(Boolean)));

const studentIdOf = (student: SchoolScopedStudent) =>
  String(student.id || student._id || "").trim();

const groupObjectIds = (ids: string[]) =>
  ids
    .filter((id) => mongoose.isValidObjectId(id))
    .map((id) => new mongoose.Types.ObjectId(id));

export const getAuthorizedStudentIdsForNotificationActor =
  getAuthorizedStudentIdsForSchoolStaffActor;

export async function getAuthorizedSupervisorRecipientIdsForStudent(
  student: SchoolScopedStudent,
) {
  const studentId = studentIdOf(student);
  if (!studentId) return [];

  const studentContexts = await resolveStudentSchoolContexts([student]);
  const activeSchoolIds = studentContexts.activeSchoolIds.get(studentId) || new Set<string>();
  if (studentContexts.hasCanonical.has(studentId) && activeSchoolIds.size === 0) return [];

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
      { id: { $in: studentGroupIds } },
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
