import mongoose, { Schema } from "mongoose";

const questionSchema = new Schema(
  {
    text: { type: String, required: true, trim: true },
    options: { type: [String], default: [] },
    correctOptionIndex: { type: Number, default: 0 },
    explanation: { type: String, default: "" },
    videoUrl: { type: String, default: "" },
    imageUrl: { type: String, default: "" },
    skillIds: { type: [String], default: [] },
    pathId: { type: String, default: null },
    subject: { type: String, required: true, index: true },
    sectionId: { type: String, default: null },
    difficulty: { type: String, enum: ["Easy", "Medium", "Hard"], default: "Medium" },
    type: { type: String, enum: ["mcq", "true_false", "essay"], default: "mcq" },
  },
  {
    timestamps: true,
  },
);

export const QuestionModel = mongoose.model("Question", questionSchema);
