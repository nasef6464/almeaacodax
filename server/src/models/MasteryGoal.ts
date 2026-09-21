import mongoose, { Schema } from "mongoose";

const masteryGoalSchema = new Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    userId: { type: String, required: true, index: true },
    createdByUserId: { type: String, required: true },
    createdByRole: { type: String, default: "student" },
    pathId: { type: String, required: true, index: true },
    subjectId: { type: String, default: "", index: true },
    targetType: { type: String, enum: ["topic", "section", "path"], required: true },
    targetId: { type: String, required: true },
    title: { type: String, required: true, trim: true },
    targetMastery: { type: Number, default: 90, min: 0, max: 100 },
    horizon: { type: String, enum: ["short", "long"], default: "short", index: true },
    dueDate: { type: String, default: "" },
    status: { type: String, enum: ["active", "achieved", "archived"], default: "active", index: true },
  },
  { timestamps: true },
);

masteryGoalSchema.index({ userId: 1, pathId: 1, status: 1, dueDate: 1 });
masteryGoalSchema.index({ userId: 1, targetType: 1, targetId: 1, status: 1 });

export const MasteryGoalModel = mongoose.model("MasteryGoal", masteryGoalSchema);
