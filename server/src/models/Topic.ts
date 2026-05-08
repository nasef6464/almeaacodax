import mongoose, { Schema } from "mongoose";

const topicSchema = new Schema(
  {
    id: { type: String, index: true, sparse: true },
    pathId: { type: String, required: true, index: true },
    subjectId: { type: String, required: true, index: true },
    sectionId: { type: String, default: null, index: true },
    title: { type: String, required: true, trim: true },
    parentId: { type: String, default: null, index: true },
    order: { type: Number, default: 0 },
    showOnPlatform: { type: Boolean, default: true },
    isLocked: { type: Boolean, default: false },
    lessonIds: { type: [String], default: [] },
    quizIds: { type: [String], default: [] },
    libraryItemIds: { type: [String], default: [] },
  },
  {
    timestamps: true,
  },
);

export const TopicModel = mongoose.model("Topic", topicSchema);
