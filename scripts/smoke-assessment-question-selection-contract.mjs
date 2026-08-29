import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const route = await read("server/src/routes/quiz.routes.ts");
const selection = await read("server/src/modules/quizzes/application/quizQuestionSelection.ts");

const checks = [
  ["selection module exports question identity resolver", selection.includes("export function getQuizQuestionIds")],
  ["mock sections take precedence when enabled", selection.includes("quiz?.mockExam?.enabled === true") && selection.includes("mockQuestionIds.length > 0")],
  ["selection module resolves skill ids from question references", selection.includes("export async function resolveQuizSkillIds") && selection.includes('select("skillIds")')],
  ["route delegates selection helpers", route.includes('application/quizQuestionSelection.js') && route.includes("getQuizQuestionIds(quiz)")],
  ["route keeps question persistence and scoring orchestration", route.includes("QuestionModel.find(buildDocumentsByIdsQuery(questionIds))") && route.includes("QuizResultModel.create({")],
];

const failed = checks.filter(([, passed]) => !passed);
for (const [name, passed] of checks) console.log(`${passed ? "PASS" : "FAIL"} ${name}`);
if (failed.length) process.exit(1);
console.log(`Assessment question selection contract passed (${checks.length} checks).`);
