import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

// Current ownership: root owns finalized submission; adaptiveTelemetryRouter
// owns stand-alone attempts; transport schemas own input validation only.
const read = (file) => readFileSync(path.join(process.cwd(),file), "utf8").replace(/\r\n/g,"\n");
const root = read("server/src/routes/quiz.routes.ts");
const telemetry = read("server/src/modules/quizzes/http/adaptiveTelemetryRoutes.ts");
const schema = read("server/src/modules/quizzes/http/submissionSchemas.ts");
const attemptDocument = read("server/src/modules/quizzes/application/questionAttemptDocument.ts");
const resultModel = read("server/src/models/QuizResult.ts");
const sideEffects = read("server/src/modules/quizzes/application/quizSubmissionSideEffects.ts");

const checks = [];
const check = (name, fn) => {
  try { fn(); checks.push({ name, status: "PASS" }); }
  catch (error) { checks.push({ name, status: "FAIL", details: String(error.message || error) }); }
};
const contains = (src, fragments, label) => {
  for (const fragment of fragments) assert.ok(src.includes(fragment), label + ": missing " + fragment);
};

check("question attempt transport retains typed evidence metadata", () => {
  contains(schema, [
    "questionId: z.string().min(1)", "selectedOptionIndex: z.number().default(-1)",
    "timeSpentSeconds: z.number().default(0)", "date: z.string().optional()",
    'z.enum(["assessment", "remediation", "recheck", "mastery_review"])',
  ], "questionAttempt");
});
check("quiz submission transport retains answer and section schema", () => {
  contains(schema, [
    "answers: z.record(z.coerce.number()).default({})", "timeSpentSeconds: z.number().min(0).default(0)",
    "sectionId: z.string()", "total: z.number().int().min(0).default(0)",
    "score: z.number().min(0).max(100).default(0)",
  ], "quizSubmit");
});
check("final submission remains authenticated and server-scored", () => {
  contains(root, [
    'import { quizSubmitSchema } from "../modules/quizzes/http/submissionSchemas.js";',
    '"/:id/submit"', 'requireAuth', "quizSubmitSchema.parse(req.body)",
    "canSubmitQuiz(quiz, authUser, payload.source)",
    "buildQuizSubmissionAnswerReview({", "QuizResultModel.create({",
    "runQuizSubmissionSideEffects({", "serializeQuizResultForLearner(result)",
  ], "root submit");
});
check("standalone question attempts use dedicated authenticated router", () => {
  contains(root, ["import { adaptiveTelemetryRouter }", "quizRouter.use(adaptiveTelemetryRouter);"], "root composition");
  contains(telemetry, [
    '"/question-attempts"', "requireAuth", "questionAttemptSchema.parse(req.body)",
    "QuestionModel.findOne(buildDocumentQuery(payload.questionId))",
    "QuestionAttemptModel.create(buildQuestionAttemptDocument({",
    "updateSkillProgressFromQuestionAttempt(created, req.authUser!.id)",
  ], "telemetry");
  assert.ok(!root.includes('quizRouter.post(\n  "/question-attempts",'));
  assert.ok(!root.includes("QuestionAttemptModel.create("));
});
check("question-attempt document derives trusted canonical question context", () => {
  contains(attemptDocument, [
    "getCanonicalQuestionSkillIds(question)", "pathId: String(question?.pathId || \"\")",
    "selectedOptionIndex,", "isCorrect,", "userId,"
  ], "question attempt doc");
});
check("accepted quiz result owns retry identity and final side effects", () => {
  contains(root, ["QuizResultModel.countDocuments({", "submissionKey", "QuizResultModel.create({"], "root result");
  contains(resultModel, ["submissionKey:", "unique: true", "sparse: true"], "result model");
  contains(sideEffects, [
    "updateSkillProgressFromResult(args.result, args.userId)",
    "buildFinalizedQuizQuestionAttemptOperations({", "QuestionAttemptModel.bulkWrite(finalAnswerOperations",
  ], "final result side effects");
});
check("transport schema stays model-free and bounded", () => {
  for (const forbidden of ["express", "mongoose", "Router(", "req.", "res.", "QuestionAttemptModel", "QuizResultModel"])
    assert.ok(!schema.includes(forbidden), "schema must not contain " + forbidden);
  assert.ok(schema.split(/\r?\n/).length <= 55);
});
const fails=checks.filter(x=>x.status==="FAIL");
console.log(JSON.stringify({phase:"current-submission-route-boundaries",status:fails.length?"FAIL":"PASS",checks},null,2));
if(fails.length)process.exit(1);
