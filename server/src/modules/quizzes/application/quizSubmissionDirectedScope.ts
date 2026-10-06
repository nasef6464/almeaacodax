type QuizSubmissionDirectedScopeInput = {
  quiz: any;
  userId: string;
  isStaff: boolean;
};

const uniqueStrings = (values: unknown[]) => [...new Set(values.map(String).filter(Boolean))];

export const buildQuizSubmissionDirectedScope = ({
  quiz,
  userId,
  isStaff,
}: QuizSubmissionDirectedScopeInput) => {
  const targetGroupIds = uniqueStrings(quiz.targetGroupIds || []);
  const targetUserIds = uniqueStrings(quiz.targetUserIds || []);
  const isDirectedQuiz = targetGroupIds.length > 0 || targetUserIds.length > 0;
  const isExplicitUser = targetUserIds.includes(userId);

  return {
    targetGroupIds,
    targetUserIds,
    requiresGroupMembershipCheck:
      isDirectedQuiz && !isStaff && !isExplicitUser && targetGroupIds.length > 0,
  };
};
