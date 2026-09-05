import {
  appendSchoolWideChildGroups,
  buildSupervisorDirectScope,
  type SupervisorDirectScope,
  type SupervisorScopeGroup,
} from "./quizSupervisorScope.js";

export type SupervisorScopeAuthUser = {
  id?: unknown;
  _id?: unknown;
  role?: unknown;
  schoolId?: unknown;
  groupIds?: unknown[];
};

export type SupervisorScopeRepository = {
  findSeedGroups(groupIds: string[]): Promise<SupervisorScopeGroup[]>;
  findDirectlySupervisedGroups(supervisorId: string): Promise<SupervisorScopeGroup[]>;
  findSchoolWideChildGroups(schoolIds: string[]): Promise<SupervisorScopeGroup[]>;
};

const uniqueStrings = (values: unknown[]) => Array.from(
  new Set(values.map((value) => String(value || "").trim()).filter(Boolean)),
);

/**
 * Resolves a report scope without promoting a class-level supervisor to school-wide access.
 * Database access stays behind the injected repository so the authorization rule is reusable.
 */
export const resolveSupervisorSchoolReportScope = async (
  authUser: SupervisorScopeAuthUser,
  repository: SupervisorScopeRepository,
): Promise<SupervisorDirectScope> => {
  if (authUser.role !== "supervisor") {
    return {
      schoolIds: uniqueStrings(authUser.schoolId ? [authUser.schoolId] : []),
      groupIds: uniqueStrings(authUser.groupIds || []),
    };
  }

  const managedGroupIds = uniqueStrings(authUser.groupIds || []);
  const [seedGroups, directlySupervisedGroups] = await Promise.all([
    repository.findSeedGroups(managedGroupIds),
    repository.findDirectlySupervisedGroups(String(authUser.id || authUser._id || "")),
  ]);
  const directScope = buildSupervisorDirectScope({
    schoolId: authUser.schoolId,
    managedGroupIds,
    seedGroups,
    directlySupervisedGroups,
  });
  const schoolWideChildGroups = await repository.findSchoolWideChildGroups(directScope.schoolIds);
  return appendSchoolWideChildGroups(directScope, schoolWideChildGroups);
};
