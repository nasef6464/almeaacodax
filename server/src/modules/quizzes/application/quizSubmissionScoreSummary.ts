type QuizScoreSummaryInput = {
  correctAnswers: number;
  wrongAnswers: number;
  unanswered: number;
  totalQuestions: number;
  passingScore: number;
};

export const buildQuizSubmissionScoreSummary = ({
  correctAnswers,
  wrongAnswers,
  unanswered,
  totalQuestions,
  passingScore,
}: QuizScoreSummaryInput) => {
  const score = Math.round((correctAnswers / Math.max(totalQuestions, 1)) * 100);

  return {
    totalQuestions,
    correctAnswers,
    wrongAnswers,
    unanswered,
    score,
    passed: score >= passingScore,
  };
};
