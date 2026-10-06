import { readFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n');

const reports = read('pages/Reports.tsx');
const learningLoop = read('pages/Reports/studentLearningLoopViewModel.ts');
const roleContract = read('scripts/smoke-reports-role-contract.mjs');
const globalJourney = read('scripts/smoke-global-student-journey-contract.mjs');

const checks = [];

function check(name, assertion) {
  try {
    assertion();
    checks.push({ name, status: 'PASS' });
  } catch (error) {
    checks.push({ name, status: 'FAIL', details: error instanceof Error ? error.message : String(error) });
  }
}

function assertIncludes(source, fragment, message) {
  if (!source.includes(fragment)) throw new Error(message || `Missing fragment: ${fragment}`);
}

function assertNotIncludes(source, fragment, message) {
  if (source.includes(fragment)) throw new Error(message || `Unexpected fragment: ${fragment}`);
}

check('Reports delegates learner quick actions and learning-loop semantics', () => {
  assertIncludes(reports, "from './Reports/studentLearningLoopViewModel';");
  assertIncludes(reports, 'buildStudentQuickActions(studentTodayFocus)');
  assertIncludes(reports, 'buildStudentTodayLearningLoop(studentTodayFocus, studentQuickActions)');
  assertIncludes(reports, 'studentLearningActionIcons[action.iconKey]');
  assertNotIncludes(reports, 'const studentQuickActions = useMemo(() => {');
  assertNotIncludes(reports, 'const studentTodayLearningLoop = useMemo(() => {\n        if (!studentTodayFocus)');
});

check('learning loop preserves explain, practice, and remeasure sequence', () => {
  assertIncludes(learningLoop, "title: 'راجع الشرح'");
  assertIncludes(learningLoop, "title: 'حل تدريب قصير'");
  assertIncludes(learningLoop, "title: 'أعد القياس'");
  assertIncludes(learningLoop, "label: 'قياس التحسن'");
  assertIncludes(learningLoop, "link: studentTodayFocus.lessonLink || studentTodayFocus.foundationTopicLink || '/courses'");
  assertIncludes(learningLoop, "'/dashboard?tab=saher'");
});

check('learning loop preserves evidence and readiness thresholds', () => {
  assertIncludes(learningLoop, 'mastery >= 75');
  assertIncludes(learningLoop, "? 'جاهز للتثبيت'");
  assertIncludes(learningLoop, 'mastery >= 50');
  assertIncludes(learningLoop, "? 'راجع ثم قِس'");
  assertIncludes(learningLoop, ": 'ابدأ من الشرح'");
  assertIncludes(learningLoop, '`قراءة أولية من ${studentTodayFocus.attempts} محاولة`');
});

check('learning loop stays deterministic and UI-framework independent', () => {
  for (const forbidden of [
    "from 'react'",
    'useMemo',
    'useStore',
    "from '../../services/api'",
    'api.',
    'navigator.',
    'window.',
    'lucide-react',
  ]) {
    assertNotIncludes(learningLoop, forbidden);
  }
});

check('role and global journey contracts follow learning-loop ownership', () => {
  assertIncludes(roleContract, "../pages/Reports/studentLearningLoopViewModel.ts");
  assertIncludes(globalJourney, "../pages/Reports/studentLearningLoopViewModel.ts");
});

check('learning-loop extraction reduces Reports without creating another hotspot', () => {
  const reportLines = reports.split('\n').length;
  const loopLines = learningLoop.split('\n').length;
  if (reportLines >= 2835) throw new Error(`Reports.tsx exceeded the guarded size: ${reportLines}`);
  if (loopLines > 150) throw new Error(`studentLearningLoopViewModel.ts exceeded 150 lines: ${loopLines}`);
});

const failed = checks.filter((item) => item.status === 'FAIL');
console.log(JSON.stringify({
  phase: 'reports-student-learning-loop-view-model',
  status: failed.length === 0 ? 'PASS' : 'FAIL',
  reportsLines: reports.split('\n').length,
  learningLoopLines: learningLoop.split('\n').length,
  checks,
}, null, 2));

if (failed.length > 0) process.exit(1);
