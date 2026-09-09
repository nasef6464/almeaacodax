import mongoose, { Schema } from "mongoose";

const classroomReportSchema = new Schema(
  {
    sessionId: { type: String, required: true, unique: true, index: true },
    totalStudents: { type: Number, default: 0 },
    respondedStudents: { type: Number, default: 0 },
    totalQuestions: { type: Number, default: 0 },
    classAccuracy: { type: Number, default: 0 }, // 0-100

    weakSkills: {
      type: [
        {
          skillId: String,
          skill: String,
          accuracy: Number,
          attempts: Number,
        },
      ],
      default: [],
    },
    strongSkills: {
      type: [
        {
          skillId: String,
          skill: String,
          accuracy: Number,
          attempts: Number,
        },
      ],
      default: [],
    },

    perStudent: {
      type: [
        {
          studentId: String,
          name: String,
          answered: Number,
          correct: Number,
          accuracy: Number,
          avgTimeMs: Number,
          needsSupport: Boolean, // accuracy < 50% flag for the teacher
        },
      ],
      default: [],
    },
  },
  {
    timestamps: true,
  },
);

export const ClassroomReportModel = mongoose.model("ClassroomReport", classroomReportSchema);
