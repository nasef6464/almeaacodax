import mongoose, { Schema } from "mongoose";

const questionRevisionSchema = new Schema(
  {
    questionId: { type: String, required: true, index: true },
    revisionHash: { type: String, required: true, unique: true, index: true },
    snapshot: { type: Schema.Types.Mixed, required: true },
    sourceUpdatedAt: { type: Date, default: undefined },
  },
  { timestamps: true },
);

questionRevisionSchema.index({ questionId: 1, createdAt: -1 });

export const QuestionRevisionModel = mongoose.model("QuestionRevision", questionRevisionSchema);
