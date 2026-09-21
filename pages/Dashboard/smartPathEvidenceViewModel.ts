import type { QuizResult, SkillGap } from '../../types';
import { getResultSkillStatus, normalizeMastery } from '../../utils/masteryPolicy';

export const SMART_PATH_RECENT_RESULT_LIMIT = 5;

const getTimestamp = (result: QuizResult) => {
  const raw = result.createdAt ?? result.date;
  if (typeof raw === 'number') return raw;
  const parsed = new Date(String(raw || '')).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
};

const resultPathId = (result: QuizResult) =>
  String(result.quizSnapshot?.pathId || result.skillsAnalysis?.find((skill) => skill.pathId)?.pathId || '').trim();

const resultSubjectId = (result: QuizResult) =>
  String(result.quizSnapshot?.subjectId || result.skillsAnalysis?.find((skill) => skill.subjectId)?.subjectId || '').trim();

export const buildSmartPathSkillsFromResults = (
  examResults: QuizResult[],
  scope: { pathId?: string; subjectId?: string; recentResultLimit?: number } = {},
): SkillGap[] => {
  const pathId = String(scope.pathId || '').trim();
  const subjectId = String(scope.subjectId || '').trim();
  const limit = Math.max(1, Math.min(20, Math.round(scope.recentResultLimit || SMART_PATH_RECENT_RESULT_LIMIT)));

  const recentResults = [...(examResults || [])]
    .filter((result) => !pathId || resultPathId(result) === pathId)
    .filter((result) => !subjectId || resultSubjectId(result) === subjectId)
    .sort((a, b) => getTimestamp(b) - getTimestamp(a))
    .slice(0, limit);

  const skillMap = new Map<string, {
    skillId?: string;
    pathId?: string;
    subjectId?: string;
    sectionId?: string;
    section?: string;
    skill: string;
    weightedMasteryTotal: number;
    evidenceCount: number;
    correctCount: number;
    observations: Array<{ mastery: number; timestamp: number }>;
  }>();

  for (const result of recentResults) {
    const timestamp = getTimestamp(result);
    for (const skill of result.skillsAnalysis || []) {
      const key = skill.skillId || [skill.pathId, skill.subjectId, skill.sectionId, skill.skill].join(':');
      const currentEvidence = Math.max(1, Math.round(Number(skill.questionCount || 1)));
      const currentCorrect = Number.isFinite(Number(skill.correctCount))
        ? Math.max(0, Math.min(currentEvidence, Number(skill.correctCount)))
        : (normalizeMastery(skill.mastery) / 100) * currentEvidence;
      const existing = skillMap.get(key) || {
        skillId: skill.skillId,
        pathId: skill.pathId,
        subjectId: skill.subjectId,
        sectionId: skill.sectionId,
        section: skill.section,
        skill: skill.skill,
        weightedMasteryTotal: 0,
        evidenceCount: 0,
        correctCount: 0,
        observations: [],
      };

      existing.weightedMasteryTotal += normalizeMastery(skill.mastery) * currentEvidence;
      existing.evidenceCount += currentEvidence;
      existing.correctCount += currentCorrect;
      existing.observations.push({ mastery: normalizeMastery(skill.mastery), timestamp });
      skillMap.set(key, existing);
    }
  }

  return [...skillMap.values()]
    .map((item): SkillGap => {
      const mastery = normalizeMastery(item.weightedMasteryTotal / Math.max(item.evidenceCount, 1));
      const ordered = [...item.observations].sort((a, b) => a.timestamp - b.timestamp);
      const delta = ordered.length >= 2
        ? ordered[ordered.length - 1].mastery - ordered[0].mastery
        : 0;
      const trend: SkillGap['trend'] = delta >= 5 ? 'improving' : delta <= -5 ? 'declining' : 'stable';

      return {
        skillId: item.skillId,
        pathId: item.pathId,
        subjectId: item.subjectId,
        sectionId: item.sectionId,
        section: item.section,
        skill: item.skill,
        mastery,
        questionCount: item.evidenceCount,
        correctCount: Math.round(item.correctCount),
        evidenceCount: item.evidenceCount,
        trend,
        status: getResultSkillStatus(mastery),
        recommendation:
          mastery < 50
            ? 'شرح وتدريب موجه ثم إعادة قياس'
            : mastery < 75
              ? 'تدريب قصير ثم إعادة قياس'
              : 'تثبيت خفيف ومراجعة دورية',
      };
    })
    .sort((a, b) => a.mastery - b.mastery)
    .slice(0, 12);
};
