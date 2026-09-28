import assert from "node:assert/strict";
import mongoose from "mongoose";
import { env } from "../config/env.js";
import { AccessGrantModel } from "../models/AccessGrant.js";
import { GroupModel } from "../models/Group.js";
import { PaymentRequestModel } from "../models/PaymentRequest.js";
import { SchoolMembershipModel } from "../models/SchoolMembership.js";
import { UserModel } from "../models/User.js";
import { deleteUserLifecycle } from "../modules/privacy/application/deleteUserLifecycle.js";
import { transferSchoolDirectorStudent } from "../modules/schools/application/schoolDirectorWorkspace.js";
import { grantAccessToUser } from "../services/accessGrantService.js";

const uri = String(env.MONGODB_URI || "");
assert.match(uri, /mongodb:\/\/(127\.0\.0\.1|localhost):27017\/almeaa_platform_v3_ci_/, "DB-5 race gate requires isolated CI Mongo");
const marker = `db5_${Date.now()}_${Math.random().toString(16).slice(2)}`;
const userIds: string[] = [];

const createSchool = async (name: string) => {
  const school = await GroupModel.create({ name: `${marker}_${name}`, type: "SCHOOL", ownerId: marker, studentIds: [], supervisorIds: [], courseIds: [] });
  const classDoc = await GroupModel.create({ name: `${marker}_${name}_class`, type: "CLASS", parentId: String(school._id), ownerId: marker, studentIds: [], supervisorIds: [], courseIds: [] });
  return { school, classDoc };
};

