import mongoose, { Schema } from "mongoose";

const discussionReplySchema = new Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    threadId: { type: String, required: true, index: true },
    authorId: { type: String, required: true, index: true },
    body: { type: String, required: true, trim: true },
    upvotes: { type: [String], default: [] },
    isInstructorReply: { type: Boolean, default: false },
    isAcceptedAnswer: { type: Boolean, default: false },
    createdAt: { type: Number, default: () => Date.now(), index: true },
  },
  { timestamps: true },
);

discussionReplySchema.index({ threadId: 1, createdAt: 1 });

export const DiscussionReplyModel = mongoose.model("DiscussionReply", discussionReplySchema);

