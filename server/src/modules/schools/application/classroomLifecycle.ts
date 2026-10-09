export type ClassroomSessionStatus = "draft" | "scheduled" | "live" | "ended" | "archived";

export const canStudentJoinClassroom = (status: ClassroomSessionStatus) => status === "live";
export const canMutateClassroomQuestions = (status: ClassroomSessionStatus) => status === "draft" || status === "scheduled" || status === "live";
export const canPublishClassroom = (status: ClassroomSessionStatus) => status === "draft" || status === "scheduled" || status === "live";

export const isDuplicateLiveSessionError = (error: unknown) => {
  const candidate = error as { code?: number; message?: string } | null;
  return Boolean(candidate && (candidate.code === 11000 || /duplicate key/i.test(candidate.message || "")));
};

export const closeActiveBatch = (session: any, endedAt = new Date()) => {
  if (!session.activeBatchId) return;
  const activeBatch = session.questionBatches?.find((batch: any) => String(batch.batchId) === String(session.activeBatchId));
  if (activeBatch && !activeBatch.endedAt) activeBatch.endedAt = endedAt;
};

export const batchForQuestion = (session: any, questionId: string) =>
  session.questionBatches?.find((batch: any) => (batch.questionIds || []).map(String).includes(String(questionId))) || null;

export const activateBatchForQuestion = (session: any, questionId: string, startedAt = new Date()) => {
  const targetBatch = batchForQuestion(session, questionId);
  if (!targetBatch) return null;
  if (targetBatch.endedAt && String(session.activeBatchId || "") !== String(targetBatch.batchId)) return null;
  if (session.activeBatchId && String(session.activeBatchId) !== String(targetBatch.batchId)) closeActiveBatch(session, startedAt);
  if (!targetBatch.startedAt) targetBatch.startedAt = startedAt;
  targetBatch.endedAt = null;
  session.activeBatchId = targetBatch.batchId;
  return targetBatch;
};
