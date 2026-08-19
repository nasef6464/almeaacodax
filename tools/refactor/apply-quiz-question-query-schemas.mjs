import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const routePath = path.join(root, 'server/src/routes/quiz.routes.ts');
let source = fs.readFileSync(routePath, 'utf8').replace(/\r\n/g, '\n');

const importAnchor = 'import { createNotificationDeliveries } from "../services/notificationService.js";';
const schemaImport = 'import { dashboardAnalyticsQuerySchema, questionBaseSchema, questionListQuerySchema, questionSchema, quizResultsListQuerySchema } from "../modules/quizzes/http/questionQuerySchemas.js";';
const rangeStart = 'const questionBaseSchema = z.object({';
const rangeEnd = 'const QUESTION_SUMMARY_TEXT_LIMIT = 280;';
const localDeclarations = [
  rangeStart,
  'const questionSchema = questionBaseSchema.refine(',
  'const questionListQuerySchema = z.object({',
  'const dashboardAnalyticsQuerySchema = z.object({',
  'const quizResultsListQuerySchema = z.object({',
];

const alreadyApplied = source.includes(schemaImport) && localDeclarations.every((declaration) => !source.includes(declaration));
if (alreadyApplied) {
  console.log(JSON.stringify({ status: 'ALREADY_APPLIED', phase: 'quiz-question-query-schemas' }, null, 2));
  process.exit(0);
}

if (!source.includes(importAnchor)) throw new Error('Quiz question/query schema import anchor not found.');
if (source.includes(schemaImport)) throw new Error('Quiz question/query schema import exists while local declarations remain.');

const startIndex = source.indexOf(rangeStart);
const endIndex = source.indexOf(rangeEnd, startIndex + rangeStart.length);
if (startIndex < 0 || endIndex < 0) throw new Error('Quiz question/query schema range not found.');
if (source.indexOf(rangeStart, startIndex + rangeStart.length) >= 0) throw new Error('Quiz question schema anchor is ambiguous.');

const range = source.slice(startIndex, endIndex);
for (const declaration of localDeclarations) {
  if (!range.includes(declaration)) throw new Error(`Quiz question/query schema range lost ${declaration}`);
}
for (const forbidden of [
  'const QUESTION_SUMMARY_TEXT_LIMIT = 280;',
  'let publicQuizListCache',
  'const validateQuizQuestionIntegrity = async',
  'const quizSchema = z.object({',
]) {
  if (range.includes(forbidden)) throw new Error(`Quiz question/query extraction crossed ownership boundary: ${forbidden}`);
}

source = `${source.slice(0, startIndex)}${source.slice(endIndex)}`;
source = source.replace(importAnchor, `${importAnchor}\n${schemaImport}`);
fs.writeFileSync(routePath, source);

console.log(JSON.stringify({
  status: 'APPLIED',
  phase: 'quiz-question-query-schemas',
  files: ['server/src/routes/quiz.routes.ts'],
}, null, 2));
