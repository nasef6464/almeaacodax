import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const apiPath = path.join(root, 'services/api.ts');
const utilitiesPath = path.join(root, 'services/apiQueryUtilities.ts');
const frontendContractPath = path.join(root, 'scripts/smoke-frontend-phase5-contract.mjs');

let apiSource = fs.readFileSync(apiPath, 'utf8').replace(/\r\n/g, '\n');
let frontendContractSource = fs.readFileSync(frontendContractPath, 'utf8').replace(/\r\n/g, '\n');

const utilitiesImport = `import {
  extractList,
  withQuery,
  type PaginatedResponseShape,
  type PaginationMeta,
  type PaginationOptions,
  type QuizResultsPageResponse,
  type QuizResultsPaginationOptions,
} from './apiQueryUtilities';`;
const typeRangeStart = 'interface PaginationOptions {';
const typeRangeEnd = 'const PUBLIC_CACHE_PREFIX =';
const helperRangeStart = 'const extractList = <T = unknown>(payload: unknown, key: string): T[] => {';
const helperRangeEnd = 'export const api = {';
const oldReportPath = 'new URL("../05_FRONTEND_IMPLEMENTATION_REPORT.md", import.meta.url)';
const newReportPath = 'new URL("../docs/archive_reports/05_FRONTEND_IMPLEMENTATION_REPORT.md", import.meta.url)';
const oldPaginationAssertion = 'assertIncludes(files.api, "interface PaginationOptions");';
const newPaginationAssertion = 'assertIncludes(files.apiQueryUtilities, "export interface PaginationOptions");';
const oldFilesApiLine = '  api: await readFile(new URL("../services/api.ts", import.meta.url), "utf8"),';
const newFilesApiBlock = `${oldFilesApiLine}\n  apiQueryUtilities: await readFile(new URL("../services/apiQueryUtilities.ts", import.meta.url), "utf8"),`;

const alreadyApplied =
  apiSource.includes(utilitiesImport) &&
  !apiSource.includes(typeRangeStart) &&
  !apiSource.includes(helperRangeStart) &&
  fs.existsSync(utilitiesPath) &&
  frontendContractSource.includes(newReportPath) &&
  frontendContractSource.includes(newPaginationAssertion) &&
  frontendContractSource.includes('apiQueryUtilities: await readFile(');

if (alreadyApplied) {
  console.log(JSON.stringify({ status: 'ALREADY_APPLIED', phase: 'api-query-utilities' }, null, 2));
  process.exit(0);
}

if (apiSource.includes(utilitiesImport)) throw new Error('API query utilities import exists while local ownership remains incomplete.');
if (fs.existsSync(utilitiesPath)) throw new Error('apiQueryUtilities.ts exists before api.ts delegation.');

const typeStartIndex = apiSource.indexOf(typeRangeStart);
const typeEndIndex = apiSource.indexOf(typeRangeEnd, typeStartIndex + typeRangeStart.length);
const helperStartIndex = apiSource.indexOf(helperRangeStart);
const helperEndIndex = apiSource.indexOf(helperRangeEnd, helperStartIndex + helperRangeStart.length);
if (typeStartIndex < 0 || typeEndIndex < 0) throw new Error('API pagination type range not found.');
if (helperStartIndex < 0 || helperEndIndex < 0) throw new Error('API query helper range not found.');
if (typeEndIndex >= helperStartIndex) throw new Error('API query ranges overlap unexpectedly.');
if (apiSource.indexOf(typeRangeStart, typeStartIndex + typeRangeStart.length) >= 0) throw new Error('Pagination type range start is ambiguous.');
if (apiSource.indexOf(helperRangeStart, helperStartIndex + helperRangeStart.length) >= 0) throw new Error('Query helper range start is ambiguous.');

