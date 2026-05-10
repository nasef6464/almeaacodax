import mongoose, { Schema } from "mongoose";

const paymentRequestSchema = new Schema(
  {
    id: { type: String, required: true, unique: true },
    userId: { type: String, required: true, index: true },
    userName: { type: String, default: "" },
    userEmail: { type: String, default: "" },
    itemType: { type: String, enum: ["course", "package", "skill", "test"], required: true },
    itemId: { type: String, required: true },
    itemName: { type: String, required: true },
    packageId: { type: String, default: "" },
    includedCourseIds: { type: [String], default: [] },
    amount: { type: Number, default: 0 },
    currency: { type: String, default: "SAR" },
    paymentMethod: { type: String, enum: ["card", "transfer", "wallet"], required: true },
    status: { type: String, enum: ["pending", "approved", "rejected", "cancelled"], default: "pending" },
    transferReference: { type: String, default: "" },
    walletNumber: { type: String, default: "" },
    receiptUrl: { type: String, default: "" },
    discountCode: { type: String, default: "" },
    notes: { type: String, default: "" },
    reviewedBy: { type: String, default: "" },
    reviewedAt: { type: Number, default: null },
    reviewerNotes: { type: String, default: "" },
  },
  {
    timestamps: true,
  },
);

paymentRequestSchema.set("toJSON", {
  transform: (_doc, ret) => {
    const safeRet = ret as Record<string, unknown>;
    delete safeRet.__v;
    return safeRet;
  },
});

export const PaymentRequestModel = mongoose.model("PaymentRequest", paymentRequestSchema);
