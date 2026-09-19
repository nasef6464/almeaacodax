import mongoose, { Schema } from "mongoose";

const publicBarcodeSubmissionGuardSchema = new Schema(
  {
    key: { type: String, required: true, unique: true, index: true },
    count: { type: Number, required: true, default: 0, min: 0 },
  },
  { timestamps: true },
);

/**
 * Serializes bounded public-test submission counters without placing a new
 * uniqueness constraint on historical submission rows. The key is either a
 * test-wide submission bucket or a test + participant identity bucket.
 */
export const PublicBarcodeSubmissionGuardModel = mongoose.model(
  "PublicBarcodeSubmissionGuard",
  publicBarcodeSubmissionGuardSchema,
);
