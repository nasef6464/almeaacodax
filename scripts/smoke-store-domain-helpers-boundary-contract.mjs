import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const storeFile = 'store/useStore.ts';
const helpersFile = 'store/storeDomainHelpers.ts';
const storeSource = fs.readFileSync(path.join(root, storeFile), 'utf8').replace(/\r\n/g, '\n');
const compositionFiles = [
  storeFile,
  'store/slices/accessEnrollmentSlice.ts',
  'store/slices/learningProgressSlice.ts',
];
const compositionSource = compositionFiles
  .filter((file) => fs.existsSync(path.join(root, file)))
  .map((file) => fs.readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n'))
  .join('\n');
const helpersExists = fs.existsSync(path.join(root, helpersFile));
const helpersSource = helpersExists ? fs.readFileSync(path.join(root, helpersFile), 'utf8').replace(/\r\n/g, '\n') : '';
const lineCount = (source) => source.split(/\r?\n/).length;

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
const localStart = 'const createGuestUser = (): User => ({';
const delegated = storeSource.includes(helpersImport);
const ownerSource = delegated ? helpersSource : storeSource;

const checks = [];
const check = (name, assertion) => {
  try { assertion(); checks.push({ name, status: 'PASS' }); }
  catch (error) { checks.push({ name, status: 'FAIL', details: error instanceof Error ? error.message : String(error) }); }
};

check('guest identity defaults remain stable', () => {
  for (const fragment of [
    "id: 'guest'",
    "name: 'حساب ضيف'",
    'role: Role.STUDENT',
    "plan: 'free'",
    'purchasedCourses: []',
    'purchasedPackages: []',
  ]) assert.ok(ownerSource.includes(fragment), `guest-user helper lost ${fragment}`);
});

check('package access matching preserves active type path and subject scope', () => {
  for (const fragment of [
    "pkg.status !== 'active'",
    "pkg.contentTypes : ['all']",
    "contentTypes.includes('all') || contentTypes.includes(contentType)",
    '!pathId || pathIds.length === 0 || pathIds.includes(pathId)',
    '!subjectId || subjectIds.length === 0 || subjectIds.includes(subjectId)',
  ]) assert.ok(ownerSource.includes(fragment), `package-scope helper lost ${fragment}`);
});

check('public package visibility semantics remain stable', () => {
  for (const fragment of [
    'course.isPackage',
    'course.showOnPlatform !== false',
    'course.isPublished !== false',
    "course.approvalStatus === 'approved'",
  ]) assert.ok(ownerSource.includes(fragment), `public-package helper lost ${fragment}`);
});

check('school scope resolution preserves direct school and parent-class ownership', () => {
  for (const fragment of [
    'if (directSchoolId)',
    'ids.add(directSchoolId)',
    "group.type === 'SCHOOL'",
    'if (group.parentId)',
    'ids.add(group.parentId)',
  ]) assert.ok(ownerSource.includes(fragment), `school-scope helper lost ${fragment}`);
});

check('quiz result merge preserves identity filtering ordering and cap', () => {
  for (const fragment of [
    '[...incomingResults, ...existingResults]',
    "currentUserId === 'guest'",
    "currentUserId.startsWith('dev-')",
    'result.userId === currentUserId',
    'const identity = getQuizResultIdentity(result)',
    'new Date(b.date).getTime() - new Date(a.date).getTime()',
    '.slice(0, 250)',
  ]) assert.ok(ownerSource.includes(fragment), `quiz-result helper lost ${fragment}`);
});

check('course normalization preserves ids numerics and platform visibility default', () => {
  for (const fragment of [
    'const normalizedId = resolveEntityId(course)',
    'id: normalizedId',
    '_id: normalizedId',
    'price: Number(course?.price || 0)',
    'rating: Number(course?.rating || 0)',
    'progress: Number(course?.progress || 0)',
    "typeof course?.showOnPlatform === 'boolean' ? course.showOnPlatform : false",
  ]) assert.ok(ownerSource.includes(fragment), `course-normalization helper lost ${fragment}`);
});

check('store domain helper ownership is exclusive after delegation while pre-apply stays valid', () => {
  if (delegated) {
    assert.ok(helpersExists, 'delegated store requires storeDomainHelpers.ts');
    for (const exported of [
      'export const createGuestUser',
      'export const packageMatchesScope',
      'export const isPublicPackageAvailable',
      'export const getUserSchoolIds',
      'export const mergeQuizResultsForStore',
      'export const isRegisteredUser',
      'export const resolveEntityId',
      'export const normalizeCourseForStore',
    ]) assert.ok(helpersSource.includes(exported), `store domain helper export missing ${exported}`);
    assert.ok(!storeSource.includes(localStart), 'useStore retained delegated pure helper block');
  } else {
    assert.ok(storeSource.includes(localStart), 'pre-apply useStore lost pure helper block');
    assert.ok(!helpersExists, 'storeDomainHelpers.ts exists before delegation');
  }
});

check('zustand composition and side effects remain store-owned', () => {
  for (const fragment of [
    'export const useStore = create<AppState>()(',
    'persist(',
    'api.',
    'shouldSyncUserToApi',
    'normalizeQuizPlacement',
  ]) assert.ok(storeSource.includes(fragment), `useStore lost state/side-effect ownership: ${fragment}`);
});

check('useStore still consumes delegated behavior at the same call sites', () => {
  for (const fragment of [
    'user: createGuestUser()',
    'normalizeCourseForStore(course)',
    'mergeQuizResultsForStore(',
    'getUserSchoolIds(state.groups, state.user.groupIds || [], state.user.schoolId)',
    'packageMatchesScope(',
    'isPublicPackageAvailable(',
    'isRegisteredUser(',
    'resolveEntityId(',
  ]) assert.ok(compositionSource.includes(fragment), `store composition lost helper consumption: ${fragment}`);
});

check('delegated helper module stays pure and bounded', () => {
  if (!delegated) return;
  for (const forbidden of [
    "from 'zustand'", "from 'zustand/middleware'", "from '../services/api'",
    'api.', 'create<AppState>()(', 'persist(', 'set((state)', 'get().',
    'localStorage', 'sessionStorage', 'window.', 'document.', 'fetch(',
  ]) assert.ok(!helpersSource.includes(forbidden), `storeDomainHelpers.ts must not include ${forbidden}`);
  assert.ok(lineCount(helpersSource) <= 220, `storeDomainHelpers.ts exceeded 220 lines (${lineCount(helpersSource)}).`);
});

const failed = checks.filter((item) => item.status === 'FAIL');
console.log(JSON.stringify({
  phase: 'store-domain-helpers-boundary',
  status: failed.length ? 'FAIL' : 'PASS',
  delegated,
  storeLines: lineCount(storeSource),
  helperLines: helpersExists ? lineCount(helpersSource) : 0,
  checks,
}, null, 2));
if (failed.length) process.exit(1);
