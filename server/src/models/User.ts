import mongoose, { Schema } from "mongoose";
import { roles } from "../constants/roles.js";

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    avatar: { type: String, default: "" },
    role: { type: String, enum: roles, default: "student" },
    points: { type: Number, default: 0 },
    badges: { type: [String], default: [] },
    subscription: {
      plan: { type: String, enum: ["free", "premium"], default: "free" },
      expiresAt: { type: Date },
      purchasedCourses: { type: [String], default: [] },
      purchasedPackages: { type: [String], default: [] },
    },
    isActive: { type: Boolean, default: true },
    schoolId: { type: String, default: null },
    groupIds: { type: [String], default: [] },
    enrolledCourses: { type: [String], default: [] },
    enrolledPaths: { type: [String], default: [] },
    completedLessons: { type: [String], default: [] },
    favorites: { type: [String], default: [] },
    reviewLater: { type: [String], default: [] },
  },
  {
    timestamps: true,
  },
);

export const UserModel = mongoose.model("User", userSchema);
