import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const courseViewSource = read('pages/CourseView.tsx');
const courseOverviewSource = read('components/CourseOverview.tsx');
const dashboardSource = read('pages/Dashboard.tsx');
const dashboardPathProgressPath = 'pages/Dashboard/pathProgressProjection.ts';
const dashboardPathProgressSource = fs.existsSync(path.join(root, dashboardPathProgressPath))
  ? read(dashboardPathProgressPath)
  : dashboardSource;
const quizzesSource = read('pages/Quizzes.tsx');
const reportsSource = read('pages/Reports.tsx');
const reportsScopePath = 'pages/Reports/studentReportScopeViewModel.ts';
const reportsScopeSource = fs.existsSync(path.join(root, reportsScopePath))
  ? read(reportsScopePath)
  : reportsSource;

const checks = [];
const check = (name, fn) => checks.push({ name, fn });

function assertIncludes(source, snippet, message = snippet) {
  if (!source.includes(snippet)) {
    throw new Error(`Missing: ${message}`);
  }
}

function assertPattern(source, pattern, message = String(pattern)) {
  if (!pattern.test(source)) {
    throw new Error(`Missing pattern: ${message}`);
  }
}

check('course detail can be browsed before purchase while non-public lessons stay locked', () => {
  assertIncludes(courseViewSource, 'withCourseAccessLocks');
  assertIncludes(courseViewSource, "lesson.accessControl !== 'public'");
  assertIncludes(courseViewSource, 'courseForCurrentAccess');
  assertPattern(
    courseViewSource,
    /if \(isPlaying\)[\s\S]*<CoursePlayer[\s\S]*course=\{courseForCurrentAccess\}/,
    'Course player must receive the access-aware course for open lessons.',
  );
  assertPattern(
    courseViewSource,
    /return \(\s*<div>[\s\S]*<CourseOverview[\s\S]*course=\{courseForCurrentAccess\}/,
    'Non-enrolled learners must see the browseable course overview instead of a dead landing page.',
  );
});

check('locked lessons and paid enrollment open the purchase flow instead of granting access', () => {
  assertIncludes(courseOverviewSource, 'lesson.isLocked');
  assertIncludes(courseOverviewSource, 'setShowPaymentModal(true);');
  assertIncludes(courseOverviewSource, 'coursePrice > 0');
  assertIncludes(courseOverviewSource, "navigate('/?auth=login')");
  assertIncludes(courseOverviewSource, 'handleLessonClick');
});

check('student path progress is scoped to enrolled paths and path-related exams', () => {
  assertIncludes(dashboardPathProgressSource, 'resolvePathProgress');
  assertIncludes(dashboardPathProgressSource, 'courseBelongsToPath');
  assertIncludes(dashboardPathProgressSource, '(result.skillsAnalysis || []).some((skill) => skill.pathId === path.id)');
  assertIncludes(dashboardSource, 'const enrolledPathSet = new Set(enrolledPaths ?? []);');
  assertIncludes(dashboardSource, 'storePaths.filter((path) => enrolledPathSet.has(path.id)');
  assertIncludes(dashboardSource, 'path.stats.examsCount');
});

check('student quizzes and attempts expose a path filter and visible path badge', () => {
  assertIncludes(quizzesSource, 'activePathFilter');
  assertIncludes(quizzesSource, 'pathFilteredPreparedQuizzes');
  assertIncludes(quizzesSource, 'matchesActivePath');
  assertIncludes(quizzesSource, 'visibleAttemptGroups');
  assertIncludes(quizzesSource, 'getPathName');
  assertIncludes(quizzesSource, 'paths.find((path) => path.id === quiz.pathId)?.name');
});

check('student reports can be filtered by one enrolled path or all enrolled paths', () => {
  assertIncludes(reportsSource, 'selectedStudentPathId');
  assertIncludes(reportsSource, 'studentReportPathOptions');
  assertIncludes(reportsSource, 'studentPathScopedSkills');
  assertIncludes(reportsSource, 'كل مساراتي');
  assertIncludes(reportsScopeSource, 'studentEnrolledPathIds');
  assertIncludes(reportsScopeSource, 'effectiveStudentPathIds');
  assertIncludes(reportsScopeSource, 'studentEnrolledPathIds.includes(path.id) || role !== Role.STUDENT');
  assertIncludes(reportsScopeSource, 'aggregatedSkills.filter((skill) => skill.pathId && effectiveStudentPathIds.includes(skill.pathId))');
});

let failed = 0;
for (const item of checks) {
  try {
    item.fn();
    console.log(`PASS ${item.name}`);
  } catch (error) {
    failed += 1;
    console.error(`FAIL ${item.name}`);
    console.error(error.message);
  }
}

if (failed) {
  console.error(`\n${failed}/${checks.length} student path scope checks failed.`);
  process.exit(1);
}

console.log(`\nAll ${checks.length} student path scope contract smoke checks passed.`);
