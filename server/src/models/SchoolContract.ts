import mongoose, { Schema } from "mongoose";

export const schoolModules = [
  "SCHOOL_CORE", "QUESTION_BANK", "SCHOOL_ASSESSMENTS", "PATHS_AND_COURSES",
  "INTERACTIVE_VIDEO", "SMART_CLASSROOM", "SCHOOL_INTELLIGENCE", "INTERVENTION_CENTER",
  "LIVE_TUTORING", "WHITE_LABEL", "EXECUTIVE_ANALYTICS",
] as const;

const schoolContractSchema = new Schema(
  {
    schoolId: { type: String, required: true, unique: true, index: true },
    status: { type: String, enum: ["active", "inactive", "expired"], default: "active" },
    modules: { type: [{ type: String, enum: schoolModules }], default: ["SCHOOL_CORE"] },
    validFrom: { type: Date, default: null },
    validUntil: { type: Date, default: null },
  },
  { timestamps: true },
);

schoolContractSchema.index({ status: 1, validUntil: 1 });
export const SchoolContractModel = mongoose.model("SchoolContract", schoolContractSchema);
