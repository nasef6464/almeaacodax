import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

const normalizeLf = (s) => s.replace(/\r\n/g, "\n");
const quizRoutesSource = normalizeLf(await read("server/src/routes/quiz.routes.ts"));
const integrityModuleSource = normalizeLf(await read("server/src/modules/quizzes/application/quizQuestionIntegrity.ts"));
const learnerQuizCatalogSource = normalizeLf(await read("server/src/modules/quizzes/application/learnerQuizCatalog.ts"));

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

check("quiz publish path validates question integrity", () => {
  assertIncludes(quizRoutesSource, "quizQuestionIntegrity.js");
  assertIncludes(integrityModuleSource, "export async function validateQuizQuestionIntegrity");
  assertIncludes(quizRoutesSource, "if (willBePublished) {");
  assertIncludes(quizRoutesSource, "const integrity = await validateQuizQuestionIntegrity(payload);");
  assertIncludes(integrityModuleSource, "Cannot publish quiz: some referenced questions are missing or have incomplete content");
});

check("quiz update path validates published quizzes", () => {
  assertIncludes(quizRoutesSource, "if (nextQuizState.isPublished === true) {");
  assertIncludes(quizRoutesSource, "const integrity = await validateQuizQuestionIntegrity(nextQuizState);");
});

check("integrity report endpoint exists for admins", () => {
  assertIncludes(quizRoutesSource, '"/integrity-report"');
  assertIncludes(quizRoutesSource, 'requireRole(["admin"])');
  assertIncludes(quizRoutesSource, "affected: issues.length");
});

check("learner quiz listing excludes unusable quizzes", () => {
  assertIncludes(quizRoutesSource, "loadLearnerSafeQuizCatalogPage({");
  assertIncludes(quizRoutesSource, "learnerAudience: learnerAudienceForCatalog");
  assertIncludes(learnerQuizCatalogSource, "const filterLearnerSafeQuizzes = async");
  assertIncludes(learnerQuizCatalogSource, "isQuizTargetedToLearner(quiz, learnerAudience)");
  assertIncludes(learnerQuizCatalogSource, "const sanitizeLearnerQuizQuestionRefs =");
  assertIncludes(learnerQuizCatalogSource, "const safeQuestionIds = getQuizQuestionIds(quiz).filter(isUsableQuestionId);");
  assertIncludes(learnerQuizCatalogSource, ".filter((section: any) => section.questionIds.length > 0)");
  assertIncludes(learnerQuizCatalogSource, "getQuizQuestionIds(sanitizedQuiz).length === 0");
  assertIncludes(learnerQuizCatalogSource, "const aliases = uniqueStrings([");
  assertIncludes(learnerQuizCatalogSource, "question._id ? String(question._id) :");
});

const failed = checks.filter((item) => item.status === "FAIL");
console.log(JSON.stringify({ total: checks.length, passed: checks.length - failed.length, failed: failed.length, checks }, null, 2));

if (failed.length > 0) {
  process.exit(1);
}
