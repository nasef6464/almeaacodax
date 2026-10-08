type ScopeUser = { id: string; schoolId?: string | null; groupIds?: string[] };
type ScopeGroup = { id: string; type: string; parentId?: string | null; supervisorIds?: string[] };

/** Mirrors the server's explicit school/class distinction; parents are labels, not grants. */
export const resolveSupervisorSchoolScope = (user: ScopeUser, groups: ScopeGroup[]) => {
  const directGroupIds = new Set(user.groupIds || []);
  const directGroups = groups.filter((group) =>
    directGroupIds.has(group.id) || group.supervisorIds?.includes(user.id),
  );
  const schoolIds = new Set<string>(user.schoolId ? [user.schoolId] : []);
  directGroups.forEach((group) => {
    if (group.type === 'SCHOOL') schoolIds.add(group.id);
  });
  const groupIds = new Set([...directGroupIds, ...directGroups.map((group) => group.id), ...schoolIds]);
  groups.forEach((group) => {
    if (group.parentId && schoolIds.has(group.parentId) &&
      (group.type === 'CLASS' || group.type === 'PRIVATE_GROUP')) groupIds.add(group.id);
  });
  return { schoolIds, groupIds };
};
