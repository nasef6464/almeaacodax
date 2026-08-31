import { AssessmentVersionModel } from "./assessmentVersionModel.js";

export const findLatestPublishedAssessmentVersion = (assessmentId: string) =>
  AssessmentVersionModel.findOne({ assessmentId, status: "published" })
    .sort({ version: -1 })
    .lean();
