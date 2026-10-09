import assert from "node:assert/strict";
import mongoose from "mongoose";
import { QuestionAttemptModel } from "../models/QuestionAttempt.js";
import { SkillProgressModel } from "../models/SkillProgress.js";
import { updateSkillProgressFromResult } from "../modules/quizzes/application/quizSubmissionSkillProgress.js";
import { buildFinalizedQuizQuestionAttemptOperations } from "../modules/quizzes/application/quizFinalizedQuestionAttemptOperations.js";

// Intentionally hard-coded to a disposable loopback DB. No environment-supplied URI,
// credentials, Atlas, Render or external Mongo endpoints are accepted.
const fixtureDatabase = "almeaa_quiz_fixture_disposable_20261009";
const fixtureUri = "mongodb://127.0.0.1:27017/" + fixtureDatabase;
if (process.env.ALMEAA_ISOLATED_MONGO_TEST !== "yes") {
  throw new Error("Set ALMEAA_ISOLATED_MONGO_TEST=yes for disposable localhost fixture only");
}
const q1 = { id: "fake-q1", skillId: "fake-skill", subSkillIds: ["fake-subskill"], pathId: "fake-path" };
const q2 = { id: "fake-q2", skillId: "fake-skill-2", subjectId: "fake-subject" };
const base = {
  userId: "fake-student-a",
  quizResultId: "fake-result-a",
  questionById: new Map<string, any>([[q1.id, q1], [q2.id, q2]]),
  date: "2026-10-09T00:00:00.000Z",
  questionReview: [
    { questionId: q1.id, selectedOptionIndex: 1, isCorrect: true },
    { questionId: q2.id, selectedOptionIndex: 0, isCorrect: false },
    { questionId: "fake-unanswered", isCorrect: false },
  ],
};
const operations = buildFinalizedQuizQuestionAttemptOperations(base);
assert.equal(operations.length, 2);
const findings: Record<string, number | string> = {};
try {
  await mongoose.connect(fixtureUri, { serverSelectionTimeoutMS: 8000 });
  assert.equal(mongoose.connection.host, "127.0.0.1", "Mongo host must be loopback only");
  assert.equal(mongoose.connection.name, fixtureDatabase, "DB must be disposable test fixture");
  // Never drop any database other than the hard-coded local fixture.
  await mongoose.connection.dropDatabase();
  await QuestionAttemptModel.createIndexes();
  const indexList = await QuestionAttemptModel.collection.indexes();
  const scopedUnique = indexList.find((index) =>
    index.unique === true && index.key?.userId === 1 &&
    index.key?.quizResultId === 1 && index.key?.questionId === 1,
  );
  assert.ok(scopedUnique, "result-specific unique index must exist");
  assert.deepEqual(scopedUnique.partialFilterExpression, { quizResultId: { $type: "string" } });
  findings.partialUniqueIndex = "PASS";

  // Existing QuestionAttempt rows without quizResultId may be duplicated historically.
  const legacy = {
    userId: base.userId, questionId: q1.id, selectedOptionIndex: 0,
    isCorrect: false, skillIds: ["fake-skill"], evidenceType: "assessment",
  };
  await QuestionAttemptModel.insertMany([legacy, legacy]);
  assert.equal(await QuestionAttemptModel.countDocuments({ quizResultId: { $exists: false } }), 2);
  findings.legacyRowsPreserved = 2;

  // Race on FIRST insertion, not only replay of pre-existing finalized rows.
  // Use a fresh result key to ensure all workers compete for the same unique index entries.
  const firstInsertOperations = buildFinalizedQuizQuestionAttemptOperations({
    ...base, quizResultId: "fake-result-first-insert-race",
  });
  const firstInsertRace = await Promise.allSettled(
    Array.from({ length: 4 }, () =>
      QuestionAttemptModel.bulkWrite(firstInsertOperations, { ordered: false }),
    ),
  );
  assert.equal(firstInsertRace.filter((outcome) => outcome.status === "rejected").length, 0,
    "first-insert upserts must not fail when four writers race");
  assert.equal(await QuestionAttemptModel.countDocuments({ quizResultId: "fake-result-first-insert-race" }), 2,
    "four concurrent first-insert submissions must produce one row per final question");
  assert.equal(await QuestionAttemptModel.countDocuments({ quizResultId: { $exists: false } }), 2,
    "concurrent finalization must not modify historical evidence");
  findings.concurrentFirstInsertWorkers = 4;

  await QuestionAttemptModel.bulkWrite(operations, { ordered: false });
  await QuestionAttemptModel.bulkWrite(operations, { ordered: false });
  assert.equal(await QuestionAttemptModel.countDocuments({ quizResultId: base.quizResultId }), 2);
  findings.repeatedSubmissionsRows = 2;

  // Replays with a changed client payload must not rewrite authoritative final answers.
  const altered = buildFinalizedQuizQuestionAttemptOperations({
    ...base, questionReview: [
      { questionId: q1.id, selectedOptionIndex: 0, isCorrect: false },
      { questionId: q2.id, selectedOptionIndex: 1, isCorrect: true },
    ],
  });
  await QuestionAttemptModel.bulkWrite(altered, { ordered: false });
  const first = await QuestionAttemptModel.findOne({
    userId: base.userId, quizResultId: base.quizResultId, questionId: q1.id,
  }).lean();
  assert.equal(first?.selectedOptionIndex, 1);
  assert.equal(first?.isCorrect, true);
  assert.deepEqual(first?.skillIds, ["fake-skill", "fake-subskill"]);
  findings.immutableAcceptedAnswer = "PASS";

  const batch = await Promise.allSettled(
    Array.from({ length: 4 }, () =>
      QuestionAttemptModel.bulkWrite(operations, { ordered: false }),
    ),
  );
  const failed = batch.filter((item) => item.status === "rejected");
  assert.equal(failed.length, 0, "concurrent replay must not error");
  assert.equal(await QuestionAttemptModel.countDocuments({ quizResultId: base.quizResultId }), 2);
  findings.concurrentReplayWorkers = 4;

  await QuestionAttemptModel.bulkWrite(
    buildFinalizedQuizQuestionAttemptOperations({ ...base, quizResultId: "fake-result-b" }),
    { ordered: false },
  );
  await QuestionAttemptModel.bulkWrite(
    buildFinalizedQuizQuestionAttemptOperations({ ...base, userId: "fake-student-b" }),
    { ordered: false },
  );
  assert.equal(await QuestionAttemptModel.countDocuments({}), 10);
  findings.crossResultAndUserIsolation = "PASS";

  // Exercise the real result-to-skill persistence path, not only question ledger upserts.
  await SkillProgressModel.createIndexes();
  const skillResult = {
    _id: "fake-skill-result-1", submissionKey: "fake-submission-once",
    quizId: "fake-quiz", quizTitle: "Fixture", date: base.date,
    skillsAnalysis: [{ skillId: "fake-skill", pathId: "fake-path",
      subjectId: "fake-subject", mastery: 75, questionCount: 2, correctCount: 1 }],
  };
  await updateSkillProgressFromResult(skillResult, base.userId);
  const initialSkill = await SkillProgressModel.findOne({ userId: base.userId,
    skillId: "fake-skill", pathId: "fake-path", subjectId: "fake-subject" }).lean();
  assert.equal(initialSkill?.attempts, 1);
  assert.equal(initialSkill?.evidenceCount, 2);
  await updateSkillProgressFromResult(skillResult, base.userId);
  const replayedSkill = await SkillProgressModel.findOne({ userId: base.userId,
    skillId: "fake-skill", pathId: "fake-path", subjectId: "fake-subject" }).lean();
  assert.equal(replayedSkill?.attempts, 1, "sequential replay must not double-count skill attempts");
  assert.equal(replayedSkill?.evidenceCount, 2, "sequential replay must not double-count evidence");
  findings.skillProgressSequentialReplay = "PASS";

  // Separate learner + fresh submission to detect a read/modify/write concurrency race.
  const concurrentUser = "fake-student-concurrent";
  const skillRace = await Promise.allSettled(Array.from({ length: 4 }, () =>
    updateSkillProgressFromResult(skillResult, concurrentUser)));
  assert.equal(skillRace.filter((outcome) => outcome.status === "rejected").length, 0,
    "concurrent skill progress writes should not reject");
  const racedSkill = await SkillProgressModel.findOne({ userId: concurrentUser,
    skillId: "fake-skill", pathId: "fake-path", subjectId: "fake-subject" }).lean();
  assert.equal(racedSkill?.attempts, 1,
    "four concurrent replays of one submission must count as one skill attempt");
  assert.equal(racedSkill?.evidenceCount, 2,
    "four concurrent replays of one submission must count evidence once");
  findings.skillProgressConcurrentReplayWorkers = 4;

  console.log(JSON.stringify({ status: "PASS", fixture: fixtureDatabase,
    noExternalServices: true, findings }, null, 2));
} finally {
  if (mongoose.connection.readyState === 1 &&
      mongoose.connection.host === "127.0.0.1" &&
      mongoose.connection.name === fixtureDatabase) {
    await mongoose.connection.dropDatabase();
  }
  await mongoose.disconnect();
}
