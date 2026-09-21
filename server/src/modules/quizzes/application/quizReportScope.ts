import { UserModel } from "../../../models/User.js";
import { buildQuizReportStudentScope } from "./quizReportStudentScope.js";
import { resolveSupervisorSchoolReportScope as resolveSupervisorSchoolReportScopePolicy } from "./quizSupervisorReportScope.js";
import { quizSupervisorScopeRepository } from "../infrastructure/quizSupervisorScopeRepository.js";

const STUDENT_DASHBOARD_SELECT = "id name email schoolId groupIds avatar isActive role";

export const resolveSupervisorSchoolReportScope = async (authUser: any) =>
  resolveSupervisorSchoolReportScopePolicy(authUser, quizSupervisorScopeRepository);

export const resolveScopedStudents = async (
  authUser: any,
  options?: { limit?: number },
) => {
  const { filter, managedPathIds, managedSubjectIds } = await buildQuizReportStudentScope(
    authUser,
    resolveSupervisorSchoolReportScope,
  );
  const limit = Math.max(1, Math.min(options?.limit || 500, 1000));
  const [students, totalStudents] = await Promise.all([
    UserModel.find(filter)
      .select(STUDENT_DASHBOARD_SELECT)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean(),
    UserModel.countDocuments(filter),
  ]);

  return {
    students,
    totalStudents,
    isTruncated: totalStudents > students.length,
    managedPathIds,
    managedSubjectIds,
  };
};
