import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

const [
  quizRoutes,
  questionPresentation,
  quizResultModel,
  accessGrantService,
  paymentRoutes,
  authRoutes,
  submissionWindow,
  attemptContext,
  scoreSummary,
  answerReview,
] = await Promise.all([
  read("server/src/routes/quiz.routes.ts"),
  read("server/src/modules/quizzes/presentation/questionPresentation.ts"),
  read("server/src/models/QuizResult.ts"),
  read("server/src/services/accessGrantService.ts"),
  read("server/src/routes/payment.routes.ts"),
  read("server/src/routes/auth.routes.ts"),
  read("server/src/modules/quizzes/application/quizSubmissionWindow.ts"),
  read("server/src/modules/quizzes/application/quizAttemptContext.ts"),
  read("server/src/modules/quizzes/application/quizSubmissionScoreSummary.ts"),
  read("server/src/modules/quizzes/application/quizSubmissionAnswerReview.ts"),
]);

const checks = [];

function check(name, assertion) {
  try {
    assertion();
    checks.push({ name, status: "PASS" });
  } catch (error) {
    checks.push({ name, status: "FAIL", details: error instanceof Error ? error.message : String(error) });
  }
}

function assertIncludes(source, fragment, message) {
  if (!source.includes(fragment)) {
    throw new Error(message || `Missing fragment: ${fragment}`);
  }
}

function assertNotIncludes(source, fragment, message) {
  if (source.includes(fragment)) {
    throw new Error(message || `Unexpected fragment: ${fragment}`);
  }
}

check("direct result creation remains blocked and audited", () => {
  assertIncludes(quizRoutes, '"/results"');
  assertIncludes(quizRoutes, "quiz.direct_result.blocked");
  assertIncludes(quizRoutes, "StatusCodes.GONE");
  assertIncludes(quizRoutes, "DIRECT_RESULT_DISABLED_MESSAGE");
});

check("quiz submit enforces server-side window, attempt limits, and duplicate protection", () => {
  assertIncludes(quizRoutes, 'import { assertQuizSubmissionWindow } from "../modules/quizzes/application/quizSubmissionWindow.js";');
  assertIncludes(quizRoutes, "const quizWindow = assertQuizSubmissionWindow({");
  assertIncludes(submissionWindow, "now > dueDateMs");
  assertIncludes(submissionWindow, "Quiz submission deadline has passed");
  assertIncludes(quizRoutes, 'import { buildQuizSubmissionAttemptState, getQuizMaxAttempts, getQuizPassingScore } from "../modules/quizzes/application/quizAttemptContext.js";');
  assertIncludes(quizRoutes, "const maxAttempts = getQuizMaxAttempts(quiz)");
  assertIncludes(quizRoutes, "const attemptState = buildQuizSubmissionAttemptState({");
  assertIncludes(attemptContext, "previousAttempts >= maxAttempts");
  assertIncludes(attemptContext, "submissionKey: buildSubmissionKey(userId, quizId, attemptNumber)");
  assertIncludes(quizRoutes, "Quiz submission already processed");
});

check("quiz score and pass/fail are calculated only on the server", () => {
  assertIncludes(quizRoutes, 'import { buildQuizSubmissionScoreSummary } from "../modules/quizzes/application/quizSubmissionScoreSummary.js";');
  assertIncludes(quizRoutes, "const scoreSummary = buildQuizSubmissionScoreSummary({");
  assertIncludes(scoreSummary, "const score = Math.round((correctAnswers / Math.max(totalQuestions, 1)) * 100)");
  assertIncludes(scoreSummary, "passed: score >= passingScore");
  assertIncludes(answerReview, "const isCorrect = selectedOptionIndex === Number(question.correctOptionIndex ?? 0)");
  assertNotIncludes(quizRoutes, "payload.score");
  assertNotIncludes(quizRoutes, "payload.passed");
});

check("learner question list does not expose answer keys before submission", () => {
  assertIncludes(quizRoutes, "sanitizeQuestionForLearner");
  assertIncludes(quizRoutes, "canSeeAnswers");
  assertIncludes(questionPresentation, "export const sanitizeQuestionForLearner");
  assertIncludes(questionPresentation, "const { correctOptionIndex, explanation, __v, ...safeQuestion } = question");
  assertIncludes(questionPresentation, "return safeQuestion");
});

check("result model stores attempt metadata for audit and race protection", () => {
  assertIncludes(quizResultModel, "passed");
  assertIncludes(quizResultModel, "attemptNumber");
  assertIncludes(quizResultModel, "timeSpentSeconds");
  assertIncludes(quizResultModel, "submissionKey");
  assertIncludes(quizResultModel, "userId: 1, quizId: 1, attemptNumber: 1");
});

check("subscriptions and access still flow through AccessGrant and atomic approvals", () => {
  assertIncludes(accessGrantService, "grantAccessToUser");
  assertIncludes(accessGrantService, "$addToSet");
  assertIncludes(paymentRoutes, "PaymentRequestModel.findOneAndUpdate");
  assertIncludes(paymentRoutes, "grantApprovedPaymentAccess");
  assertIncludes(authRoutes, "AccessCodeModel.findOneAndUpdate");
  assertIncludes(authRoutes, 'sourceType: "access_code"');
});

const failed = checks.filter((item) => item.status === "FAIL");
console.log(JSON.stringify({ total: checks.length, passed: checks.length - failed.length, failed: failed.length, checks }, null, 2));

if (failed.length > 0) {
  process.exit(1);
}
