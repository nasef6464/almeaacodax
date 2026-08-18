import { readFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n');

const reports = read('pages/Reports.tsx');
const analytics = read('pages/Reports/studentAnalyticsViewModel.ts');
const reportsRole = read('scripts/smoke-reports-role-contract.mjs');
const globalJourney = read('scripts/smoke-global-student-journey-contract.mjs');
const performance = read('scripts/smoke-performance-contract.mjs');

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

check('Reports delegates student analytics derivation to a pure view-model', () => {
  assertIncludes(reports, "from './Reports/studentAnalyticsViewModel';");
  assertIncludes(reports, 'buildStudentPerformanceStats(');
  assertIncludes(reports, 'buildStudentAggregatedSkills({');
  assertIncludes(reports, 'buildStudentEvidenceSummary(aggregatedSkills)');
  assertIncludes(reports, 'buildStudentSkillReadinessSummary(');
  assertIncludes(reports, 'minSkillEvidence: MIN_SKILL_EVIDENCE_COUNT');
  assertNotIncludes(reports, 'const subjectScores: Record<string');
  assertNotIncludes(reports, 'const skillsMap: Record<string');
  assertNotIncludes(reports, 'isReliable: data.count >= MIN_SKILL_EVIDENCE_COUNT');
});

check('student analytics view-model preserves performance and evidence semantics', () => {
  assertIncludes(analytics, 'export const buildStudentPerformanceStats = (');
  assertIncludes(analytics, "bestSubject: { name: 'تدريبات الأسئلة', score: averageScore }");
  assertIncludes(analytics, "worstSubject: { name: 'تحتاج متابعة', score: averageScore }");
  assertIncludes(analytics, "displayText(result.quizTitle).replace('اختبار ', '').replace('الوحدة الأولى', 'أساسيات')");
  assertIncludes(analytics, 'export const buildStudentAggregatedSkills = ({');
  assertIncludes(analytics, 'skillsMap[skillKey].totalMastery += skill.mastery');
  assertIncludes(analytics, 'skillsMap[skillName].totalMastery += attempt.isCorrect ? 100 : 0');
  assertIncludes(analytics, 'correctAttempts: Math.round((mastery / 100) * data.count)');
  assertIncludes(analytics, 'isReliable: data.count >= minSkillEvidence');
  assertIncludes(analytics, ".sort((a, b) => a.mastery - b.mastery)");
});

check('student analytics view-model preserves readiness messaging and evidence summary', () => {
  assertIncludes(analytics, 'export const buildStudentEvidenceSummary =');
  assertIncludes(analytics, 'skill.totalEvidence || skill.attempts || 0');
  assertIncludes(analytics, 'export const buildStudentSkillReadinessSummary = (');
  assertIncludes(analytics, 'مؤشراتك مطمئنة. حافظ على التدريب القصير.');
  assertIncludes(analytics, 'ابدأ اختبارًا قصيرًا حتى تظهر خريطة مهاراتك.');
  assertIncludes(analytics, 'مهارة بها إشارات أولية وتحتاج محاولات أكثر قبل الحكم.');
});

check('student analytics view-model is deterministic and runtime-side-effect free', () => {
  assertNotIncludes(analytics, 'useStore');
  assertNotIncludes(analytics, "from 'react'");
  assertNotIncludes(analytics, "from '../../services/api'");
  assertNotIncludes(analytics, 'api.');
  assertNotIncludes(analytics, 'navigator.');
  assertNotIncludes(analytics, 'window.');
  assertNotIncludes(analytics, 'loadXlsx');
});

check('source contracts follow extracted student analytics ownership', () => {
  assertIncludes(reportsRole, "../pages/Reports/studentAnalyticsViewModel.ts");
  assertIncludes(globalJourney, "../pages/Reports/studentAnalyticsViewModel.ts");
  assertIncludes(performance, "assertIncludes('pages/Reports/studentAnalyticsViewModel.ts', 'isReliable: data.count >= minSkillEvidence');");
  assertNotIncludes(performance, "assertIncludes('pages/Reports.tsx', 'isReliable: data.count >= MIN_SKILL_EVIDENCE_COUNT');");
});

check('student analytics extraction materially reduces Reports without creating a replacement hotspot', () => {
  const reportLines = reports.split('\n').length;
  const analyticsLines = analytics.split('\n').length;
  if (reportLines >= 3350) throw new Error(`Reports.tsx remained too large after student analytics extraction: ${reportLines}`);
  if (analyticsLines > 260) throw new Error(`studentAnalyticsViewModel.ts exceeded 260 lines: ${analyticsLines}`);
});

const failed = checks.filter((item) => item.status === 'FAIL');
const result = {
  phase: 'reports-student-analytics-view-model',
  status: failed.length === 0 ? 'PASS' : 'FAIL',
  reportsLines: reports.split('\n').length,
  analyticsLines: analytics.split('\n').length,
  checks,
};

console.log(JSON.stringify(result, null, 2));
if (failed.length > 0) process.exit(1);
