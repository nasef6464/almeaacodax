import mongoose, { Schema } from "mongoose";

const libraryItemSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    size: { type: String, default: "" },
    downloads: { type: Number, default: 0 },
    type: { type: String, enum: ["pdf", "doc", "video"], default: "pdf" },
    subjectId: { type: String, required: true, index: true },
    url: { type: String, default: "" },
  },
  {
    timestamps: true,
  },
);

export const LibraryItemModel = mongoose.model("LibraryItem", libraryItemSchema);
