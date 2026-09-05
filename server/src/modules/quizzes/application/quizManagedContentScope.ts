export type ManagedContentScopeRecord = {
  pathId?: unknown;
  subjectId?: unknown;
  skillsAnalysis?: unknown;
};

/** Returns whether a report record belongs to a teacher's configured content scope. */
export const matchesManagedContentScope = (
  record: ManagedContentScopeRecord,
  managedPathIds: Set<string>,
  managedSubjectIds: Set<string>,
) => {
  if (managedPathIds.size === 0 && managedSubjectIds.size === 0) {
    return true;
  }

  const subjectId = String(record?.subjectId || "");
  const pathId = String(record?.pathId || "");
  return (
    (managedSubjectIds.size > 0 && Boolean(subjectId) && managedSubjectIds.has(subjectId)) ||
    (managedPathIds.size > 0 && Boolean(pathId) && managedPathIds.has(pathId))
  );
};

/** Applies teacher content ownership to result read models without altering other roles. */
export const filterResultsByManagedContentScope = <T extends ManagedContentScopeRecord>(
  results: T[],
  role: string,
  managedPathIds: Set<string>,
  managedSubjectIds: Set<string>,
) => {
  if (role !== "teacher" || (managedPathIds.size === 0 && managedSubjectIds.size === 0)) {
    return results;
  }

  return results.filter((result) => {
    const skills = Array.isArray(result.skillsAnalysis) ? result.skillsAnalysis : [];
    return skills.some((skill: any) => matchesManagedContentScope(skill, managedPathIds, managedSubjectIds));
  });
};
