import mongoose, { Schema } from "mongoose";

const lessonSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    pathId: { type: String, default: null },
    subjectId: { type: String, default: null },
    sectionId: { type: String, default: null },
    type: {
      type: String,
      enum: ["video", "quiz", "file", "assignment", "text", "live_youtube", "zoom", "google_meet", "teams"],
      required: true,
    },
    duration: { type: String, default: "" },
    content: { type: String, default: "" },
    videoUrl: { type: String, default: "" },
    fileUrl: { type: String, default: "" },
    quizId: { type: String, default: null },
    order: { type: Number, default: 0 },
    isLocked: { type: Boolean, default: false },
    skillIds: { type: [String], default: [] },
  },
  {
    timestamps: true,
  },
);

export const LessonModel = mongoose.model("Lesson", lessonSchema);
