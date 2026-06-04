import mongoose, { Schema } from "mongoose";

const publicBarcodeTestSchema = new Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    slug: { type: String, required: true, unique: true, index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    pathId: { type: String, required: true, index: true },
    subjectId: { type: String, required: true, index: true },
    sectionId: { type: String, default: "" },
    skillIds: { type: [String], default: [], index: true },
    questionIds: { type: [String], required: true, default: [] },
    status: { type: String, enum: ["draft", "active", "paused", "archived"], default: "draft", index: true },
    showResultToStudent: { type: Boolean, default: true },
    collectSchool: { type: Boolean, default: true },
    collectClassroom: { type: Boolean, default: true },
    startsAt: { type: Number, default: null },
    endsAt: { type: Number, default: null },
    maxSubmissions: { type: Number, default: null },
    createdBy: { type: String, required: true, index: true },
    ownerType: { type: String, enum: ["platform", "school", "teacher"], default: "platform" },
    ownerId: { type: String, default: "" },
  },
  {
    timestamps: true,
  },
);

publicBarcodeTestSchema.index({ status: 1, pathId: 1, subjectId: 1 });
publicBarcodeTestSchema.index({ createdBy: 1, createdAt: -1 });

export const PublicBarcodeTestModel = mongoose.model("PublicBarcodeTest", publicBarcodeTestSchema);
