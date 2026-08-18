import { readFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n');

const reports = read('pages/Reports.tsx');
const recommendation = read('pages/Reports/recommendationViewModel.ts');
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

check('Reports delegates recommendation ranking to a dedicated view-model', () => {
  assertIncludes(reports, "import { buildSkillRecommendation } from './Reports/recommendationViewModel';");
  assertIncludes(reports, 'const getSkillRecommendation = (');
  assertIncludes(reports, 'buildSkillRecommendation(skill, {');
  assertIncludes(reports, 'subjects: useStore.getState().subjects');
  assertIncludes(reports, 'sections: useStore.getState().sections');
  assertNotIncludes(reports, "import { matchesEntityId } from '../utils/entityIds';");
  assertNotIncludes(reports, 'const scoredFoundationTopics =');
  assertNotIncludes(reports, "const buildFoundationTopicLink = (content: 'lessons' | 'quizzes')");
});

check('recommendation view-model preserves content ranking and links', () => {
  assertIncludes(recommendation, 'export const buildSkillRecommendation = (');
  assertIncludes(recommendation, 'lesson.skillIds?.includes(resolvedSkill.id)');
  assertIncludes(recommendation, 'quiz.questionIds?.some((questionId) =>');
  assertIncludes(recommendation, 'item.skillIds?.includes(resolvedSkill.id)');
  assertIncludes(recommendation, '(topicHasLesson ? 60 : 0)');
  assertIncludes(recommendation, '(topicHasQuiz ? 55 : 0)');
  assertIncludes(recommendation, '(topicMatchesSkill ? 80 : 0)');
  assertIncludes(recommendation, '(topicMatchesSection ? 35 : 0)');
  assertIncludes(recommendation, "params.set('tab', 'skills')");
  assertIncludes(recommendation, "params.set('content', content)");
  assertIncludes(recommendation, 'quizLink: foundationTrainingLink ||');
  assertIncludes(recommendation, 'ابدأ بالشرح أولًا ثم نفّذ اختبارًا قصيرًا لقياس التحسن.');
  assertIncludes(recommendation, 'أعد المحاولة عبر اختبار ساهر مخصص لهذه المهارة.');
});

check('recommendation view-model is deterministic and store/API independent', () => {
  assertNotIncludes(recommendation, 'useStore');
  assertNotIncludes(recommendation, 'React');
  assertNotIncludes(recommendation, "from '../../services/api'");
  assertNotIncludes(recommendation, 'api.');
  assertNotIncludes(recommendation, 'navigator.');
  assertNotIncludes(recommendation, 'window.');
  assertNotIncludes(recommendation, 'loadXlsx');
  assertIncludes(recommendation, 'subjects: CategorySubject[];');
  assertIncludes(recommendation, 'sections: CategorySection[];');
});

check('source contracts follow recommendation ownership after extraction', () => {
  assertIncludes(reportsRole, "../pages/Reports/recommendationViewModel.ts");
  assertIncludes(globalJourney, "../pages/Reports/recommendationViewModel.ts");
});

check('recommendation extraction reduces Reports hotspot without creating another hotspot', () => {
  const reportLines = reports.split('\n').length;
  const recommendationLines = recommendation.split('\n').length;
  if (reportLines >= 3490) throw new Error(`Reports.tsx remained too large after recommendation extraction: ${reportLines}`);
  if (recommendationLines > 190) throw new Error(`recommendationViewModel.ts exceeded 190 lines: ${recommendationLines}`);
});

const failed = checks.filter((item) => item.status === 'FAIL');
const result = {
  phase: 'reports-skill-recommendation-view-model',
  status: failed.length === 0 ? 'PASS' : 'FAIL',
  reportsLines: reports.split('\n').length,
  recommendationLines: recommendation.split('\n').length,
  checks,
};

console.log(JSON.stringify(result, null, 2));
if (failed.length > 0) process.exit(1);
