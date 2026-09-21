export const MASTERY_POLICY = {
  supportBelow: 50,
  readyAt: 75,
  masteredAt: 90,
  reliableEvidence: 3,
} as const;

export const mergeSkillMasteryEvidence = ({
  previousMastery,
  previousEvidence,
  currentMastery,
  currentEvidence,
}: {
  previousMastery: number;
  previousEvidence: number;
  currentMastery: number;
  currentEvidence: number;
}) => {
  const safePreviousMastery = Math.max(0, Math.min(100, Number(previousMastery || 0)));
  const safeCurrentMastery = Math.max(0, Math.min(100, Number(currentMastery || 0)));
  const safePreviousEvidence = Math.max(0, Number(previousEvidence || 0));
  const safeCurrentEvidence = Math.max(1, Number(currentEvidence || 1));
  const evidenceCount = safePreviousEvidence + safeCurrentEvidence;
  const mastery = Math.round(
    ((safePreviousMastery * safePreviousEvidence) + (safeCurrentMastery * safeCurrentEvidence)) /
      Math.max(evidenceCount, 1),
  );

  return { mastery, evidenceCount };
};

export const buildRecommendedAction = (mastery: number, attemptCount: number) => {
  if (mastery < MASTERY_POLICY.supportBelow) {
    return "خطة علاج: شرح + تدريب + إعادة قياس";
  }

  if (mastery < MASTERY_POLICY.readyAt) {
    return attemptCount >= MASTERY_POLICY.reliableEvidence
      ? "زيادة التدريب ثم إعادة قياس على نفس المهارة"
      : "إضافة تدريب قصير ثم جمع دليل إضافي";
  }

  return mastery >= MASTERY_POLICY.masteredAt
    ? "المهارة متقنة: مراجعة دورية متباعدة"
    : "تثبيت المهارة بتدريب خفيف وإعادة قياس لاحقًا";
};

export const buildSkillStatus = (mastery: number) => {
  if (mastery >= MASTERY_POLICY.masteredAt) return "mastered";
  if (mastery >= MASTERY_POLICY.readyAt) return "good";
  if (mastery >= MASTERY_POLICY.supportBelow) return "average";
  return "weak";
};

export const buildResultSkillStatus = (mastery: number) => {
  if (mastery >= MASTERY_POLICY.readyAt) return "strong";
  if (mastery >= MASTERY_POLICY.supportBelow) return "average";
  return "weak";
};

export const buildSkillRecommendation = (mastery: number) => {
  if (mastery < MASTERY_POLICY.supportBelow) {
    return "راجع شرحًا قصيرًا ثم حل تدريبًا موجّهًا على نفس المهارة";
  }
  if (mastery < MASTERY_POLICY.readyAt) {
    return "أداؤك يتطور. زد التدريب قليلًا ثم أعد القياس";
  }
  if (mastery >= MASTERY_POLICY.masteredAt) {
    return "المهارة متقنة. حافظ عليها بمراجعة متباعدة من وقت لآخر";
  }
  return "أداء جيد. ثبّت المهارة بتدريب خفيف ثم انتقل للخطوة التالية";
};
