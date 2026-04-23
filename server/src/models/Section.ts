import mongoose, { Schema } from "mongoose";

const sectionSchema = new Schema(
  {
    _id: { type: String, required: true },
    subjectId: { type: String, required: true, index: true },
    name: { type: String, required: true, trim: true },
  },
  {
    timestamps: true,
  },
);

export const SectionModel = mongoose.model("Section", sectionSchema);
