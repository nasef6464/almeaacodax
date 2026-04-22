import mongoose, { Schema } from "mongoose";

const quizSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    pathId: { type: String, required: true, index: true },
    subjectId: { type: String, required: true, index: true },
    sectionId: { type: String, default: null },
    type: { type: String, enum: ["quiz", "bank"], default: "quiz" },
    settings: {
      showExplanations: { type: Boolean, default: true },
      showAnswers: { type: Boolean, default: true },
      maxAttempts: { type: Number, default: 3 },
      passingScore: { type: Number, default: 60 },
      timeLimit: { type: Number, default: 60 },
    },
    access: {
      type: {
        type: String,
        enum: ["free", "paid", "private", "course_only"],
        default: "free",
      },
      price: { type: Number, default: 0 },
      allowedGroupIds: { type: [String], default: [] },
    },
    questionIds: { type: [String], default: [] },
    skillIds: { type: [String], default: [] },
    isPublished: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  },
);

export const QuizModel = mongoose.model("Quiz", quizSchema);