const typeBlock = apiSource.slice(typeStartIndex, typeEndIndex).trimEnd();
const helperBlock = apiSource.slice(helperStartIndex, helperEndIndex).trimEnd();
for (const required of [
  'interface PaginationOptions {',
  'interface QuizResultsPaginationOptions extends PaginationOptions {',
  'interface QuizResultsPageResponse<T = unknown> {',
  'interface PaginatedResponseShape {',
  'interface PaginationMeta {',
]) {
  if (!typeBlock.includes(required)) throw new Error(`API pagination type range lost ${required}`);
}
for (const required of [
  'const extractList = <T = unknown>',
  'const withQuery = (path: string, query?: Record<string, string | number | boolean | undefined | null>) =>',
  'new URLSearchParams()',
]) {
  if (!helperBlock.includes(required)) throw new Error(`API query helper range lost ${required}`);
}
for (const forbidden of [
  'async function request<',
  'ensureCsrfToken',
  'CSRF_COOKIE_NAME',
  'readPublicCache',
  'requestCached',
  'sessionStorage',
  'fetch(',
  'export const api = {',
]) {
  if (typeBlock.includes(forbidden) || helperBlock.includes(forbidden)) {
    throw new Error(`API query utility extraction crossed transport/cache/security boundary: ${forbidden}`);
  }
}

let exportedTypes = typeBlock;
for (const name of [
  'PaginationOptions',
  'QuizResultsPaginationOptions',
  'QuizResultsPageResponse',
  'PaginatedResponseShape',
  'PaginationMeta',
]) {
  exportedTypes = exportedTypes.replace(`interface ${name}`, `export interface ${name}`);
}
const exportedHelpers = helperBlock
  .replace('const extractList =', 'export const extractList =')
  .replace('const withQuery =', 'export const withQuery =');
const utilitiesSource = `${exportedTypes}\n\n${exportedHelpers}\n`;

let nextApiSource = `${apiSource.slice(0, typeStartIndex)}${apiSource.slice(typeEndIndex, helperStartIndex)}${apiSource.slice(helperEndIndex)}`;
nextApiSource = `${utilitiesImport}\n\n${nextApiSource}`;

if (nextApiSource.includes(typeRangeStart)) throw new Error('Local PaginationOptions remained after extraction.');
if (nextApiSource.includes(helperRangeStart)) throw new Error('Local extractList remained after extraction.');
if (!nextApiSource.includes(utilitiesImport)) throw new Error('API query utilities import insertion failed.');
for (const required of [
  'async function request<T>',
  'const ensureCsrfToken = async () =>',
  'const requestCached = async <T>',
  'export const api = {',
]) {
  if (!nextApiSource.includes(required)) throw new Error(`API transport/runtime owner lost ${required}`);
}

if (!frontendContractSource.includes(oldFilesApiLine)) throw new Error('Frontend Phase 5 API source anchor not found.');
if (!frontendContractSource.includes(oldPaginationAssertion)) throw new Error('Frontend Phase 5 PaginationOptions owner assertion not found.');
if (!frontendContractSource.includes(oldReportPath)) throw new Error('Frontend Phase 5 report still does not match expected pre-move path.');
if (frontendContractSource.includes(newPaginationAssertion) || frontendContractSource.includes(newReportPath)) {
  throw new Error('Frontend Phase 5 contract is partially migrated before API query utility delegation.');
}
const nextFrontendContractSource = frontendContractSource
  .replace(oldFilesApiLine, newFilesApiBlock)
  .replace(oldPaginationAssertion, newPaginationAssertion)
  .replace(oldReportPath, newReportPath);

fs.writeFileSync(utilitiesPath, utilitiesSource);
fs.writeFileSync(apiPath, nextApiSource);
fs.writeFileSync(frontendContractPath, nextFrontendContractSource);

console.log(JSON.stringify({
  status: 'APPLIED',
  phase: 'api-query-utilities',
  files: [
    'services/api.ts',
    'services/apiQueryUtilities.ts',
    'scripts/smoke-frontend-phase5-contract.mjs',
  ],
}, null, 2));
