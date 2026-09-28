import mongoose, { Schema } from "mongoose";
import { DB_GROWTH_BUDGETS } from "../modules/database/dbGrowthBudgets.js";

const lessonProgressSchema = new Schema(
  {
    userId: { type: String, required: true, index: true },
    lessonId: { type: String, required: true, index: true },
    courseId: { type: String, default: "", index: true },
    completed: { type: Boolean, default: false, index: true },
    completedAt: { type: Date, default: undefined },
    positionSeconds: { type: Number, min: 0, default: 0 },
    answeredQuestionIds: {
      type: [String],
      default: [],
      validate: { validator: (value: string[]) => value.length <= DB_GROWTH_BUDGETS.answeredQuestionIdsPerLesson, message: "LessonProgress answeredQuestionIds exceeds growth budget" },
    },
    sourceUpdatedAt: { type: Number, default: 0 },
  },
  { timestamps: true },
);

lessonProgressSchema.index({ userId: 1, lessonId: 1 }, { unique: true, name: "user_lesson_unique" });
lessonProgressSchema.index({ userId: 1, courseId: 1, completed: 1 }, { name: "user_course_completed" });
lessonProgressSchema.index({ userId: 1, updatedAt: -1 }, { name: "user_updated" });

export const LessonProgressModel = mongoose.model("LessonProgress", lessonProgressSchema);
