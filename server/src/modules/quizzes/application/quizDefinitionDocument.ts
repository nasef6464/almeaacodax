const uniqueQuestionIds = (values: unknown) => Array.isArray(values)
  ? [...new Set(values.filter((value): value is string => typeof value === "string" && value.trim().length > 0))]
  : [];

export const buildQuizCreateDocument = ({
  payload,
  quizId,
  workflowDefaults,
  isPowerRole,
  resolvedSkillIds,
  willBePublished,
}: {
  payload: Record<string, any>;
  quizId: string;
  workflowDefaults: Record<string, unknown>;
  isPowerRole: boolean;
  resolvedSkillIds: string[];
  willBePublished: boolean;
}) => ({
  ...payload,
  questionIds: uniqueQuestionIds(payload.questionIds),
  id: quizId,
  _id: quizId,
  ...workflowDefaults,
  approvalStatus: isPowerRole ? payload.approvalStatus || "approved" : workflowDefaults.approvalStatus,
  isPublished: willBePublished,
  showOnPlatform: typeof payload.showOnPlatform === "boolean" ? payload.showOnPlatform : false,
  skillIds: resolvedSkillIds,
});
