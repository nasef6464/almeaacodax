import type { SkillProgress } from '../../types';
import { MIN_SKILL_EVIDENCE_COUNT, type StudentAggregatedSkill } from './reportDomain';

const toStatus = (mastery: number): StudentAggregatedSkill['status'] =>
  mastery < 50 ? 'weak' : mastery < 75 ? 'average' : 'strong';

export const buildStudentSkillsFromProgress = (
  rows: SkillProgress[],
  minSkillEvidence = MIN_SKILL_EVIDENCE_COUNT,
): StudentAggregatedSkill[] =>
  rows
    .filter((row) => !row.unresolvedTaxonomy && Boolean(String(row.skillId || '').trim()))
    .map((row) => {
      const mastery = Math.max(0, Math.min(100, Number(row.mastery || 0)));
      const evidenceCount = Math.max(0, Number(row.evidenceCount || row.attempts || 0));
      const recentMastery = Number.isFinite(Number(row.recent?.mastery))
        ? Math.max(0, Math.min(100, Number(row.recent?.mastery)))
        : undefined;
      const recentEvidence = Math.max(0, Number(row.recent?.evidenceCount || 0));
      return {
        skill: String(row.skill || '').trim(),
        skillId: row.skillId,
        level: row.level,
        parentSkillId: row.parentSkillId,
        parentSkill: row.parentSkill,
        pathId: row.pathId,
        subjectId: row.subjectId,
        sectionId: row.sectionId,
        mastery,
        recentMastery,
        trend: row.recent?.trend || 'stable',
        confidence: Math.min(100, evidenceCount * 10),
        recentEvidence,
        recentSampleSize: Number(row.recent?.sampleSize || 0),
        attempts: Math.max(0, Number(row.attempts || 0)),
        correctAttempts: Math.round((mastery / 100) * evidenceCount),
        totalEvidence: evidenceCount,
        isReliable: evidenceCount >= minSkillEvidence,
        status: toStatus(mastery),
      } satisfies StudentAggregatedSkill;
    })
    .sort((a, b) => a.mastery - b.mastery || b.totalEvidence - a.totalEvidence);
