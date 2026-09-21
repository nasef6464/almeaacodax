import { readFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n');

const reports = read('pages/Reports.tsx');
const recommendation = read('pages/Reports/recommendationViewModel.ts');
const navigation = read('utils/foundationSkillNavigation.ts');
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

check('Reports delegates recommendation routing to a dedicated view-model', () => {
  assertIncludes(reports, "import { buildSkillRecommendation } from './Reports/recommendationViewModel';");
  assertIncludes(reports, 'buildSkillRecommendation(skill, {');
  assertNotIncludes(reports, "import { matchesEntityId } from '../utils/entityIds';");
  assertNotIncludes(reports, 'const scoredFoundationTopics =');
  assertNotIncludes(reports, "const buildFoundationTopicLink = (content:");
});

check('recommendation view-model delegates foundation identity and route construction', () => {
  assertIncludes(recommendation, "from '../../utils/foundationSkillNavigation';");
  assertIncludes(recommendation, 'resolveFoundationSkillTopic(target, topics)');
  assertIncludes(recommendation, "buildFoundationSkillLink({ target, topics, content: 'lessons' })");
  assertIncludes(recommendation, "buildFoundationSkillLink({ target, topics, content: 'quizzes' })");
  assertIncludes(recommendation, "buildFoundationSkillLink({ target, topics, content: 'support' })");
  assertIncludes(recommendation, 'buildSkillRecheckLink(target)');
  assertIncludes(recommendation, 'lesson.skillIds?.includes(resolvedSkillId)');
  assertIncludes(recommendation, 'quiz.questionIds?.some((questionId) =>');
  assertIncludes(recommendation, 'item.skillIds?.includes(resolvedSkillId)');
});

check('foundation navigation prefers explicit topic skillId and keeps compatibility fallbacks scoped', () => {
  assertIncludes(navigation, "String(topic.skillId || '').trim() === skillId");
  assertIncludes(navigation, "matchesEntityId(topic, `topic_sub_${skillId}`)");
  assertIncludes(navigation, "matchesEntityId({ id: quizId }, `quiz_drill_${skillId}`)");
  assertIncludes(navigation, 'topic.subjectId !== target.subjectId');
  assertIncludes(navigation, 'topic.sectionId === target.sectionId');
  assertIncludes(navigation, "content: FoundationContentTab");
  assertIncludes(navigation, "evidenceType: 'recheck'");
  assertNotIncludes(navigation, 'p_1777779639431');
  assertNotIncludes(navigation, 'sub_1777779748206');
});

check('Reports exposes the four remediation actions from one recommendation contract', () => {
  assertIncludes(reports, 'selectedSkillRecommendation.lessonLink');
  assertIncludes(reports, 'selectedSkillRecommendation.quizLink');
  assertIncludes(reports, 'selectedSkillRecommendation.supportLink');
  assertIncludes(reports, 'selectedSkillRecommendation.recheckLink');
  assertIncludes(reports, 'ملف الدعم');
  assertIncludes(reports, 'قياس');
});

check('recommendation and navigation logic are deterministic and store/API independent', () => {
  for (const source of [recommendation, navigation]) {
    assertNotIncludes(source, 'useStore');
    assertNotIncludes(source, 'React');
    assertNotIncludes(source, "from '../../services/api'");
    assertNotIncludes(source, 'api.');
    assertNotIncludes(source, 'navigator.');
    assertNotIncludes(source, 'window.');
  }
});

check('source contracts follow recommendation ownership after extraction', () => {
  assertIncludes(reportsRole, "../pages/Reports/recommendationViewModel.ts");
  assertIncludes(globalJourney, "../pages/Reports/recommendationViewModel.ts");
});

check('recommendation extraction reduces Reports hotspot without creating replacement hotspots', () => {
  const reportLines = reports.split('\n').length;
  const recommendationLines = recommendation.split('\n').length;
  const navigationLines = navigation.split('\n').length;
  if (reportLines >= 3490) throw new Error(`Reports.tsx remained too large after recommendation extraction: ${reportLines}`);
  if (recommendationLines > 170) throw new Error(`recommendationViewModel.ts exceeded 170 lines: ${recommendationLines}`);
  if (navigationLines > 150) throw new Error(`foundationSkillNavigation.ts exceeded 150 lines: ${navigationLines}`);
});

const failed = checks.filter((item) => item.status === 'FAIL');
const result = {
  phase: 'reports-skill-recommendation-view-model',
  status: failed.length === 0 ? 'PASS' : 'FAIL',
  reportsLines: reports.split('\n').length,
  recommendationLines: recommendation.split('\n').length,
  navigationLines: navigation.split('\n').length,
  checks,
};

console.log(JSON.stringify(result, null, 2));
if (failed.length > 0) process.exit(1);
