import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const routePath = path.join(root, 'server/src/routes/quiz.routes.ts');
let source = fs.readFileSync(routePath, 'utf8').replace(/\r\n/g, '\n');

const importAnchor = 'import { questionAttemptSchema, quizSubmitSchema } from "../modules/quizzes/http/submissionSchemas.js";';
const presentationImport = 'import { isQuestionContentUsable, sanitizeQuestionForLearner, toQuestionSummaryText } from "../modules/quizzes/presentation/questionPresentation.js";';
const constantLine = 'const QUESTION_SUMMARY_TEXT_LIMIT = 280;\n';
const rangeStart = 'const escapeHtml = (value: string) =>';
const rangeEnd = 'const validateQuizQuestionIntegrity = async';

const localDeclarations = [
  'const escapeHtml = (value: string) =>',
  'const toQuestionSummaryText = (value: unknown) =>',
  'const sanitizeQuestionForLearner = (question: Record<string, any>) =>',
  'const isQuestionContentUsable = (question: any) =>',
];

const alreadyApplied =
  source.includes(presentationImport) &&
  !source.includes(constantLine.trim()) &&
  localDeclarations.every((declaration) => !source.includes(declaration));
if (alreadyApplied) {
  console.log(JSON.stringify({ status: 'ALREADY_APPLIED', phase: 'quiz-question-presentation' }, null, 2));
  process.exit(0);
}

if (!source.includes(importAnchor)) throw new Error('Question presentation import anchor not found.');
if (source.includes(presentationImport)) throw new Error('Question presentation import exists while local declarations remain.');
if (!source.includes(constantLine)) throw new Error('Question summary limit constant not found.');

const startIndex = source.indexOf(rangeStart);
const endIndex = source.indexOf(rangeEnd, startIndex + rangeStart.length);
if (startIndex < 0 || endIndex < 0) throw new Error('Question presentation helper range not found.');
if (source.indexOf(rangeStart, startIndex + rangeStart.length) >= 0) throw new Error('Question presentation helper anchor is ambiguous.');

const range = source.slice(startIndex, endIndex);
for (const required of [
  'const inlineMedia = withoutDangerousBlocks.match(',
  'const { correctOptionIndex, explanation, __v, ...safeQuestion } = question;',
  'return Array.isArray(question?.options) && question.options.length >= 2;',
]) {
  if (!range.includes(required)) throw new Error(`Question presentation range lost ${required}`);
}
for (const forbidden of [
  rangeEnd,
  'QuestionModel.find(',
  'QuizModel.find(',
  'StatusCodes.',
]) {
  if (range.includes(forbidden)) throw new Error(`Question presentation extraction crossed behavior boundary: ${forbidden}`);
}

source = source.replace(constantLine, '');
const adjustedStartIndex = source.indexOf(rangeStart);
const adjustedEndIndex = source.indexOf(rangeEnd, adjustedStartIndex + rangeStart.length);
source = `${source.slice(0, adjustedStartIndex)}${source.slice(adjustedEndIndex)}`;
source = source.replace(importAnchor, `${importAnchor}\n${presentationImport}`);
fs.writeFileSync(routePath, source);

console.log(JSON.stringify({
  status: 'APPLIED',
  phase: 'quiz-question-presentation',
  files: ['server/src/routes/quiz.routes.ts'],
}, null, 2));
