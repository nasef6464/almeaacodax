import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const dashboardPath = 'pages/Dashboard.tsx';
const helperPath = 'pages/Dashboard/pathProgressProjection.ts';
const dashboardSource = read(dashboardPath);
const helperSource = read(helperPath);

const importLine = "import { courseBelongsToPath, resolvePathProgress } from './Dashboard/pathProgressProjection';";
const localMarkers = [
  'const normalizeDashboardScope =',
  'const courseBelongsToPath =',
  'const getCourseLessons =',
  'const resolvePathProgress =',
];

const hasImport = dashboardSource.includes(importLine);
const localMarkerCount = localMarkers.filter((marker) => dashboardSource.includes(marker)).length;
const mode = !hasImport && localMarkerCount === localMarkers.length
  ? 'PRE_BOUNDARY'
  : hasImport && localMarkerCount === 0
    ? 'POST_BOUNDARY'
    : 'PARTIAL';

const checks = [];
const check = (name, fn) => checks.push({ name, fn });

function assertIncludes(source, snippet, message = snippet) {
  if (!source.includes(snippet)) throw new Error(`Missing: ${message}`);
}

function assertExcludes(source, snippet, message = snippet) {
  if (source.includes(snippet)) throw new Error(`Unexpected: ${message}`);
}

check('Dashboard path progress boundary is never partially applied', () => {
  if (mode === 'PARTIAL') {
    throw new Error(`Partial boundary state: import=${hasImport}, localMarkers=${localMarkerCount}/${localMarkers.length}`);
  }
});

check('path progress helper owns only deterministic projection logic', () => {
  for (const marker of [
    'export const normalizeDashboardScope',
    'export const courseBelongsToPath',
    'export const getCourseLessons',
    'export const resolvePathProgress',
    '(result.skillsAnalysis || []).some((skill) => skill.pathId === path.id)',
    'completedLessons.includes(lessonId)',
  ]) {
    assertIncludes(helperSource, marker);
  }

  for (const banned of [
    'useStore(',
    'useEffect(',
    'useMemo(',
    'api.',
    'fetch(',
    'window.',
    'localStorage',
    'sessionStorage',
    'navigate(',
    'setState(',
  ]) {
    assertExcludes(helperSource, banned, `helper must stay side-effect free: ${banned}`);
  }
});

check('Dashboard retains page, store, smart-path, parent, routing, and path composition ownership', () => {
  for (const marker of [
    'const buildSmartPathSkillsFromResults =',
    'const useParentScopedResults =',
    'const Dashboard: React.FC = () =>',
    'const { user } = useStore();',
    'useLocation()',
    'api.requestParentWeeklyReport()',
    'const enrolledPathSet = new Set(enrolledPaths ?? []);',
    'courses.filter((course) => !course.isPackage && courseBelongsToPath(course, path))',
    'const pathStats = resolvePathProgress(path, pathCourses, completedLessons, examResults);',
  ]) {
    assertIncludes(dashboardSource, marker);
  }
});

check('post-boundary Dashboard consumes the projection helper instead of redefining it', () => {
  if (mode !== 'POST_BOUNDARY') return;
  assertIncludes(dashboardSource, importLine);
  for (const marker of localMarkers) assertExcludes(dashboardSource, marker);
});

let failed = 0;
const results = [];
for (const item of checks) {
  try {
    item.fn();
    results.push({ name: item.name, status: 'PASS' });
  } catch (error) {
    failed += 1;
    results.push({ name: item.name, status: 'FAIL', error: error.message });
  }
}

console.log(JSON.stringify({
  phase: 'dashboard-path-progress-boundary',
  status: failed ? 'FAIL' : 'PASS',
  mode,
  checks: results,
}, null, 2));

if (failed) process.exit(1);
