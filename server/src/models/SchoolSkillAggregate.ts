import mongoose, { Schema } from "mongoose";

const schoolSkillAggregateSchema = new Schema(
  {
    schoolId: { type: String, required: true },
    classId: { type: String, default: "" },
    userId: { type: String, required: true },
    pathId: { type: String, required: true },
    subjectId: { type: String, required: true },
    sectionId: { type: String, default: "" },
    skillId: { type: String, required: true },
    skill: { type: String, default: "" },
    totalEvidence: { type: Number, min: 0, default: 0 },
    totalCorrect: { type: Number, min: 0, default: 0 },
    attemptCount: { type: Number, min: 0, default: 0 },
    mastery: { type: Number, min: 0, max: 100, default: 0 },
    recentMastery: { type: Number, min: 0, max: 100, default: 0 },
    trend: { type: String, enum: ["improving", "stable", "declining"], default: "stable" },
    confidence: { type: Number, min: 0, max: 100, default: 0 },
    lastEvidenceAt: { type: Date, default: undefined },
  },
  { timestamps: true },
);

schoolSkillAggregateSchema.index(
  { schoolId: 1, classId: 1, userId: 1, pathId: 1, subjectId: 1, skillId: 1 },
  { unique: true },
);
schoolSkillAggregateSchema.index({
  schoolId: 1,
  pathId: 1,
  subjectId: 1,
  classId: 1,
  skillId: 1,
  mastery: 1,
});

export const SchoolSkillAggregateModel = mongoose.model("SchoolSkillAggregate", schoolSkillAggregateSchema);
