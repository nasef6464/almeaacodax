import mongoose, { Schema } from "mongoose";
import { createHash } from 'node:crypto';

export const quizRetakeId = (quizId: string, studentId: string) => createHash('sha256').update(JSON.stringify([quizId, studentId])).digest('hex');

const schema = new Schema({
  _id: { type: String, required: true },
  quizId: { type: String, required: true },
  studentId: { type: String, required: true },
  maxAttempts: { type: Number, required: true, min: 1 },
  opensAt: { type: String, required: true },
  closesAt: { type: String, required: true },
  grantedBy: { type: String, required: true },
}, { timestamps: true });
// The deterministic built-in _id is the indexed quiz/student identity.
export const QuizRetakeModel = mongoose.model("QuizRetake", schema);
