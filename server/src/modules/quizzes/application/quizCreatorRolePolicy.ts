export type QuizCreatorPolicyUser = {
  id?: string;
  role?: string;
  schoolId?: string | null;
};

const uniqueStrings = (values: unknown) =>
  Array.isArray(values)
    ? [...new Set(values.map((value) => String(value || "").trim()).filter(Boolean))]
    : [];

export const hasDirectedQuizTargets = (payload: Record<string, any>) =>
  uniqueStrings(payload.targetGroupIds).length > 0 || uniqueStrings(payload.targetUserIds).length > 0;

/**
 * Platform catalogue placement, pricing, and course placement are admin-only.
 * Supervisors always create school-directed assessments. Teachers keep their
 * legacy platform-trainer workflow unless the assessment is explicitly
 * directed to assigned classes/students.
 */
export const applyQuizCreatorRolePolicy = (
  authUser: QuizCreatorPolicyUser,
  payload: Record<string, any>,
) => {
  if (authUser.role === "admin") return payload;

  const isDirectedStaffAssessment =
    authUser.role === "supervisor"
    || (authUser.role === "teacher" && hasDirectedQuizTargets(payload));

  if (!isDirectedStaffAssessment) return payload;

  const nextPayload: Record<string, any> = {
    ...payload,
    showOnPlatform: false,
    access: { type: "free" },
    learningPlacements: [],
  };

  delete nextPayload.revenueSharePercentage;
  return nextPayload;
};
