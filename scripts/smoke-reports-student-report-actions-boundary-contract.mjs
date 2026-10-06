import { readFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n');

const reports = read('pages/Reports.tsx');
const actions = read('pages/Reports/studentReportActionsViewModel.ts');
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

check('Reports delegates learner follow-up projections to a focused view-model', () => {
  assertIncludes(reports, "from './Reports/studentReportActionsViewModel';");
  assertIncludes(reports, 'buildStudentAdaptiveLearningBridge(studentTodayFocus)');
  assertIncludes(reports, 'buildStudentReportNextAction(isStudentView, studentTodayFocus)');
  assertIncludes(reports, 'buildStudentFollowUpSummary({');
  assertNotIncludes(reports, "const skillParam = studentTodayFocus.skillId ? `?skillIds=${encodeURIComponent(studentTodayFocus.skillId)}` : '';");
  assertNotIncludes(reports, "title: 'ابدأ بقياس قصير',\n            description: 'حل اختبار ساهر أولًا");
});

check('student report actions preserve relearn, adaptive training, smart path, and retest links', () => {
  assertIncludes(actions, "relearnLink: studentTodayFocus.lessonLink || studentTodayFocus.foundationTopicLink || '/courses'");
  assertIncludes(actions, "adaptiveTrainingLink: studentTodayFocus.quizLink || (studentTodayFocus.skillId ? `/quiz${skillParam}` : '/dashboard?tab=saher')");
  assertIncludes(actions, "smartPathLink: '/plan'");
  assertIncludes(actions, "retestLink: studentTodayFocus.quizLink || (studentTodayFocus.skillId ? `/quiz${skillParam}` : '/dashboard?tab=saher')");
  assertIncludes(actions, "primaryLabel: studentTodayFocus.lessonLink || studentTodayFocus.foundationTopicLink ? 'فتح موضوع التأسيس' : 'استعراض الشروحات'");
  assertIncludes(actions, "secondaryLabel: 'تدريب قصير'");
  assertIncludes(actions, "tone: studentTodayFocus.mastery < 50 ? 'rose' : 'amber'");
});

check('student follow-up summary preserves evidence wording and period/track context', () => {
  assertIncludes(actions, "const weaknessLabel = weakest?.isReliable ? 'ضعف مؤكد' : 'إشارة أولية';");
  assertIncludes(actions, '`متوسطك الحالي ${averageScore || 0}%.`');
  assertIncludes(actions, '`الفترة: ${studentPeriodLabel}.`');
  assertIncludes(actions, "studentTrackLabel ? `المسار: ${studentTrackLabel}.` : 'اختر مسارك حتى نرتب التقارير والاختبارات حسبه.'");
  assertIncludes(actions, "'الخطوة: إعادة تعلم قصيرة، تدريب تكيفي، ثم قياس داخل المسار الذكي.'");
});

check('student report action projection stays deterministic and side-effect free', () => {
  for (const forbidden of [
    "from 'react'",
    'useMemo',
    'useStore',
    "from '../../services/api'",
    'api.',
    'navigator.',
    'window.',
    'loadXlsx',
    'lucide-react',
  ]) {
    assertNotIncludes(actions, forbidden);
  }
});

check('role and global journey contracts follow student report action ownership', () => {
  assertIncludes(roleContract, "../pages/Reports/studentReportActionsViewModel.ts");
  assertIncludes(globalJourney, "../pages/Reports/studentReportActionsViewModel.ts");
  assertIncludes(roleContract, "assertIncludes(reportsSource, 'buildStudentAdaptiveLearningBridge(studentTodayFocus)');");
  assertNotIncludes(roleContract, "assertIncludes(reportsSource, 'const studentAdaptiveLearningBridge = useMemo');");
});

check('student report action extraction reduces Reports without creating another hotspot', () => {
  const reportLines = reports.split('\n').length;
  const actionLines = actions.split('\n').length;
  if (reportLines >= 2975) throw new Error(`Reports.tsx exceeded the guarded size: ${reportLines}`);
  if (actionLines > 150) throw new Error(`studentReportActionsViewModel.ts exceeded 150 lines: ${actionLines}`);
});

const failed = checks.filter((item) => item.status === 'FAIL');
const result = {
  phase: 'reports-student-report-actions-view-model',
  status: failed.length === 0 ? 'PASS' : 'FAIL',
  reportsLines: reports.split('\n').length,
  actionLines: actions.split('\n').length,
  checks,
};

console.log(JSON.stringify(result, null, 2));
if (failed.length > 0) process.exit(1);
