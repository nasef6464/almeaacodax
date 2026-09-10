import mongoose, { Schema } from "mongoose";

/** Additive school context. User.schoolId remains the legacy compatibility field. */
const schoolMembershipSchema = new Schema(
  {
    userId: { type: String, required: true, index: true },
    schoolId: { type: String, required: true, index: true },
    role: { type: String, enum: ["student", "teacher", "supervisor", "parent"], required: true },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
  },
  { timestamps: true },
);

schoolMembershipSchema.index({ userId: 1, schoolId: 1, role: 1 }, { unique: true });
schoolMembershipSchema.index({ schoolId: 1, role: 1, status: 1 });

export const SchoolMembershipModel = mongoose.model("SchoolMembership", schoolMembershipSchema);
