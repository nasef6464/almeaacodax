import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { connectToDatabase } from "../config/db.js";
import { UserModel } from "../models/User.js";

type AccountSpec = {
  label: string;
  emailEnv: string;
  passwordEnv: string;
  expectedRole: "admin" | "student" | "teacher" | "supervisor" | "parent";
};

const accountSpecs: AccountSpec[] = [
  { label: "admin", emailEnv: "ROLE_ADMIN_EMAIL", passwordEnv: "ROLE_ADMIN_PASSWORD", expectedRole: "admin" },
  { label: "student", emailEnv: "ROLE_STUDENT_EMAIL", passwordEnv: "ROLE_STUDENT_PASSWORD", expectedRole: "student" },
  {
    label: "student-redeemed",
    emailEnv: "SMOKE_STUDENT_REDEEMED_EMAIL",
    passwordEnv: "SMOKE_STUDENT_REDEEMED_PASSWORD",
    expectedRole: "student",
  },
  { label: "teacher", emailEnv: "ROLE_TEACHER_EMAIL", passwordEnv: "ROLE_TEACHER_PASSWORD", expectedRole: "teacher" },
  {
    label: "supervisor",
    emailEnv: "ROLE_SUPERVISOR_EMAIL",
    passwordEnv: "ROLE_SUPERVISOR_PASSWORD",
    expectedRole: "supervisor",
  },
  {
    label: "school-supervisor",
    emailEnv: "ROLE_SCHOOL_SUPERVISOR_EMAIL",
    passwordEnv: "ROLE_SCHOOL_SUPERVISOR_PASSWORD",
    expectedRole: "supervisor",
  },
  { label: "parent", emailEnv: "ROLE_PARENT_EMAIL", passwordEnv: "ROLE_PARENT_PASSWORD", expectedRole: "parent" },
];

const requireEnv = (name: string) => {
  const value = String(process.env[name] || "").trim();
  if (!value) throw new Error(`${name} is required for the isolated deep pre-merge gate`);
  return value;
};

async function prepareDeepPreMergeUsers() {
  await connectToDatabase();

  try {
    for (const spec of accountSpecs) {
      const email = requireEnv(spec.emailEnv).toLowerCase();
      const password = requireEnv(spec.passwordEnv);
      if (password.length < 24) {
        throw new Error(`${spec.passwordEnv} must be an ephemeral high-entropy password`);
      }

      const user = await UserModel.findOne({ email });
      if (!user) throw new Error(`Missing seeded ${spec.label} account`);
      if (user.role !== spec.expectedRole) {
        throw new Error(`Seeded ${spec.label} role mismatch: expected ${spec.expectedRole}, received ${user.role}`);
      }

      user.passwordHash = await bcrypt.hash(password, 10);
      user.isActive = true;
      await user.save();
      console.log(`Prepared isolated ${spec.label} account`);
    }
  } finally {
    await mongoose.disconnect();
  }
}

prepareDeepPreMergeUsers().catch((error) => {
  console.error("Failed to prepare isolated deep pre-merge users", error instanceof Error ? error.message : error);
  process.exit(1);
});
