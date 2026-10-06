import mongoose, { Schema } from "mongoose";

const parentStudentRelationshipSchema = new Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    parentUserId: { type: String, required: true, index: true },
    studentUserId: { type: String, required: true, index: true },
    schoolId: { type: String, default: "", index: true },
    status: { type: String, enum: ["active", "revoked"], default: "active", index: true },
    source: { type: String, enum: ["admin", "legacy_backfill"], required: true },
    createdBy: { type: String, required: true },
    revokedAt: { type: Number, default: null },
    revokedBy: { type: String, default: "" },
  },
  { timestamps: true },
);

parentStudentRelationshipSchema.index(
  { parentUserId: 1, studentUserId: 1 },
  { unique: true },
);
parentStudentRelationshipSchema.index({ parentUserId: 1, status: 1, studentUserId: 1 });
parentStudentRelationshipSchema.index({ studentUserId: 1, status: 1, parentUserId: 1 });

export const ParentStudentRelationshipModel = mongoose.model(
  "ParentStudentRelationship",
  parentStudentRelationshipSchema,
);
