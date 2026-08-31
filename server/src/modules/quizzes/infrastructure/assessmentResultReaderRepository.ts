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
