import type { LearningRecommendation, SkillGap } from '../types';
import { buildFoundationActionLink, buildSkillRemediationActionLink } from '../utils/skillActionLinks';

export type AdaptiveSkillSignal = SkillGap & {
  topicId?: string;
  evidenceCount?: number;
  trend?: 'improving' | 'stable' | 'declining';
  lastAttemptAt?: string | number | Date;
};

export type InternalLearningPath = {
  fingerprint: string;
  recommendations: LearningRecommendation[];
};

const CACHE_LIMIT = 50;
const pathCache = new Map<string, LearningRecommendation[]>();

const normalizeSignal = (skill: AdaptiveSkillSignal) => ({
  skillId: String(skill.skillId || ''),
  pathId: String(skill.pathId || ''),
  subjectId: String(skill.subjectId || ''),
  sectionId: String(skill.sectionId || ''),
  topicId: String(skill.topicId || ''),
  skill: String(skill.skill || '').trim(),
  mastery: Math.max(0, Math.min(100, Number(skill.mastery || 0))),
  status: skill.status,
  evidenceCount: Math.max(0, Number(skill.evidenceCount || 0)),
  trend: skill.trend || 'stable',
  lastAttemptAt: skill.lastAttemptAt ? new Date(skill.lastAttemptAt).getTime() || 0 : 0,
});

export const buildAdaptivePathFingerprint = (skills: AdaptiveSkillSignal[]) =>
  JSON.stringify(
    skills
      .map(normalizeSignal)
      .sort((a, b) =>
        [a.pathId, a.subjectId, a.skillId, a.topicId, a.skill].join('|').localeCompare(
          [b.pathId, b.subjectId, b.skillId, b.topicId, b.skill].join('|'),
        ),
      ),
  );

const priorityScore = (skill: ReturnType<typeof normalizeSignal>) => {
  const masteryNeed = 100 - skill.mastery;
  const statusWeight = skill.status === 'weak' ? 30 : skill.status === 'average' ? 15 : 0;
  const trendWeight = skill.trend === 'declining' ? 18 : skill.trend === 'improving' ? -6 : 0;
  const evidenceWeight = skill.evidenceCount > 0 && skill.evidenceCount < 3 ? -10 : 0;
  const recencyWeight = skill.lastAttemptAt > 0
    ? Math.min(10, Math.max(0, (Date.now() - skill.lastAttemptAt) / (1000 * 60 * 60 * 24 * 14)))
    : 0;
  return masteryNeed + statusWeight + trendWeight + evidenceWeight + recencyWeight;
};

const recommendationForSkill = (
  rawSkill: AdaptiveSkillSignal,
  index: number,
): LearningRecommendation => {
  const skill = normalizeSignal(rawSkill);
  const topicId = skill.topicId || (skill.skillId ? `topic_sub_${skill.skillId}` : undefined);
  const scope = {
    pathId: skill.pathId || undefined,
    subjectId: skill.subjectId || undefined,
    sectionId: skill.sectionId || undefined,
    skillId: skill.skillId || undefined,
    topicId,
  };

  const insufficientEvidence = skill.evidenceCount > 0 && skill.evidenceCount < 3;
  const usePractice = insufficientEvidence || index % 2 === 1;
  const link = insufficientEvidence
    ? buildSkillRemediationActionLink(scope, 5)
      || buildFoundationActionLink(scope, 'quizzes')
      || '/reports'
    : usePractice
      ? buildFoundationActionLink(scope, 'quizzes')
        || buildSkillRemediationActionLink(scope, 7)
        || '/reports'
      : buildFoundationActionLink(scope, 'lessons')
        || buildSkillRemediationActionLink(scope)
        || '/reports';

  return {
    id: `internal_${skill.skillId || index + 1}`,
    type: usePractice ? 'quiz' : 'lesson',
    title: insufficientEvidence
      ? `قياس قصير: ${skill.skill || 'المهارة'}`
      : usePractice
        ? `تدريب مركز: ${skill.skill || 'المهارة'}`
        : `مراجعة: ${skill.skill || 'المهارة'}`,
    duration: usePractice ? '10 دقائق' : '15 دقيقة',
    reason: insufficientEvidence
      ? 'الأدلة الحالية غير كافية؛ نحتاج قياسًا قصيرًا قبل الحكم.'
      : skill.trend === 'declining'
        ? 'الأداء الحديث يتراجع، لذلك هذه المهارة تحتاج أولوية.'
        : `مستوى الإتقان الحالي ${skill.mastery}% ويحتاج دعمًا داخل نفس المسار والمادة.`,
    skillTargeted: skill.skill || 'مهارة',
    priority: skill.status === 'weak' || skill.trend === 'declining' ? 'high' : 'medium',
    actionLabel: usePractice ? 'ابدأ التدريب' : 'افتح الشرح',
    link,
  };
};

export const getInternalLearningPath = (skills: AdaptiveSkillSignal[]): InternalLearningPath => {
  const candidates = skills
    .map((skill) => ({ raw: skill, normalized: normalizeSignal(skill) }))
    .filter(({ normalized }) => normalized.status !== 'strong' && normalized.mastery < 90)
    .sort((a, b) => priorityScore(b.normalized) - priorityScore(a.normalized));

  const fingerprint = buildAdaptivePathFingerprint(candidates.map(({ raw }) => raw));
  const cached = pathCache.get(fingerprint);
  if (cached) return { fingerprint, recommendations: cached };

  const recommendations = candidates.slice(0, 4).map(({ raw }, index) => recommendationForSkill(raw, index));
  pathCache.set(fingerprint, recommendations);
  if (pathCache.size > CACHE_LIMIT) {
    const oldestKey = pathCache.keys().next().value;
    if (oldestKey) pathCache.delete(oldestKey);
  }

  return { fingerprint, recommendations };
};

export const getNextBestAction = (skills: AdaptiveSkillSignal[]) =>
  getInternalLearningPath(skills).recommendations[0] || null;
