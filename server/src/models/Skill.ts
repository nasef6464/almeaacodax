import mongoose, { Schema } from "mongoose";

const embeddedSubSkillSchema = new Schema(
  {
    id: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    code: { type: String, default: "" },
    description: { type: String, default: "" },
    order: { type: Number, default: 0 },
  },
  { _id: false },
);

const skillSchema = new Schema(
  {
    _id: { type: String, required: true },
    id: { type: String, default: undefined, index: true, sparse: true },
    pathId: { type: String, required: true, index: true },
    subjectId: { type: String, required: true, index: true },
    sectionId: { type: String, required: true, index: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    order: { type: Number, default: 0 },
    subSkills: { type: [embeddedSubSkillSchema], default: [] },
    lessonIds: { type: [String], default: [] },
    questionIds: { type: [String], default: [] },
  },
  {
    timestamps: true,
  },
);

skillSchema.index({ pathId: 1, subjectId: 1, sectionId: 1, createdAt: 1 });
skillSchema.index({ subjectId: 1, sectionId: 1, createdAt: 1 });

export const SkillModel = mongoose.model("Skill", skillSchema);
