import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (file) => readFileSync(file, 'utf8');
const links = read('utils/skillActionLinks.ts');
const foundation = read('utils/foundationSkillTarget.ts');
const learner = read('components/LearningSection.tsx');
const modal = read('components/SkillDetailsModal.tsx');
const report = read('pages/Reports.tsx');
const rows = read('pages/Reports/studentSkillRowsViewModel.ts');
const selected = read('pages/Reports/StudentSelectedSkillPanel.tsx');
const results = read('pages/Results.tsx');
const details = read('components/QuizDetailsModal.tsx');
const recommendations = read('pages/Reports/recommendationViewModel.ts');
const attemptTrend = read('pages/Reports/studentSkillAttemptTrendViewModel.ts');
const adaptive = read('services/adaptiveLearningPathService.ts');
const smartPath = read('components/SmartLearningPath.tsx');

const required = (source, fragments, label) => {
  for (const fragment of fragments) assert.ok(source.includes(fragment), `${label}: missing ${fragment}`);
};
const absent = (source, fragments, label) => {
  for (const fragment of fragments) assert.ok(!source.includes(fragment), `${label}: forbidden ${fragment}`);
};

required(links, [
  'buildCanonicalFoundationSkillActions',
  'resolveFoundationSkillTarget(context, skills, topics)',
  '!target.topicId || !target.pathId || !target.subjectId || !target.skillId',
  "buildFoundationActionLink(scope, 'lessons')",
  "buildFoundationActionLink(scope, 'quizzes')",
  "buildFoundationActionLink(scope, 'support')",
], 'central contract');

required(foundation, [
  "const topic = kind === 'sub'",
  '? explicitTopic',
  'topic.skillId',
], 'canonical subskill mapping');

required(learner, [
  "searchParams.get('content')",
  "requestedContent === 'quizzes'",
  "requestedContent === 'support'",
  'initialContentTab: requestedContentTab',
  'initialSubTopicId: requestedTopic.parentId ? requestedTopic.id : null',
], 'Foundation topic view');
required(modal, ['initialContentTab', "openLessonVideo(lesson)", "initialLessonId = skill?.initialLessonId"], 'Foundation media selection');
required(rows, ['buildCanonicalFoundationSkillActions({', 'lessonLink: foundationActions.lessonLink', 'const quizLink = foundationActions.quizLink', 'supportLink: foundationActions.supportLink'], 'skill rows');
required(results, ['buildCanonicalFoundationSkillActions(', 'const lessonLink = foundationActions.lessonLink', 'const quizLink = foundationActions.quizLink', 'const supportLink = foundationActions.supportLink'], 'results');
required(details, ['buildCanonicalFoundationSkillActions({', 'foundationActions.lessonLink', 'foundationActions.quizLink'], 'quiz history');
required(selected, ['موضوع التأسيس غير مرتبط بعد', 'تدريب التأسيس غير مرتبط بعد', 'ملف الدعم غير مرتبط بعد'], 'unlinked actions');
required(recommendations, ['quizLink: recommendedTopic ? foundationTrainingLink : undefined'], 'shared recommendation');
absent(recommendations, ['const subskillFallbackQuiz =', 'quizLink: foundationTrainingLink ||'], 'no direct quiz fallback');

required(report, ['useState(12)', 'compactStudentSkillRows.slice(0, reportSkillLimit)', 'value + 12 : 12', 'setReportSkillLimit(12)', 'عرض مهارات أخرى', 'عرض أول 12 مهارة', 'const studentPrintableSkillRows = compactStudentSkillRows', 'buildRecordedSkillAttemptChanges(studentPeriodExamResults)'], 'all-skill UI');
required(adaptive, [
  'const topicId = skill.topicId || undefined;',
  "buildFoundationActionLink(scope, usePractice ? 'quizzes' : 'lessons')",
  "actionLabel: insufficientEvidence ? 'ابدأ القياس' : usePractice ? 'تدريب' : 'فيديو'",
], 'adaptive study route');
absent(adaptive, ['topic_sub_${skill.skillId}', "buildFoundationActionLink(scope, 'quizzes')\n        || buildSkillRemediationActionLink"], 'adaptive no guessed content');
absent(smartPath, ["to={item.link || '#'}"], 'no dead smart path actions');

required(attemptTrend, [
  'if (!item.skillId || !item.pathId || !item.subjectId) continue;',
  'if (series.length < 2) return;',
  'latestMastery - previousMastery',
], 'evidence-only recorded change');

console.log('PASS universal Foundation skill actions, safe disabled links, unlimited data, evidence-based comparisons');
