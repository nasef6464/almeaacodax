import mongoose, { Schema } from "mongoose";

/**
 * Server-owned attempt lifecycle. Legacy QuizResult remains the production
 * submission record until a later, explicitly verified dual-write batch.
 */
const assessmentAttemptSchema = new Schema(
  {
    assignmentId: { type: String, required: true, index: true, trim: true },
    assessmentVersionId: { type: String, required: true, index: true, trim: true },
    studentId: { type: String, required: true, index: true, trim: true },
    attemptNumber: { type: Number, required: true, min: 1 },
    status: {
      type: String,
      enum: ["in_progress", "submitted", "expired", "abandoned"],
      required: true,
      default: "in_progress",
      index: true,
    },
    startedAt: { type: Date, required: true, default: Date.now },
    expiresAt: { type: Date, default: undefined },
    submittedAt: { type: Date, default: undefined },
    submissionKey: { type: String, default: undefined, unique: true, sparse: true, index: true },
  },
  { timestamps: true },
);

assessmentAttemptSchema.index(
  { assignmentId: 1, studentId: 1, attemptNumber: 1 },
  { unique: true },
);
assessmentAttemptSchema.index({ studentId: 1, status: 1, updatedAt: -1 });
assessmentAttemptSchema.index({ assignmentId: 1, status: 1, startedAt: -1 });

export const AssessmentAttemptModel = mongoose.model(
  "AssessmentAttempt",
  assessmentAttemptSchema,
);
