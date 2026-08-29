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
  id: quizId,
  _id: quizId,
  ...workflowDefaults,
  approvalStatus: isPowerRole ? payload.approvalStatus || "approved" : workflowDefaults.approvalStatus,
  isPublished: willBePublished,
  showOnPlatform: typeof payload.showOnPlatform === "boolean" ? payload.showOnPlatform : false,
  skillIds: resolvedSkillIds,
});
