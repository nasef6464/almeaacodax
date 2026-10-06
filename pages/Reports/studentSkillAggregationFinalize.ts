import type { CategorySection, CategorySubject, Skill } from '../../types';
import { displayText, type StudentAggregatedSkill } from './reportDomain';

export type StudentSkillAccumulator = {
    weightedMasteryTotal: number;
    evidenceCount: number;
    observationCount: number;
    correctEvidence: number;
    skillName: string;
    skillId?: string;
    pathId?: string;
    subjectId?: string;
    sectionId?: string;
    observations: Array<{
        mastery: number;
        evidenceCount: number;
        correctEvidence: number;
        occurredAt: number;
    }>;
    hasResultEvidence: boolean;
};

export const finalizeStudentAggregatedSkills = ({
    skillsMap,
    skills,
    subjects,
    sections,
    minSkillEvidence,
}: {
    skillsMap: Record<string, StudentSkillAccumulator>;
    skills: Skill[];
    subjects: CategorySubject[];
    sections: CategorySection[];
    minSkillEvidence: number;
}): StudentAggregatedSkill[] =>
    Object.entries(skillsMap)
        .map(([skillKey, data]): StudentAggregatedSkill => {
            const mastery = data.evidenceCount > 0
                ? Math.round(data.weightedMasteryTotal / data.evidenceCount)
                : 0;
            const recentObservations = [...data.observations]
                .sort((a, b) => b.occurredAt - a.occurredAt)
                .slice(0, 5);
            const recentEvidence = recentObservations.reduce((sum, item) => sum + item.evidenceCount, 0);
            const recentMastery = recentEvidence > 0
                ? Math.round(
                    recentObservations.reduce(
                        (sum, item) => sum + item.mastery * item.evidenceCount,
                        0,
                    ) / recentEvidence,
                )
                : mastery;
            const chronologicalRecent = [...recentObservations].sort((a, b) => a.occurredAt - b.occurredAt);
            const oldestRecent = chronologicalRecent[0]?.mastery ?? recentMastery;
            const latestRecent = chronologicalRecent.at(-1)?.mastery ?? recentMastery;
            const trend = chronologicalRecent.length < 2
                ? 'stable'
                : latestRecent > oldestRecent
                    ? 'improving'
                    : latestRecent < oldestRecent
                        ? 'declining'
                        : 'stable';
            const resolvedSkill = data.skillId
                ? skills.find((item) => item.id === data.skillId)
                : skills.find((item) => displayText(item.name) === displayText(data.skillName));
            const pathId = data.pathId || resolvedSkill?.pathId;
            const subjectId = data.subjectId || resolvedSkill?.subjectId;
            const sectionId = data.sectionId || resolvedSkill?.sectionId;
            const subjectName = subjectId
                ? displayText(subjects.find((subject) => subject.id === subjectId)?.name)
                : undefined;
            const sectionName = sectionId
                ? displayText(sections.find((section) => section.id === sectionId)?.name)
                : undefined;
            const confidence = Math.min(100, Math.round((data.evidenceCount / Math.max(minSkillEvidence, 1)) * 100));

            return {
                skill: displayText(data.skillName || skillKey),
                skillId: data.skillId,
                pathId,
                subjectId,
                sectionId,
                subjectName,
                sectionName,
                mastery,
                recentMastery,
                trend,
                confidence,
                attempts: data.observationCount,
                correctAttempts: Math.round(data.correctEvidence),
                totalEvidence: data.evidenceCount,
                recentEvidence,
                recentSampleSize: recentObservations.length,
                isReliable: data.evidenceCount >= minSkillEvidence,
                status: mastery < 50 ? 'weak' : mastery < 75 ? 'average' : 'strong',
            };
        })
        .sort((a, b) => {
            const aPriority = a.isReliable ? a.recentMastery ?? a.mastery : a.mastery;
            const bPriority = b.isReliable ? b.recentMastery ?? b.mastery : b.mastery;
            return aPriority - bPriority;
        });
