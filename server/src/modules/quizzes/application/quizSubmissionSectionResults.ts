type QuizSubmissionSectionResultsInput = {
  quiz: any;
  orderedQuestions: any[];
  answers: Record<string, unknown>;
};

export const buildQuizSubmissionSectionResults = ({
  quiz,
  orderedQuestions,
  answers,
}: QuizSubmissionSectionResultsInput) => {
  const mockSections: any[] = quiz.mockExam?.sections || [];
  if (!quiz.mockExam?.enabled || mockSections.length === 0) {
    return undefined;
  }

  return mockSections.map((section: any) => {
    const sectionQuestionIds = new Set<string>((section.questionIds || []).map(String));
    const sectionQuestions = orderedQuestions.filter((question) =>
      sectionQuestionIds.has(String(question.id || question._id)),
    );
    const total = sectionQuestions.length;
    const answersByQuestion = sectionQuestions.map((question) => {
      const questionId = String(question.id || question._id);
      const rawSelected = answers[questionId];
      const selectedOptionIndex =
        typeof rawSelected === "number" && rawSelected >= 0 ? rawSelected : undefined;
      return {
        selectedOptionIndex,
        isCorrect: selectedOptionIndex === Number(question.correctOptionIndex ?? 0),
      };
    });
    const correct = answersByQuestion.filter((answer) => answer.isCorrect).length;
    const wrong = answersByQuestion.filter(
      (answer) => answer.selectedOptionIndex !== undefined && !answer.isCorrect,
    ).length;
    const unanswered = total - correct - wrong;

    return {
      sectionId: String(section.id || section._id || ""),
      sectionName: String(section.title || section.name || ""),
      total,
      correct,
      wrong,
      unanswered,
      score: total > 0 ? Math.round((correct / total) * 100) : 0,
    };
  });
};
