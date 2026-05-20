import mongoose, { Schema } from "mongoose";

const discussionThreadSchema = new Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    entityType: { type: String, enum: ["lesson", "quiz", "course"], required: true, index: true },
    entityId: { type: String, required: true, index: true },
    authorId: { type: String, required: true, index: true },
    title: { type: String, required: true, trim: true },
    body: { type: String, required: true, trim: true },
    upvotes: { type: [String], default: [] },
    isPinned: { type: Boolean, default: false },
    isResolved: { type: Boolean, default: false, index: true },
    repliesCount: { type: Number, default: 0 },
    createdAt: { type: Number, default: () => Date.now(), index: true },
    updatedAt: { type: Number, default: () => Date.now() },
  },
  { timestamps: true },
);

discussionThreadSchema.index({ entityType: 1, entityId: 1, createdAt: -1 });

export const DiscussionThreadModel = mongoose.model("DiscussionThread", discussionThreadSchema);

