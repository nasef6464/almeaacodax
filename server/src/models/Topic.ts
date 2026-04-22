import mongoose, { Schema } from "mongoose";

const topicSchema = new Schema(
  {
    subjectId: { type: String, required: true, index: true },
    title: { type: String, required: true, trim: true },
    parentId: { type: String, default: null, index: true },
    order: { type: Number, default: 0 },
    lessonIds: { type: [String], default: [] },
    quizIds: { type: [String], default: [] },
  },
  {
    timestamps: true,
  },
);

export const TopicModel = mongoose.model("Topic", topicSchema);
