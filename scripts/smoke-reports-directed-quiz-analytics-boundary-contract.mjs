import { readFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n');

const reports = read('pages/Reports.tsx');
const directed = read('pages/Reports/directedQuizAnalyticsViewModel.ts');
const reportsRole = read('scripts/smoke-reports-role-contract.mjs');
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

check('Reports delegates directed quiz analytics while keeping selection correction in React', () => {
  assertIncludes(reports, "from './Reports/directedQuizAnalyticsViewModel';");
  assertIncludes(reports, 'buildDirectedFollowUpOptions(scopedAnalytics)');
  assertIncludes(reports, 'selectDirectedFollowUpQuiz(directedFollowUpOptions, selectedFollowUpQuizId)');
  assertIncludes(reports, 'buildDirectedQuizAnalysisResults({');
  assertIncludes(reports, 'buildDirectedQuizSkillAnalysis(directedQuizAnalysisResults)');
  assertIncludes(reports, 'buildDirectedQuizStudentAnalysis(directedQuizAnalysisResults)');
  assertIncludes(reports, 'buildDirectedQuizSummary(directedQuizAnalysisResults, directedQuizSkillAnalysis, selectedFollowUpQuiz)');
  assertIncludes(reports, "setSelectedFollowUpQuizId('all')");
  assertNotIncludes(reports, 'const targetQuizIds = selectedFollowUpQuizId === \'all\'');
  assertNotIncludes(reports, 'const skillMap = new Map<string, {');
});

check('directed quiz view-model preserves directed-assignment filtering', () => {
  assertIncludes(directed, 'export const buildDirectedFollowUpOptions = (');
  assertIncludes(directed, "const mode = quiz.mode || 'regular';");
  assertIncludes(directed, 'const hasTargets = (quiz.targetUserIds || []).length > 0 || (quiz.targetGroupIds || []).length > 0;');
  assertIncludes(directed, "return mode === 'central' || hasTargets;");
  assertIncludes(directed, "selectedFollowUpQuizId === 'all'");
  assertIncludes(directed, 'targetQuizIds.has(result.quizId)');
});

check('directed quiz view-model preserves group filtering and skill analysis thresholds', () => {
  assertIncludes(directed, "if (scopedGroupFilter === 'all') return true;");
  assertIncludes(directed, 'scopedFilteredStudents.some((student) => student.id === result.userId)');
  assertIncludes(directed, 'if (mastery < 75 && result.userId)');
  assertIncludes(directed, '.sort((a, b) => a.mastery - b.mastery)');
  assertIncludes(directed, '.slice(0, 8);');
});

check('directed quiz view-model preserves student weakness and summary semantics', () => {
  assertIncludes(directed, 'Number(skill.mastery || 0) < 75');
  assertIncludes(directed, '.slice(0, 3);');
  assertIncludes(directed, "studentName: displayText(result.studentName || result.studentEmail) || 'طالب'");
  assertIncludes(directed, '.sort((a, b) => a.score - b.score)');
  assertIncludes(directed, '.slice(0, 12);');
  assertIncludes(directed, 'Number(result.score || 0) < 75');
  assertIncludes(directed, "title: selectedFollowUpQuiz ? displayText(selectedFollowUpQuiz.title) : 'كل الاختبارات الموجهة'");
});

check('directed quiz view-model remains deterministic and runtime-side-effect free', () => {
  assertNotIncludes(directed, 'useStore');
  assertNotIncludes(directed, "from 'react'");
  assertNotIncludes(directed, "from '../../services/api'");
  assertNotIncludes(directed, 'api.');
  assertNotIncludes(directed, 'navigator.');
  assertNotIncludes(directed, 'window.');
  assertNotIncludes(directed, 'setSelectedFollowUpQuizId');
  assertNotIncludes(directed, 'loadXlsx');
});

check('Reports contracts follow directed quiz analytics ownership', () => {
  assertIncludes(reportsRole, "../pages/Reports/directedQuizAnalyticsViewModel.ts");
  assertIncludes(globalJourney, "../pages/Reports/directedQuizAnalyticsViewModel.ts");
  assertIncludes(reportsRole, "assertIncludes(reportsSource, 'buildDirectedQuizAnalysisResults({');");
  assertIncludes(reportsRole, "assertIncludes(reportsSource, 'buildDirectedQuizSkillAnalysis(directedQuizAnalysisResults)');");
});

check('directed quiz extraction reduces Reports without creating a replacement hotspot', () => {
  const reportLines = reports.split('\n').length;
  const directedLines = directed.split('\n').length;
  if (reportLines >= 3170) throw new Error(`Reports.tsx remained too large after directed quiz extraction: ${reportLines}`);
  if (directedLines > 210) throw new Error(`directedQuizAnalyticsViewModel.ts exceeded 210 lines: ${directedLines}`);
});

const failed = checks.filter((item) => item.status === 'FAIL');
const result = {
  phase: 'reports-directed-quiz-analytics-view-model',
  status: failed.length === 0 ? 'PASS' : 'FAIL',
  reportsLines: reports.split('\n').length,
  directedLines: directed.split('\n').length,
  checks,
};

console.log(JSON.stringify(result, null, 2));
if (failed.length > 0) process.exit(1);
