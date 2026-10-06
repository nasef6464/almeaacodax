import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const apiFile = 'services/api.ts';
const utilitiesFile = 'services/apiQueryUtilities.ts';
const frontendContractFile = 'scripts/smoke-frontend-phase5-contract.mjs';
const apiSource = fs.readFileSync(path.join(root, apiFile), 'utf8').replace(/\r\n/g, '\n');
const utilitiesExists = fs.existsSync(path.join(root, utilitiesFile));
const utilitiesSource = utilitiesExists ? fs.readFileSync(path.join(root, utilitiesFile), 'utf8').replace(/\r\n/g, '\n') : '';
const frontendContractSource = fs.readFileSync(path.join(root, frontendContractFile), 'utf8').replace(/\r\n/g, '\n');
const lineCount = (source) => source.split(/\r?\n/).length;

const utilitiesImport = `import {
  extractList,
  withQuery,
  type PaginatedResponseShape,
  type PaginationMeta,
  type PaginationOptions,
  type QuizResultsPageResponse,
  type QuizResultsPaginationOptions,
} from './apiQueryUtilities';`;
const delegated = apiSource.includes(utilitiesImport);
const ownerSource = delegated ? utilitiesSource : apiSource;

const checks = [];
const check = (name, assertion) => {
  try { assertion(); checks.push({ name, status: 'PASS' }); }
  catch (error) { checks.push({ name, status: 'FAIL', details: error instanceof Error ? error.message : String(error) }); }
};

check('pagination option and response compatibility shapes remain stable', () => {
  for (const fragment of [
    'page?: number;',
    'limit?: number;',
    'search?: string;',
    'role?: string;',
    'isActive?: boolean;',
    'pathId?: string;',
    'subjectId?: string;',
    'noTotal?: boolean;',
    'quizId?: string;',
    'studentId?: string;',
    'status?: "passed" | "failed";',
    'sortBy?: "createdAt" | "score" | "quizTitle" | "date";',
    'sortOrder?: "asc" | "desc";',
    'hasNext: boolean;',
    'hasPrev: boolean;',
  ]) assert.ok(ownerSource.includes(fragment), `API pagination compatibility lost ${fragment}`);
});

check('extractList keeps raw-array and keyed-object compatibility', () => {
  for (const fragment of [
    'Array.isArray(payload)',
    'return payload as T[];',
    'payload && typeof payload === "object"',
    '(payload as Record<string, unknown>)[key]',
    'return Array.isArray(value) ? (value as T[]) : [];',
    'return [];',
  ]) assert.ok(ownerSource.includes(fragment), `extractList compatibility lost ${fragment}`);
});

check('withQuery filters empty values and encodes remaining query values', () => {
  for (const fragment of [
    'Object.entries(query || {}).filter',
    'value !== undefined && value !== null && value !== ""',
    'if (!entries.length)',
    'return path;',
    'const search = new URLSearchParams();',
    'search.set(key, String(value));',
    'return `${path}?${search.toString()}`;',
  ]) assert.ok(ownerSource.includes(fragment), `withQuery compatibility lost ${fragment}`);
});

check('query utility ownership is exclusive after delegation while pre-apply stays valid', () => {
  if (delegated) {
    assert.ok(utilitiesExists, 'delegated API client requires apiQueryUtilities.ts');
    for (const exported of [
      'export interface PaginationOptions',
      'export interface QuizResultsPaginationOptions extends PaginationOptions',
      'export interface QuizResultsPageResponse<T = unknown>',
      'export interface PaginatedResponseShape',
      'export interface PaginationMeta',
      'export const extractList =',
      'export const withQuery =',
    ]) assert.ok(utilitiesSource.includes(exported), `API query utility export missing ${exported}`);
    assert.ok(!apiSource.includes('interface PaginationOptions {'), 'api.ts retained PaginationOptions ownership');
    assert.ok(!apiSource.includes('const extractList = <T = unknown>'), 'api.ts retained extractList ownership');
    assert.ok(!apiSource.includes('const withQuery = (path: string'), 'api.ts retained withQuery ownership');
  } else {
    assert.ok(apiSource.includes('interface PaginationOptions {'), 'pre-apply api.ts lost PaginationOptions');
    assert.ok(apiSource.includes('const extractList = <T = unknown>'), 'pre-apply api.ts lost extractList');
    assert.ok(apiSource.includes('const withQuery = (path: string'), 'pre-apply api.ts lost withQuery');
    assert.ok(!utilitiesExists, 'apiQueryUtilities.ts exists before delegation');
  }
});

