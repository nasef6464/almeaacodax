import mongoose, { Schema } from "mongoose";

/**
 * Immutable published definition for the additive assessment-data evolution.
 * This model is intentionally not wired into legacy quiz reads or writes yet.
 */
const assessmentVersionSchema = new Schema(
  {
    assessmentId: { type: String, required: true, index: true, trim: true },
    version: { type: Number, required: true, min: 1 },
    definition: { type: Schema.Types.Mixed, required: true },
    publishedAt: { type: Date, required: true, default: Date.now },
    publishedBy: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ["published", "superseded"],
      required: true,
      default: "published",
      index: true,
    },
  },
  { timestamps: true },
);

assessmentVersionSchema.index({ assessmentId: 1, version: 1 }, { unique: true });
assessmentVersionSchema.index({ assessmentId: 1, status: 1, publishedAt: -1 });

export const AssessmentVersionModel = mongoose.model(
  "AssessmentVersion",
  assessmentVersionSchema,
);
