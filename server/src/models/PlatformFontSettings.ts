import mongoose, { Schema } from "mongoose";

const platformFontUploadSchema = new Schema(
  {
    name: { type: String, default: "" },
    dataUrl: { type: String, default: "" },
    fileName: { type: String, default: "" },
    mimeType: { type: String, default: "" },
    size: { type: Number, default: 0 },
  },
  { _id: false },
);

const platformFontSettingsSchema = new Schema(
  {
    key: { type: String, required: true, unique: true, default: "default" },
    bodyFont: {
      type: String,
      enum: ["tajawal", "cairo", "ibm-plex-sans-arabic", "noto-kufi-arabic", "system", "custom"],
      default: "tajawal",
    },
    headingFont: {
      type: String,
      enum: ["tajawal", "cairo", "ibm-plex-sans-arabic", "noto-kufi-arabic", "system", "custom"],
      default: "tajawal",
    },
    bodyCustomFont: { type: platformFontUploadSchema, default: () => ({}) },
    headingCustomFont: { type: platformFontUploadSchema, default: () => ({}) },
  },
  {
    timestamps: true,
  },
);

platformFontSettingsSchema.set("toJSON", {
  transform: (_doc, ret) => {
    const safeRet = ret as Record<string, unknown>;
    delete safeRet.__v;
    return safeRet;
  },
});

export const PlatformFontSettingsModel = mongoose.model("PlatformFontSettings", platformFontSettingsSchema);
