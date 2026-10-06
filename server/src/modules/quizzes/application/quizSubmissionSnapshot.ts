type QuizSubmissionSnapshotInput = {
  quiz: any;
  passingScore: number;
  totalQuestions: number;
  snapshotAt?: number;
};

const uniqueStrings = (values: unknown[]) => [...new Set(values.map(String).filter(Boolean))];

export const buildQuizSubmissionSnapshot = ({
  quiz,
  passingScore,
  totalQuestions,
  snapshotAt = Date.now(),
}: QuizSubmissionSnapshotInput) => ({
  title: String(quiz.title || ""),
  mode: String(quiz.mode || "regular"),
  quizKind: String(quiz.quizKind || "test"),
  passingScore,
  targetGroupIds: uniqueStrings(quiz.targetGroupIds || []),
  targetUserIds: uniqueStrings(quiz.targetUserIds || []),
  dueDate: String(quiz.dueDate || "") || null,
  pathId: String(quiz.pathId || ""),
  subjectId: String(quiz.subjectId || ""),
  totalQuestions,
  snapshotAt,
});
