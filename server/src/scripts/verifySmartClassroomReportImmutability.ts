import assert from "node:assert/strict";
import mongoose from "mongoose";
import { env } from "../config/env.js";
import { ClassroomParticipantModel } from "../models/ClassroomParticipant.js";
import { ClassroomResponseModel } from "../models/ClassroomResponse.js";
import { ClassroomSessionModel } from "../models/ClassroomSession.js";
import { GroupModel } from "../models/Group.js";
import { UserModel } from "../models/User.js";
import { buildClassroomSessionReport } from "../modules/schools/application/classroomSupervisorReport.js";

const RUN_ID = `report_snapshot_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
let schoolId = "";
let classId = "";
let studentAId = "";
let studentBId = "";
let sessionId = "";

function databaseName(uri: string) {
  const withoutQuery = uri.split("?")[0] || "";
  const slash = withoutQuery.lastIndexOf("/");
  return slash >= 0 ? withoutQuery.slice(slash + 1) : "";
}

function assertSafeDatabase() {
  const name = databaseName(env.MONGODB_URI);
  if (env.NODE_ENV === "production") throw new Error("Report immutability verification must never run in production");
  if (!/(?:test|ci|dev|local|sandbox)/i.test(name) && process.env.ALLOW_SMART_CLASSROOM_E2E_UNSAFE_DB !== "1") {
    throw new Error(`Refusing report verification against database '${name || "<default>"}'`);
  }
}

async function cleanup() {
  if (sessionId) {
    await Promise.all([
      ClassroomResponseModel.deleteMany({ sessionId }),
      ClassroomParticipantModel.deleteMany({ sessionId }),
      ClassroomSessionModel.deleteMany({ _id: sessionId }),
    ]);
  }
  if (classId) await GroupModel.deleteMany({ _id: classId });
  if (schoolId) await GroupModel.deleteMany({ _id: schoolId });
  const userIds = [studentAId, studentBId].filter(Boolean);
  if (userIds.length) await UserModel.deleteMany({ _id: { $in: userIds } });
}

async function run() {
  assertSafeDatabase();
  await mongoose.connect(env.MONGODB_URI);

  const school = await GroupModel.create({ name: `Snapshot School ${RUN_ID}`, type: "SCHOOL", ownerId: RUN_ID });
  schoolId = String(school._id);

  const studentA = await UserModel.create({
    name: "Snapshot Student A",
    email: `snapshot_a_${RUN_ID}@example.com`,
    passwordHash: "x",
    role: "student",
    schoolId,
    groupIds: [],
    isActive: true,
  });
  studentAId = String(studentA._id);

  const classroom = await GroupModel.create({
    name: `Snapshot Class ${RUN_ID}`,
    type: "CLASS",
    parentId: schoolId,
    ownerId: RUN_ID,
    studentIds: [studentAId],
  });
  classId = String(classroom._id);
  await UserModel.updateOne({ _id: studentA._id }, { $set: { groupIds: [classId] } });

  const session = await ClassroomSessionModel.create({
    schoolId,
    classId,
    teacherId: `teacher_${RUN_ID}`,
    status: "live",
    className: "Snapshot Class",
    subjectName: "General",
    publishedMode: "single",
    publishedQuestionIds: [`q_${RUN_ID}`],
    activeQuestionIndex: 0,
    pinHash: `pin_${RUN_ID}`,
    pinExpiresAt: new Date(Date.now() + 60_000),
    questionSnapshots: [{
      questionId: `q_${RUN_ID}`,
      text: "Snapshot question",
      options: ["A", "B"],
      type: "mcq",
      correctOptionIndex: 1,
      skillIds: ["snapshot-skill"],
      pathId: "snapshot-path",
      subject: "general",
    }],
  });
  sessionId = String(session._id);

  await ClassroomParticipantModel.create({ sessionId, studentId: studentAId });
  await ClassroomResponseModel.create({
    sessionId,
    questionId: `q_${RUN_ID}`,
    studentId: studentAId,
    selectedOptionIndex: 1,
    isCorrect: true,
  });

  const initial = await buildClassroomSessionReport(session.toObject());
  assert.equal(initial.roster.expected, 1);
  assert.equal(initial.roster.joined, 1);
  assert.equal(initial.totals.responses, 1);
  assert.equal(initial.totals.correct, 1);

  session.status = "ended";
  session.endedAt = new Date();
  session.activeQuestionIndex = null;
  session.reportSnapshot = { ...initial, status: "ended", endedAt: session.endedAt };
  await session.save();

  const studentB = await UserModel.create({
    name: "Snapshot Student B",
    email: `snapshot_b_${RUN_ID}@example.com`,
    passwordHash: "x",
    role: "student",
    schoolId,
    groupIds: [classId],
    isActive: true,
  });
  studentBId = String(studentB._id);
  await GroupModel.updateOne({ _id: classId }, { $addToSet: { studentIds: studentBId } });

  const endedSession = await ClassroomSessionModel.findById(sessionId).lean();
  const historical = await buildClassroomSessionReport(endedSession);
  assert.equal(historical.roster.expected, 1, "historical roster changed after a new student joined the class");
  assert.equal(historical.roster.joined, 1);
  assert.equal(historical.totals.responses, 1);
  assert.equal(historical.totals.correct, 1);
  assert.deepEqual(historical.questions, initial.questions);

  console.log("Smart Classroom finalized report immutability: PASS");
}

run()
  .catch((error) => {
    console.error("Smart Classroom finalized report immutability: FAIL", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    try { await cleanup(); } catch (error) { console.error("Report immutability cleanup failed", error); }
    await mongoose.disconnect();
  });
