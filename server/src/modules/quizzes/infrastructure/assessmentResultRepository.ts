import { AssessmentResultModel } from "./assessmentResultModel.js";

export const findAssessmentResultByLegacyId = (legacyQuizResultId: string) =>
  AssessmentResultModel.findOne({ legacyQuizResultId }).lean();
