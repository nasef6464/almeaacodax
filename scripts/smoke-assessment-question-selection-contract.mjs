import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const route = await read("server/src/routes/quiz.routes.ts");
const selection = await read("server/src/modules/quizzes/application/quizQuestionSelection.ts");
const integrity = await read("server/src/modules/quizzes/application/quizQuestionIntegrity.ts");
const integrationGate = await read("server/src/scripts/backendIntegrationGate.ts");

const checks = [
  ["selection module exports question identity resolver", selection.includes("export function getQuizQuestionIds")],
  ["mock sections take precedence when enabled", selection.includes("quiz?.mockExam?.enabled === true") && selection.includes("mockQuestionIds.length > 0")],
  ["selection module resolves skill ids from question references", selection.includes("export async function resolveQuizSkillIds") && selection.includes('select("skillIds")')],
  ["route delegates selection helpers", route.includes('application/quizQuestionSelection.js') && route.includes("getQuizQuestionIds(quiz)")],
  ["route keeps question persistence and scoring orchestration", route.includes("QuestionModel.find(buildDocumentsByIdsQuery(questionIds))") && route.includes("QuizResultModel.create({")],
  ["integrity guard rejects missing published question references", integrity.includes("missingIds.push(id)") && integrity.includes("Cannot publish quiz: some referenced questions are missing")],
  ["isolated HTTP gate rejects and does not save missing-question assessments", integrationGate.includes("published assessment with a missing question is rejected") && integrationGate.includes("MISSING_QUESTION_ID") && integrationGate.includes("QuizModel.countDocuments({ id: MISSING_QUESTION_QUIZ_ID })")],
  ["integrity guard rejects unusable published question content", integrity.includes("invalidContentIds.push(id)") && integrity.includes("Cannot publish quiz: some referenced questions are missing or have incomplete content")],
  ["isolated HTTP gate rejects and does not save invalid-question assessments", integrationGate.includes("published assessment with invalid question content is rejected") && integrationGate.includes("INVALID_QUESTION_ID") && integrationGate.includes("QuizModel.countDocuments({ id: INVALID_QUESTION_QUIZ_ID })")],
];

const failed = checks.filter(([, passed]) => !passed);
for (const [name, passed] of checks) console.log(`${passed ? "PASS" : "FAIL"} ${name}`);
if (failed.length) process.exit(1);
console.log(`Assessment question selection contract passed (${checks.length} checks).`);
