import type { Topic } from '../types';
import { matchesEntityId } from './entityIds';

export type FoundationContentTab = 'lessons' | 'quizzes' | 'support';

export type FoundationSkillTarget = {
  skillId: string;
  pathId?: string;
  subjectId?: string;
  sectionId?: string;
  skillName?: string;
};

const normalizeText = (value?: string | null) =>
  String(value || '').trim().replace(/\s+/g, ' ');

const topicMatchesScope = (topic: Topic, target: FoundationSkillTarget) => {
  if (topic.showOnPlatform === false) return false;
  if (target.pathId && topic.pathId && topic.pathId !== target.pathId) return false;
  if (target.subjectId && topic.subjectId !== target.subjectId) return false;
  return true;
};

export const resolveFoundationSkillTopic = (
  target: FoundationSkillTarget,
  topics: Topic[],
): Topic | undefined => {
  const skillId = String(target.skillId || '').trim();
  if (!skillId) return undefined;

  const scopedTopics = topics.filter((topic) => topicMatchesScope(topic, target));
  const sectionPreferred = (items: Topic[]) =>
    target.sectionId
      ? items.find((topic) => topic.sectionId === target.sectionId) || items[0]
      : items[0];

  const explicit = scopedTopics.filter((topic) => String(topic.skillId || '').trim() === skillId);
  if (explicit.length > 0) return sectionPreferred(explicit);

  const deterministicId = scopedTopics.filter(
    (topic) =>
      matchesEntityId(topic, `topic_sub_${skillId}`) ||
      matchesEntityId(topic, skillId),
  );
  if (deterministicId.length > 0) return sectionPreferred(deterministicId);

  const drillLinked = scopedTopics.filter((topic) =>
    (topic.quizIds || []).some((quizId) =>
      matchesEntityId({ id: quizId }, `quiz_drill_${skillId}`),
    ),
  );
  if (drillLinked.length > 0) return sectionPreferred(drillLinked);

  const skillName = normalizeText(target.skillName);
  if (!skillName) return undefined;

  const titleMatches = scopedTopics.filter(
    (topic) =>
      Boolean(topic.parentId) &&
      normalizeText(topic.title) === skillName &&
      (!target.sectionId || topic.sectionId === target.sectionId),
  );
  return titleMatches.length === 1 ? titleMatches[0] : undefined;
};

export const buildFoundationSkillLink = ({
  target,
  topics,
  content,
}: {
  target: FoundationSkillTarget;
  topics: Topic[];
  content: FoundationContentTab;
}) => {
  const pathId = String(target.pathId || '').trim();
  const subjectId = String(target.subjectId || '').trim();
  if (!pathId || !subjectId) return undefined;

  const topic = resolveFoundationSkillTopic(target, topics);
  const topicId = topic?.id || (target.skillId ? `topic_sub_${target.skillId}` : '');
  if (!topicId) return undefined;

  const params = new URLSearchParams({
    subject: subjectId,
    tab: 'skills',
    topic: topicId,
    content,
  });
  return `/category/${pathId}?${params.toString()}`;
};

export const buildSkillRecheckLink = (
  target: FoundationSkillTarget,
  options: { questionCount?: number; timeLimit?: number } = {},
) => {
  const skillId = String(target.skillId || '').trim();
  const pathId = String(target.pathId || '').trim();
  const subjectId = String(target.subjectId || '').trim();
  if (!skillId || !pathId || !subjectId) return undefined;

  const questionCount = Math.max(5, Math.min(20, Math.round(options.questionCount || 5)));
  const timeLimit = Math.max(5, Math.min(30, Math.round(options.timeLimit || 10)));
  const params = new URLSearchParams({
    mode: 'self',
    autostart: '1',
    pathId,
    subjectId,
    skillIds: skillId,
    questionCount: String(questionCount),
    timeLimit: String(timeLimit),
    evidenceType: 'recheck',
  });

  if (target.sectionId) params.set('sectionId', target.sectionId);
  return `/quiz?${params.toString()}`;
};
