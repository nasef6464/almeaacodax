import mongoose from "mongoose";
import { env } from "../config/env.js";
import { ParentStudentRelationshipModel } from "../models/ParentStudentRelationship.js";
import { UserModel } from "../models/User.js";

const APPLY = process.argv.includes("--apply");
const SOURCE = "legacy_backfill" as const;
const CREATED_BY = "migration:parent-student-backfill";

const normalizeIds = (values: unknown[]) =>
  Array.from(new Set(values.map((value) => String(value || "").trim()).filter(Boolean)));

async function run() {
  await mongoose.connect(env.MONGODB_URI, { serverSelectionTimeoutMS: 12_000 });
  try {
    const parents = await UserModel.find({ role: "parent", linkedStudentIds: { $exists: true, $ne: [] } })
      .select("_id linkedStudentIds")
      .lean() as any[];

    const requestedStudentIds = normalizeIds(
      parents.flatMap((parent) =>
        Array.isArray(parent.linkedStudentIds) ? parent.linkedStudentIds : [],
      ),
    );
    const validObjectIds = requestedStudentIds.filter((id) => mongoose.isValidObjectId(id));
    const students = validObjectIds.length
      ? await UserModel.find({ _id: { $in: validObjectIds }, role: "student" })
          .select("_id schoolId")
          .lean() as any[]
      : [];
    const studentsById = new Map(
      students.map((student) => [String(student._id), student]),
    );

    const candidatePairs = parents.flatMap((parent) => {
      const parentUserId = String(parent._id);
      const studentIds = normalizeIds(
        Array.isArray(parent.linkedStudentIds) ? parent.linkedStudentIds : [],
      );
      return studentIds
        .filter((studentUserId) => studentsById.has(studentUserId))
        .map((studentUserId) => ({
          parentUserId,
          studentUserId,
          schoolId: String(studentsById.get(studentUserId)?.schoolId || ""),
        }));
    });

    const existingRows = candidatePairs.length
      ? await ParentStudentRelationshipModel.find({
          $or: candidatePairs.map(({ parentUserId, studentUserId }) => ({
            parentUserId,
            studentUserId,
          })),
        })
          .select("parentUserId studentUserId status source")
          .lean() as any[]
      : [];
    const existingPairKeys = new Set(
      existingRows.map((row) => `${String(row.parentUserId)}:${String(row.studentUserId)}`),
    );
    const inserts = candidatePairs.filter(
      (pair) => !existingPairKeys.has(`${pair.parentUserId}:${pair.studentUserId}`),
    );

    const summary = {
      mode: APPLY ? "apply" : "dry-run",
      parentsScanned: parents.length,
      requestedStudentIds: requestedStudentIds.length,
      validStudentsFound: students.length,
      candidatePairs: candidatePairs.length,
      existingCanonicalPairs: existingRows.length,
      newCanonicalPairs: inserts.length,
      skippedInvalidOrMissingStudents: Math.max(0, requestedStudentIds.length - students.length),
    };

    console.log(JSON.stringify(summary, null, 2));
    if (!APPLY || inserts.length === 0) return;

    await ParentStudentRelationshipModel.bulkWrite(
      inserts.map((pair) => ({
        updateOne: {
          filter: {
            parentUserId: pair.parentUserId,
            studentUserId: pair.studentUserId,
          },
          update: {
            $setOnInsert: {
              id: `parent-student:${pair.parentUserId}:${pair.studentUserId}`,
              parentUserId: pair.parentUserId,
              studentUserId: pair.studentUserId,
              schoolId: pair.schoolId,
              status: "active" as const,
              source: SOURCE,
              createdBy: CREATED_BY,
            },
          },
          upsert: true,
        },
      })),
      { ordered: false },
    );

    console.log(JSON.stringify({ ...summary, applied: inserts.length }, null, 2));
  } finally {
    await mongoose.disconnect();
  }
}

run().catch(async (error) => {
  console.error("Parent/student relationship backfill failed");
  console.error(error);
  await mongoose.disconnect().catch(() => undefined);
  process.exitCode = 1;
});
