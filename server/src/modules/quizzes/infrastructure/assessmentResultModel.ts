import mongoose, { Schema } from "mongoose";

/**
 * Finalized assessment read model. It is additive and intentionally has no
 * production reader until compatibility parity with QuizResult is verified.
 */
const assessmentResultSchema = new Schema(
  {
    attemptId: { type: String, required: true, unique: true, index: true, trim: true },
    assignmentId: { type: String, required: true, index: true, trim: true },
    assessmentVersionId: { type: String, required: true, index: true, trim: true },
    studentId: { type: String, required: true, index: true, trim: true },
    legacyQuizResultId: { type: String, default: undefined, unique: true, sparse: true, index: true },
    score: { type: Number, required: true, min: 0, max: 100 },
    totalQuestions: { type: Number, required: true, min: 0 },
    correctAnswers: { type: Number, required: true, min: 0 },
    wrongAnswers: { type: Number, required: true, min: 0 },
    unanswered: { type: Number, required: true, min: 0 },
    passed: { type: Boolean, required: true },
    sectionResults: { type: [Schema.Types.Mixed], required: true, default: [] },
    finalizedAt: { type: Date, required: true, default: Date.now },
  },
  { timestamps: true },
);

assessmentResultSchema.index({ studentId: 1, finalizedAt: -1 });
assessmentResultSchema.index({ assignmentId: 1, finalizedAt: -1 });
assessmentResultSchema.index({ assessmentVersionId: 1, finalizedAt: -1 });

export const AssessmentResultModel = mongoose.model(
  "AssessmentResult",
  assessmentResultSchema,
);
