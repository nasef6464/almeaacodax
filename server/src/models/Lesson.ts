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
    meetingUrl: { type: String, default: "" },
    meetingDate: { type: String, default: "" },
    recordingUrl: { type: String, default: "" },
    joinInstructions: { type: String, default: "" },
    showRecordingOnPlatform: { type: Boolean, default: false },
    showOnPlatform: { type: Boolean, default: true },
    quizId: { type: String, default: null },
    order: { type: Number, default: 0 },
    isLocked: { type: Boolean, default: false },
    skillIds: { type: [String], default: [] },
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

export const LessonModel = mongoose.model("Lesson", lessonSchema);
