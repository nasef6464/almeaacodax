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
  if (mastery < 45) {
    return "خطة علاج عاجلة: شرح + تدريب + اختبار موجه";
  }

  if (mastery < 65) {
    return attemptCount >= 3 ? "زيادة التدريب ثم اختبار ساهر علاجي" : "إضافة تدريب قصير ومتابعة الأداء";
  }

  return "تثبيت المهارة بتدريب خفيف وإعادة قياس لاحقًا";
};

export const buildSkillStatus = (mastery: number) => {
  if (mastery >= 90) return "mastered";
  if (mastery >= 75) return "good";
  if (mastery >= 50) return "average";
  return "weak";
};

export const buildResultSkillStatus = (mastery: number) => {
  if (mastery >= 80) return "strong";
  if (mastery >= 50) return "average";
  return "weak";
};

export const buildSkillRecommendation = (mastery: number) => {
  if (mastery < 50) return "راجع شرحًا قصيرًا ثم حل تدريبًا موجّهًا على نفس المهارة";
  if (mastery < 80) return "أداؤك قريب من الإتقان. زد التدريب قليلًا ثم أعد القياس";
  return "أداء ممتاز. حافظ على المهارة بتدريب خفيف من وقت لآخر";
};
