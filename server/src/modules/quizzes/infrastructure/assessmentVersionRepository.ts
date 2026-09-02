import { AssessmentVersionModel } from "./assessmentVersionModel.js";

export const findLatestPublishedAssessmentVersion = (assessmentId: string) =>
  AssessmentVersionModel.findOne({ assessmentId, status: "published" })
    .sort({ version: -1 })
    .lean();

type PublishAssessmentVersionInput = {
  assessmentId: string;
  definition: Record<string, unknown>;
  publishedBy: string;
};

/**
 * Appends an immutable definition whenever a published assessment is created
 * or changed. The legacy Quiz remains the compatibility facade; this only
 * prevents the version reader from serving an older published snapshot.
 */
export const publishAssessmentVersion = async ({
  assessmentId,
  definition,
  publishedBy,
}: PublishAssessmentVersionInput) => {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const latest = await AssessmentVersionModel.findOne({ assessmentId })
      .sort({ version: -1 })
      .lean();
    const version = Number(latest?.version || 0) + 1;

    try {
      const created = await AssessmentVersionModel.create({
        assessmentId,
        version,
        definition,
        publishedBy,
        status: "published",
      });
      await AssessmentVersionModel.updateMany(
        { assessmentId, status: "published", _id: { $ne: created._id } },
        { $set: { status: "superseded" } },
      );
      return created;
    } catch (error: any) {
      if (error?.code !== 11000 || attempt === 2) throw error;
    }
  }

  throw new Error("Unable to publish assessment version");
};
