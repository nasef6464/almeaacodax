import mongoose, { Schema } from "mongoose";
import { schoolDirectorPermissions } from "../modules/schools/domain/schoolDirectorPermissions.js";

/** Additive school context. User.schoolId remains the legacy compatibility field. */
const schoolMembershipSchema = new Schema(
  {
    userId: { type: String, required: true, trim: true, index: true },
    schoolId: { type: String, required: true, trim: true, index: true },
    role: { type: String, enum: ["student", "teacher", "supervisor", "school_admin", "parent"], required: true },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
    permissions: { type: [{ type: String, enum: schoolDirectorPermissions }], default: [] },
    migrationKey: { type: String, default: undefined },
  },
  { timestamps: true },
);

schoolMembershipSchema.index({ userId: 1, schoolId: 1, role: 1 }, { unique: true });
schoolMembershipSchema.index({ schoolId: 1, role: 1, status: 1 });

export const SchoolMembershipModel = mongoose.model("SchoolMembership", schoolMembershipSchema);
