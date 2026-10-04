import mongoose, { Schema } from "mongoose";

const passageSourceMetaSchema = new Schema(
  {
    documentCode: { type: String, default: "", trim: true },
    documentTitle: { type: String, default: "", trim: true },
    sourceItemId: { type: String, default: "", trim: true },
    pdfPageIndex: { type: Number, default: null },
    printedPageNumber: { type: Number, default: null },
    importBatchId: { type: String, default: "", trim: true },
  },
  { _id: false },
);

const questionPassageSchema = new Schema(
  {
    id: { type: String, required: true, unique: true, index: true, trim: true },
    title: { type: String, default: "", trim: true },
    text: { type: String, required: true, trim: true },
    canonicalFingerprint: { type: String, required: true, unique: true, index: true, trim: true },
    pathId: { type: String, required: true, index: true },
    subjectId: { type: String, required: true, index: true },
    sourceMeta: { type: passageSourceMetaSchema, default: () => ({}) },
  },
  { timestamps: true },
);

questionPassageSchema.index({ pathId: 1, subjectId: 1, id: 1 });

export const QuestionPassageModel = mongoose.model("QuestionPassage", questionPassageSchema);
