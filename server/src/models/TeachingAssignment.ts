import mongoose, { Schema } from "mongoose";

/** Explicit authority for future classroom actions; does not reinterpret legacy groupIds. */
const teachingAssignmentSchema = new Schema(
  {
    schoolId: { type: String, required: true, index: true },
    teacherId: { type: String, required: true, index: true },
    classId: { type: String, required: true, index: true },
    subjectId: { type: String, default: "" },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
  },
  { timestamps: true },
);

teachingAssignmentSchema.index({ schoolId: 1, teacherId: 1, classId: 1, subjectId: 1 }, { unique: true });
teachingAssignmentSchema.index({ teacherId: 1, status: 1, schoolId: 1 });

export const TeachingAssignmentModel = mongoose.model("TeachingAssignment", teachingAssignmentSchema);
