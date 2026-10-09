import mongoose, { Schema } from "mongoose";
import { DB_GROWTH_BUDGETS, assertDocumentGrowthBudget } from "../modules/database/dbGrowthBudgets.js";

const questionSnapshotSchema = new Schema(
  {
    questionId: { type: String, required: true },
    text: { type: String, required: true },
    imageUrl: { type: String, default: "" },
    options: { type: [String], default: [] },
    type: { type: String, default: "mcq" },
    correctOptionIndex: { type: Number, required: true },
    skillIds: { type: [String], default: [] },
    explanation: { type: String, default: "" },
    subject: { type: String, default: "" },
    sectionId: { type: String, default: "" },
    pathId: { type: String, default: "" },
    difficulty: { type: String, default: "Medium" },
  },
  { _id: false },
);

const questionBatchSchema = new Schema(
  {
    batchId: { type: String, required: true },
    label: { type: String, default: "" },
    questionIds: { type: [String], default: [] },
    challengeQuestionIds: { type: [String], default: [] },
    competitionEnabled: { type: Boolean, default: false },
    challengeDurationSeconds: { type: Number, default: null, min: 10, max: 600 },
    timerStartedAt: { type: Date, default: null },
    timerEndsAt: { type: Date, default: null },
    startedAt: { type: Date, default: null },
    endedAt: { type: Date, default: null },
  },
  { _id: false },
);

const classroomSessionSchema = new Schema(
  {
    schoolId: { type: String, required: true, index: true },
    classId: { type: String, required: true, index: true },
    teacherId: { type: String, required: true, index: true },
    status: {
      type: String,
      enum: ["draft", "scheduled", "live", "ended", "archived"],
      default: "draft",
      index: true,
    },
    day: { type: String, default: "" },
    period: { type: Number, default: null },
    subjectName: { type: String, default: "" },
    className: { type: String, default: "" },
    publishedMode: { type: String, enum: ["single", "batch"], default: "single" },
    publishedQuestionIds: { type: [String], default: [], validate: { validator: (value: string[]) => value.length <= DB_GROWTH_BUDGETS.classroomSessionQuestions, message: "publishedQuestionIds exceeds growth budget" } },
    sentQuestionIds: { type: [String], default: undefined, validate: { validator: (value?: string[]) => !value || value.length <= DB_GROWTH_BUDGETS.classroomSessionQuestions, message: "sentQuestionIds exceeds growth budget" } },
    sentHistoryComplete: { type: Boolean, default: false },
    questionSnapshots: { type: [questionSnapshotSchema], default: [], validate: { validator: (value: unknown[]) => value.length <= DB_GROWTH_BUDGETS.classroomSessionQuestions, message: "questionSnapshots exceeds growth budget" } },
    questionBatches: { type: [questionBatchSchema], default: [], validate: { validator: (value: unknown[]) => value.length <= DB_GROWTH_BUDGETS.classroomSessionBatches, message: "questionBatches exceeds growth budget" } },
    activeBatchId: { type: String, default: "" },
    activeQuestionIndex: { type: Number, default: null },
    pinHash: { type: String, required: true, index: true },
    pinExpiresAt: { type: Date, required: true, index: true },
    startedAt: { type: Date, default: null },
    endedAt: { type: Date, default: null },
    reportSnapshot: { type: Schema.Types.Mixed, default: null },
  },
  {
    timestamps: true,
    autoIndex: process.env.NODE_ENV !== "production",
  },
);

classroomSessionSchema.pre("validate", function enforceClassroomGrowthBudget() {
  assertDocumentGrowthBudget("ClassroomSession", this.toObject({ depopulate: true, versionKey: false }), DB_GROWTH_BUDGETS.classroomSessionDocumentBytes);
});

classroomSessionSchema.index({ schoolId: 1, classId: 1, status: 1, createdAt: -1 });
classroomSessionSchema.index(
  { schoolId: 1, classId: 1 },
  {
    unique: true,
    partialFilterExpression: { status: "live" },
  }
);
export const ClassroomSessionModel = mongoose.model("ClassroomSession", classroomSessionSchema);
