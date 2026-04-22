import mongoose, { Schema } from "mongoose";

const pathSchema = new Schema(
  {
    _id: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    color: { type: String, default: "indigo" },
    icon: { type: String, default: "" },
    iconUrl: { type: String, default: "" },
    iconStyle: {
      type: String,
      enum: ["default", "modern", "minimal", "playful"],
      default: "default",
    },
    showInNavbar: { type: Boolean, default: true },
    showInHome: { type: Boolean, default: true },
    isActive: { type: Boolean, default: true },
    parentPathId: { type: String, default: null },
    description: { type: String, default: "" },
  },
  {
    timestamps: true,
  },
);

export const PathModel = mongoose.model("Path", pathSchema);
