import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const routeSource = fs.readFileSync(path.join(root, 'server/src/routes/quiz.routes.ts'), 'utf8').replace(/\r\n/g, '\n');
const utilitySource = fs.readFileSync(path.join(root, 'server/src/modules/quizzes/http/queryUtilities.ts'), 'utf8').replace(/\r\n/g, '\n');
const lineCount = (source) => source.split(/\r?\n/).length;
const utilityImport = 'import { buildQuizResultsCacheKey, escapeRegex, parseDateFilter } from "../modules/quizzes/http/queryUtilities.js";';
const delegated = routeSource.includes(utilityImport);
const checks = [];
const check = (name, assertion) => {
  try { assertion(); checks.push({ name, status: 'PASS' }); }
  catch (error) { checks.push({ name, status: 'FAIL', details: error instanceof Error ? error.message : String(error) }); }
};

check('quiz results cache key semantics are preserved', () => {
  for (const fragment of [
    'userId: string,',
    'originalUrl: string,',
    'includeReview: boolean,',
    '`${userId}:${includeReview ? "review" : "list"}:${originalUrl}`',
  ]) assert.ok(utilitySource.includes(fragment), `query utility missing cache-key fragment ${fragment}`);
});

check('regex escaping semantics are preserved', () => {
  assert.ok(
    utilitySource.includes('value.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\\\$&")'),
    'query utility must keep escaping regex metacharacters before MongoDB search',
  );
});

check('date filter parsing semantics are preserved', () => {
  for (const fragment of [
    'const raw = String(value || "").trim();',
    'if (!raw) return null;',
    'const parsed = new Date(raw);',
    'if (Number.isNaN(parsed.getTime())) return null;',
    'return parsed;',
  ]) assert.ok(utilitySource.includes(fragment), `query utility missing date parser fragment ${fragment}`);
});

check('query utility call sites remain route-owned', () => {
  for (const fragment of [
    'const safeSearch = escapeRegex(query.search);',
    'filter.quizTitle = { $regex: escapeRegex(query.search), $options: "i" };',
    'const dateFrom = parseDateFilter(query.dateFrom);',
    'const dateTo = parseDateFilter(query.dateTo);',
    'const scopedDateFrom = parseDateFilter(query.dateFrom);',
    'const scopedDateTo = parseDateFilter(query.dateTo);',
    'const cacheKey = buildQuizResultsCacheKey(req.authUser!.id, req.originalUrl || req.url || "/results", includeReview);',
  ]) assert.ok(routeSource.includes(fragment), `quiz route lost query utility call site ${fragment}`);
});

check('query utility ownership is exclusive after delegation while staging remains baseline-compatible', () => {
  for (const declaration of [
    'const buildQuizResultsCacheKey = (',
    'const escapeRegex = (value: string) =>',
    'const parseDateFilter = (value?: string) => {',
  ]) {
    assert.equal(routeSource.includes(declaration), !delegated, `${delegated ? 'delegated' : 'route-owned'} query utility ownership mismatch for ${declaration}`);
  }
});

check('delegated query utility import is singular and before route-local cache state', () => {
  if (!delegated) return;
  assert.equal(routeSource.split(utilityImport).length - 1, 1, 'query utility import must be singular');
  const importIndex = routeSource.indexOf(utilityImport);
  const stateIndex = routeSource.indexOf('const PUBLIC_QUIZ_LIST_CACHE_TTL_MS = 30 * 1000;');
  assert.ok(importIndex >= 0 && stateIndex >= 0 && importIndex < stateIndex, 'query utility import must precede route-local cache state');
});

check('cache state, eviction and database auth resolution remain route-owned', () => {
  for (const fragment of [
    'const QUIZ_RESULTS_CACHE_TTL_MS = 5 * 1000;',
    'let quizResultsCache = new Map<',
    'const trimQuizResultsCacheIfNeeded = () => {',
    'quizResultsCache.delete(firstKey);',
    'const resolveAuthUserByAuthId = async',
    'mongoose.isValidObjectId(authId) ? UserModel.findById(authId) : UserModel.findOne({ id: authId });',
    'const buildQuestionSummaryCacheKey =',
  ]) assert.ok(routeSource.includes(fragment), `quiz route lost state/database ownership ${fragment}`);
});

check('query utility module stays pure and bounded', () => {
  for (const forbidden of [
    'express', 'mongoose', '../models/', 'Router(', 'req.', 'res.', 'process.env', 'StatusCodes',
    'UserModel', 'QuizResultModel', 'quizResultsCache', 'findById', 'findOne',
  ]) assert.ok(!utilitySource.includes(forbidden), `query utility module must not include ${forbidden}`);
  assert.ok(lineCount(utilitySource) <= 30, `queryUtilities.ts exceeded 30 lines (${lineCount(utilitySource)}).`);
});

const failed = checks.filter((item) => item.status === 'FAIL');
console.log(JSON.stringify({
  phase: 'quiz-query-utilities-boundary',
  status: failed.length ? 'FAIL' : 'PASS',
  delegated,
  routeLines: lineCount(routeSource),
  utilityLines: lineCount(utilitySource),
  checks,
}, null, 2));
if (failed.length) process.exit(1);
