import type { LearningRecommendation, SkillGap, Topic } from '../types';
import { buildFoundationSkillLink, buildSkillRecheckLink } from '../utils/foundationSkillNavigation';
import { MASTERY_POLICY, hasReliableEvidence, normalizeMastery } from '../utils/masteryPolicy';
import { sanitizeArabicText } from '../utils/sanitizeMojibakeArabic';

const text = (value?: string | null) => sanitizeArabicText(value) || '';

const recommendationScore = (skill: SkillGap) => {
  const mastery = normalizeMastery(skill.mastery);
  const evidenceCount = Number(skill.evidenceCount ?? skill.questionCount ?? 0);
  const evidencePriority = hasReliableEvidence(evidenceCount) ? 0 : 40;
  const trendPriority = skill.trend === 'declining' ? 15 : skill.trend === 'improving' ? -5 : 0;
  return evidencePriority + (100 - mastery) + trendPriority;
};

export const buildInternalLearningPath = (
  skills: SkillGap[],
  topics: Topic[] = [],
): LearningRecommendation[] => {
  const candidates = (skills || [])
    .filter((skill) => normalizeMastery(skill.mastery) < MASTERY_POLICY.readyAt || !hasReliableEvidence(skill.evidenceCount ?? skill.questionCount))
    .sort((a, b) => recommendationScore(b) - recommendationScore(a))
    .slice(0, 3);

  return candidates.map((skill, index) => {
    const mastery = normalizeMastery(skill.mastery);
    const evidenceCount = Number(skill.evidenceCount ?? skill.questionCount ?? 0);
    const reliable = hasReliableEvidence(evidenceCount);
    const target = {
      skillId: String(skill.skillId || ''),
      pathId: skill.pathId,
      subjectId: skill.subjectId,
      sectionId: skill.sectionId,
      skillName: skill.skill,
    };

    const needsMeasurement = !reliable;
    const needsFoundation = reliable && mastery < MASTERY_POLICY.supportBelow;
    const type: LearningRecommendation['type'] = needsFoundation ? 'lesson' : 'quiz';
    const link = needsMeasurement
      ? buildSkillRecheckLink(target)
      : buildFoundationSkillLink({
          target,
          topics,
          content: needsFoundation ? 'lessons' : 'quizzes',
        }) || buildSkillRecheckLink(target);

    const reason = needsMeasurement
      ? `نحتاج قياسًا إضافيًا لأن الدليل الحالي على ${text(skill.skill)} ما زال محدودًا.`
      : needsFoundation
        ? `إتقان ${text(skill.skill)} عند ${mastery}%، لذلك الأولوية للشرح ثم التدريب والقياس.`
        : skill.trend === 'declining'
          ? `المستوى في ${text(skill.skill)} يحتاج تثبيتًا لأن الاتجاه الأخير متراجع.`
          : `إتقان ${text(skill.skill)} عند ${mastery}%؛ تدريب قصير ثم إعادة قياس هو أقصر خطوة تالية.`;

    return {
      id: `internal-rec-${skill.skillId || index}-${index + 1}`,
      type,
      title: needsMeasurement
        ? `قياس ${text(skill.skill)}`
        : needsFoundation
          ? `راجع ${text(skill.skill)}`
          : `ثبّت ${text(skill.skill)}`,
      duration: needsFoundation ? '15 دقيقة' : '10 دقائق',
      reason,
      skillTargeted: text(skill.skill),
      priority: index === 0 || mastery < MASTERY_POLICY.supportBelow ? 'high' : 'medium',
      actionLabel: needsMeasurement ? 'ابدأ القياس' : needsFoundation ? 'ابدأ الشرح' : 'ابدأ التدريب',
      link: link || '/reports',
      isPrimary: index === 0,
      source: 'internal',
    };
  });
};
