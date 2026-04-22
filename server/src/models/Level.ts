import mongoose, { Schema } from "mongoose";

const levelSchema = new Schema(
  {
    _id: { type: String, required: true },
    pathId: { type: String, required: true, index: true },
    name: { type: String, required: true, trim: true },
  },
  {
    timestamps: true,
  },
);

export const LevelModel = mongoose.model("Level", levelSchema);
