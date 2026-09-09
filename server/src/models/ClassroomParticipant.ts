import mongoose, { Schema } from "mongoose";
const classroomParticipantSchema = new Schema({ sessionId: { type: String, required: true, index: true }, studentId: { type: String, required: true, index: true }, joinedAt: { type: Date, default: Date.now } }, { timestamps: true });
classroomParticipantSchema.index({ sessionId: 1, studentId: 1 }, { unique: true });
export const ClassroomParticipantModel = mongoose.model("ClassroomParticipant", classroomParticipantSchema);
