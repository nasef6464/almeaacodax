import mongoose, { Schema } from "mongoose";

export type AiUsageScopeType = "global" | "user" | "school" | "capability";

const aiUsageDailySchema = new Schema(
  {
    dayKey: { type: String, required: true, index: true },
    scopeType: { type: String, enum: ["global", "user", "school", "capability"], required: true },
    scopeId: { type: String, required: true },
    requestCount: { type: Number, default: 0 },
    inputTokens: { type: Number, default: 0 },
    outputTokens: { type: Number, default: 0 },
    totalTokens: { type: Number, default: 0 },
    cachedTokens: { type: Number, default: 0 },
    estimatedUsageCount: { type: Number, default: 0 },
    lastUsedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

aiUsageDailySchema.index({ dayKey: 1, scopeType: 1, scopeId: 1 }, { unique: true });
aiUsageDailySchema.index({ scopeType: 1, scopeId: 1, dayKey: -1 });

export const AiUsageDailyModel =
  mongoose.models.AiUsageDaily || mongoose.model("AiUsageDaily", aiUsageDailySchema);
