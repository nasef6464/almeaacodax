import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const requirePost = process.argv.includes('--require-post');
const resultsPath = 'pages/Results.tsx';
const helperPath = 'components/results/resultScorePresentation.ts';
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n');

const results = read(resultsPath);
const helper = read(helperPath);
const importFragment = "from '../components/results/resultScorePresentation'";
const legacyMarkers = [
  'const getMasteryClasses =',
  'const getSkillPriorityLabel =',
  'const getFriendlyResultMessage =',
  'const getScoreVisualTone =',
  'const getStudentFriendlyChecklist =',
];
const legacyCount = legacyMarkers.filter((marker) => results.includes(marker)).length;
const hasHelperImport = results.includes(importFragment);
const mode = !hasHelperImport && legacyCount === legacyMarkers.length
  ? 'PRE_BOUNDARY'
  : hasHelperImport && legacyCount === 0
    ? 'POST_BOUNDARY'
    : 'PARTIAL';

const checks = [];
const check = (name, assertion) => {
  try { assertion(); checks.push({ name, status: 'PASS' }); }
  catch (error) { checks.push({ name, status: 'FAIL', details: error instanceof Error ? error.message : String(error) }); }
};

check('Results score presentation boundary is never partially applied', () => {
  if (mode === 'PARTIAL') throw new Error(`Partial boundary state: import=${hasHelperImport}, legacy=${legacyCount}/${legacyMarkers.length}`);
  if (requirePost && mode !== 'POST_BOUNDARY') throw new Error(`Post-boundary state required, got ${mode}`);
});

check('score presentation helper owns only deterministic display mapping', () => {
  for (const marker of [
    'export const getMasteryClasses',
    'export const getSkillPriorityLabel',
    'export const getFriendlyResultMessage',
    'export const getScoreVisualTone',
    'export const getStudentFriendlyChecklist',
  ]) {
    if (!helper.includes(marker)) throw new Error(`Missing helper ownership marker: ${marker}`);
  }

  for (const forbidden of [
    'useStore(',
    'fetch(',
    'localStorage',
    'sessionStorage',
    'printElementAsPdf',
    'shareTextSummary',
    'buildQuizRouteWithContext',
    'getSkillRecommendation',
  ]) {
    if (helper.includes(forbidden)) throw new Error(`Score presentation helper must not own side effect/domain concern: ${forbidden}`);
  }
});

check('Results retains recommendation, review reconstruction, routing, and page ownership', () => {
  for (const marker of [
    'useStore()',
    'const getSkillRecommendation =',
    'const supplementMissingReviewQuestions =',
    'const getStatusFromMastery =',
    'const ResultChartFallback:',
    'const SimpleResultStat =',
    'printElementAsPdf',
    'shareTextSummary',
    'buildQuizRouteWithContext',
  ]) {
    if (!results.includes(marker)) throw new Error(`Results lost retained ownership marker: ${marker}`);
  }
});

check('post-boundary Results consumes score presentation helper instead of redefining it', () => {
  if (mode !== 'POST_BOUNDARY') return;
  if (!hasHelperImport) throw new Error('Results does not import resultScorePresentation helper');
  for (const marker of legacyMarkers) {
    if (results.includes(marker)) throw new Error(`Results still defines score presentation marker: ${marker}`);
  }
});

const failed = checks.filter((item) => item.status === 'FAIL');
console.log(JSON.stringify({
  phase: 'results-score-presentation-boundary',
  status: failed.length ? 'FAIL' : 'PASS',
  mode,
  checks,
}, null, 2));
if (failed.length) process.exit(1);
