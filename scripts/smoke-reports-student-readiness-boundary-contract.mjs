import { readFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n');

const reports = read('pages/Reports.tsx');
const readiness = read('pages/Reports/studentReadinessViewModel.ts');
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

check('Reports delegates readiness decision while keeping icon rendering in React', () => {
  assertIncludes(reports, "from './Reports/studentReadinessViewModel';");
  assertIncludes(reports, 'buildStudentReadinessDecision(isStudentView, studentTodayFocus)');
  assertIncludes(reports, 'studentReadinessIcons[decision.iconKey]');
  assertNotIncludes(reports, 'const studentReadinessDecision = useMemo(() => {\n        if (!isStudentView) return null;');
});

check('readiness decision preserves measurement, advance, practice, and remediation thresholds', () => {
  assertIncludes(readiness, 'const readyToAdvance = mastery >= 75 && Boolean(studentTodayFocus.isReliable);');
  assertIncludes(readiness, 'const needsPractice = mastery >= 50;');
  assertIncludes(readiness, "status: 'needsMeasurement'");
  assertIncludes(readiness, "status: 'readyToAdvance'");
  assertIncludes(readiness, "status: 'needsPractice'");
  assertIncludes(readiness, "status: 'needsRemediation'");
});

check('readiness decision preserves learner-facing labels and links', () => {
  assertIncludes(readiness, "title: 'جاهز تنتقل؟ نحتاج قياس قصير أولًا'");
  assertIncludes(readiness, "title: 'نعم، جاهز تنتقل بعد تثبيت قصير'");
  assertIncludes(readiness, "title: 'ليس بعد، تحتاج تدريبًا قصيرًا'");
  assertIncludes(readiness, "title: 'ليس الآن، ابدأ بموضوع التأسيس'");
  assertIncludes(readiness, "'/dashboard?tab=saher'");
  assertIncludes(readiness, "studentTodayFocus.lessonLink || studentTodayFocus.foundationTopicLink || '/courses'");
});

check('readiness decision stays deterministic and UI-framework independent', () => {
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
    assertNotIncludes(readiness, forbidden);
  }
});

check('role and global journey contracts follow readiness ownership', () => {
  assertIncludes(roleContract, "../pages/Reports/studentReadinessViewModel.ts");
  assertIncludes(globalJourney, "../pages/Reports/studentReadinessViewModel.ts");
});

check('readiness extraction reduces Reports without creating another hotspot', () => {
  const reportLines = reports.split('\n').length;
  const readinessLines = readiness.split('\n').length;
  if (reportLines >= 2885) throw new Error(`Reports.tsx exceeded the guarded size: ${reportLines}`);
  if (readinessLines > 140) throw new Error(`studentReadinessViewModel.ts exceeded 140 lines: ${readinessLines}`);
});

const failed = checks.filter((item) => item.status === 'FAIL');
console.log(JSON.stringify({
  phase: 'reports-student-readiness-view-model',
  status: failed.length === 0 ? 'PASS' : 'FAIL',
  reportsLines: reports.split('\n').length,
  readinessLines: readiness.split('\n').length,
  checks,
}, null, 2));

if (failed.length > 0) process.exit(1);
