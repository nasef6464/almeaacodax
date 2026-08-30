type QuizSubmissionResultDocumentInput = {
  userId: string;
  quizId: string;
  quizTitle: string;
  score: number;
  passed: boolean;
  attemptNumber: number;
  source: string;
  totalQuestions: number;
  correctAnswers: number;
  wrongAnswers: number;
  unanswered: number;
  timeSpentSeconds: number;
  skillsAnalysis: unknown[];
  questionReview: unknown[];
  sectionResults?: unknown;
  submissionKey: string;
  quizSnapshot: unknown;
  submittedAt?: string;
};

export const buildQuizSubmissionResultDocument = ({
  timeSpentSeconds,
  submittedAt = new Date().toISOString(),
  sectionResults,
  ...input
}: QuizSubmissionResultDocumentInput) => {
  const timeSpentMinutes = Math.max(0, Math.round(timeSpentSeconds / 60));

  return {
    ...input,
    timeSpentSeconds,
    timeSpent: timeSpentMinutes > 0 ? `${timeSpentMinutes} دقيقة` : "أقل من دقيقة",
    date: submittedAt,
    ...(sectionResults ? { sectionResults } : {}),
  };
};
