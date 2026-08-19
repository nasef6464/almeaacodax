import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const storePath = path.join(root, 'store/useStore.ts');
const helpersPath = path.join(root, 'store/storeDomainHelpers.ts');
let storeSource = fs.readFileSync(storePath, 'utf8').replace(/\r\n/g, '\n');

const importAnchor = "import { normalizeQuizPlacement } from '../utils/quizPlacement';";
const helpersImport = `import {
    createGuestUser,
    getUserSchoolIds,
    isPublicPackageAvailable,
    isRegisteredUser,
    mergeQuizResultsForStore,
    normalizeCourseForStore,
    packageMatchesScope,
    resolveEntityId,
} from './storeDomainHelpers';`;
const rangeStart = 'const createGuestUser = (): User => ({';
const rangeEnd = 'export const useStore = create<AppState>()(';

const alreadyApplied =
  storeSource.includes(helpersImport) &&
  !storeSource.includes(rangeStart) &&
  fs.existsSync(helpersPath);

if (alreadyApplied) {
  console.log(JSON.stringify({ status: 'ALREADY_APPLIED', phase: 'store-domain-helpers' }, null, 2));
  process.exit(0);
}

if (!storeSource.includes(importAnchor)) throw new Error('Store helper import anchor not found.');
if (storeSource.includes(helpersImport)) throw new Error('Store helper import exists while local helper ownership remains.');
if (fs.existsSync(helpersPath)) throw new Error('storeDomainHelpers.ts exists before delegation.');

const startIndex = storeSource.indexOf(rangeStart);
const endIndex = storeSource.indexOf(rangeEnd, startIndex + rangeStart.length);
if (startIndex < 0 || endIndex < 0) throw new Error('Store domain helper range not found.');
if (storeSource.indexOf(rangeStart, startIndex + rangeStart.length) >= 0) throw new Error('Store helper range start is ambiguous.');

const range = storeSource.slice(startIndex, endIndex).trimEnd();
for (const required of [
  'const packageMatchesScope = (',
  'const isPublicPackageAvailable = (course: Course) =>',
  'const getUserSchoolIds = (groups: Group[]',
  'const getQuizResultIdentity = (',
  'const normalizeQuizResultForStore = (result: QuizResult): QuizResult =>',
  'const mergeQuizResultsForStore = (',
  'const isRegisteredUser = (user?: User | null) =>',
  'const resolveEntityId = (entity:',
  'const toOptionalFiniteNumber = (value: unknown) =>',
  'const normalizeCourseForStore = (course: any) =>',
]) {
  if (!range.includes(required)) throw new Error(`Store domain helper range lost ${required}`);
}
for (const forbidden of [
  'create<AppState>()(',
  'api.',
  'set((state)',
  'get().',
  'persist(',
  'localStorage',
  'window.',
]) {
  if (range.includes(forbidden)) throw new Error(`Store helper extraction crossed state/side-effect boundary: ${forbidden}`);
}

let helperBody = range;
for (const name of [
  'createGuestUser',
  'packageMatchesScope',
  'isPublicPackageAvailable',
  'getUserSchoolIds',
  'mergeQuizResultsForStore',
  'isRegisteredUser',
  'resolveEntityId',
  'normalizeCourseForStore',
]) {
  const declaration = `const ${name}`;
  if (!helperBody.includes(declaration)) throw new Error(`Expected exported helper declaration missing: ${name}`);
  helperBody = helperBody.replace(declaration, `export const ${name}`);
}

const helpersSource = `import { B2BPackage, Course, Group, PackageContentType, QuizResult, Role, User } from '../types';\n\n${helperBody}\n`;
const nextStoreSource = `${storeSource.slice(0, startIndex)}${storeSource.slice(endIndex)}`.replace(
  importAnchor,
  `${importAnchor}\n${helpersImport}`,
);

if (nextStoreSource.includes(rangeStart)) throw new Error('Inline store domain helper block remained after extraction.');
if (!nextStoreSource.includes(helpersImport)) throw new Error('Store domain helper import insertion failed.');
for (const forbidden of ['api.', 'persist(', 'create<AppState>()(', 'localStorage', 'window.']) {
  if (helpersSource.includes(forbidden)) throw new Error(`storeDomainHelpers.ts must stay pure: ${forbidden}`);
}

fs.writeFileSync(helpersPath, helpersSource);
fs.writeFileSync(storePath, nextStoreSource);

console.log(JSON.stringify({
  status: 'APPLIED',
  phase: 'store-domain-helpers',
  files: ['store/useStore.ts', 'store/storeDomainHelpers.ts'],
}, null, 2));
