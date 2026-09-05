import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');
const applicationRoots = ['App.tsx', 'pages', 'components', 'dashboards', 'src'];
const sourceFiles = [];
const collectSourceFiles = (relativePath) => {
  const fullPath = path.join(root, relativePath);
  const stat = fs.statSync(fullPath);
  if (stat.isFile()) {
    if (/\.(?:ts|tsx|js|jsx)$/.test(relativePath)) sourceFiles.push(relativePath);
    return;
  }
  for (const entry of fs.readdirSync(fullPath, { withFileTypes: true })) {
    if (entry.name === 'node_modules') continue;
    collectSourceFiles(path.join(relativePath, entry.name));
  }
};
applicationRoots.forEach(collectSourceFiles);

const appSource = read('App.tsx');
const genericPathPageSource = read('pages/GenericPathPage.tsx');
const subjectLearningSource = read('pages/SubjectLearningPage.tsx');
const checks = [];
const check = (name, assertion) => {
  try {
    assertion();
    checks.push({ name, status: 'PASS' });
  } catch (error) {
    checks.push({ name, status: 'FAIL', details: error instanceof Error ? error.message : String(error) });
  }
};

check('category route loads the GenericPathPage runtime', () => {
  assert.ok(appSource.includes("import('./pages/GenericPathPage')"));
  assert.ok(appSource.includes('<Route path="/category/:pathId" element={<GenericPathPage />} />'));
});
check('GenericPathPage composes the current learning runtime', () => {
  assert.ok(genericPathPageSource.includes("import { LearningSection } from '../components/LearningSection'"));
  assert.ok(genericPathPageSource.includes('<LearningSection category={path.id}'));
});
check('legacy subject deep links resolve their owning level instead of dropping the subject', () => {
  assert.ok(genericPathPageSource.includes('Legacy subject deep links predate the level query parameter.'));
  assert.ok(genericPathPageSource.includes('const owningLevelId = subject?.levelId'));
  assert.ok(genericPathPageSource.includes('updateUrl(owningLevelId, resolvedSubjectId, true)'));
});
check('legacy subject page is retained without an application import or lazy entry', () => {
  assert.ok(subjectLearningSource.includes('export const SubjectLearningPage'));
  const callers = sourceFiles
    .filter((file) => file !== 'pages/SubjectLearningPage.tsx')
    .filter((file) => /(?:from\s+['"][^'"]*SubjectLearningPage|import\s*\(\s*['"][^'"]*SubjectLearningPage)/.test(read(file)));
  assert.deepEqual(callers, []);
});

const failed = checks.filter((item) => item.status === 'FAIL');
console.log(JSON.stringify({ phase: 'learning-canonical-entry', status: failed.length ? 'FAIL' : 'PASS', checks }, null, 2));
if (failed.length) process.exit(1);
