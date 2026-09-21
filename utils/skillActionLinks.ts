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

export const buildSkillPracticeActionLink = (context: SkillActionContext) => {
  if (context.quizId) {
    const params = new URLSearchParams({ source: 'foundation' });
    const returnTo = safeInternalReturn(context.returnTo);
    if (returnTo) params.set('returnTo', returnTo);
    return `/quiz/${encodeURIComponent(context.quizId)}?${params.toString()}`;
  }
  return buildFoundationActionLink(context, 'quizzes');
};

export const buildSkillReportActionLink = (context: SkillActionContext) => {
  const params = new URLSearchParams();
  if (context.pathId) params.set('pathId', context.pathId);
  if (context.subjectId) params.set('subjectId', context.subjectId);
  if (context.skillId) params.set('skillId', context.skillId);
  const query = params.toString();
  return `/reports${query ? `?${query}` : ''}`;
};
