import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

const [quizRoutes, quizResultsRoutes, serializerSource, quizPage, resultsPage, quizPresentation] = await Promise.all([
  read("server/src/routes/quiz.routes.ts"),
  read("server/src/routes/quizResults.routes.ts"),
  read("server/src/utils/quizResultSerialization.ts"),
  read("pages/QuizPage.tsx"),
  read("pages/Results.tsx"),
  read("utils/quizPresentation.ts"),
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

check("submit endpoint must serialize quiz result before responding", () => {
  assertIncludes(quizRoutes, "serializeQuizResultForLearner", "quiz submit route must use learner-safe quiz result serializer");
  assertNotIncludes(quizRoutes, "return res.status(StatusCodes.CREATED).json(result);", "quiz submit must not return raw QuizResult");
});

check("quiz result detail endpoint must serialize owner response", () => {
  assertIncludes(quizResultsRoutes, "serializeQuizResultForLearner", "quiz result detail route must use learner-safe serializer");
  assertNotIncludes(quizResultsRoutes, "result,\n      analysis", "quiz result detail must not return raw result object");
});

check("learner result payload must not include answer key fields", () => {
  assertIncludes(serializerSource, "correctOptionIndex: undefined", "serializer must explicitly remove correctOptionIndex");
  assertIncludes(serializerSource, "explanation: undefined", "serializer must explicitly remove explanation");
});

check("quiz page must not restore local answer keys over server-safe result", () => {
  assertNotIncludes(quizPage, "savedServerResult.questionReview = result.questionReview", "client must not re-inject local questionReview with answer keys");
});

check("results page must not reveal correct answer or explanation to learners", () => {
  assertNotIncludes(resultsPage, "الإجابة الصحيحة:", "results page must not render correct answer text");
  assertNotIncludes(resultsPage, "q.correctOptionIndex", "results page must not depend on correctOptionIndex");
  assertNotIncludes(resultsPage, "q.explanation", "results page must not render stored explanation");
  assertNotIncludes(quizPresentation, "sourceQuestion.correctOptionIndex", "question bank fallback must not restore answer keys");
  assertNotIncludes(quizPresentation, "sourceQuestion.explanation", "question bank fallback must not restore explanations");
});

for (const item of checks) {
  console.log(`${item.status} ${item.name}${item.details ? ` - ${item.details}` : ""}`);
}

const failed = checks.filter((item) => item.status === "FAIL");
if (failed.length > 0) {
  console.error(`\n${failed.length} quiz answer exposure contract check(s) failed.`);
  process.exit(1);
}

console.log(`\nAll ${checks.length} quiz answer exposure contract checks passed.`);
