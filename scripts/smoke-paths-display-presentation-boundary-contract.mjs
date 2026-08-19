import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const requirePost = process.argv.includes('--require-post');
const managerPath = 'dashboards/admin/PathsManager.tsx';
const helperPath = 'dashboards/admin/PathsManager/pathDisplayPresentation.tsx';
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n');

const manager = read(managerPath);
const helper = read(helperPath);
const importFragment = "from './PathsManager/pathDisplayPresentation'";
const legacyMarkers = [
  'const getPathIcon =',
  'const colorMap:',
  'const resolveColor =',
  'const defaultPathDisplaySettings:',
  'const resolvePathDisplaySettings =',
  'const getSubjectIcon =',
];
const legacyCount = legacyMarkers.filter((marker) => manager.includes(marker)).length;
const hasHelperImport = manager.includes(importFragment);
const mode = !hasHelperImport && legacyCount === legacyMarkers.length
  ? 'PRE_BOUNDARY'
  : hasHelperImport && legacyCount === 0
    ? 'POST_BOUNDARY'
    : 'PARTIAL';

const checks = [];
const check = (name, assertion) => {
  try { assertion(); checks.push({ name, status: 'PASS' }); }
  catch (error) { checks.push({ name, status: 'FAIL', details: error instanceof Error ? error.message : String(error) }); }
};

check('paths display presentation boundary is never partially applied', () => {
  if (mode === 'PARTIAL') throw new Error(`Partial boundary state: import=${hasHelperImport}, legacy=${legacyCount}/${legacyMarkers.length}`);
  if (requirePost && mode !== 'POST_BOUNDARY') throw new Error(`Post-boundary state required, got ${mode}`);
});

check('display helper owns only presentation and display-setting concerns', () => {
  for (const marker of ['export const resolveColor', 'export const resolvePathDisplaySettings', 'export const getPathIcon', 'export const getSubjectIcon']) {
    if (!helper.includes(marker)) throw new Error(`Missing helper ownership marker: ${marker}`);
  }
  for (const forbidden of ['useStore(', 'fetch(', 'localStorage', 'sessionStorage', 'addCourse(', 'updateCourse(', 'deleteCourse(', 'window.location']) {
    if (helper.includes(forbidden)) throw new Error(`Display helper must not own side effect/store concern: ${forbidden}`);
  }
});

check('PathsManager retains orchestration and quiz placement ownership', () => {
  for (const marker of ['useStore()', 'isSelectedForSubjectLearningSlot', 'publicPackageContentOptions', 'addCourse', 'updateCourse', 'deleteCourse']) {
    if (!manager.includes(marker)) throw new Error(`PathsManager lost orchestration marker: ${marker}`);
  }
});

check('post-boundary PathsManager consumes the display helper instead of redefining it', () => {
  if (mode !== 'POST_BOUNDARY') return;
  if (!hasHelperImport) throw new Error('PathsManager does not import path display presentation helper');
  for (const marker of legacyMarkers) {
    if (manager.includes(marker)) throw new Error(`PathsManager still defines display helper marker: ${marker}`);
  }
});

const failed = checks.filter((item) => item.status === 'FAIL');
console.log(JSON.stringify({
  phase: 'paths-display-presentation-boundary',
  status: failed.length ? 'FAIL' : 'PASS',
  mode,
  checks,
}, null, 2));
if (failed.length) process.exit(1);
