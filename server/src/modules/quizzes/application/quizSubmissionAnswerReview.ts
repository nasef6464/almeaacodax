type QuizSubmissionAnswerReviewInput = {
  orderedQuestions: any[];
  answers: Record<string, unknown>;
};

export const buildQuizSubmissionAnswerReview = ({
  orderedQuestions,
  answers,
}: QuizSubmissionAnswerReviewInput) => {
  let correctAnswers = 0;
  let wrongAnswers = 0;
  let unanswered = 0;
  const skillStats = new Map<string, { total: number; correct: number }>();

  const questionReview = orderedQuestions.map((question) => {
    const questionId = String(question.id || question._id);
    const rawSelected = answers[questionId];
    const selectedOptionIndex =
      typeof rawSelected === "number" && rawSelected >= 0 ? rawSelected : undefined;
    const isCorrect = selectedOptionIndex === Number(question.correctOptionIndex ?? 0);

    if (selectedOptionIndex === undefined) {
      unanswered += 1;
    } else if (isCorrect) {
      correctAnswers += 1;
    } else {
      wrongAnswers += 1;
    }

    (question.skillIds || []).map(String).filter(Boolean).forEach((skillId: string) => {
      const current = skillStats.get(skillId) || { total: 0, correct: 0 };
      current.total += 1;
      if (isCorrect) {
        current.correct += 1;
      }
      skillStats.set(skillId, current);
    });

    return {
      questionId,
      text: String(question.text || ""),
      options: Array.isArray(question.options) ? question.options.map(String) : [],
      correctOptionIndex: Number(question.correctOptionIndex ?? 0),
      selectedOptionIndex,
      explanation: question.explanation || "",
      videoUrl: question.videoUrl || "",
      imageUrl: question.imageUrl || "",
      isCorrect,
    };
  });

  return { correctAnswers, wrongAnswers, unanswered, skillStats, questionReview };
};
