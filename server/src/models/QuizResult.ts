import mongoose, { Schema } from "mongoose";

const quizResultSchema = new Schema(
  {
    userId: { type: String, required: true, index: true },
    quizId: { type: String, required: true, index: true },
    quizTitle: { type: String, required: true, trim: true },
    score: { type: Number, default: 0 },
    totalQuestions: { type: Number, default: 0 },
    correctAnswers: { type: Number, default: 0 },
    wrongAnswers: { type: Number, default: 0 },
    unanswered: { type: Number, default: 0 },
    timeSpent: { type: String, default: "" },
    date: { type: String, default: "" },
    skillsAnalysis: { type: [Schema.Types.Mixed], default: [] },
  },
  {
    timestamps: true,
  },
);

export const QuizResultModel = mongoose.model("QuizResult", quizResultSchema);
