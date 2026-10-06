export type AdaptiveTrend = 'improving' | 'stable' | 'declining';

export type TreatmentDecision =
  | { state: 'measure'; primary: 'measure'; message: string }
  | { state: 'mastered'; primary: 'mastery_review'; message: string }
  | { state: 'improving'; primary: 'remediation_then_recheck'; message: string }
  | { state: 'weak'; primary: 'alternate_support_then_recheck'; message: string }
  | { state: 'practice'; primary: 'remediation_then_recheck'; message: string };

export const decideAdaptiveTreatment = ({
  mastery,
  evidenceCount,
  minEvidence = 3,
  trend = 'stable',
}: {
  mastery: number;
  evidenceCount: number;
  minEvidence?: number;
  trend?: AdaptiveTrend;
}): TreatmentDecision => {
  const safeMastery = Math.max(0, Math.min(100, Number(mastery || 0)));
  const safeEvidence = Math.max(0, Number(evidenceCount || 0));

  if (safeEvidence < minEvidence) {
    return {
      state: 'measure',
      primary: 'measure',
      message: 'الأدلة غير كافية؛ ابدأ بقياس قصير قبل إصدار حكم علاجي.',
    };
  }

  if (safeMastery >= 80) {
    return {
      state: 'mastered',
      primary: 'mastery_review',
      message: 'المهارة متقنة حاليًا؛ انتقل للتثبيت والمراجعة المتباعدة.',
    };
  }

  if (trend === 'improving') {
    return {
      state: 'improving',
      primary: 'remediation_then_recheck',
      message: 'هناك تحسن؛ أكمل تدريبًا مركزًا ثم أعد القياس.',
    };
  }

  if (safeMastery < 50 || trend === 'declining') {
    return {
      state: 'weak',
      primary: 'alternate_support_then_recheck',
      message: 'ابدأ بشرح أو دعم بديل، ثم تدريب قصير، ثم أعد القياس.',
    };
  }

  return {
    state: 'practice',
    primary: 'remediation_then_recheck',
    message: 'راجع المهارة بتدريب مركز ثم أعد القياس.',
  };
};
