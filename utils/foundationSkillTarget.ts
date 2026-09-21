import type { Skill, Topic } from '../types';

export type FoundationSkillTargetInput = {
  skillId?: string;
  skillName?: string;
  pathId?: string;
  subjectId?: string;
  sectionId?: string;
};

export type FoundationSkillTarget = {
  skillId?: string;
  skillName?: string;
  pathId?: string;
  subjectId?: string;
  sectionId?: string;
  topicId?: string;
  kind: 'sub' | 'main' | 'unknown';
};

const normalizeText = (value?: string | null) =>
  String(value || '')
    .trim()
    .replace(/\s+/g, ' ');

const sameValue = (expected?: string, actual?: string | null) =>
  !expected || !actual || String(expected) === String(actual);

const topicMatchesScope = (
  topic: Topic,
  target: Pick<FoundationSkillTarget, 'pathId' | 'subjectId' | 'sectionId'>,
) =>
  sameValue(target.pathId, topic.pathId) &&
  sameValue(target.subjectId, topic.subjectId) &&
  sameValue(target.sectionId, topic.sectionId);

export const resolveFoundationSkillTarget = (
  input: FoundationSkillTargetInput,
  skills: Skill[],
  topics: Topic[],
): FoundationSkillTarget => {
  const requestedSkillId = normalizeText(input.skillId);
  const requestedSkillName = normalizeText(input.skillName);

  let parentSkill: Skill | undefined;
  let subSkill: NonNullable<Skill['subSkills']>[number] | undefined;

  if (requestedSkillId) {
    parentSkill = skills.find((item) => String(item.id) === requestedSkillId);
    if (!parentSkill) {
      for (const item of skills) {
        const nested = item.subSkills?.find((candidate) => String(candidate.id) === requestedSkillId);
        if (nested) {
          parentSkill = item;
          subSkill = nested;
          break;
        }
      }
    }
  }

  if (!parentSkill && requestedSkillName) {
    const scopedSkills = skills.filter((item) =>
      sameValue(input.pathId, item.pathId) &&
      sameValue(input.subjectId, item.subjectId) &&
      sameValue(input.sectionId, item.sectionId),
    );

    const mainMatches = scopedSkills.filter((item) => normalizeText(item.name) === requestedSkillName);
    if (mainMatches.length === 1) {
      parentSkill = mainMatches[0];
    } else {
      const nestedMatches = scopedSkills.flatMap((item) =>
        (item.subSkills || [])
          .filter((candidate) => normalizeText(candidate.name) === requestedSkillName)
          .map((candidate) => ({ parent: item, sub: candidate })),
      );
      if (nestedMatches.length === 1) {
        parentSkill = nestedMatches[0].parent;
        subSkill = nestedMatches[0].sub;
      }
    }
  }

  const kind: FoundationSkillTarget['kind'] = subSkill ? 'sub' : parentSkill ? 'main' : 'unknown';
  const skillId = normalizeText(subSkill?.id || parentSkill?.id || requestedSkillId) || undefined;
  const skillName = normalizeText(subSkill?.name || parentSkill?.name || requestedSkillName) || undefined;
  const pathId = normalizeText(input.pathId || parentSkill?.pathId) || undefined;
  const subjectId = normalizeText(input.subjectId || parentSkill?.subjectId) || undefined;
  const sectionId = normalizeText(input.sectionId || parentSkill?.sectionId) || undefined;

  const target = { skillId, skillName, pathId, subjectId, sectionId, kind };
  const visibleTopics = topics.filter((topic) => topic.showOnPlatform !== false && topicMatchesScope(topic, target));

  const explicitTopic = skillId
    ? visibleTopics.find((topic) => normalizeText(topic.skillId) === skillId)
    : undefined;

  const legacyIdTopic = skillId
    ? visibleTopics.find((topic) => String(topic.id) === `topic_sub_${skillId}`)
    : undefined;

  const titleTopic = skillName
    ? visibleTopics.find((topic) =>
        normalizeText(topic.title) === skillName &&
        (kind !== 'sub' || Boolean(topic.parentId)),
      )
    : undefined;

  const topic = explicitTopic || legacyIdTopic || titleTopic;

  return {
    ...target,
    topicId: topic?.id ? String(topic.id) : undefined,
  };
};
