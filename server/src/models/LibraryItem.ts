import mongoose, { Schema } from "mongoose";

const libraryItemSchema = new Schema(
  {
    id: { type: String, index: true, sparse: true },
    title: { type: String, required: true, trim: true },
    size: { type: String, default: "" },
    downloads: { type: Number, default: 0 },
    type: { type: String, enum: ["pdf", "doc", "video"], default: "pdf" },
    pathId: { type: String, required: true, index: true },
    subjectId: { type: String, required: true, index: true },
    sectionId: { type: String, default: null, index: true },
    skillIds: { type: [String], default: [] },
    url: { type: String, default: "" },
  },
  {
    timestamps: true,
  },
);

export const LibraryItemModel = mongoose.model("LibraryItem", libraryItemSchema);
