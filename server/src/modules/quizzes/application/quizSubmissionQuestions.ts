export const buildQuizQuestionLookup = (questions: any[]) => {
  const questionById = new Map<string, any>();
  questions.forEach((question) => {
    const canonicalId = String(question.id || question._id);
    questionById.set(canonicalId, question);
    const withoutCopySuffix = canonicalId.replace(/_copy(?:_\d+)?$/i, "");
    if (withoutCopySuffix && withoutCopySuffix !== canonicalId) {
      questionById.set(withoutCopySuffix, question);
    }
  });

  return questionById;
};

export const resolveOrderedQuizQuestions = (questionIds: string[], questions: any[]) => {
  const questionById = buildQuizQuestionLookup(questions);
  return questionIds
    .map((questionId) => {
      const id = String(questionId);
      return questionById.get(id) || questionById.get(id.replace(/_copy(?:_\d+)?$/i, ""));
    })
    .filter(Boolean);
};
