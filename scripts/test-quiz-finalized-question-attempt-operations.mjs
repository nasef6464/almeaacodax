import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildFinalizedQuizQuestionAttemptOperations } from "../server/src/modules/quizzes/application/quizFinalizedQuestionAttemptOperations.ts";

const questions = new Map([
  ["q1", { id: "q1", pathId: "path", subjectId: "subject", sectionId: "section", skillId: "main", subSkillIds: ["sub"], skillIds: ["main", "sub"], options: ["A","B"] }],
  ["q2", { id: "q2", pathId: "path", subjectId: "subject", skillId: "other", options: ["A","B"] }],
  ["q3", { id: "q3", skillId: "no-answer", options: ["A","B"] }],
]);
const fixture = {
  userId: "fixture-user", quizResultId: "result-1", date: "2026-10-09T13:00:00.000Z",
  source: "recheck", questionById: questions,
  questionReview: [
    { questionId: "q1", selectedOptionIndex: 1, isCorrect: true },
    { questionId: "q1", selectedOptionIndex: 0, isCorrect: false }, // duplicated question
    { questionId: "q2", selectedOptionIndex: 0, isCorrect: false },
    { questionId: "q3" }, // unanswered: not a question interaction
    { questionId: "missing", selectedOptionIndex: 1, isCorrect: true }, // unknown
  ],
};
const ops = buildFinalizedQuizQuestionAttemptOperations(fixture);
assert.equal(ops.length, 2, "only two distinct final answered questions should be included");
const first = ops[0].updateOne;
assert.equal(first.filter.quizResultId, "result-1");
assert.equal(first.filter.questionId, "q1");
assert.equal(first.update.$setOnInsert.selectedOptionIndex, 1);
assert.equal(first.update.$setOnInsert.isCorrect, true);
assert.deepEqual(first.update.$setOnInsert.skillIds, ["main", "sub"]);
assert.equal(first.update.$setOnInsert.evidenceType, "recheck");
assert.equal(ops[1].updateOne.update.$setOnInsert.isCorrect, false);
assert.equal(ops[1].updateOne.update.$setOnInsert.subjectId, "subject");
assert.equal(ops[0].updateOne.upsert, true);
assert.equal(ops[0].updateOne.update.$set, undefined,
  "only $setOnInsert is allowed, to preserve original final evidence");

// Simulate replay of the same accepted result in a fake collection without Mongo access.
const rows = new Map();
for (const pass of [1, 2]) {
  for (const operation of buildFinalizedQuizQuestionAttemptOperations(fixture)) {
    const { filter, update } = operation.updateOne;
    const key = [filter.userId, filter.quizResultId, filter.questionId].join(":");
    if (!rows.has(key)) rows.set(key, update.$setOnInsert);
  }
  assert.equal(rows.size, 2, "repeating side effects must not create extra question evidence");
}
assert.deepEqual(buildFinalizedQuizQuestionAttemptOperations({ ...fixture, quizResultId: "" }), []);
assert.equal(buildFinalizedQuizQuestionAttemptOperations({ ...fixture, source: "unknown" })[0].updateOne.update.$setOnInsert.evidenceType, "assessment");

const model = readFileSync(new URL("../server/src/models/QuestionAttempt.ts", import.meta.url), "utf8");
assert.ok(model.includes("quizResultId: { type: String, default: undefined }"), "legacy attempts must not be automatically scoped");
assert.ok(model.includes("partialFilterExpression: { quizResultId: { $type: \"string\" } }"),
  "new unique index should exclude existing historical attempt rows");

const sideEffects = readFileSync(new URL("../server/src/modules/quizzes/application/quizSubmissionSideEffects.ts", import.meta.url), "utf8");
assert.ok(sideEffects.includes("QuestionAttemptModel.bulkWrite(finalAnswerOperations"), "accepted result must persist final answer ledger");
assert.ok(sideEffects.includes("updateSkillProgressFromResult(args.result, args.userId)"), "server should own mastery aggregation");
assert.ok(!sideEffects.includes("updateSkillProgressFromQuestionAttempt(created"),
  "final answer evidence must not recalculate mastery for every answer");

// Explicit test status: no real database or production service was accessed.
console.log(JSON.stringify({ status: "PASS", checks: 16, finalAnsweredQuestions: ops.length,
  upsertReplayRows: rows.size, unchangedLegacyRows: "schema-preserved", noProductionAccess: true }, null, 2));
