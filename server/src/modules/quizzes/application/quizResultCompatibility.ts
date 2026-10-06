import {
  resolveAssessmentResultRead,
  resolveAssessmentResultReads,
} from "./assessmentResultReadAdapter.js";
import { shouldReadAssessmentCompatibilityProjection } from "./assessmentResultReaderPolicy.js";
import {
  findAssessmentResultByLegacyId,
  findAssessmentResultsByLegacyIds,
} from "../infrastructure/assessmentResultRepository.js";
import {
  findAssessmentResultReaderMode,
  findAssessmentResultReaderModes,
} from "../infrastructure/assessmentResultReaderRepository.js";

export const resolveCompatibleQuizResultList = async (results: Record<string, unknown>[]) => {
  const legacyIds = results.map((result) => String(result.id || result._id || "")).filter(Boolean);
  const quizIds = results.map((result) => String(result.quizId || "")).filter(Boolean);
  const [assessmentResultsByLegacyId, readerModesByQuizId] = await Promise.all([
    findAssessmentResultsByLegacyIds(legacyIds),
    findAssessmentResultReaderModes(quizIds),
  ]);
  return resolveAssessmentResultReads(results, assessmentResultsByLegacyId, readerModesByQuizId);
};

export const resolveCompatibleLatestQuizResult = async (result: Record<string, unknown>) => {
  const readerMode = await findAssessmentResultReaderMode(String(result.quizId || ""));
  const assessmentResult = shouldReadAssessmentCompatibilityProjection(readerMode)
    ? await findAssessmentResultByLegacyId(String(result._id || result.id || ""))
    : null;
  return resolveAssessmentResultRead(result, assessmentResult);
};
