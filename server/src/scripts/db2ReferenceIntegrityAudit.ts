import mongoose from "mongoose";
import { env } from "../config/env.js";

const dbName = () => mongoose.connection.db?.databaseName || "unknown";
const countFacet = (value: any) => Number(value?.[0]?.n || 0);

async function aggregate(collection: string, pipeline: any[]) {
  return mongoose.connection.collection(collection).aggregate(pipeline, { allowDiskUse: false }).toArray();
}

async function run() {
  await mongoose.connect(env.MONGODB_URI, { serverSelectionTimeoutMS: 12_000 });
  try {
    const duplicateSpecs: Array<[string, Record<string, string>]> = [
      ["schoolmemberships", { userId: "$userId", schoolId: "$schoolId", role: "$role" }],
      ["teachingassignments", { schoolId: "$schoolId", teacherId: "$teacherId", classId: "$classId", subjectId: "$subjectId" }],
      ["parentstudentrelationships", { parentUserId: "$parentUserId", studentUserId: "$studentUserId" }],
      ["reviewcards", { userId: "$userId", questionId: "$questionId" }],
      ["skillprogresses", { userId: "$userId", pathId: "$pathId", subjectId: "$subjectId", skillId: "$skillId" }],
      ["lessonprogresses", { userId: "$userId", lessonId: "$lessonId" }],
    ];
    const duplicates: Record<string, number> = {};
    for (const [collection, identity] of duplicateSpecs) {
      const rows = await aggregate(collection, [
        { $group: { _id: identity, n: { $sum: 1 } } },
        { $match: { n: { $gt: 1 } } },
        { $count: "n" },
      ]);
      duplicates[collection] = Number(rows[0]?.n || 0);
    }

    const schoolMembership = await aggregate("schoolmemberships", [
      { $lookup: { from: "users", let: { id: "$userId" }, pipeline: [{ $match: { $expr: { $eq: [{ $toString: "$_id" }, "$$id"] } } }], as: "user" } },
      { $lookup: { from: "groups", let: { id: "$schoolId" }, pipeline: [{ $match: { $expr: { $and: [{ $eq: [{ $toString: "$_id" }, "$$id"] }, { $eq: ["$type", "SCHOOL"] }] } } }], as: "school" } },
      { $facet: {
        missingUsers: [{ $match: { $expr: { $eq: [{ $size: "$user" }, 0] } } }, { $count: "n" }],
        missingSchools: [{ $match: { $expr: { $eq: [{ $size: "$school" }, 0] } } }, { $count: "n" }],
      } },
    ]);

    const assignments = await aggregate("teachingassignments", [
      { $lookup: { from: "users", let: { id: "$teacherId" }, pipeline: [{ $match: { $expr: { $eq: [{ $toString: "$_id" }, "$$id"] } } }], as: "teacher" } },
      { $lookup: { from: "groups", let: { id: "$schoolId" }, pipeline: [{ $match: { $expr: { $and: [{ $eq: [{ $toString: "$_id" }, "$$id"] }, { $eq: ["$type", "SCHOOL"] }] } } }], as: "school" } },
      { $lookup: { from: "groups", let: { id: "$classId" }, pipeline: [{ $match: { $expr: { $and: [{ $eq: [{ $toString: "$_id" }, "$$id"] }, { $eq: ["$type", "CLASS"] }] } } }], as: "classroom" } },
      { $facet: {
        missingTeachers: [{ $match: { $expr: { $eq: [{ $size: "$teacher" }, 0] } } }, { $count: "n" }],
        missingSchools: [{ $match: { $expr: { $eq: [{ $size: "$school" }, 0] } } }, { $count: "n" }],
        missingClasses: [{ $match: { $expr: { $eq: [{ $size: "$classroom" }, 0] } } }, { $count: "n" }],
      } },
    ]);

    const review = await aggregate("reviewcards", [
      { $lookup: { from: "questions", let: { id: "$questionId" }, pipeline: [{ $match: { $expr: { $or: [{ $eq: [{ $toString: "$_id" }, "$$id"] }, { $eq: ["$id", "$$id"] }] } } }], as: "question" } },
      { $match: { $expr: { $eq: [{ $size: "$question" }, 0] } } },
      { $count: "n" },
    ]);
    const lesson = await aggregate("lessonprogresses", [
      { $lookup: { from: "lessons", let: { id: "$lessonId" }, pipeline: [{ $match: { $expr: { $or: [{ $eq: [{ $toString: "$_id" }, "$$id"] }, { $eq: ["$id", "$$id"] }] } } }], as: "lesson" } },
      { $match: { $expr: { $eq: [{ $size: "$lesson" }, 0] } } },
      { $count: "n" },
    ]);
    const quizHistory = await aggregate("quizresults", [
      { $lookup: { from: "quizzes", let: { id: "$quizId" }, pipeline: [{ $match: { $expr: { $or: [{ $eq: [{ $toString: "$_id" }, "$$id"] }, { $eq: ["$id", "$$id"] }] } } }], as: "quiz" } },
      { $project: { missingQuiz: { $eq: [{ $size: "$quiz" }, 0] }, hasSnapshot: { $ne: [{ $type: "$quizSnapshot" }, "missing"] } } },
      { $facet: {
        missingWithSnapshot: [{ $match: { missingQuiz: true, hasSnapshot: true } }, { $count: "n" }],
        missingWithoutSnapshot: [{ $match: { missingQuiz: true, hasSnapshot: false } }, { $count: "n" }],
      } },
    ]);

    const legacySchool = await aggregate("users", [
      { $match: { schoolId: { $type: "string", $ne: "" }, role: { $in: ["student", "teacher", "supervisor", "school_admin", "parent"] } } },
      { $lookup: { from: "groups", let: { sid: "$schoolId" }, pipeline: [{ $match: { $expr: { $and: [{ $eq: [{ $toString: "$_id" }, "$$sid"] }, { $eq: ["$type", "SCHOOL"] }] } } }], as: "school" } },
      { $lookup: { from: "schoolmemberships", let: { uid: { $toString: "$_id" }, sid: "$schoolId" }, pipeline: [{ $match: { $expr: { $and: [{ $eq: ["$userId", "$$uid"] }, { $eq: ["$schoolId", "$$sid"] }] } } }], as: "membership" } },
      { $facet: {
        validLegacyOnly: [{ $match: { $expr: { $and: [{ $gt: [{ $size: "$school" }, 0] }, { $eq: [{ $size: "$membership" }, 0] }] } } }, { $count: "n" }],
        invalidLegacySchool: [{ $match: { $expr: { $eq: [{ $size: "$school" }, 0] } } }, { $count: "n" }],
      } },
    ]);

    const result = {
      database: dbName(),
      readOnly: true,
      duplicates,
      schoolMembership: {
        missingUsers: countFacet(schoolMembership[0]?.missingUsers),
        missingSchools: countFacet(schoolMembership[0]?.missingSchools),
      },
      teachingAssignments: {
        missingTeachers: countFacet(assignments[0]?.missingTeachers),
        missingSchools: countFacet(assignments[0]?.missingSchools),
        missingClasses: countFacet(assignments[0]?.missingClasses),
      },
      historicalReferences: {
        reviewCardsMissingCurrentQuestion: Number(review[0]?.n || 0),
        lessonProgressMissingCurrentLesson: Number(lesson[0]?.n || 0),
        quizResultMissingQuizWithSnapshot: countFacet(quizHistory[0]?.missingWithSnapshot),
        quizResultMissingQuizWithoutSnapshot: countFacet(quizHistory[0]?.missingWithoutSnapshot),
      },
      migrationReadiness: {
        validLegacySchoolUsersWithoutCanonicalMembership: countFacet(legacySchool[0]?.validLegacyOnly),
        invalidLegacySchoolReferences: countFacet(legacySchool[0]?.invalidLegacySchool),
      },
    };
    console.log(JSON.stringify(result, null, 2));
  } finally {
    await mongoose.disconnect();
  }
}
run().catch(async (error) => {
  console.error("DB-2 reference integrity audit failed");
  console.error(error);
  await mongoose.disconnect().catch(() => undefined);
  process.exitCode = 1;
});
