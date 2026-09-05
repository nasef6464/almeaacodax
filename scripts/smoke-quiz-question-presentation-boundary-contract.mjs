import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const routeSource = fs.readFileSync(path.join(root, 'server/src/routes/quiz.routes.ts'), 'utf8').replace(/\r\n/g, '\n');
const presentationSource = fs.readFileSync(path.join(root, 'server/src/modules/quizzes/presentation/questionPresentation.ts'), 'utf8').replace(/\r\n/g, '\n');
const integritySource = fs.readFileSync(path.join(root, 'server/src/modules/quizzes/application/quizQuestionIntegrity.ts'), 'utf8').replace(/\r\n/g, '\n');
const lineCount = (source) => source.split(/\r?\n/).length;
const presentationImport = 'import { isQuestionContentUsable, sanitizeQuestionForLearner, toQuestionSummaryText } from "../modules/quizzes/presentation/questionPresentation.js";';
const delegated = routeSource.includes(presentationImport);
const checks = [];
const check = (name, assertion) => {
  try { assertion(); checks.push({ name, status: 'PASS' }); }
  catch (error) { checks.push({ name, status: 'FAIL', details: error instanceof Error ? error.message : String(error) }); }
};

check('question summary presentation semantics are preserved', () => {
  for (const fragment of [
    'const QUESTION_SUMMARY_TEXT_LIMIT = 280;',
    '.replace(/<style[\\s\\S]*?<\\/style>/gi, " ")',
    '.replace(/<script[\\s\\S]*?<\\/script>/gi, " ")',
    '.replace(/<[^>]+>/g, " ")',
    '.replace(/\\s+/g, " ")',
    'plain.length > QUESTION_SUMMARY_TEXT_LIMIT',
    '<img\\b[^>]*\\/?>|<svg\\b[\\s\\S]*?<\\/svg>|<table\\b[\\s\\S]*?<\\/table>',
    '<p>${escapeHtml(summaryText)}</p>',
  ]) assert.ok(presentationSource.includes(fragment), `question presentation helper missing ${fragment}`);
});

check('learner question sanitization semantics are preserved', () => {
  assert.ok(
    presentationSource.includes('const { correctOptionIndex, explanation, __v, ...safeQuestion } = question;'),
    'learner sanitizer must remove answer-key and mongoose metadata fields',
  );
  assert.ok(presentationSource.includes('return safeQuestion;'), 'learner sanitizer must return the safe projection');
});

check('question usability semantics are preserved', () => {
  for (const fragment of [
    'const hasText = String(question?.text || "").trim().length > 0;',
    'const hasImage = String(question?.imageUrl || "").trim().length > 0;',
    'if (!hasText && !hasImage) return false;',
    'if (type === "mcq" || type === "true_false")',
    'return Array.isArray(question?.options) && question.options.length >= 2;',
    'return true;',
  ]) assert.ok(presentationSource.includes(fragment), `question usability helper missing ${fragment}`);
});

check('question presentation call sites remain route-owned', () => {
  for (const fragment of [
    'toQuestionSummaryText(item.text)',
    'sanitizeQuestionForLearner(q)',
    'isQuestionContentUsable(question)',
  ]) assert.ok(routeSource.includes(fragment), `quiz route lost presentation call site ${fragment}`);
  assert.ok(integritySource.includes('isQuestionContentUsable(resolved)'), 'integrity module lost usability call site');
});

check('question presentation ownership is exclusive after delegation while staging remains baseline-compatible', () => {
  for (const declaration of [
    'const QUESTION_SUMMARY_TEXT_LIMIT = 280;',
    'const escapeHtml = (value: string) =>',
    'const toQuestionSummaryText = (value: unknown) =>',
    'const sanitizeQuestionForLearner = (question: Record<string, any>) =>',
    'const isQuestionContentUsable = (question: any) =>',
  ]) {
    assert.equal(routeSource.includes(declaration), !delegated, `${delegated ? 'delegated' : 'route-owned'} question presentation ownership mismatch for ${declaration}`);
  }
});

check('delegated presentation import is singular and remains before route-local state', () => {
  if (!delegated) return;
  assert.equal(routeSource.split(presentationImport).length - 1, 1, 'question presentation import must be singular');
  const importIndex = routeSource.indexOf(presentationImport);
  const stateIndex = routeSource.indexOf('const PUBLIC_QUIZ_LIST_CACHE_TTL_MS = 30 * 1000;');
  assert.ok(importIndex >= 0 && stateIndex >= 0 && importIndex < stateIndex, 'question presentation import must precede route-local state');
});

check('quiz integrity and database behavior remain outside presentation module', () => {
  for (const fragment of [
    'export async function validateQuizQuestionIntegrity',
    'QuestionModel.find(buildDocumentsByIdsQuery(normalizedIds))',
    'const missingIds: string[] = [];',
    'const invalidContentIds: string[] = [];',
    'Cannot publish quiz: some referenced questions are missing or have incomplete content',
  ]) assert.ok(integritySource.includes(fragment), `integrity module lost behavior: ${fragment}`);
  assert.ok(routeSource.includes('validateQuizQuestionIntegrity(payload)'), 'quiz route lost integrity call site');
});

check('question presentation module stays pure and bounded', () => {
  for (const forbidden of [
    'express', 'mongoose', '../models/', 'Router(', 'req.', 'res.', 'process.env', 'Date.now',
    'StatusCodes', 'QuestionModel', 'QuizModel', 'findOne', 'findById', 'find(', 'validateQuizQuestionIntegrity',
  ]) assert.ok(!presentationSource.includes(forbidden), `question presentation module must not include ${forbidden}`);
  assert.ok(lineCount(presentationSource) <= 70, `questionPresentation.ts exceeded 70 lines (${lineCount(presentationSource)}).`);
});

const failed = checks.filter((item) => item.status === 'FAIL');
console.log(JSON.stringify({
  phase: 'quiz-question-presentation-boundary',
  status: failed.length ? 'FAIL' : 'PASS',
  delegated,
  routeLines: lineCount(routeSource),
  presentationLines: lineCount(presentationSource),
  checks,
}, null, 2));
if (failed.length) process.exit(1);
