import mongoose, { Schema } from "mongoose";
const classroomResponseSchema = new Schema({ sessionId: { type: String, required: true, index: true }, questionId: { type: String, required: true }, studentId: { type: String, required: true, index: true }, selectedOptionIndex: { type: Number, required: true }, isCorrect: { type: Boolean, required: true }, submittedAt: { type: Date, default: Date.now } }, { timestamps: true });
classroomResponseSchema.index({ sessionId: 1, questionId: 1, studentId: 1 }, { unique: true });
export const ClassroomResponseModel = mongoose.model("ClassroomResponse", classroomResponseSchema);
