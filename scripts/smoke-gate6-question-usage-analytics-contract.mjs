import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

const [route, routeIndex, client, manager] = await Promise.all([
  read("server/src/routes/questionAnalytics.routes.ts"),
  read("server/src/routes/index.ts"),
  read("services/apiGroups/questionsApi.ts"),
  read("dashboards/admin/QuestionBankManager.tsx"),
]);

const check = (name, fn) => {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
};

check("analytics endpoint is staff-authenticated and bounded to admin/teacher question-bank roles", () => {
  assert.ok(route.includes('requireRole(["admin", "teacher"])'));
  assert.ok(route.includes("requestedIds.length > 100"));
  assert.ok(route.includes('apiRouter.use("/question-analytics", questionAnalyticsRouter)') || routeIndex.includes('apiRouter.use("/question-analytics", questionAnalyticsRouter)'));
});

check("analytics uses existing question-attempt evidence without changing scoring or persistence", () => {
  assert.ok(route.includes("QuestionAttemptModel.aggregate"));
  assert.ok(route.includes('questionId: { $in: attemptQuestionIds }'));
  assert.ok(route.includes('correctAnswers: { $sum: { $cond: ["$isCorrect", 1, 0] } }'));
  assert.ok(route.includes('totalTimeSeconds: { $sum: { $ifNull: ["$timeSpentSeconds", 0] } }'));
  assert.ok(route.includes('studentIds: { $addToSet: "$userId" }'));
  assert.ok(!route.includes("QuestionAttemptModel.create"));
  assert.ok(!route.includes("QuizResultModel"));
});

check("teacher analytics respects the same managed curriculum scope used by the question bank", () => {
  assert.ok(route.includes("managedPathIds"));
  assert.ok(route.includes("managedSubjectIds"));
  assert.ok(route.includes('authUser.role === "teacher"'));
});

check("public analytics response exposes aggregates, not student identities", () => {
  for (const field of ["attempts", "correctAnswers", "accuracyPercent", "averageTimeSeconds", "uniqueStudents", "lastAttemptAt"]) {
    assert.ok(route.includes(field), `missing analytics field ${field}`);
  }
  assert.ok(!route.includes("studentIds: metric?.studentIds"));
  assert.ok(!route.includes("users: metric"));
});

check("frontend requests only the visible bounded question page", () => {
  assert.ok(client.includes("getQuestionUsageAnalytics"));
  assert.ok(client.includes("slice(0, 100)"));
  assert.ok(client.includes('cache: "no-store"'));
  assert.ok(manager.includes("api.getQuestionUsageAnalytics"));
  assert.ok(manager.includes("displayedQuestions"));
});

check("question bank shows factual usage and quality metrics without invented quality thresholds", () => {
  for (const label of ["المحاولات", "الدقة", "متوسط الوقت"]) {
    assert.ok(manager.includes(label), `question bank missing ${label}`);
  }
  assert.ok(manager.includes("accuracyPercent"));
  assert.ok(manager.includes("averageTimeSeconds"));
  assert.ok(!manager.includes("QUESTION_QUALITY_THRESHOLD"));
  assert.ok(!manager.includes("accuracyPercent >="));
});

console.log("Gate 6 question usage analytics contract passed.");
