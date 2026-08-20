import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { connectToDatabase } from "../config/db.js";
import { UserModel } from "../models/User.js";

const demoUsers = [
  {
    name: "adminnasef",
    email: "nasef64@gmail.com",
    passwordEnv: "DEMO_ADMIN_PASSWORD",
    role: "admin",
    subscription: {
      plan: "premium",
      purchasedCourses: ["c1", "c3", "c10"],
      purchasedPackages: ["p1"],
    },
    enrolledCourses: ["c1", "c3", "c10"],
    enrolledPaths: ["p_qudrat", "p_tahsili"],
    completedLessons: ["l1", "l2"],
  },
  {
    name: "سارة المعلمة",
    email: "teacher@example.com",
    passwordEnv: "DEMO_TEACHER_PASSWORD",
    role: "teacher",
    subscription: {
      plan: "premium",
      purchasedCourses: [],
      purchasedPackages: [],
    },
    enrolledCourses: [],
    enrolledPaths: ["p_qudrat"],
    completedLessons: [],
  },
  {
    name: "علي الطالب",
    email: "student@example.com",
    passwordEnv: "DEMO_STUDENT_PASSWORD",
    role: "student",
    subscription: {
      plan: "premium",
      purchasedCourses: ["c1", "c3"],
      purchasedPackages: [],
    },
    enrolledCourses: ["c1", "c3"],
    enrolledPaths: ["p_qudrat", "p_tahsili"],
    completedLessons: ["l1", "l2"],
  },
  {
    name: "أحمد المشرف",
    email: "supervisor@example.com",
    passwordEnv: "DEMO_SUPERVISOR_PASSWORD",
    role: "supervisor",
    subscription: {
      plan: "premium",
      purchasedCourses: [],
      purchasedPackages: [],
    },
    enrolledCourses: [],
    enrolledPaths: ["p_qudrat"],
    completedLessons: [],
  },
  {
    name: "خالد ولي الأمر",
    email: "parent@example.com",
    passwordEnv: "DEMO_PARENT_PASSWORD",
    role: "parent",
    subscription: {
      plan: "free",
      purchasedCourses: [],
      purchasedPackages: [],
    },
    enrolledCourses: [],
    enrolledPaths: [],
    completedLessons: [],
  },
];

async function seedDemoUsers() {
  await connectToDatabase();

  try {
    const preparedUsers = [];

    for (const user of demoUsers) {
      const email = user.email.toLowerCase();
      const existing = await UserModel.findOne({ email }).select("_id").lean();
      const password = existing ? "" : String(process.env[user.passwordEnv] || "").trim();

      if (!existing && !password) {
        throw new Error(`${user.passwordEnv} is required to create missing demo user ${email}`);
      }

      preparedUsers.push({ user, email, existing, password });
    }

    for (const { user, email, existing, password } of preparedUsers) {
      const profileFields = {
        name: user.name,
        email,
        role: user.role,
        isActive: true,
        subscription: user.subscription,
        enrolledCourses: user.enrolledCourses,
        enrolledPaths: user.enrolledPaths,
        completedLessons: user.completedLessons,
      };

      if (existing) {
        await UserModel.updateOne(
          { _id: existing._id },
          {
            $set: profileFields,
          },
        );
        console.log(`Updated ${user.role} without changing password: ${email}`);
        continue;
      }

      const passwordHash = await bcrypt.hash(password, 10);
      await UserModel.create({
        ...profileFields,
        passwordHash,
      });
      console.log(`Created ${user.role}: ${email}`);
    }

    const student = await UserModel.findOne({ email: "student@example.com" });
    const parent = await UserModel.findOne({ email: "parent@example.com" });

    if (student && parent) {
      parent.linkedStudentIds = [String(student.id)];
      await parent.save();
      console.log(`Linked parent@example.com to student ${student.email}`);
    }
  } finally {
    await mongoose.disconnect();
  }
}

seedDemoUsers().catch((error) => {
  console.error("Failed to seed demo users", error);
  process.exit(1);
});
