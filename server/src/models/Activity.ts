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
      enum: ["pending", "confirmed", "cancelled"],
      default: "pending",
      index: true,
    },
    assignedTeacherName: { type: String, default: "", trim: true },
    adminNotes: { type: String, default: "", trim: true },
  },
  {
    timestamps: true,
  },
);

activitySchema.index({ type: 1, bookingStatus: 1, createdAt: -1 });

export const ActivityModel = mongoose.model("Activity", activitySchema);
