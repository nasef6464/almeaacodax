import type { QuizResult, SkillGap } from '../../../types';

/** Taxonomy and hierarchy are part of identity; display names are not unique. */
export const assessmentSkillKey = (gap: SkillGap) => JSON.stringify([
  gap.pathId || '', gap.subjectId || '', gap.level || '',
  gap.parentSkillId || '', gap.skillId || gap.skill || gap.sectionId || '',
]);

export const assessmentSkillSummaries = (results: QuizResult[], threshold = 60) => {
  const rows = new Map<string, { key: string; skill: string; subjectId?: string; level?: string; numerator: number; denominator: number; students: Set<string> }>();
  for (const result of results) {
    for (const gap of result.skillsAnalysis || []) {
      if (!Number.isFinite(Number(gap.mastery))) continue;
      const key = assessmentSkillKey(gap);
      const row = rows.get(key) || { key, skill: gap.skill, subjectId: gap.subjectId, level: gap.level, numerator: 0, denominator: 0, students: new Set<string>() };
      const weight = Number(gap.questionCount) > 0 ? Number(gap.questionCount) : 1;
      const correct = Number(gap.correctCount);
      const mastery = Math.min(100, Math.max(0, Number(gap.mastery)));
      row.numerator += gap.questionCount && Number.isFinite(correct) && correct >= 0 && correct <= weight
        ? correct * 100 : mastery * weight;
      row.denominator += weight;
      if (result.userId) row.students.add(result.userId);
      rows.set(key, row);
    }
  }
  return [...rows.values()].map(row => ({
    key: row.key, skill: row.skill, subjectId: row.subjectId, level: row.level,
    mastery: Math.round(row.numerator / row.denominator), studentCount: row.students.size,
    isWeak: row.numerator / row.denominator < threshold,
  })).sort((a, b) => a.mastery - b.mastery);
};
