import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const routePath = path.join(root, 'server/src/routes/quiz.routes.ts');
let source = fs.readFileSync(routePath, 'utf8').replace(/\r\n/g, '\n');

const importAnchor = 'import { quizSchema } from "../modules/quizzes/http/quizDefinitionSchema.js";';
const schemaImport = 'import { questionAttemptSchema, quizSubmitSchema } from "../modules/quizzes/http/submissionSchemas.js";';
const rangeStart = 'const questionAttemptSchema = z.object({';
const rangeEnd = 'const DIRECT_RESULT_DISABLED_MESSAGE =';

const alreadyApplied = source.includes(schemaImport) && !source.includes(rangeStart) && !source.includes('const quizSubmitSchema = z.object({');
if (alreadyApplied) {
  console.log(JSON.stringify({ status: 'ALREADY_APPLIED', phase: 'quiz-submission-schemas' }, null, 2));
  process.exit(0);
}

if (!source.includes(importAnchor)) throw new Error('Quiz submission schema import anchor not found.');
if (source.includes(schemaImport)) throw new Error('Quiz submission schema import exists while local declarations remain.');

const startIndex = source.indexOf(rangeStart);
const endIndex = source.indexOf(rangeEnd, startIndex + rangeStart.length);
if (startIndex < 0 || endIndex < 0) throw new Error('Quiz submission schema range not found.');
if (source.indexOf(rangeStart, startIndex + rangeStart.length) >= 0) throw new Error('Question attempt schema anchor is ambiguous.');

const range = source.slice(startIndex, endIndex);
for (const required of [
  'questionId: z.string().min(1)',
  'selectedOptionIndex: z.number().default(-1)',
  'answers: z.record(z.coerce.number()).default({})',
  'timeSpentSeconds: z.number().min(0).default(0)',
  'sectionResults: z',
  'score:       z.number().min(0).max(100).default(0)',
]) {
  if (!range.includes(required)) throw new Error(`Quiz submission schema range lost ${required}`);
}
for (const forbidden of [
  rangeEnd,
  'const getQuizMaxAttempts =',
  'const assertQuizWindowIsOpen =',
  'const buildSubmissionKey =',
  'const canSubmitQuiz = async',
]) {
  if (range.includes(forbidden)) throw new Error(`Quiz submission schema extraction crossed behavior boundary: ${forbidden}`);
}

source = `${source.slice(0, startIndex)}${source.slice(endIndex)}`;
source = source.replace(importAnchor, `${importAnchor}\n${schemaImport}`);
fs.writeFileSync(routePath, source);

console.log(JSON.stringify({
  status: 'APPLIED',
  phase: 'quiz-submission-schemas',
  files: ['server/src/routes/quiz.routes.ts'],
}, null, 2));
