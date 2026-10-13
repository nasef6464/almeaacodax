import mongoose, { Schema } from 'mongoose';
const schema = new Schema({
  sourceKey: { type: String, required: true, unique: true },
  source: { type: Schema.Types.Mixed, required: true },
  audience: { type: Schema.Types.Mixed, required: true },
  title: { type: String, required: true },
  teacherId: { type: String, required: true, index: true }, teacherName: { type: String, default: '' },
  provider: { type: String, enum: ['zoom','google_meet','teams','live_youtube'], required: true },
  hostingMode: { type: String, enum: ['teacher_account','platform_account','manual_link'], default: 'manual_link' },
  hostId: { type: String, default: '' },
  meetingUrl: { type: String, default: '' }, recordingUrl: { type: String, default: '' },
  showRecording: { type: Boolean, default: false },
  pathId: { type: String, default: '' }, levelId: { type: String, default: '' }, subjectId: { type: String, default: '' },
  meetingReadiness: { type: String, enum: ['manual_ready','awaiting_connection','creating','ready','failed'], default: 'awaiting_connection' },
  startAt: { type: Date, required: true, index: true }, endAt: { type: Date, required: true }, timeZone: { type: String, default: 'Asia/Riyadh' },
  state: { type: String, enum: ['confirmed','cancelled','completed'], default: 'confirmed' },
  hostCapacityVerified: { type: Boolean, default: false },
  changes: { type: [Schema.Types.Mixed], default: [] }, createdBy: { type: String, required: true },
}, { timestamps: true });
schema.index({ teacherId: 1, startAt: 1, state: 1 });
export const LiveSessionModel = mongoose.model('LiveSession', schema);
