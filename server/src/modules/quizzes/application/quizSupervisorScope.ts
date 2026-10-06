export type SupervisorScopeGroup = {
  id?: unknown;
  _id?: unknown;
  parentId?: unknown;
  type?: unknown;
};

export type SupervisorDirectScope = {
  schoolIds: string[];
  groupIds: string[];
};

const uniqueStrings = (values: unknown[]) => Array.from(
  new Set(values.map((value) => String(value || "").trim()).filter(Boolean)),
);

const groupId = (group: SupervisorScopeGroup) => String(group.id || group._id || "").trim();

/**
 * Separates explicit school-wide authority from class/private-group authority.
 * A class relationship must never be promoted into its parent school scope.
 */
export const buildSupervisorDirectScope = (input: {
  schoolId?: unknown;
  managedGroupIds?: unknown[];
  seedGroups?: SupervisorScopeGroup[];
  directlySupervisedGroups?: SupervisorScopeGroup[];
}): SupervisorDirectScope => {
  const managedGroupIds = uniqueStrings(input.managedGroupIds || []);
  const seedGroups = input.seedGroups || [];
  const directlySupervisedGroups = input.directlySupervisedGroups || [];

  const schoolIds = uniqueStrings([
    input.schoolId,
    ...directlySupervisedGroups
      .filter((group) => group.type === "SCHOOL")
      .map(groupId),
    ...seedGroups
      .filter((group) => group.type === "SCHOOL")
      .map(groupId),
  ]);

  return {
    schoolIds,
    groupIds: uniqueStrings([
      ...managedGroupIds,
      ...directlySupervisedGroups.map(groupId),
    ]),
  };
};

export const appendSchoolWideChildGroups = (
  directScope: SupervisorDirectScope,
  schoolWideChildGroups: SupervisorScopeGroup[],
): SupervisorDirectScope => ({
  schoolIds: directScope.schoolIds,
  groupIds: uniqueStrings([
    ...directScope.groupIds,
    ...schoolWideChildGroups.map(groupId),
  ]),
});
