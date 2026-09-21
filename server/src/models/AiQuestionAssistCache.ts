import mongoose, { Schema } from "mongoose";

const aiQuestionAssistCacheSchema = new Schema(
  {
    cacheKey: { type: String, required: true, unique: true, index: true },
    userId: { type: String, required: true },
    schoolId: { type: String, default: "" },
    resultId: { type: String, required: true },
    questionId: { type: String, required: true },
    helpLevel: {
      type: String,
      enum: ["hint", "stronger_hint", "concept", "steps", "follow_up"],
      required: true,
    },
    responseText: { type: String, required: true },
    provider: { type: String, default: "none" },
    model: { type: String, default: "" },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true },
);

aiQuestionAssistCacheSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
aiQuestionAssistCacheSchema.index({ userId: 1, questionId: 1, createdAt: -1 });

export const AiQuestionAssistCacheModel = mongoose.model("AiQuestionAssistCache", aiQuestionAssistCacheSchema);
