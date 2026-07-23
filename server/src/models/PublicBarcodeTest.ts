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
    testKind: { type: String, enum: ["quick", "mock"], default: "quick", index: true },
    audience: { type: String, enum: ["open", "targeted"], default: "open", index: true },
    targetGroupIds: { type: [String], default: [], index: true },
    targetUserIds: { type: [String], default: [], index: true },
    status: { type: String, enum: ["draft", "active", "paused", "archived"], default: "draft", index: true },
    showResultToStudent: { type: Boolean, default: true },
    collectSchool: { type: Boolean, default: true },
    collectClassroom: { type: Boolean, default: true },
    settings: {
      showExplanations: { type: Boolean, default: true },
      showAnswers: { type: Boolean, default: true },
      showResultsReport: { type: Boolean, default: true },
      maxAttempts: { type: Number, default: 1 },
      passingScore: { type: Number, default: 60 },
      timeLimit: { type: Number, default: 20 },
      randomizeQuestions: { type: Boolean, default: true },
      randomizeOptions: { type: Boolean, default: false },
      showProgressBar: { type: Boolean, default: true },
      requireAnswerBeforeNext: { type: Boolean, default: false },
      allowQuestionReview: { type: Boolean, default: true },
      optionLayout: { type: String, enum: ["auto", "horizontal", "two_columns"], default: "auto" },
    },
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
