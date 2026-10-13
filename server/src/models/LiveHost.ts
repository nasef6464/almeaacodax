import mongoose, { Schema } from 'mongoose';
const schema = new Schema({
  ownerId: { type: String, required: true, index: true }, ownerType: { type: String, enum: ['teacher','platform'], required: true },
  provider: { type: String, enum: ['zoom','google_meet','teams','live_youtube'], required: true },
  label: { type: String, required: true }, capacity: { type: Number, min: 1, max: 100, default: 1 },
  enabled: { type: Boolean, default: true }, connected: { type: Boolean, default: false },
}, { timestamps: true });
export const LiveHostModel = mongoose.model('LiveHost', schema);
