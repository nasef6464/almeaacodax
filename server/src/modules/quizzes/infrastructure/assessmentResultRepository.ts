import { AssessmentResultModel } from "./assessmentResultModel.js";

export const findAssessmentResultByLegacyId = (legacyQuizResultId: string) =>
  AssessmentResultModel.findOne({ legacyQuizResultId }).lean();

export async function findAssessmentResultsByLegacyIds(legacyQuizResultIds: string[]) {
  if (legacyQuizResultIds.length === 0) return new Map<string, { compatibilityProjection?: unknown }>();
  const results = await AssessmentResultModel.find({ legacyQuizResultId: { $in: legacyQuizResultIds } })
    .select("legacyQuizResultId compatibilityProjection")
    .lean();
  return new Map(results.map((result) => [String(result.legacyQuizResultId), result]));
}
