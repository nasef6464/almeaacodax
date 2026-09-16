import mongoose from "mongoose";
import { env } from "../config/env.js";

const explicitProductionApproval = process.env.ALLOW_LIVE_ASSESSMENT_INDEX_MIGRATION === "1";

async function findDuplicateActiveAttempts() {
  return mongoose.connection
    .collection("assessmentattempts")
    .aggregate([
      { $match: { status: "in_progress" } },
      {
        $group: {
          _id: { assignmentId: "$assignmentId", studentId: "$studentId" },
          count: { $sum: 1 },
          ids: { $push: "$_id" },
        },
      },
      { $match: { count: { $gt: 1 } } },
      { $limit: 20 },
    ])
    .toArray();
}

async function findDuplicateActiveSessions() {
  return mongoose.connection
    .collection("liveexamsessions")
    .aggregate([
      { $match: { status: "active" } },
      {
        $group: {
          _id: { studentId: "$studentId", quizId: "$quizId" },
          count: { $sum: 1 },
          ids: { $push: "$_id" },
        },
      },
      { $match: { count: { $gt: 1 } } },
      { $limit: 20 },
    ])
    .toArray();
}

async function run() {
  if (env.NODE_ENV === "production" && !explicitProductionApproval) {
    throw new Error(
      "Refusing live-assessment index migration in production without ALLOW_LIVE_ASSESSMENT_INDEX_MIGRATION=1",
    );
  }

  // This migration uses raw collections intentionally. New unique indexes must
  // never be auto-built before duplicate preflight has proved existing data is
  // safe to constrain.
  mongoose.set("autoIndex", false);
  await mongoose.connect(env.MONGODB_URI);
  try {
    const [attemptDuplicates, sessionDuplicates] = await Promise.all([
      findDuplicateActiveAttempts(),
      findDuplicateActiveSessions(),
    ]);

    if (attemptDuplicates.length || sessionDuplicates.length) {
      console.error("Live-assessment unique indexes were NOT created because duplicate active rows exist.");
      for (const duplicate of attemptDuplicates) {
        console.error(
          JSON.stringify({
            type: "assessment_attempt",
            assignmentId: duplicate._id.assignmentId,
            studentId: duplicate._id.studentId,
            count: duplicate.count,
            ids: duplicate.ids.map(String),
          }),
        );
      }
      for (const duplicate of sessionDuplicates) {
        console.error(
          JSON.stringify({
            type: "live_exam_session",
            studentId: duplicate._id.studentId,
            quizId: duplicate._id.quizId,
            count: duplicate.count,
            ids: duplicate.ids.map(String),
          }),
        );
      }
      process.exitCode = 2;
      return;
    }

    await mongoose.connection.collection("assessmentattempts").createIndex(
      { assignmentId: 1, studentId: 1 },
      {
        unique: true,
        name: "uniq_active_assessment_attempt",
        partialFilterExpression: { status: "in_progress" },
      },
    );
    await mongoose.connection.collection("liveexamsessions").createIndex(
      { studentId: 1, quizId: 1 },
      {
        unique: true,
        name: "uniq_active_live_exam_session",
        partialFilterExpression: { status: "active" },
      },
    );

    console.log("Live-assessment concurrency indexes created/verified successfully.");
  } finally {
    await mongoose.disconnect();
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
