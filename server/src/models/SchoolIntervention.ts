import mongoose, { Schema } from "mongoose";

const evidenceSchema = new Schema({ evidenceCount: Number, correct: Number, accuracy: Number, measuredAt: Date }, { _id: false });

/** Links an existing learning action to its school evidence; it never copies a quiz/path engine. */
const schoolInterventionSchema = new Schema({
  schoolId: { type: String, required: true, index: true },
  classId: { type: String, default: "", index: true },
  skillId: { type: String, required: true, index: true },
  targetStudentIds: { type: [String], required: true },
  actionType: { type: String, enum: ["study_plan"], required: true },
  actionRef: { type: String, required: true },
  status: { type: String, enum: ["active", "completed", "cancelled"], default: "active", index: true },
  assignedBy: { type: String, required: true, index: true },
  followUpAt: { type: Date, default: null },
  remediationThreshold: { type: Number, min: 0, max: 100, default: undefined },
  minimumEvidence: { type: Number, min: 1, default: undefined },
  baseline: { type: evidenceSchema, required: true },
  outcomeSnapshot: { type: evidenceSchema, default: null },
}, { timestamps: true });

schoolInterventionSchema.index({ schoolId: 1, classId: 1, status: 1, createdAt: -1 });
schoolInterventionSchema.index({ targetStudentIds: 1, status: 1, createdAt: -1 });

export const SchoolInterventionModel = mongoose.model("SchoolIntervention", schoolInterventionSchema);
