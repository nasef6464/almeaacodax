export const MASTERY_THRESHOLDS = {
  foundation: 50,
  proficient: 75,
  mastered: 90,
  minEvidence: 3,
} as const;

export type MasteryLevel = 'needs_measurement' | 'foundation' | 'developing' | 'proficient' | 'mastered';

export const resolveMasteryLevel = (
  mastery: number,
  evidenceCount: number,
  minEvidence = MASTERY_THRESHOLDS.minEvidence,
): MasteryLevel => {
  const safeMastery = Math.max(0, Math.min(100, Number(mastery || 0)));
  const safeEvidence = Math.max(0, Number(evidenceCount || 0));
  if (safeEvidence < minEvidence) return 'needs_measurement';
  if (safeMastery < MASTERY_THRESHOLDS.foundation) return 'foundation';
  if (safeMastery < MASTERY_THRESHOLDS.proficient) return 'developing';
  if (safeMastery < MASTERY_THRESHOLDS.mastered) return 'proficient';
  return 'mastered';
};

const recencyFactor = (lastAttemptAt?: string | number | Date) => {
  if (!lastAttemptAt) return 0.5;
  const timestamp = new Date(lastAttemptAt).getTime();
  if (!Number.isFinite(timestamp) || timestamp <= 0) return 0.5;
  const ageDays = Math.max(0, (Date.now() - timestamp) / 86_400_000);
  if (ageDays <= 14) return 1;
  if (ageDays <= 30) return 0.8;
  if (ageDays <= 60) return 0.6;
  return 0.4;
};

export const buildReadinessInterpretation = ({
  mastery,
  evidenceCount,
  coverage,
  lastAttemptAt,
  minEvidence = MASTERY_THRESHOLDS.minEvidence,
}: {
  mastery: number;
  evidenceCount: number;
  coverage: number;
  lastAttemptAt?: string | number | Date;
  minEvidence?: number;
}) => {
  const safeMastery = Math.max(0, Math.min(100, Number(mastery || 0)));
  const safeCoverage = Math.max(0, Math.min(1, Number(coverage || 0)));
  const evidenceConfidence = Math.max(0, Math.min(1, Number(evidenceCount || 0) / Math.max(minEvidence, 1)));
  const recency = recencyFactor(lastAttemptAt);
  const score = Math.round(
    safeMastery * 0.55 +
    safeCoverage * 100 * 0.2 +
    evidenceConfidence * 100 * 0.15 +
    recency * 100 * 0.1,
  );
  const level = resolveMasteryLevel(safeMastery, evidenceCount, minEvidence);
  const status = level === 'needs_measurement'
    ? 'needs_measurement'
    : score >= 80 && safeCoverage >= 0.7
      ? 'ready_to_advance'
      : score >= 60
        ? 'ready_for_recheck'
        : 'building';

  return {
    score,
    status,
    level,
    coverage: safeCoverage,
    evidenceConfidence,
    recency,
    explanation:
      status === 'needs_measurement'
        ? 'نحتاج أدلة أكثر قبل اتخاذ قرار انتقال.'
        : status === 'ready_to_advance'
          ? 'الإتقان والتغطية والأدلة الحديثة تسمح بالانتقال بعد تثبيت قصير.'
          : status === 'ready_for_recheck'
            ? 'المستوى قريب من الجاهزية؛ أعد القياس بعد تدريب قصير.'
            : 'استمر في العلاج والتدريب قبل إعادة القياس.',
  };
};
