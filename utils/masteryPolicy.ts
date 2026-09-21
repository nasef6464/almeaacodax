import type { SkillGap, SkillProgress } from '../types';

export const MASTERY_POLICY = {
  supportBelow: 50,
  readyAt: 75,
  masteredAt: 90,
  reliableEvidence: 3,
} as const;

export type MasteryBand = 'needs_support' | 'developing' | 'proficient' | 'mastered';

export const normalizeMastery = (value: number) =>
  Math.max(0, Math.min(100, Math.round(Number(value || 0))));

export const getMasteryBand = (value: number): MasteryBand => {
  const mastery = normalizeMastery(value);
  if (mastery >= MASTERY_POLICY.masteredAt) return 'mastered';
  if (mastery >= MASTERY_POLICY.readyAt) return 'proficient';
  if (mastery >= MASTERY_POLICY.supportBelow) return 'developing';
  return 'needs_support';
};

export const getResultSkillStatus = (value: number): SkillGap['status'] => {
  const band = getMasteryBand(value);
  if (band === 'needs_support') return 'weak';
  if (band === 'developing') return 'average';
  return 'strong';
};

export const getProgressSkillStatus = (value: number): SkillProgress['status'] => {
  const band = getMasteryBand(value);
  if (band === 'mastered') return 'mastered';
  if (band === 'proficient') return 'good';
  if (band === 'developing') return 'average';
  return 'weak';
};

export const hasReliableEvidence = (evidenceCount?: number) =>
  Number(evidenceCount || 0) >= MASTERY_POLICY.reliableEvidence;

export const isReadyToAdvance = (mastery: number, reliable: boolean) =>
  normalizeMastery(mastery) >= MASTERY_POLICY.readyAt && reliable;
