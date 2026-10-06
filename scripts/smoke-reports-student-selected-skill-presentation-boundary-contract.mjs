import { readFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n');

const reports = read('pages/Reports.tsx');
const panel = read('pages/Reports/StudentSelectedSkillPanel.tsx');
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

check('Reports keeps selected-skill ownership while delegating presentation', () => {
  assertIncludes(reports, "import { StudentSelectedSkillPanel } from './Reports/StudentSelectedSkillPanel';");
  assertIncludes(reports, '{selectedReportSkill ? (');
  assertIncludes(reports, '<StudentSelectedSkillPanel');
  assertIncludes(reports, 'skill={selectedReportSkill}');
  assertIncludes(reports, 'recommendation={selectedSkillRecommendation}');
  assertIncludes(reports, 'sessionLink={buildSkillSessionLink(selectedReportSkill)}');
  assertIncludes(reports, 'setSelectedSkillKey(');
  assertNotIncludes(reports, 'مقترحات لهذه المهارة');
});

check('selected-skill panel preserves recommendation copy and all action fallbacks', () => {
  for (const fragment of [
    'مقترحات لهذه المهارة',
    'اختر من المقترحات التالية ما يناسب وقتك الآن. الأفضل أن تبدأ بالشرح ثم تنتقل للتدريب.',
    'يمكنك تغيير المقترحات بالضغط على أي مهارة من البطاقات بالأعلى.',
    'to={recommendation.lessonLink}',
    "recommendation.lessonTopicTitle ? `درس: ${recommendation.lessonTopicTitle}` : 'فيديو أو درس'",
    'to="/courses"',
    'استعرض الشروح',
    'to={recommendation.quizLink}',
    'اختبار علاجي',
    'to="/dashboard?tab=saher"',
    'ابحث عن اختبار',
    'href={recommendation.resourceUrl}',
    'target="_blank"',
    'rel="noreferrer"',
    'ملف داعم',
    'to={sessionLink}',
    'حجز حصة',
  ]) assertIncludes(panel, fragment);
});

check('selected-skill panel is presentation-only', () => {
  for (const forbidden of ['useStore', 'api.', 'setSelectedSkillKey', 'buildSkillSessionLink', 'useState', 'useEffect', 'window.', 'navigator.']) {
    assertNotIncludes(panel, forbidden);
  }
  assertIncludes(panel, "type StudentAggregatedSkill");
  assertIncludes(panel, "import type { SkillRecommendation } from './reportTypes';");
});

check('aggregate contracts follow selected-skill presentation ownership', () => {
  assertIncludes(roleContract, "../pages/Reports/StudentSelectedSkillPanel.tsx");
  assertIncludes(globalJourney, "../pages/Reports/StudentSelectedSkillPanel.tsx");
});

check('selected-skill extraction remains bounded', () => {
  const reportLines = reports.split('\n').length;
  const panelLines = panel.split('\n').length;
  if (reportLines >= 2620) throw new Error(`Reports.tsx exceeded guarded size: ${reportLines}`);
  if (panelLines > 80) throw new Error(`StudentSelectedSkillPanel.tsx exceeded 80 lines: ${panelLines}`);
});

const failed = checks.filter((item) => item.status === 'FAIL');
console.log(JSON.stringify({
  phase: 'reports-student-selected-skill-presentation',
  status: failed.length === 0 ? 'PASS' : 'FAIL',
  reportsLines: reports.split('\n').length,
  panelLines: panel.split('\n').length,
  checks,
}, null, 2));
if (failed.length > 0) process.exit(1);
