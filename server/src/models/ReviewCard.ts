import mongoose, { Schema } from "mongoose";

const reviewCardSchema = new Schema(
  {
    userId: { type: String, required: true, index: true },
    questionId: { type: String, required: true, index: true },
    skillId: { type: String, default: "", index: true },
    pathId: { type: String, default: "" },
    subjectId: { type: String, default: "" },
    sectionId: { type: String, default: "" },
    reviewType: { type: String, enum: ["error_recovery", "mastery_review"], default: "error_recovery" },
    easeFactor: { type: Number, default: 2.5 },
    interval: { type: Number, default: 1 },
    repetitions: { type: Number, default: 0 },
    nextReviewDate: { type: Date, default: Date.now, index: true },
    lastQuality: { type: Number, min: 0, max: 5, default: 0 },
    lastReviewEventId: { type: String, default: "" },
    lastReviewedAt: { type: Date, default: undefined },
  },
  {
    timestamps: true,
  },
);

reviewCardSchema.index({ userId: 1, questionId: 1 }, { unique: true });
reviewCardSchema.index({ userId: 1, nextReviewDate: 1 });
reviewCardSchema.index({ userId: 1, skillId: 1, nextReviewDate: 1 });
reviewCardSchema.index({ userId: 1, pathId: 1, subjectId: 1, nextReviewDate: 1 });
reviewCardSchema.index({ userId: 1, pathId: 1, subjectId: 1, reviewType: 1, nextReviewDate: 1 });

export const ReviewCardModel = mongoose.model("ReviewCard", reviewCardSchema);
