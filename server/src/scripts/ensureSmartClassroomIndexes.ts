import mongoose from "mongoose";
import { env } from "../config/env.js";
import { ClassroomSessionModel } from "../models/ClassroomSession.js";

const explicitProductionApproval = process.env.ALLOW_SMART_CLASSROOM_INDEX_MIGRATION === "1";

async function run() {
  if (env.NODE_ENV === "production" && !explicitProductionApproval) {
    throw new Error("Refusing to run Smart Classroom index migration in production without ALLOW_SMART_CLASSROOM_INDEX_MIGRATION=1");
  }

  await mongoose.connect(env.MONGODB_URI);
  try {
    const duplicates = await ClassroomSessionModel.aggregate([
      { $match: { status: "live" } },
      { $group: { _id: { schoolId: "$schoolId", classId: "$classId" }, count: { $sum: 1 }, sessionIds: { $push: "$_id" } } },
      { $match: { count: { $gt: 1 } } },
      { $limit: 20 },
    ]);

    if (duplicates.length > 0) {
      console.error("Duplicate live Smart Classroom sessions must be resolved before creating the unique index:");
      for (const duplicate of duplicates) {
        console.error(JSON.stringify({ schoolId: duplicate._id.schoolId, classId: duplicate._id.classId, count: duplicate.count, sessionIds: duplicate.sessionIds.map(String) }));
      }
      process.exitCode = 2;
      return;
    }

    await ClassroomSessionModel.syncIndexes();
    console.log("Smart Classroom indexes synchronized successfully; one-live-session invariant is enforced by MongoDB.");
  } finally {
    await mongoose.disconnect();
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
