import mongoose, { Schema } from "mongoose";

const questionAttemptSchema = new Schema(
  {
    userId: { type: String, required: true, index: true },
    questionId: { type: String, required: true, index: true },
    // Present only for finalized quiz answers; legacy/practice attempts remain untouched.
    quizResultId: { type: String, default: undefined },
    selectedOptionIndex: { type: Number, default: -1 },
    isCorrect: { type: Boolean, default: false, index: true },
    timeSpentSeconds: { type: Number, default: 0 },
    date: { type: String, default: "" },
    pathId: { type: String, default: "", index: true },
    subjectId: { type: String, default: "", index: true },
    sectionId: { type: String, default: "", index: true },
    skillIds: { type: [String], default: [], index: true },
    evidenceType: { type: String, enum: ["assessment", "remediation", "recheck", "mastery_review"], default: "assessment" },
  },
  {
    timestamps: true,
  },
);

questionAttemptSchema.index({ userId: 1, questionId: 1, createdAt: -1 });
// One finalized evidence row per question/result. Excludes existing legacy attempts.
questionAttemptSchema.index(
  { userId: 1, quizResultId: 1, questionId: 1 },
  { unique: true, partialFilterExpression: { quizResultId: { $type: "string" } } },
);
questionAttemptSchema.index({ userId: 1, createdAt: -1 });
questionAttemptSchema.index({ userId: 1, skillIds: 1, createdAt: -1 });
questionAttemptSchema.index({ pathId: 1, subjectId: 1, sectionId: 1, createdAt: -1 });
questionAttemptSchema.index({ skillIds: 1, isCorrect: 1 });

export const QuestionAttemptModel = mongoose.model("QuestionAttempt", questionAttemptSchema);
