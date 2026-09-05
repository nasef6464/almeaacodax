import { QuizModel } from "../../../models/Quiz.js";
import type { AssessmentResultReaderMode } from "../application/assessmentResultReaderPolicy.js";

/**
 * The reader policy is stored with the assessment definition so it can be
 * rolled back without an environment-level deployment change.
 */
export async function findAssessmentResultReaderMode(quizId: string): Promise<AssessmentResultReaderMode> {
  const quiz = await QuizModel.findOne({ $or: [{ id: quizId }, { _id: quizId }] })
    .select("assessmentData.resultReaderMode")
    .lean();
  return quiz?.assessmentData?.resultReaderMode === "compatibility" ? "compatibility" : "legacy";
}

export async function findAssessmentResultReaderModes(quizIds: string[]) {
  const uniqueQuizIds = [...new Set(quizIds.filter(Boolean))];
  if (uniqueQuizIds.length === 0) return new Map<string, AssessmentResultReaderMode>();
  const quizzes = await QuizModel.find({ $or: [{ id: { $in: uniqueQuizIds } }, { _id: { $in: uniqueQuizIds } }] })
    .select("id _id assessmentData.resultReaderMode")
    .lean();
  return new Map(quizzes.flatMap((quiz) => {
    const mode: AssessmentResultReaderMode = quiz.assessmentData?.resultReaderMode === "compatibility" ? "compatibility" : "legacy";
    return [String(quiz.id || ""), String(quiz._id || "")].filter(Boolean).map((id) => [id, mode] as const);
  }));
}
