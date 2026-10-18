type AssignmentQuiz = {createdBy?: string; ownerType?: string; mode?: string; isPublished?: boolean};
/** Presentation filter only; the server remains the assignment authority. */
export function ownPublishedSchoolAssessments<T extends AssignmentQuiz>(quizzes: readonly T[], actorId: string): T[] {
  if (!actorId) return [];
  return quizzes.filter(quiz => quiz.isPublished === true && quiz.ownerType === 'school' && quiz.mode === 'central' && quiz.createdBy === actorId);
}
