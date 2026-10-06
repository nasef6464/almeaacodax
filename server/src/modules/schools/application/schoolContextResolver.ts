import { SchoolMembershipModel } from "../../../models/SchoolMembership.js";

export type LegacySchoolUser = { id: string; role: string; schoolId?: string | null };

/** Explicit memberships win; legacy schoolId is a read-only compatibility fallback. */
export const resolveSchoolContexts = async (user: LegacySchoolUser) => {
  const memberships = await SchoolMembershipModel.find({ userId: user.id }).select("schoolId role status").lean();
  const active = memberships.filter((entry: any) => String(entry.status || "active") === "active");
  const contexts: Array<{ schoolId: string; role: string; source: "membership" | "legacy" }> = active.map((entry: any) => ({
    schoolId: String(entry.schoolId),
    role: String(entry.role),
    source: "membership",
  }));

  const legacySchoolId = String(user.schoolId || "");
  const hasExplicitMembershipForLegacySchool = legacySchoolId
    ? memberships.some((entry: any) => String(entry.schoolId) === legacySchoolId)
    : false;

  // Legacy schoolId is only a compatibility source for accounts that have not
  // been migrated to SchoolMembership yet. Once an explicit membership exists,
  // its status is authoritative: an inactive membership must not be resurrected
  // by the stale legacy User.schoolId field.
  if (legacySchoolId && !hasExplicitMembershipForLegacySchool) {
    contexts.push({ schoolId: legacySchoolId, role: user.role, source: "legacy" as const });
  }
  return contexts;
};

export const hasActiveSchoolRole = async (user: LegacySchoolUser, schoolId: string, role: string) => {
  const contexts = await resolveSchoolContexts(user);
  return contexts.some((context) => context.schoolId === schoolId && context.role === role);
};
