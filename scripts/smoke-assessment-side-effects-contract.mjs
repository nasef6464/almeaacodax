import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const route = await read("server/src/routes/quiz.routes.ts");
const moduleSource = await read("server/src/modules/quizzes/application/quizSubmissionSideEffects.ts");

const checks = [
  ["assessment application module owns submission side effects", moduleSource.includes("export async function runQuizSubmissionSideEffects")],
  ["skill progress update remains in application module", moduleSource.includes("export async function updateSkillProgressFromResult") && moduleSource.includes("SkillProgressModel.findOneAndUpdate")],
  ["review cards remain in application module", moduleSource.includes("ReviewCardModel.bulkWrite") && moduleSource.includes("upsertReviewCardsFromQuestionReview")],
  ["notification remains non-critical", moduleSource.includes("createNotificationDeliveries") && moduleSource.includes("Promise.allSettled")],
  ["quiz route delegates submission side effects", route.includes("runQuizSubmissionSideEffects({") && route.includes("quizSubmissionSideEffects.js")],
  ["route no longer owns review-card implementation", !route.includes("ReviewCardModel") && !route.includes("upsertReviewCardsFromQuestionReview")],
];

const failed = checks.filter(([, passed]) => !passed);
for (const [name, passed] of checks) console.log(`${passed ? "PASS" : "FAIL"} ${name}`);
if (failed.length) process.exit(1);
console.log(`Assessment side-effects contract passed (${checks.length} checks).`);
