import mongoose, { Schema } from "mongoose";

const classroomTemplateSchema = new Schema(
  {
    schoolId: { type: String, required: true, index: true },
    teacherId: { type: String, required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 160 },
    questionIds: { type: [String], required: true, default: [] },
    challengeIds: { type: [String], default: [] },
    badge: { type: String, default: "حزمة مخصصة للمعلم" },
  },
  { timestamps: true },
);

classroomTemplateSchema.index({ schoolId: 1, teacherId: 1, updatedAt: -1 });
classroomTemplateSchema.index({ schoolId: 1, teacherId: 1, title: 1 }, { unique: true });

export const ClassroomTemplateModel = mongoose.model("ClassroomTemplate", classroomTemplateSchema);
