import { SchoolMembershipModel } from "../../../models/SchoolMembership.js";

export type LegacySchoolUser = { id: string; role: string; schoolId?: string | null };

/** Explicit memberships win; legacy schoolId is a read-only compatibility fallback. */
export const resolveSchoolContexts = async (user: LegacySchoolUser) => {
  const explicit = await SchoolMembershipModel.find({ userId: user.id, status: "active" }).select("schoolId role").lean();
  const contexts: Array<{ schoolId: string; role: string; source: "membership" | "legacy" }> = explicit.map((entry) => ({ schoolId: String(entry.schoolId), role: String(entry.role), source: "membership" }));
  if (user.schoolId && !contexts.some((entry) => entry.schoolId === String(user.schoolId))) {
    contexts.push({ schoolId: String(user.schoolId), role: user.role, source: "legacy" as const });
  }
  return contexts;
};

export const hasActiveSchoolRole = async (user: LegacySchoolUser, schoolId: string, role: string) => {
  const contexts = await resolveSchoolContexts(user);
  return contexts.some((context) => context.schoolId === schoolId && context.role === role);
};
