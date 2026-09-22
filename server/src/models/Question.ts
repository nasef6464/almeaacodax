import mongoose, { Schema } from "mongoose";

const questionMathExpressionSchema = new Schema(
  {
    latex: { type: String, default: "", trim: true },
    spokenArabic: { type: String, default: "", trim: true },
  },
  { _id: false },
);

const questionAiContextSchema = new Schema(
  {
    readableText: { type: String, default: "", trim: true },
    speechText: { type: String, default: "", trim: true },
    visualDescription: { type: String, default: "", trim: true },
    optionTexts: { type: [String], default: [] },
    mathExpressions: { type: [questionMathExpressionSchema], default: [] },
    concepts: { type: [String], default: [] },
    requiredData: { type: [String], default: [] },
    version: { type: Number, default: 1 },
  },
  { _id: false },
);

const questionVoiceExplanationSchema = new Schema(
  {
    text: { type: String, default: "", trim: true },
    audioUrl: { type: String, default: "", trim: true },
    audioMimeType: { type: String, default: "", trim: true },
    version: { type: Number, default: 1 },
  },
  { _id: false },
);

const questionSourceMetaSchema = new Schema(
  {
    documentCode: { type: String, default: "", trim: true },
    documentTitle: { type: String, default: "", trim: true },
    page: { type: Number, default: null },
    questionNumber: { type: String, default: "", trim: true },
    cropIndex: { type: Number, default: null },
    importBatchId: { type: String, default: "", trim: true },
    imageVersion: { type: Number, default: 1 },
    imageHash: { type: String, default: "", trim: true },
  },
  { _id: false },
);

const questionSchema = new Schema(
  {
    id: { type: String, index: true, sparse: true },
    questionCode: { type: String, unique: true, index: true, sparse: true, trim: true, uppercase: true },
    text: { type: String, default: "", trim: true },
    options: { type: [String], default: [] },
    correctOptionIndex: { type: Number, default: 0 },
    explanation: { type: String, default: "" },
    hint: { type: String, default: "" },
    solvingStrategy: { type: String, default: "" },
    videoUrl: { type: String, default: "" },
    imageUrl: { type: String, default: "" },
    imageAlt: { type: String, default: "" },
    optionsEmbeddedInImage: { type: Boolean, default: false },
    aiContext: { type: questionAiContextSchema, default: () => ({}) },
    voiceExplanation: { type: questionVoiceExplanationSchema, default: () => ({}) },
    sourceMeta: { type: questionSourceMetaSchema, default: () => ({}) },
    skillIds: { type: [String], default: [] },
    skillId: { type: String, default: null },
    subSkillId: { type: String, default: null },
    pathId: { type: String, default: null },
    subject: { type: String, required: true, index: true },
    subjectId: { type: String, default: null, index: true },
    sectionId: { type: String, default: null },
    examType: { type: String, enum: ["qudurat", "tahsili", "general"], default: "general", index: true },
    source: { type: String, enum: ["internal", "official_exam", "mock", "imported"], default: "internal", index: true },
    year: { type: Number, default: null, index: true },
    difficulty: { type: String, enum: ["Easy", "Medium", "Hard"], default: "Medium" },
    type: { type: String, enum: ["mcq", "true_false", "essay"], default: "mcq" },
    ownerType: { type: String, enum: ["platform", "teacher", "school"], default: "platform" },
    ownerId: { type: String, default: "" },
    createdBy: { type: String, default: "" },
    assignedTeacherId: { type: String, default: "" },
    approvalStatus: { type: String, enum: ["draft", "pending_review", "approved", "rejected"], default: "draft", index: true },
    approvedBy: { type: String, default: "" },
    approvedAt: { type: Number, default: null },
    reviewerNotes: { type: String, default: "" },
    revenueSharePercentage: { type: Number, default: null },
  },
  {
    timestamps: true,
  },
);

questionSchema.pre("validate", function assignStableQuestionIdentity(next) {
  const objectId = String(this._id || new mongoose.Types.ObjectId());
  if (!String(this.id || "").trim()) {
    this.id = `q_${objectId}`;
  }
  if (!String(this.questionCode || "").trim()) {
    this.questionCode = `Q-${objectId.slice(-10).toUpperCase()}`;
  }
  next();
});

questionSchema.index({ pathId: 1, subject: 1, sectionId: 1, approvalStatus: 1 });
questionSchema.index({ pathId: 1, subjectId: 1, sectionId: 1, approvalStatus: 1 }, { sparse: true });
questionSchema.index({ skillIds: 1, difficulty: 1 });
questionSchema.index({ ownerType: 1, ownerId: 1, approvalStatus: 1 });
questionSchema.index({ examType: 1, source: 1, year: -1, approvalStatus: 1 });
questionSchema.index({ "sourceMeta.documentCode": 1, "sourceMeta.page": 1, "sourceMeta.questionNumber": 1 });
questionSchema.index({ subject: 1, approvalStatus: 1, updatedAt: -1 });

export const QuestionModel = mongoose.model("Question", questionSchema);
