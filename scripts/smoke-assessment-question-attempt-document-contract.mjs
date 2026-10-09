import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

const read = (file) => readFileSync(path.join(process.cwd(), file), "utf8").replace(/\r\n/g, "\n");
const route = read("server/src/modules/quizzes/http/adaptiveTelemetryRoutes.ts");
const builder = read("server/src/modules/quizzes/application/questionAttemptDocument.ts");
const schema = read("server/src/models/QuestionAttempt.ts");
const finalBuilder = read("server/src/modules/quizzes/application/quizFinalizedQuestionAttemptOperations.ts");
const effects = read("server/src/modules/quizzes/application/quizSubmissionSideEffects.ts");
const checks = [];
const check = (name, fn) => {
  try { fn(); checks.push({ name, status: "PASS" }); }
  catch (error) { checks.push({ name, status: "FAIL", details: String(error.message || error) }); }
};
const requires = (src, fragments, owner) => {
  for (const fragment of fragments) assert.ok(src.includes(fragment), owner + ": missing " + fragment);
};

check("question attempt document builder has the dedicated route owner", () => {
  requires(route, [
    'import { buildQuestionAttemptDocument } from "../application/questionAttemptDocument.js";',
    "QuestionAttemptModel.create(buildQuestionAttemptDocument({",
  ], "telemetry");
  assert.ok(!route.includes("QuestionAttemptModel.create({\n      ...payload"));
});
check("builder never trusts client correctness or skill scope", () => {
  requires(builder, [
    "...payload,", "selectedOptionIndex,", "isCorrect,", "userId,",
    "date: payload.date || new Date().toISOString()",
    'pathId: String(question?.pathId || "")',
    "skillIds: getCanonicalQuestionSkillIds(question)",
  ], "questionAttemptDocument");
});
check("dedicated route derives correctness from canonical server question", () => {
  requires(route, [
    "QuestionModel.findOne(buildDocumentQuery(payload.questionId))",
    "const isCorrect =", "Number(question.correctOptionIndex ?? 0)",
    "updateSkillProgressFromQuestionAttempt(created, req.authUser!.id)",
    "upsertReviewCardFromQuestionAttempt({",
    "res.status(StatusCodes.CREATED).json(created)",
  ], "telemetry");
});
check("accepted result ledger uses an isolated result key and does not emit draft evidence", () => {
  requires(schema, [
    "quizResultId: { type: String, default: undefined }",
    'partialFilterExpression: { quizResultId: { $type: "string" } }',
  ], "QuestionAttempt model");
  requires(effects, [
    "buildFinalizedQuizQuestionAttemptOperations({", "QuestionAttemptModel.bulkWrite(finalAnswerOperations",
    "updateSkillProgressFromResult(args.result, args.userId)",
  ], "result side effects");
  requires(finalBuilder, [
    "seen.has(questionId)", "selectedOptionIndex < 0",
    "$setOnInsert", "quizResultId",
  ], "final evidence builder");
});
check("standalone question-attempt builder stays model-free and bounded", () => {
  for (const forbidden of ["express", "mongoose", "Router(", "req.", "res.", "QuizModel",
    "QuestionModel", "QuestionAttemptModel", "requireRole", "process.env"])
    assert.ok(!builder.includes(forbidden), "attempt builder must not include " + forbidden);
  assert.ok(builder.split(/\r?\n/).length <= 36);
});
const failed=checks.filter(x=>x.status==="FAIL");
console.log(JSON.stringify({phase:"question-attempt-and-final-evidence-ownership",status:failed.length?"FAIL":"PASS",checks},null,2));
if(failed.length)process.exit(1);
