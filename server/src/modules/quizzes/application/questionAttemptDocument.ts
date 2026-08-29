export const buildQuestionAttemptDocument = ({
  payload,
  selectedOptionIndex,
  isCorrect,
  userId,
  question,
}: {
  payload: Record<string, unknown>;
  selectedOptionIndex: number;
  isCorrect: boolean;
  userId: string;
  question: Record<string, any>;
}) => ({
  ...payload,
  selectedOptionIndex,
  isCorrect,
  userId,
  date: payload.date || new Date().toISOString(),
  pathId: String(question?.pathId || ""),
  subjectId: String(question?.subject || ""),
  sectionId: String(question?.sectionId || ""),
  skillIds: Array.isArray(question?.skillIds) ? question.skillIds.map(String) : [],
});
