import mongoose, { Schema } from "mongoose";

const lessonProgressSchema = new Schema(
  {
    userId: { type: String, required: true, index: true },
    lessonId: { type: String, required: true, index: true },
    courseId: { type: String, default: "", index: true },
    completed: { type: Boolean, default: false, index: true },
    completedAt: { type: Date, default: undefined },
    positionSeconds: { type: Number, min: 0, default: 0 },
    answeredQuestionIds: { type: [String], default: [] },
    sourceUpdatedAt: { type: Number, default: 0 },
  },
  { timestamps: true },
);

lessonProgressSchema.index({ userId: 1, lessonId: 1 }, { unique: true });
lessonProgressSchema.index({ userId: 1, courseId: 1, completed: 1 });
lessonProgressSchema.index({ userId: 1, updatedAt: -1 });

export const LessonProgressModel = mongoose.model("LessonProgress", lessonProgressSchema);
