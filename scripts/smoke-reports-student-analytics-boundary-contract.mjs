import { readFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n');

const reports = read('pages/Reports.tsx');
const analytics = read('pages/Reports/studentAnalyticsViewModel.ts');
const evidence = read('pages/Reports/studentEvidenceViewModel.ts');
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

check('Reports delegates student analytics derivation through the stable analytics facade', () => {
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

check('student analytics view-model preserves performance and aggregation semantics', () => {
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

check('student evidence view-model owns evidence totals and readiness messaging', () => {
  assertIncludes(analytics, "from './studentEvidenceViewModel';");
  assertIncludes(analytics, 'buildStudentEvidenceSummary,');
  assertIncludes(analytics, 'buildStudentSkillReadinessSummary,');
  assertNotIncludes(analytics, 'export const buildStudentEvidenceSummary =');
  assertNotIncludes(analytics, 'export const buildStudentSkillReadinessSummary =');
  assertIncludes(evidence, 'export const buildStudentEvidenceSummary =');
  assertIncludes(evidence, 'skill.totalEvidence || skill.attempts || 0');
  assertIncludes(evidence, 'export const buildStudentSkillReadinessSummary = (');
  assertIncludes(evidence, 'مؤشراتك مطمئنة. حافظ على التدريب القصير.');
  assertIncludes(evidence, 'ابدأ اختبارًا قصيرًا حتى تظهر خريطة مهاراتك.');
  assertIncludes(evidence, 'مهارة بها إشارات أولية وتحتاج محاولات أكثر قبل الحكم.');
});

check('student analytics and evidence view-models are deterministic and runtime-side-effect free', () => {
  for (const source of [analytics, evidence]) {
    assertNotIncludes(source, 'useStore');
    assertNotIncludes(source, "from 'react'");
    assertNotIncludes(source, "from '../../services/api'");
    assertNotIncludes(source, 'api.');
    assertNotIncludes(source, 'navigator.');
    assertNotIncludes(source, 'window.');
    assertNotIncludes(source, 'loadXlsx');
  }
});

check('source contracts keep the stable student analytics facade while evidence has separate ownership', () => {
  assertIncludes(reportsRole, "../pages/Reports/studentAnalyticsViewModel.ts");
  assertIncludes(globalJourney, "../pages/Reports/studentAnalyticsViewModel.ts");
  assertIncludes(performance, "assertIncludes('pages/Reports/studentAnalyticsViewModel.ts', 'isReliable: data.count >= minSkillEvidence');");
  assertNotIncludes(performance, "assertIncludes('pages/Reports.tsx', 'isReliable: data.count >= MIN_SKILL_EVIDENCE_COUNT');");
});

check('student analytics split reduces responsibility without creating a replacement hotspot', () => {
  const reportLines = reports.split('\n').length;
  const analyticsLines = analytics.split('\n').length;
  const evidenceLines = evidence.split('\n').length;
  if (reportLines >= 3350) throw new Error(`Reports.tsx remained too large after student analytics extraction: ${reportLines}`);
  if (analyticsLines > 220) throw new Error(`studentAnalyticsViewModel.ts exceeded 220 lines: ${analyticsLines}`);
  if (evidenceLines > 100) throw new Error(`studentEvidenceViewModel.ts exceeded 100 lines: ${evidenceLines}`);
});

const failed = checks.filter((item) => item.status === 'FAIL');
const result = {
  phase: 'reports-student-analytics-view-model',
  status: failed.length === 0 ? 'PASS' : 'FAIL',
  reportsLines: reports.split('\n').length,
  analyticsLines: analytics.split('\n').length,
  evidenceLines: evidence.split('\n').length,
  checks,
};

console.log(JSON.stringify(result, null, 2));
if (failed.length > 0) process.exit(1);
