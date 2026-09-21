import { readFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n');

const reports = read('pages/Reports.tsx');
const analytics = read('pages/Reports/studentAnalyticsViewModel.ts');
const evidence = read('pages/Reports/studentEvidenceViewModel.ts');
const evidenceWindow = read('pages/Reports/studentEvidenceWindowViewModel.ts');
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

check('Reports delegates student analytics and recent evidence selection through stable view-models', () => {
  assertIncludes(reports, "from './Reports/studentAnalyticsViewModel';");
  assertIncludes(reports, "from './Reports/studentEvidenceWindowViewModel';");
  assertIncludes(reports, 'buildStudentEvidenceWindow({');
  assertIncludes(reports, 'selectedSubjectId: selectedStudentSubjectId');
  assertIncludes(reports, "const [selectedStudentSubjectId, setSelectedStudentSubjectId] = useState<string>('all')");
  assertIncludes(reports, '<option value="all">كل المواد</option>');
  assertIncludes(reports, 'buildStudentPerformanceStats(');
  assertIncludes(reports, 'buildStudentAggregatedSkills({');
  assertIncludes(reports, 'examResults: studentEvidenceWindow.recentExamResults');
  assertIncludes(reports, 'buildStudentEvidenceSummary(aggregatedSkills)');
  assertIncludes(reports, 'buildStudentSkillReadinessSummary(');
  assertIncludes(reports, 'minSkillEvidence: MIN_SKILL_EVIDENCE_COUNT');
  assertNotIncludes(reports, 'const subjectScores: Record<string');
  assertNotIncludes(reports, 'const skillsMap: Record<string');
});

check('recent evidence window scopes by selected path before taking the latest five quiz results', () => {
  assertIncludes(evidenceWindow, 'export const RECENT_STUDENT_QUIZ_RESULT_LIMIT = 5');
  assertIncludes(evidenceWindow, "selectedPathId === 'all'");
  assertIncludes(evidenceWindow, "selectedSubjectId === 'all'");
  assertIncludes(evidenceWindow, 'resolveQuizResultPathId(result) === selectedPathId');
  assertIncludes(evidenceWindow, 'resolveQuizResultSubjectId(result) === selectedSubjectId');
  assertIncludes(evidenceWindow, 'resolveQuestionAttemptPathId(attempt) === selectedPathId');
  assertIncludes(evidenceWindow, 'resolveQuestionAttemptSubjectId(attempt) === selectedSubjectId');
  assertIncludes(evidenceWindow, 'sortRecentFirst(subjectScopedExamResults).slice(0, boundedLimit)');
  assertIncludes(evidenceWindow, 'Math.max(1, Math.min(20');
});

check('student analytics weights mastery by evidence volume instead of treating each quiz equally', () => {
  assertIncludes(analytics, 'export const buildStudentPerformanceStats = (');
  assertIncludes(analytics, 'export const buildStudentAggregatedSkills = ({');
  assertIncludes(analytics, 'const reportedEvidence = Number(skill.questionCount)');
  assertIncludes(analytics, 'const reportedCorrect = Number(skill.correctCount)');
  assertIncludes(analytics, 'weightedMasteryTotal');
  assertIncludes(analytics, 'evidenceCount');
  assertIncludes(analytics, 'correctEvidence');
  assertIncludes(analytics, 'skillsMap[skillKey].weightedMasteryTotal +=');
  assertIncludes(analytics, 'skillsMap[skillId].weightedMasteryTotal += attempt.isCorrect ? 100 : 0');
  assertIncludes(analytics, 'const mastery = Math.round(data.weightedMasteryTotal / Math.max(data.evidenceCount, 1))');
  assertIncludes(analytics, 'correctAttempts: Math.round(data.correctEvidence)');
  assertIncludes(analytics, 'totalEvidence: data.evidenceCount');
  assertIncludes(analytics, 'isReliable: data.evidenceCount >= minSkillEvidence');
  assertNotIncludes(analytics, 'skillsMap[skillKey].totalMastery += skill.mastery');
  assertNotIncludes(analytics, 'isReliable: data.count >= minSkillEvidence');
  assertIncludes(analytics, ".sort((a, b) => a.mastery - b.mastery)");
});

check('question-attempt fallback keys evidence by stable skill id rather than display name', () => {
  assertIncludes(analytics, 'if (!skillsMap[skillId])');
  assertIncludes(analytics, 'skillsMap[skillId].evidenceCount += 1');
  assertNotIncludes(analytics, 'if (!skillsMap[skillName])');
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
});

check('student analytics and evidence view-models are deterministic and runtime-side-effect free', () => {
  for (const source of [analytics, evidence, evidenceWindow]) {
    assertNotIncludes(source, 'useStore');
    assertNotIncludes(source, "from 'react'");
    assertNotIncludes(source, "from '../../services/api'");
    assertNotIncludes(source, 'api.');
    assertNotIncludes(source, 'navigator.');
    assertNotIncludes(source, 'window.');
    assertNotIncludes(source, 'loadXlsx');
  }
});

check('source contracts keep the stable analytics facade and evidence ownership boundaries', () => {
  assertIncludes(reportsRole, "../pages/Reports/studentAnalyticsViewModel.ts");
  assertIncludes(globalJourney, "../pages/Reports/studentAnalyticsViewModel.ts");
  assertIncludes(performance, "assertIncludes('pages/Reports/studentAnalyticsViewModel.ts', 'isReliable: data.evidenceCount >= minSkillEvidence');");
  assertNotIncludes(performance, "assertIncludes('pages/Reports.tsx', 'isReliable: data.evidenceCount >= MIN_SKILL_EVIDENCE_COUNT');");
});

check('student analytics split reduces responsibility without creating replacement hotspots', () => {
  const reportLines = reports.split('\n').length;
  const analyticsLines = analytics.split('\n').length;
  const evidenceLines = evidence.split('\n').length;
  const evidenceWindowLines = evidenceWindow.split('\n').length;
  if (reportLines >= 3350) throw new Error(`Reports.tsx remained too large after student analytics extraction: ${reportLines}`);
  if (analyticsLines > 220) throw new Error(`studentAnalyticsViewModel.ts exceeded 220 lines: ${analyticsLines}`);
  if (evidenceLines > 100) throw new Error(`studentEvidenceViewModel.ts exceeded 100 lines: ${evidenceLines}`);
  if (evidenceWindowLines > 100) throw new Error(`studentEvidenceWindowViewModel.ts exceeded 100 lines: ${evidenceWindowLines}`);
});

const failed = checks.filter((item) => item.status === 'FAIL');
const result = {
  phase: 'reports-student-analytics-view-model',
  status: failed.length === 0 ? 'PASS' : 'FAIL',
  reportsLines: reports.split('\n').length,
  analyticsLines: analytics.split('\n').length,
  evidenceLines: evidence.split('\n').length,
  evidenceWindowLines: evidenceWindow.split('\n').length,
  checks,
};

console.log(JSON.stringify(result, null, 2));
if (failed.length > 0) process.exit(1);
