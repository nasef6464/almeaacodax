import mongoose, { Schema } from "mongoose";

const phoneOtpSchema = new Schema(
  {
    phone: { type: String, required: true, index: true },
    codeHash: { type: String, required: true },
    expiresAt: { type: Number, required: true, index: true },
    attempts: { type: Number, default: 0 },
    usedAt: { type: Number, default: null },
    channel: { type: String, enum: ["whatsapp"], default: "whatsapp" },
  },
  { timestamps: true },
);

phoneOtpSchema.index({ phone: 1, createdAt: -1 });
phoneOtpSchema.index({ expiresAt: 1 });

export const PhoneOtpModel = mongoose.model("PhoneOtp", phoneOtpSchema);
