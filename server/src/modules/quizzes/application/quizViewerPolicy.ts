import { QuizRetakeModel, quizRetakeId } from "../infrastructure/quizRetakeModel.js";

// One bounded query for the current viewer, never all students' grants.
export const applyQuizViewerPolicy = async (quizzes: any[], user?: { id: string; role: string }) => {
  if (user?.role !== "student" || !quizzes.length) return quizzes;
  const directed = quizzes.filter(q => q.targetUserIds?.length || q.targetGroupIds?.length);
  if (!directed.length) return quizzes;
  const grants = await QuizRetakeModel.find({ studentId: user.id, _id: { $in: directed.map(q => quizRetakeId(String(q.id || q._id), user.id)) } })
    .select("quizId opensAt closesAt maxAttempts -_id").lean();
  const byId = new Map(grants.map(grant => [grant.quizId, grant]));
  return quizzes.map(quiz => {
    const grant = byId.get(String(quiz.id || quiz._id));
    return grant ? {
      ...quiz, opensAt: grant.opensAt, closesAt: grant.closesAt,
      viewerRetakeGranted: true,
      settings: { ...quiz.settings, maxAttempts: Math.max(Number(quiz.settings?.maxAttempts || 1), grant.maxAttempts) },
    } : quiz;
  });
};
