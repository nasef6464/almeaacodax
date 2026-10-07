import type { Skill, Topic } from '../types';
import { resolveFoundationSkillTarget } from './foundationSkillTarget';

export type SkillActionContext = {
  pathId?: string;
  subjectId?: string;
  skillId?: string;
  topicId?: string;
  lessonId?: string;
  quizId?: string;
  returnTo?: string;
};

const safeInternalReturn = (value?: string) =>
  value && value.startsWith('/') && !value.startsWith('//') ? value : undefined;

export const buildFoundationActionLink = (
  context: SkillActionContext,
  content: 'lessons' | 'quizzes' | 'support',
) => {
  if (!context.pathId || !context.subjectId) return undefined;
  const params = new URLSearchParams({ subject: context.subjectId, tab: 'skills', content });
  if (context.topicId) params.set('topic', context.topicId);
  if (context.skillId) params.set('skillId', context.skillId);
  if (content === 'lessons' && context.lessonId) params.set('lesson', context.lessonId);
  const returnTo = safeInternalReturn(context.returnTo);
  if (returnTo) params.set('returnTo', returnTo);
  return `/category/${encodeURIComponent(context.pathId)}?${params.toString()}`;
};

/**
 * Common learner contract across reports, result details and future subjects:
 * three actions always open the SAME Foundation topic, selecting only a content tab.
 * No mapped topic means an unavailable action, never a guessed course/quiz route.
 */
export const buildCanonicalFoundationSkillActions = (
  context: SkillActionContext & { sectionId?: string; skillName?: string },
  skills: Skill[],
  topics: Topic[],
) => {
  const target = resolveFoundationSkillTarget(context, skills, topics);
  if (!target.topicId || !target.pathId || !target.subjectId || !target.skillId) {
    return { topicId: undefined, lessonLink: undefined, quizLink: undefined, supportLink: undefined };
  }
  const scope: SkillActionContext = {
    pathId: target.pathId,
    subjectId: target.subjectId,
    topicId: target.topicId,
    skillId: target.skillId,
    returnTo: context.returnTo,
  };
  return {
    topicId: target.topicId,
    lessonLink: buildFoundationActionLink(scope, 'lessons'),
    quizLink: buildFoundationActionLink(scope, 'quizzes'),
    supportLink: buildFoundationActionLink(scope, 'support'),
  };
};

export const buildSkillPracticeActionLink = (context: SkillActionContext) => {
  if (context.quizId) {
    const params = new URLSearchParams({ source: 'foundation' });
    const returnTo = safeInternalReturn(context.returnTo);
    if (returnTo) params.set('returnTo', returnTo);
    return `/quiz/${encodeURIComponent(context.quizId)}?${params.toString()}`;
  }
  return buildFoundationActionLink(context, 'quizzes');
};

const buildScopedSelfQuizActionLink = (
  context: SkillActionContext & { sectionId?: string },
  evidenceType: 'remediation' | 'recheck' | 'mastery_review',
  questionCount: number,
  timeLimit: number,
) => {
  if (!context.skillId) return undefined;
  const params = new URLSearchParams({
    mode: 'self',
    autostart: '1',
    skillIds: context.skillId,
    questionCount: String(questionCount),
    timeLimit: String(timeLimit),
    evidenceType,
  });
  if (context.pathId) params.set('pathId', context.pathId);
  if (context.subjectId) params.set('subjectId', context.subjectId);
  if (context.sectionId) params.set('sectionId', context.sectionId);
  const returnTo = safeInternalReturn(context.returnTo);
  if (returnTo) params.set('returnTo', returnTo);
  return `/quiz?${params.toString()}`;
};

export const buildSkillRemediationActionLink = (
  context: SkillActionContext & { sectionId?: string },
  questionCount = 7,
) => buildScopedSelfQuizActionLink(context, 'remediation', questionCount, 15);

export const buildSkillRecheckActionLink = (
  context: SkillActionContext & { sectionId?: string },
  questionCount = 5,
) => buildScopedSelfQuizActionLink(context, 'recheck', questionCount, 10);

export const buildSkillMasteryReviewActionLink = (
  context: SkillActionContext & { sectionId?: string },
  questionCount = 5,
) => buildScopedSelfQuizActionLink(context, 'mastery_review', questionCount, 10);

export const buildSkillReportActionLink = (context: SkillActionContext) => {
  const params = new URLSearchParams();
  if (context.pathId) params.set('pathId', context.pathId);
  if (context.subjectId) params.set('subjectId', context.subjectId);
  if (context.skillId) params.set('skillId', context.skillId);
  const query = params.toString();
  return `/reports${query ? `?${query}` : ''}`;
};