check('API transport CSRF cookie and cache behavior remain api.ts-owned', () => {
  for (const fragment of [
    'const API_BASE_URL =',
    'interface RequestOptions {',
    'CSRF_COOKIE_NAME = "almeaa_csrf_token"',
    'CSRF_HEADER_NAME = "x-csrf-token"',
    'const ensureCsrfToken = async () =>',
    'async function request<T>',
    'credentials: "include"',
    'const readPublicCache = <T>',
    'const writePublicCache = <T>',
    'const clearPublicCache = (key?: string)',
    'const requestCached = async <T>',
    'export const api = {',
  ]) assert.ok(apiSource.includes(fragment), `api.ts lost transport/security/cache ownership: ${fragment}`);
});

check('endpoint compatibility call sites stay api.ts-owned', () => {
  for (const fragment of [
    'withQuery("/auth/admin/users"',
    'withQuery("/payments/requests"',
    'withQuery("/payments/discount-codes"',
    'withQuery("/courses"',
    'withQuery("/quizzes"',
    'withQuery("/quizzes/results"',
    'extractList(payload, "users")',
    'extractList(payload, "requests")',
    'extractList(payload, "courses")',
  ]) assert.ok(apiSource.includes(fragment), `api.ts lost paginated endpoint compatibility call site: ${fragment}`);
});

check('query utility module remains pure and bounded after delegation', () => {
  if (!delegated) return;
  for (const forbidden of [
    'fetch(', 'sessionStorage', 'localStorage', 'document.', 'globalThis', 'import.meta',
    'CSRF_', 'ensureCsrfToken', 'API_BASE_URL', 'requestCached', 'readPublicCache',
    'writePublicCache', 'clearPublicCache', 'export const api =', 'credentials:', 'Authorization',
  ]) assert.ok(!utilitiesSource.includes(forbidden), `apiQueryUtilities.ts must not include ${forbidden}`);
  assert.ok(lineCount(utilitiesSource) <= 130, `apiQueryUtilities.ts exceeded 130 lines (${lineCount(utilitiesSource)}).`);
});

check('Frontend Phase 5 source-coupled contract follows active query utility ownership', () => {
  if (delegated) {
    assert.ok(frontendContractSource.includes('apiQueryUtilities: await readFile(new URL("../services/apiQueryUtilities.ts"'), 'Frontend Phase 5 contract does not read query utility owner');
    assert.ok(frontendContractSource.includes('assertIncludes(files.apiQueryUtilities, "export interface PaginationOptions");'), 'Frontend Phase 5 PaginationOptions assertion still follows old owner');
    assert.ok(frontendContractSource.includes('../docs/archive_reports/05_FRONTEND_IMPLEMENTATION_REPORT.md'), 'Frontend Phase 5 report path does not follow archive owner');
    assert.ok(!frontendContractSource.includes('assertIncludes(files.api, "interface PaginationOptions");'), 'Frontend Phase 5 still pins PaginationOptions to api.ts');
  } else {
    assert.ok(frontendContractSource.includes('assertIncludes(files.api, "interface PaginationOptions");'), 'pre-apply Frontend Phase 5 lost api.ts PaginationOptions assertion');
  }
});

const failed = checks.filter((item) => item.status === 'FAIL');
console.log(JSON.stringify({
  phase: 'api-query-utilities-boundary',
  status: failed.length ? 'FAIL' : 'PASS',
  delegated,
  apiLines: lineCount(apiSource),
  utilityLines: utilitiesExists ? lineCount(utilitiesSource) : 0,
  checks,
}, null, 2));
if (failed.length) process.exit(1);
