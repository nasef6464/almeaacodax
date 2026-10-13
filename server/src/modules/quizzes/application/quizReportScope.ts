import mongoose from "mongoose";
import { UserModel } from "../../../models/User.js";
import { buildQuizReportStudentScope } from "./quizReportStudentScope.js";
import { resolveSupervisorSchoolReportScope as resolveSupervisorSchoolReportScopePolicy } from "./quizSupervisorReportScope.js";
import { quizSupervisorScopeRepository } from "../infrastructure/quizSupervisorScopeRepository.js";

const STUDENT_DASHBOARD_SELECT = "id name email schoolId groupIds avatar isActive role";

export const resolveSupervisorSchoolReportScope = async (authUser: any) =>
  resolveSupervisorSchoolReportScopePolicy(authUser, quizSupervisorScopeRepository);

export const resolveScopedStudents = async (
  authUser: any,
  options?: { limit?: number; classId?: string; studentId?: string },
) => {
  const { filter: authorityFilter, managedPathIds, managedSubjectIds } = await buildQuizReportStudentScope(
    authUser,
    resolveSupervisorSchoolReportScope,
  );
  // Narrow inside the authorized query before sampling; old learners/classes
  // must not disappear merely because a newer roster page filled the cap.
  const selectors: Record<string, unknown> = {};
  if (options?.classId) selectors.groupIds = options.classId;
  if (options?.studentId) {
    // Match the existing id || _id display identity, including persisted legacy
    // aliases. Native IDs only apply when the stored alias is absent/falsy.
    selectors.$or = [
      { id: options.studentId },
      ...(mongoose.isValidObjectId(options.studentId)
        ? [{ _id: new mongoose.Types.ObjectId(options.studentId), id: { $in: [null, "", 0, false] } }]
        : []),
    ];
  }
  const filter = Object.keys(selectors).length ? { $and: [authorityFilter, selectors] } : authorityFilter;
  // Keep the intentional stored alias predicate; strictQuery would strip it.
  const identityQueryOptions = options?.studentId ? { strictQuery: false } : {};
  const limit = Math.max(1, Math.min(options?.limit || 500, 1000));
  const [students, totalStudents] = await Promise.all([
    UserModel.find(filter)
      .setOptions(identityQueryOptions)
      .select(STUDENT_DASHBOARD_SELECT)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean(),
    UserModel.countDocuments(filter).setOptions(identityQueryOptions),
  ]);

  return {
    students,
    totalStudents,
    isTruncated: totalStudents > students.length,
    managedPathIds,
    managedSubjectIds,
  };
};
