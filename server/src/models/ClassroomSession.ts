import mongoose, { Schema } from "mongoose";

const questionSnapshotSchema = new Schema({ questionId: String, text: String, imageUrl: String, options: [String], type: String, correctOptionIndex: Number, skillIds: [String] }, { _id: false });
const classroomSessionSchema = new Schema({
  schoolId: { type: String, required: true, index: true }, classId: { type: String, required: true, index: true }, teacherId: { type: String, required: true, index: true },
  status: { type: String, enum: ["draft", "live", "ended"], default: "draft", index: true }, questionSnapshots: { type: [questionSnapshotSchema], default: [] },
  activeQuestionIndex: { type: Number, default: null }, pinHash: { type: String, required: true, index: true }, pinExpiresAt: { type: Date, required: true, index: true }, endedAt: { type: Date, default: null }, reportSnapshot: { type: Schema.Types.Mixed, default: null },
}, { timestamps: true });
classroomSessionSchema.index({ schoolId: 1, classId: 1, status: 1, createdAt: -1 });
export const ClassroomSessionModel = mongoose.model("ClassroomSession", classroomSessionSchema);
