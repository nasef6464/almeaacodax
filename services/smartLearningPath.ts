import type { LearningRecommendation, SkillGap } from '../types';
import {
  buildFoundationActionLink,
  buildSkillRecheckActionLink,
  buildSkillRemediationActionLink,
} from '../utils/skillActionLinks';

export const SMART_LEARNING_PATH_POLICY_VERSION = 'adaptive-path-v1';
const MAX_CACHE_ENTRIES = 50;

export type SmartLearningPathResult = {
  version: string;
  fingerprint: string;
  recommendations: LearningRecommendation[];
};

type SmartSkillSignal = SkillGap & {
  evidenceCount?: number;
  recentMastery?: number;
  trend?: 'improving' | 'stable' | 'declining';
  lastAttemptAt?: string | number;
};

const cache = new Map<string, SmartLearningPathResult>();

const normalizeSignals = (skills: SmartSkillSignal[]) =>
  skills
    .map((skill) => ({
      skillId: String(skill.skillId || ''),
      pathId: String(skill.pathId || ''),
      subjectId: String(skill.subjectId || ''),
      sectionId: String(skill.sectionId || ''),
      skill: String(skill.skill || '').trim(),
      mastery: Math.max(0, Math.min(100, Number(skill.mastery || 0))),
      recentMastery: Number.isFinite(Number(skill.recentMastery)) ? Number(skill.recentMastery) : undefined,
      evidenceCount: Math.max(0, Number(skill.evidenceCount || 0)),
      trend: skill.trend || 'stable',
      lastAttemptAt: String(skill.lastAttemptAt || ''),
      status: skill.status,
    }))
    .filter((skill) => skill.skill)
    .sort((a, b) =>
      a.pathId.localeCompare(b.pathId) ||
      a.subjectId.localeCompare(b.subjectId) ||
      a.skillId.localeCompare(b.skillId) ||
      a.skill.localeCompare(b.skill, 'ar'),
    );

const hashString = (value: string) => {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
};

export const buildSmartLearningPathFingerprint = (skills: SmartSkillSignal[]) =>
  `${SMART_LEARNING_PATH_POLICY_VERSION}:${hashString(JSON.stringify(normalizeSignals(skills)))}`;

const recencyPenalty = (lastAttemptAt?: string | number) => {
  if (!lastAttemptAt) return 0;
  const timestamp = new Date(lastAttemptAt).getTime();
  if (!Number.isFinite(timestamp)) return 0;
  const days = Math.max(0, (Date.now() - timestamp) / 86_400_000);
  return Math.min(12, Math.floor(days / 7) * 2);
};

const priorityScore = (skill: SmartSkillSignal) => {
  const mastery = Math.max(0, Math.min(100, Number(skill.mastery || 0)));
  const evidenceCount = Math.max(0, Number(skill.evidenceCount || 0));
  const trendBoost = skill.trend === 'declining' ? 18 : skill.trend === 'improving' ? -8 : 0;
  const evidenceBoost = evidenceCount > 0 && evidenceCount < 3 ? 10 : 0;
  return (100 - mastery) + trendBoost + evidenceBoost + recencyPenalty(skill.lastAttemptAt);
};

const actionForSkill = (skill: SmartSkillSignal, index: number): LearningRecommendation => {
  const context = {
    pathId: skill.pathId,
    subjectId: skill.subjectId,
    sectionId: skill.sectionId,
    skillId: skill.skillId,
    topicId: skill.skillId ? `topic_sub_${skill.skillId}` : undefined,
    returnTo: '/plan',
  };
  const evidenceCount = Math.max(0, Number(skill.evidenceCount || 0));
  const insufficientEvidence = evidenceCount > 0 && evidenceCount < 3;
  const mastered = Number(skill.mastery || 0) >= 80;
  const needsSupport = Number(skill.mastery || 0) < 50 || skill.trend === 'declining';

  if (insufficientEvidence) {
    return {
      id: `smart_${skill.skillId || index}_measure`,
      type: 'quiz',
      title: `قِس مستوى ${skill.skill}`,
      duration: '10 دقائق',
      reason: 'الأدلة الحالية قليلة؛ القياس القصير أدق من افتراض وجود ضعف.',
      skillTargeted: skill.skill,
      priority: 'high',
      actionLabel: 'ابدأ القياس',
      link: buildSkillRecheckActionLink(context) || '/quiz',
    };
  }

  if (mastered) {
    return {
      id: `smart_${skill.skillId || index}_review`,
      type: 'flashcard',
      title: `ثبّت ${skill.skill}`,
      duration: '5 دقائق',
      reason: 'المهارة قوية حاليًا؛ مراجعة قصيرة تساعد على تثبيتها دون إفراط في التدريب.',
      skillTargeted: skill.skill,
      priority: 'low',
      actionLabel: 'مراجعة خفيفة',
      link: buildSkillRecheckActionLink(context) || '/reports',
    };
  }

  if (needsSupport) {
    return {
      id: `smart_${skill.skillId || index}_learn`,
      type: 'lesson',
      title: `راجع ${skill.skill}`,
      duration: '15 دقيقة',
      reason: skill.trend === 'declining'
        ? 'الاتجاه الأخير يتراجع؛ ابدأ بشرح أو دعم بديل قبل إعادة القياس.'
        : 'هذه من أقل المهارات إتقانًا وتحتاج تأسيسًا قصيرًا قبل التدريب.',
      skillTargeted: skill.skill,
      priority: 'high',
      actionLabel: 'افتح الشرح',
      link: buildFoundationActionLink(context, 'lessons') || '/reports',
    };
  }

  return {
    id: `smart_${skill.skillId || index}_practice`,
    type: 'quiz',
    title: `درّب ${skill.skill}`,
    duration: '10 دقائق',
    reason: skill.trend === 'improving'
      ? 'هناك تحسن؛ تدريب مركز قصير يساعد على تثبيت الاتجاه ثم إعادة القياس.'
      : 'المهارة قريبة من التحسن وتحتاج تدريبًا مركزًا بدل إعادة شرح كامل.',
    skillTargeted: skill.skill,
    priority: 'medium',
    actionLabel: 'ابدأ التدريب',
    link: buildSkillRemediationActionLink(context) || '/quiz',
  };
};

export const buildSmartLearningPath = (skills: SmartSkillSignal[]): SmartLearningPathResult => {
  const fingerprint = buildSmartLearningPathFingerprint(skills);
  const cached = cache.get(fingerprint);
  if (cached) return cached;

  const ranked = skills
    .filter((skill) => skill.status !== 'strong' || Number(skill.mastery || 0) < 90)
    .sort((a, b) => priorityScore(b) - priorityScore(a))
    .slice(0, 5);

  const recommendations = ranked.map(actionForSkill);
  const result = {
    version: SMART_LEARNING_PATH_POLICY_VERSION,
    fingerprint,
    recommendations,
  };

  if (cache.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = cache.keys().next().value;
    if (oldestKey) cache.delete(oldestKey);
  }
  cache.set(fingerprint, result);
  return result;
};
