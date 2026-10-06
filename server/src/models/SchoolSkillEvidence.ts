import mongoose, { Schema } from "mongoose";

const schoolSkillEvidenceSchema = new Schema(
  {
    evidenceKey: { type: String, required: true, unique: true, index: true },
    resultId: { type: String, required: true },
    schoolId: { type: String, required: true },
    classId: { type: String, default: "" },
    userId: { type: String, required: true },
    pathId: { type: String, required: true },
    subjectId: { type: String, required: true },
    sectionId: { type: String, default: "" },
    skillId: { type: String, required: true },
    skill: { type: String, default: "" },
    questionCount: { type: Number, min: 1, default: 1 },
    correctCount: { type: Number, min: 0, default: 0 },
    source: { type: String, default: "" },
    occurredAt: { type: Date, required: true, default: Date.now },
  },
  { timestamps: true },
);

schoolSkillEvidenceSchema.index({
  schoolId: 1,
  classId: 1,
  userId: 1,
  pathId: 1,
  subjectId: 1,
  skillId: 1,
  occurredAt: -1,
});

export const SchoolSkillEvidenceModel = mongoose.model("SchoolSkillEvidence", schoolSkillEvidenceSchema);
