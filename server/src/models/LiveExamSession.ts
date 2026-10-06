import mongoose, { Schema } from "mongoose";

const liveExamSessionSchema = new Schema(
  {
    studentId: { type: String, required: true, index: true },
    studentName: { type: String, required: true },
    quizId: { type: String, required: true, index: true },
    assessmentAttemptId: { type: String, index: true, default: undefined },
    quizTitle: { type: String, required: true },
    startTime: { type: Date, required: true, default: Date.now },
    totalQuestions: { type: Number, required: true, default: 0 },
    answeredQuestions: { type: Number, required: true, default: 0 },
    progress: { type: Number, required: true, default: 0 }, // percentage 0-100
    status: {
      type: String,
      enum: ["active", "completed"],
      default: "active",
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Auto-delete active sessions after 24 hours to prevent stuck sessions.
liveExamSessionSchema.index({ updatedAt: 1 }, { expireAfterSeconds: 86400 });

export const LiveExamSessionModel = mongoose.model("LiveExamSession", liveExamSessionSchema);
