import mongoose, { Schema } from "mongoose";

const classroomAnswerSchema = new Schema(
  {
    sessionId: { type: String, required: true, index: true },
    questionId: { type: String, required: true, index: true },
    studentId: { type: String, required: true, index: true },
    selectedOptionIndex: { type: Number, default: -1 },
    isCorrect: { type: Boolean, default: false, index: true },
    timeTakenMs: { type: Number, default: 0 },
    answeredAt: { type: Date, default: Date.now },
  },
  {
    timestamps: false,
  },
);

// One answer per student per question per session. Upserts hit this index,
// so a double-submit (flaky tablet wifi, double tap) can never create a
// duplicate row — mirrors the pattern used by AssessmentResponseModel.
classroomAnswerSchema.index({ sessionId: 1, studentId: 1, questionId: 1 }, { unique: true });
classroomAnswerSchema.index({ sessionId: 1, questionId: 1 });

export const ClassroomAnswerModel = mongoose.model("ClassroomAnswer", classroomAnswerSchema);
