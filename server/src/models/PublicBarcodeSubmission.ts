import mongoose, { Schema } from "mongoose";

const publicBarcodeSubmissionSchema = new Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    testId: { type: String, required: true, index: true },
    slug: { type: String, required: true, index: true },
    studentName: { type: String, required: true, trim: true },
    schoolName: { type: String, default: "", trim: true, index: true },
    classroomName: { type: String, default: "", trim: true, index: true },
    contact: { type: String, default: "", trim: true },
    answers: {
      type: [
        {
          questionId: { type: String, required: true },
          selectedOptionIndex: { type: Number, default: -1 },
          isCorrect: { type: Boolean, default: false },
          skillIds: { type: [String], default: [] },
        },
      ],
      default: [],
    },
    score: { type: Number, default: 0 },
    totalQuestions: { type: Number, default: 0 },
    correctAnswers: { type: Number, default: 0 },
    wrongAnswers: { type: Number, default: 0 },
    unanswered: { type: Number, default: 0 },
    skillsAnalysis: { type: [Schema.Types.Mixed], default: [] },
    sessionFingerprint: { type: String, default: "", index: true },
    submittedAt: { type: Number, default: () => Date.now(), index: true },
  },
  {
    timestamps: true,
  },
);

publicBarcodeSubmissionSchema.index({ testId: 1, schoolName: 1, classroomName: 1, submittedAt: -1 });
publicBarcodeSubmissionSchema.index({ testId: 1, score: 1 });

export const PublicBarcodeSubmissionModel = mongoose.model("PublicBarcodeSubmission", publicBarcodeSubmissionSchema);
