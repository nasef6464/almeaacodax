import mongoose, { Schema } from "mongoose";

/**
 * A "smart classroom" live session (Nawn/Wordwall-style): a teacher pushes
 * a sequence of question-bank questions to a class of tablets and watches
 * answers arrive in real time. This is deliberately separate from the
 * exam/assessment system (Quiz / AssessmentAttempt) — it only *reads* from
 * the question bank and never writes to exam tables.
 */
const classroomSessionSchema = new Schema(
  {
    teacherId: { type: String, required: true, index: true },
    groupId: { type: String, required: true, index: true }, // Group (type: CLASS)
    subjectId: { type: String, default: "" },
    title: { type: String, default: "" },

    // 6-character human-typeable code students use to join from a tablet.
    joinCode: { type: String, required: true, unique: true, index: true },

    // Ordered snapshot of question ids pulled from the bank at creation time.
    // Snapshotting (not a live reference) means editing/deleting a bank
    // question later never breaks a past session's history or report.
    questionIds: { type: [String], default: [] },

    // -1 = not started yet. 0..N-1 = index into questionIds currently open.
    currentQuestionIndex: { type: Number, default: -1 },

    status: {
      type: String,
      enum: ["draft", "live", "ended"],
      default: "draft",
      index: true,
    },

    startedAt: { type: Date, default: null },
    endedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
  },
);

classroomSessionSchema.index({ groupId: 1, status: 1, createdAt: -1 });
classroomSessionSchema.index({ teacherId: 1, createdAt: -1 });

export const ClassroomSessionModel = mongoose.model("ClassroomSession", classroomSessionSchema);
