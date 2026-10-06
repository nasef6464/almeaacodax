import mongoose, { Schema } from "mongoose";

/**
 * Latest saved response per question. The unique index makes draft writes
 * idempotent without storing client-only progress in LiveExamSession.
 */
const assessmentResponseSchema = new Schema(
  {
    attemptId: { type: String, required: true, index: true, trim: true },
    studentId: { type: String, required: true, index: true, trim: true },
    questionId: { type: String, required: true, trim: true },
    sectionId: { type: String, default: "", trim: true },
    answer: { type: Schema.Types.Mixed, required: true },
    savedAt: { type: Date, required: true, default: Date.now },
  },
  { timestamps: true },
);

assessmentResponseSchema.index({ attemptId: 1, questionId: 1 }, { unique: true });
assessmentResponseSchema.index({ attemptId: 1, sectionId: 1, savedAt: -1 });

export const AssessmentResponseModel = mongoose.model(
  "AssessmentResponse",
  assessmentResponseSchema,
);
