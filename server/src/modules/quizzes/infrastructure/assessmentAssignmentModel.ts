import mongoose, { Schema } from "mongoose";

const assessmentAudienceSchema = new Schema(
  {
    groupIds: { type: [String], required: true, default: [] },
    userIds: { type: [String], required: true, default: [] },
  },
  { _id: false },
);

const assessmentWindowSchema = new Schema(
  {
    opensAt: { type: Date, default: undefined },
    closesAt: { type: Date, default: undefined },
  },
  { _id: false },
);

/**
 * Assignment policy is separate from immutable assessment content. It is
 * additive until an adapter explicitly begins to write or read it.
 */
const assessmentAssignmentSchema = new Schema(
  {
    assessmentId: { type: String, required: true, index: true, trim: true },
    assessmentVersionId: { type: String, required: true, index: true, trim: true },
    audience: { type: assessmentAudienceSchema, required: true, default: () => ({}) },
    window: { type: assessmentWindowSchema, required: true, default: () => ({}) },
    maxAttempts: { type: Number, required: true, min: 1, default: 1 },
    status: {
      type: String,
      enum: ["active", "closed", "cancelled"],
      required: true,
      default: "active",
      index: true,
    },
    createdBy: { type: String, required: true, trim: true },
  },
  { timestamps: true },
);

assessmentAssignmentSchema.index({ assessmentVersionId: 1, status: 1, createdAt: -1 });
assessmentAssignmentSchema.index({ "audience.userIds": 1, status: 1, createdAt: -1 });
assessmentAssignmentSchema.index({ "audience.groupIds": 1, status: 1, createdAt: -1 });

export const AssessmentAssignmentModel = mongoose.model(
  "AssessmentAssignment",
  assessmentAssignmentSchema,
);
