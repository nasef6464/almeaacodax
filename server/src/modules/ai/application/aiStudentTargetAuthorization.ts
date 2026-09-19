import type { AuthUser } from "../../auth/domain/auth-user.js";
import { GroupModel } from "../../../models/Group.js";
import { TeachingAssignmentModel } from "../../../models/TeachingAssignment.js";
import { UserModel } from "../../../models/User.js";
import { resolveSchoolContexts } from "../../schools/application/schoolContextResolver.js";

/**
 * Authoritative scope check for AI operations that read a student's learning
 * data or create targeted content for that student.
 */
export const canTargetStudentForAi = async (actor: AuthUser, targetStudentId: string) => {
  const actorId = String(actor.id);
  const targetId = String(targetStudentId);

  if (actor.role === "admin") return true;
  if (actor.role === "student") return actorId === targetId;

  const target = await UserModel.findById(targetId).select("role schoolId").lean();
  if (!target || String(target.role) !== "student") return false;

  // Parent linkage is still the platform's current parent-child authority.
  // Batch 9 will migrate this legacy field to the canonical relationship.
  if (actor.role === "parent") {
    return (actor.linkedStudentIds || []).map(String).includes(targetId);
  }

  const [actorContexts, targetContexts] = await Promise.all([
    resolveSchoolContexts({ id: actorId, role: actor.role, schoolId: actor.schoolId || null }),
    resolveSchoolContexts({ id: targetId, role: "student", schoolId: (target as any).schoolId || null }),
  ]);
  const targetSchoolIds = new Set(targetContexts.filter((entry) => entry.role === "student").map((entry) => String(entry.schoolId)));

  if (actor.role === "school_admin" || actor.role === "supervisor") {
    return actorContexts.some((entry) => entry.role === actor.role && targetSchoolIds.has(String(entry.schoolId)));
  }

  if (actor.role === "teacher") {
    const actorSchoolIds = actorContexts
      .filter((entry) => entry.role === "teacher" && targetSchoolIds.has(String(entry.schoolId)))
      .map((entry) => String(entry.schoolId));
    if (actorSchoolIds.length === 0) return false;

    const assignments = await TeachingAssignmentModel.find({
      teacherId: actorId,
      schoolId: { $in: actorSchoolIds },
      status: "active",
    }).select("classId").lean();
    const classIds = assignments.map((entry: any) => String(entry.classId)).filter(Boolean);
    if (classIds.length === 0) return false;

    return Boolean(await GroupModel.exists({ _id: { $in: classIds }, studentIds: targetId }));
  }

  return false;
};
