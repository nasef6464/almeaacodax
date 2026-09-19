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

  const studentGroupIds = normalizeIds(Array.isArray(student.groupIds) ? student.groupIds : []);
  const groupIds = normalizeIds([...studentGroupIds, ...Array.from(activeSchoolIds)]);
  const objectIds = groupObjectIds(groupIds);
  const relevantGroups = await GroupModel.find({
    $or: [
      { studentIds: studentId },
      { id: { $in: groupIds } },
      ...(objectIds.length ? [{ _id: { $in: objectIds } }] : []),
    ],
  })
    .select("_id id type parentId supervisorIds")
    .lean();

  const candidateSupervisorIds = normalizeIds(
    (relevantGroups as any[]).flatMap((group) =>
      Array.isArray(group.supervisorIds) ? group.supervisorIds : [],
    ),
  );
  if (!candidateSupervisorIds.length) return [];

  const canonicalMemberships = await SchoolMembershipModel.find({
    userId: { $in: candidateSupervisorIds },
    role: "supervisor",
  })
    .select("userId schoolId status")
    .lean();

  const membershipsBySupervisor = new Map<string, any[]>();
  for (const membership of canonicalMemberships as any[]) {
    const userId = String(membership.userId || "");
    if (!userId) continue;
    const current = membershipsBySupervisor.get(userId) || [];
    current.push(membership);
    membershipsBySupervisor.set(userId, current);
  }

  return candidateSupervisorIds.filter((userId) => {
    const memberships = membershipsBySupervisor.get(userId) || [];
    if (!memberships.length) return true;
    return memberships.some(
      (membership) =>
        String(membership.status || "active") === "active" &&
        activeSchoolIds.has(String(membership.schoolId || "")),
    );
  });
}
