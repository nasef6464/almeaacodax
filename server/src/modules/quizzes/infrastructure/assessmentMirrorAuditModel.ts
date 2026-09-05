import mongoose, { Schema } from "mongoose";

/**
 * Operational evidence for the additive post-submission mirror. It is not a
 * learner-facing result and does not participate in scoring or access rules.
 */
const assessmentMirrorAuditSchema = new Schema(
  {
    legacyQuizResultId: { type: String, required: true, unique: true, index: true, trim: true },
    assessmentId: { type: String, required: true, index: true, trim: true },
    submissionKey: { type: String, default: "", trim: true },
    status: { type: String, enum: ["completed", "failed"], required: true, index: true },
    failureCode: { type: String, default: "", trim: true },
    failureMessage: { type: String, default: "", trim: true },
    completedAt: { type: Date, default: undefined },
    failedAt: { type: Date, default: undefined },
  },
  { timestamps: true },
);

assessmentMirrorAuditSchema.index({ status: 1, updatedAt: 1 });
assessmentMirrorAuditSchema.index({ assessmentId: 1, status: 1, updatedAt: -1 });

export const AssessmentMirrorAuditModel = mongoose.model(
  "AssessmentMirrorAudit",
  assessmentMirrorAuditSchema,
);
