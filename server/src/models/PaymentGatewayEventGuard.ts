import mongoose, { Schema } from "mongoose";

const paymentGatewayEventGuardSchema = new Schema(
  {
    key: { type: String, required: true, unique: true, index: true },
    paymentRequestId: { type: String, required: true, index: true },
    provider: { type: String, required: true, index: true },
    eventId: { type: String, required: true },
    transactionId: { type: String, default: "" },
  },
  { timestamps: true },
);

paymentGatewayEventGuardSchema.index({ provider: 1, eventId: 1 }, { unique: true });

export const PaymentGatewayEventGuardModel = mongoose.model(
  "PaymentGatewayEventGuard",
  paymentGatewayEventGuardSchema,
);
