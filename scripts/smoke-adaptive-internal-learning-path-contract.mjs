import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n');

const frontendPolicy = read('utils/masteryPolicy.ts');
const serverPolicy = read('server/src/modules/quizzes/analytics/skillAnalytics.ts');
const learningPath = read('services/learningPathService.ts');
const legacyAi = read('services/geminiService.ts');
const smartPath = read('components/SmartLearningPath.tsx');
const evidence = read('pages/Dashboard/smartPathEvidenceViewModel.ts');
const dashboard = read('pages/Dashboard.tsx');
const readiness = read('pages/Reports/studentReadinessViewModel.ts');

const checks = [];
const check = (name, fn) => {
  try {
    fn();
    checks.push({ name, status: 'PASS' });
  } catch (error) {
    checks.push({ name, status: 'FAIL', details: error instanceof Error ? error.message : String(error) });
  }
};
const includes = (source, fragment) => assert.ok(source.includes(fragment), `Missing fragment: ${fragment}`);
const excludes = (source, fragment) => assert.ok(!source.includes(fragment), `Unexpected fragment: ${fragment}`);

check('frontend and backend use the same canonical mastery thresholds', () => {
  for (const source of [frontendPolicy, serverPolicy]) {
    includes(source, 'supportBelow: 50');
    includes(source, 'readyAt: 75');
    includes(source, 'masteredAt: 90');
    includes(source, 'reliableEvidence: 3');
  }
  includes(serverPolicy, 'mastery >= MASTERY_POLICY.readyAt');
  includes(serverPolicy, 'mastery >= MASTERY_POLICY.masteredAt');
  includes(readiness, 'isReadyToAdvance(mastery, Boolean(studentTodayFocus.isReliable))');
  includes(readiness, 'mastery >= MASTERY_POLICY.supportBelow');
});

check('smart path is internal-first and has no automatic provider call', () => {
  includes(smartPath, "from '../services/learningPathService'");
  includes(smartPath, 'buildInternalLearningPath(skills, topics)');
  excludes(smartPath, 'generateLearningPath');
  excludes(smartPath, 'useEffect');
  excludes(smartPath, 'useState');
  excludes(legacyAi, 'api.aiLearningPath');
  includes(legacyAi, 'buildInternalLearningPath(skills, [])');
});

check('internal recommendations are explainable and bounded', () => {
  includes(learningPath, '.slice(0, 3)');
  includes(learningPath, 'hasReliableEvidence');
  includes(learningPath, "skill.trend === 'declining'");
  includes(learningPath, 'buildFoundationSkillLink');
  includes(learningPath, 'buildSkillRecheckLink');
  includes(learningPath, "source: 'internal'");
  includes(learningPath, 'isPrimary: index === 0');
  excludes(learningPath, 'api.');
  excludes(learningPath, 'fetch(');
  excludes(learningPath, 'p_1777779639431');
  excludes(learningPath, 'sub_1777779748206');
});

check('smart path evidence uses latest five after path and subject scoping', () => {
  includes(evidence, 'export const SMART_PATH_RECENT_RESULT_LIMIT = 5');
  includes(evidence, 'resultPathId(result) === pathId');
  includes(evidence, 'resultSubjectId(result) === subjectId');
  includes(evidence, '.slice(0, limit)');
  includes(evidence, 'weightedMasteryTotal');
  includes(evidence, 'evidenceCount');
  includes(evidence, "delta >= 5 ? 'improving' : delta <= -5 ? 'declining' : 'stable'");
  includes(evidence, 'getResultSkillStatus(mastery)');
});

check('dashboard keeps simultaneous learning paths isolated', () => {
  includes(dashboard, 'new Set(enrolledPaths || [])');
  includes(dashboard, 'paths.filter((path) => enrolledSet.has(path.id))');
  includes(dashboard, 'subjects.filter((subject) => subject.pathId === selectedPathId)');
  includes(dashboard, 'pathId: selectedPathId || undefined');
  includes(dashboard, "subjectId: selectedSubjectId === 'all' ? undefined : selectedSubjectId");
  includes(dashboard, '<SmartLearningPath skills={smartPathSkills} topics={topics} scopeLabel={scopeLabel} />');
  includes(dashboard, 'بدون استدعاء AI تلقائي');
});

check('mastery policy and recommendation services stay side-effect free', () => {
  for (const source of [frontendPolicy, learningPath, evidence]) {
    excludes(source, 'useStore(');
    excludes(source, 'useEffect(');
    excludes(source, 'useState(');
    excludes(source, 'localStorage');
    excludes(source, 'sessionStorage');
  }
});

const failed = checks.filter((item) => item.status === 'FAIL');
console.log(JSON.stringify({
  phase: 'adaptive-internal-learning-path',
  status: failed.length ? 'FAIL' : 'PASS',
  checks,
}, null, 2));

if (failed.length) process.exit(1);
