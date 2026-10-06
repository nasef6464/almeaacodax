import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const routePath = path.join(root, 'server/src/routes/quiz.routes.ts');
let source = fs.readFileSync(routePath, 'utf8').replace(/\r\n/g, '\n');

const importAnchor = 'import { dashboardAnalyticsQuerySchema, questionBaseSchema, questionListQuerySchema, questionSchema, quizResultsListQuerySchema } from "../modules/quizzes/http/questionQuerySchemas.js";';
const schemaImport = 'import { quizSchema } from "../modules/quizzes/http/quizDefinitionSchema.js";';
const rangeStart = 'const quizSchema = z.object({';
const rangeEnd = 'const normalizeQuizPlacementPayload = <T extends Record<string, any>>(payload: T, fallbackType = "quiz") => {';

const alreadyApplied = source.includes(schemaImport) && !source.includes(rangeStart);
if (alreadyApplied) {
  console.log(JSON.stringify({ status: 'ALREADY_APPLIED', phase: 'quiz-definition-schema' }, null, 2));
  process.exit(0);
}

if (!source.includes(importAnchor)) throw new Error('Quiz definition schema import anchor not found.');
if (source.includes(schemaImport)) throw new Error('Quiz definition schema import exists while local declaration remains.');

const startIndex = source.indexOf(rangeStart);
const endIndex = source.indexOf(rangeEnd, startIndex + rangeStart.length);
if (startIndex < 0 || endIndex < 0) throw new Error('Quiz definition schema range not found.');
if (source.indexOf(rangeStart, startIndex + rangeStart.length) >= 0) throw new Error('Quiz definition schema anchor is ambiguous.');

const range = source.slice(startIndex, endIndex);
for (const required of [
  'quizKind: z.enum(["drill", "test", "mock"]).default("test")',
  'learningPlacements: z.array(z.object({',
  'mockExam: z.object({',
  'targetGroupIds: z.array(z.string()).default([])',
  'approvalStatus: z.enum(["draft", "pending_review", "approved", "rejected"]).optional()',
]) {
  if (!range.includes(required)) throw new Error(`Quiz definition schema range lost ${required}`);
}
for (const forbidden of [
  rangeEnd,
  'const questionAttemptSchema = z.object({',
  'const quizSubmitSchema = z.object({',
  'const validateQuizQuestionIntegrity = async',
]) {
  if (range.includes(forbidden)) throw new Error(`Quiz definition extraction crossed ownership boundary: ${forbidden}`);
}

source = `${source.slice(0, startIndex)}${source.slice(endIndex)}`;
source = source.replace(importAnchor, `${importAnchor}\n${schemaImport}`);
fs.writeFileSync(routePath, source);

console.log(JSON.stringify({
  status: 'APPLIED',
  phase: 'quiz-definition-schema',
  files: ['server/src/routes/quiz.routes.ts'],
}, null, 2));