async function run() {
  await mongoose.connect(uri);
  try {
    await PaymentRequestModel.createIndexes();

    const source = await createSchool("source");
    const targetA = await createSchool("target_a");
    const targetB = await createSchool("target_b");
    const student = await UserModel.create({
      name: marker,
      email: `${marker}@example.invalid`,
      passwordHash: "db5-test-hash",
      role: "student",
      schoolId: String(source.school._id),
      groupIds: [String(source.classDoc._id)],
      isActive: true,
    });
    const studentId = String(student._id);
    userIds.push(studentId);
    await Promise.all([
      GroupModel.updateOne({ _id: source.school._id }, { $addToSet: { studentIds: studentId } }),
      GroupModel.updateOne({ _id: source.classDoc._id }, { $addToSet: { studentIds: studentId } }),
      SchoolMembershipModel.create({ userId: studentId, schoolId: String(source.school._id), role: "student", status: "active" }),
    ]);

    const race = await Promise.allSettled([
      transferSchoolDirectorStudent(String(source.school._id), String(targetA.school._id), studentId, String(targetA.classDoc._id)),
      transferSchoolDirectorStudent(String(source.school._id), String(targetB.school._id), studentId, String(targetB.classDoc._id)),
    ]);
    assert.equal(race.filter((item) => item.status === "fulfilled").length, 1, "exactly one concurrent school transfer must win");
    assert.equal(race.filter((item) => item.status === "rejected").length, 1, "exactly one concurrent school transfer must lose");

    const winner = race.find((item): item is PromiseFulfilledResult<any> => item.status === "fulfilled")!.value;
    const current = await UserModel.findById(student._id).lean() as any;
    assert.equal(String(current.schoolId), String(winner.targetSchoolId));
    assert.deepEqual((current.groupIds || []).map(String), [String(winner.targetClassId)]);

    const activeMemberships = await SchoolMembershipModel.find({ userId: studentId, role: "student", status: "active" }).lean();
    assert.equal(activeMemberships.length, 1, "student must have one active school membership after race");
    assert.equal(String(activeMemberships[0].schoolId), String(winner.targetSchoolId));
    assert.equal(await SchoolMembershipModel.countDocuments({ userId: studentId, schoolId: String(source.school._id), role: "student", status: "active" }), 0);

    const winningSchool = String(winner.targetSchoolId) === String(targetA.school._id) ? targetA : targetB;
    const losingSchool = winningSchool === targetA ? targetB : targetA;
    assert.ok(await GroupModel.exists({ _id: winningSchool.school._id, studentIds: studentId }));
    assert.ok(await GroupModel.exists({ _id: winningSchool.classDoc._id, studentIds: studentId }));
    assert.equal(await GroupModel.countDocuments({ _id: { $in: [source.school._id, source.classDoc._id, losingSchool.school._id, losingSchool.classDoc._id] }, studentIds: studentId }), 0);

    const retry = await transferSchoolDirectorStudent(String(source.school._id), String(winner.targetSchoolId), studentId, String(winner.targetClassId));
    assert.equal(retry.idempotent, true, "repeating the completed transfer must be idempotent");

    const paymentBase = {
      userId: studentId,
      userName: marker,
      userEmail: `${marker}@example.invalid`,
      itemType: "course" as const,
      itemId: `${marker}_course`,
      itemName: "DB5 Course",
      amount: 100,
      originalAmount: 100,
      currency: "SAR",
      paymentMethod: "transfer" as const,
      transferReference: marker,
      status: "pending" as const,
    };
    const paymentRace = await Promise.allSettled([
      PaymentRequestModel.create({ ...paymentBase, id: `${marker}_pay_1` }),
      PaymentRequestModel.create({ ...paymentBase, id: `${marker}_pay_2` }),
    ]);
    assert.equal(paymentRace.filter((item) => item.status === "fulfilled").length, 1, "one pending payment request must win");
    const paymentFailure = paymentRace.find((item): item is PromiseRejectedResult => item.status === "rejected");
    assert.equal((paymentFailure?.reason as any)?.code, 11000, "concurrent duplicate pending payment must hit unique guard");

    const grantKey = `${marker}_grant`;
    await Promise.all([
      grantAccessToUser({ userId: studentId, sourceType: "admin_manual", sourceId: grantKey, courseIds: [`${marker}_course`], idempotencyKey: grantKey }),
      grantAccessToUser({ userId: studentId, sourceType: "admin_manual", sourceId: grantKey, courseIds: [`${marker}_course`], idempotencyKey: grantKey }),
    ]);
    assert.equal(await AccessGrantModel.countDocuments({ idempotencyKey: grantKey }), 1, "access grant retry must remain single-row");

    const erased = await UserModel.create({
      name: `${marker}_erase`,
      email: `${marker}_erase@example.invalid`,
      passwordHash: "db5-test-hash",
      role: "student",
      schoolId: String(source.school._id),
      groupIds: [],
      isActive: true,
    });
    const erasedId = String(erased._id);
    userIds.push(erasedId);
    await SchoolMembershipModel.create({ userId: erasedId, schoolId: String(source.school._id), role: "student", status: "active" });
    await grantAccessToUser({ userId: erasedId, sourceType: "admin_manual", sourceId: `${marker}_erase_grant`, idempotencyKey: `${marker}_erase_grant` });
    await deleteUserLifecycle({ targetUserId: erasedId, targetMongoId: erasedId, actorUserId: marker });
    await deleteUserLifecycle({ targetUserId: erasedId, targetMongoId: erasedId, actorUserId: marker });
    assert.equal(await UserModel.countDocuments({ _id: erased._id }), 0);
    assert.equal(await SchoolMembershipModel.countDocuments({ userId: erasedId, status: "active" }), 0);
    assert.equal(await AccessGrantModel.countDocuments({ userId: erasedId, status: "active" }), 0);

    console.log(JSON.stringify({
      phase: "DB5",
      status: "PASS",
      checks: [
        "concurrent cross-school transfer has one winner",
        "completed transfer retry is idempotent",
        "pending purchase race is unique",
        "access-grant retry is idempotent",
        "privacy deletion is safe to retry",
      ],
    }, null, 2));
  } finally {
    await Promise.allSettled([
      PaymentRequestModel.deleteMany({ id: { $regex: `^${marker}` } }),
      AccessGrantModel.deleteMany({ $or: [{ idempotencyKey: { $regex: `^${marker}` } }, { userId: { $in: userIds } }] }),
      SchoolMembershipModel.deleteMany({ userId: { $in: userIds } }),
      UserModel.deleteMany({ email: { $regex: `^${marker}` } }),
      GroupModel.deleteMany({ name: { $regex: `^${marker}` } }),
    ]);
    await mongoose.disconnect();
  }
}

run().catch(async (error) => {
  console.error("DB-5 consistency race gate failed");
  console.error(error);
  await mongoose.disconnect().catch(() => undefined);
  process.exitCode = 1;
});
