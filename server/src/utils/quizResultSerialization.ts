const toPlainObject = (value: any) => {
  if (!value) return value;
  if (typeof value.toObject === "function") return value.toObject();
  return value;
};

export const serializeQuizQuestionReviewForLearner = (questionReview: any) => {
  const { correctOptionIndex: _correctOptionIndex, explanation: _explanation, ...safeReview } = questionReview || {};
  return {
    ...safeReview,
    correctOptionIndex: undefined,
    explanation: undefined,
  };
};

export const serializeQuizResultForLearner = <TResult = any>(result: TResult): TResult => {
  const plainResult = toPlainObject(result);
  if (!plainResult || typeof plainResult !== "object") return plainResult;

  return {
    ...plainResult,
    questionReview: Array.isArray((plainResult as any).questionReview)
      ? (plainResult as any).questionReview.map(serializeQuizQuestionReviewForLearner)
      : (plainResult as any).questionReview,
  } as TResult;
};

export const serializeQuizResultsForLearner = <TResult = any>(results: TResult[]): TResult[] =>
  results.map((result) => serializeQuizResultForLearner(result));
