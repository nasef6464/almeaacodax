import mongoose from "mongoose";
import { env } from "../config/env.js";
import { LessonProgressModel } from "../models/LessonProgress.js";
import { UserModel } from "../models/User.js";
import { mirrorLessonProgress } from "../services/lessonProgressMirror.js";

const apply = process.argv.includes("--apply");
const limitArg = process.argv.find((arg) => arg.startsWith("--limit="));
const limit = Math.max(1, Math.min(Number(limitArg?.split("=")[1] || 500), 5000));

await mongoose.connect(env.MONGODB_URI);

try {
  const users = await UserModel.find({
    $or: [
      { "completedLessons.0": { $exists: true } },
      { "interactiveVideoProgress.0": { $exists: true } },
    ],
  })
    .select("_id completedLessons interactiveVideoProgress")
    .limit(limit)
    .lean();

  let mismatchedUsers = 0;
  let missingCompleted = 0;
  let missingVideo = 0;

  for (const user of users as any[]) {
    const userId = String(user._id);
    if (apply) {
      await mirrorLessonProgress({
        userId,
        completedLessons: user.completedLessons || [],
        interactiveVideoProgress: user.interactiveVideoProgress || [],
      });
    }

    const rows = await LessonProgressModel.find({ userId }).lean();
    const byLesson = new Map<string, any>(rows.map((row: any) => [String(row.lessonId), row]));
    let mismatch = false;

    for (const lessonId of new Set<string>((user.completedLessons || []).map((value: unknown) => String(value)))) {
      if (!byLesson.get(lessonId)?.completed) {
        missingCompleted += 1;
        mismatch = true;
      }
    }

    for (const item of user.interactiveVideoProgress || []) {
      const row: any = byLesson.get(String(item.lessonId));
      if (
        !row ||
        String(row.courseId || "") !== String(item.courseId || "") ||
        Number(row.positionSeconds || 0) !== Number(item.positionSeconds || 0) ||
        Number(row.sourceUpdatedAt || 0) !== Number(item.updatedAt || 0) ||
        JSON.stringify([...(row.answeredQuestionIds || [])].map(String).sort()) !==
          JSON.stringify([...(item.answeredQuestionIds || [])].map(String).sort())
      ) {
        missingVideo += 1;
        mismatch = true;
      }
    }

    if (mismatch) mismatchedUsers += 1;
  }

  const report = {
    mode: apply ? "apply-and-verify" : "verify-only",
    sampledUsers: users.length,
    mismatchedUsers,
    missingCompleted,
    missingVideo,
    parity: mismatchedUsers === 0,
  };
  console.log(JSON.stringify(report, null, 2));
  if (!apply && mismatchedUsers > 0) process.exitCode = 2;
} finally {
  await mongoose.disconnect();
}
