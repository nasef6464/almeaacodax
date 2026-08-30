import type { SupervisorDirectScope } from "./quizSupervisorScope.js";
import type { SupervisorScopeAuthUser } from "./quizSupervisorReportScope.js";

export type QuizReportScopeAuthUser = SupervisorScopeAuthUser & {
  managedPathIds?: unknown[];
  managedSubjectIds?: unknown[];
  linkedStudentIds?: unknown[];
};

export type QuizReportStudentScope = {
  filter: Record<string, unknown>;
  managedPathIds: Set<string>;
  managedSubjectIds: Set<string>;
};

const uniqueStrings = (values: unknown[]) => Array.from(
  new Set(values.map((value) => String(value || "").trim()).filter(Boolean)),
);

const buildDocumentsByIdsQuery = (values: string[]) => ({
  $or: [{ id: { $in: values } }, { _id: { $in: values } }],
});

const buildDocumentQuery = (value: string) => buildDocumentsByIdsQuery(value ? [value] : []);

/** Builds the role-bound student filter consumed by quiz report read models. */
export const buildQuizReportStudentScope = async (
  authUser: QuizReportScopeAuthUser,
  resolveSupervisorScope: (authUser: QuizReportScopeAuthUser) => Promise<SupervisorDirectScope>,
): Promise<QuizReportStudentScope> => {
  const managedPathIds = new Set(uniqueStrings(authUser.managedPathIds || []));
  const managedSubjectIds = new Set(uniqueStrings(authUser.managedSubjectIds || []));

  if (authUser.role === "admin") {
    return { filter: { role: "student" }, managedPathIds, managedSubjectIds };
  }

  if (authUser.role === "teacher" || authUser.role === "supervisor") {
    const supervisorScope = await resolveSupervisorScope(authUser);
    const scopeFilters: Record<string, unknown>[] = [];
    if (supervisorScope.groupIds.length > 0) {
      scopeFilters.push({ groupIds: { $in: supervisorScope.groupIds } });
    }
    if (supervisorScope.schoolIds.length > 0) {
      scopeFilters.push({ schoolId: { $in: supervisorScope.schoolIds } });
    }
    return {
      filter: scopeFilters.length ? { role: "student", $or: scopeFilters } : { role: "student", _id: { $exists: false } },
      managedPathIds,
      managedSubjectIds,
    };
  }

  if (authUser.role === "parent") {
    const linkedStudentIds = uniqueStrings(authUser.linkedStudentIds || []);
    const studentIdentityFilter = linkedStudentIds.length
      ? buildDocumentsByIdsQuery(linkedStudentIds)
      : { _id: { $exists: false } };
    return { filter: { role: "student", ...studentIdentityFilter }, managedPathIds, managedSubjectIds };
  }

  return {
    filter: { role: "student", ...buildDocumentQuery(String(authUser.id || authUser._id || "")) },
    managedPathIds,
    managedSubjectIds,
  };
};
