import mongoose, { Schema } from "mongoose";

const activitySchema = new Schema(
  {
    userId: { type: String, required: true, index: true },
    type: {
      type: String,
      enum: ["course_view", "lesson_complete", "quiz_complete", "skill_practice", "session_booked"],
      required: true,
    },
    title: { type: String, required: true, trim: true },
    date: { type: String, required: true },
    link: { type: String, default: "" },
    targetLabel: { type: String, default: "", trim: true },
    scheduledDate: { type: String, default: "", trim: true },
    scheduledTime: { type: String, default: "", trim: true },
    notes: { type: String, default: "", trim: true },
    bookingStatus: {
      type: String,
      enum: ["pending", "confirmed", "rejected", "cancelled"],
      default: "pending",
      index: true,
    },
    assignedTeacherName: { type: String, default: "", trim: true },
    teacherId: { type: String, default: "", index: true },
    sessionId: { type: String, default: "" },
    requestKey: { type: String },
    pathId: { type: String, default: "" },
    stageId: { type: String, default: "" },
    subjectId: { type: String, default: "" },
    sectionId: { type: String, default: "" },
    skillIds: { type: [String], default: [] },
    courseId: { type: String, default: "" },
    adminNotes: { type: String, default: "", trim: true },
  },
  {
    timestamps: true,
  },
);

activitySchema.index({ type: 1, bookingStatus: 1, createdAt: -1 });
activitySchema.index({ userId: 1, requestKey: 1 }, { unique: true, partialFilterExpression: { type: "session_booked", requestKey: { $type: "string" } } });

export const ActivityModel = mongoose.model("Activity", activitySchema);
