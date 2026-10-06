export const getQuizMaxAttempts = (quiz: any) => {
  const value = Number(quiz?.settings?.maxAttempts ?? 1);
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : 1;
};

export const getQuizPassingScore = (quiz: any) => {
  const value = Number(quiz?.settings?.passingScore ?? 60);
  if (!Number.isFinite(value)) return 60;
  return Math.min(100, Math.max(0, value));
};

export const buildSubmissionKey = (userId: string, quizId: string, attemptNumber: number) =>
  `quiz-submit:${userId}:${quizId}:attempt:${attemptNumber}`;

export const buildQuizSubmissionAttemptState = ({
  userId,
  quizId,
  previousAttempts,
  maxAttempts,
}: {
  userId: string;
  quizId: string;
  previousAttempts: number;
  maxAttempts: number;
}) => {
  if (previousAttempts >= maxAttempts) {
    return { isLimitReached: true as const };
  }

  const attemptNumber = previousAttempts + 1;
  return {
    isLimitReached: false as const,
    attemptNumber,
    submissionKey: buildSubmissionKey(userId, quizId, attemptNumber),
  };
};
