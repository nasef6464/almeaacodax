import type {
    CategorySection,
    CategorySubject,
    Question,
    QuestionAttempt,
    QuizResult,
    Skill,
} from '../../types';
import { displayText, getReportItemTimestamp, type StudentAggregatedSkill } from './reportDomain';

export {
    buildStudentEvidenceSummary,
    buildStudentSkillReadinessSummary,
} from './studentEvidenceViewModel';
export type {
    StudentEvidenceSummary,
    StudentSkillReadinessSummary,
} from './studentEvidenceViewModel';

export interface StudentPerformanceStats {
    averageScore: number;
    bestSubject: { name: string; score: number };
    worstSubject: { name: string; score: number };
}

export interface StudentAggregatedSkillsInput {
    examResults: QuizResult[];
    questionAttempts: QuestionAttempt[];
    questions: Question[];
    skills: Skill[];
    subjects: CategorySubject[];
    sections: CategorySection[];
    minSkillEvidence: number;
}

export const buildStudentPerformanceStats = (
    examResults: QuizResult[],
    questionAttempts: QuestionAttempt[],
): StudentPerformanceStats | null => {
    if (examResults.length === 0) {
        if (questionAttempts.length === 0) return null;

        const answeredAttempts = questionAttempts.filter((attempt) => attempt.selectedOptionIndex >= 0);
        const correctAttempts = answeredAttempts.filter((attempt) => attempt.isCorrect).length;
        const averageScore = answeredAttempts.length > 0
            ? Math.round((correctAttempts / answeredAttempts.length) * 100)
            : 0;

        return {
            averageScore,
            bestSubject: { name: 'تدريبات الأسئلة', score: averageScore },
            worstSubject: { name: 'تحتاج متابعة', score: averageScore },
        };
    }

    const totalScore = examResults.reduce((acc, curr) => acc + curr.score, 0);
    const averageScore = Math.round(totalScore / examResults.length);
    const subjectScores: Record<string, { total: number; count: number }> = {};

    examResults.forEach((result) => {
        const subjectName = displayText(result.quizTitle).replace('اختبار ', '').replace('الوحدة الأولى', 'أساسيات');
        if (!subjectScores[subjectName]) {
            subjectScores[subjectName] = { total: 0, count: 0 };
        }
        subjectScores[subjectName].total += result.score;
        subjectScores[subjectName].count += 1;
    });

    let bestSubject = { name: '-', score: 0 };
    let worstSubject = { name: '-', score: 100 };

    Object.entries(subjectScores).forEach(([name, data]) => {
        const average = data.total / data.count;
        if (average >= bestSubject.score) bestSubject = { name, score: Math.round(average) };
        if (average <= worstSubject.score) worstSubject = { name, score: Math.round(average) };
    });

    return { averageScore, bestSubject, worstSubject };
};

export const buildStudentAggregatedSkills = ({
    examResults,
    questionAttempts,
    questions,
    skills,
    subjects,
    sections,
    minSkillEvidence,
}: StudentAggregatedSkillsInput): StudentAggregatedSkill[] => {
    type Observation = {
        mastery: number;
        evidenceCount: number;
        correctEvidence: number;
        occurredAt: number;
    };
    type SkillAccumulator = {
        weightedMasteryTotal: number;
        evidenceCount: number;
        observationCount: number;
        correctEvidence: number;
        skillName: string;
        skillId?: string;
        pathId?: string;
        subjectId?: string;
        sectionId?: string;
        observations: Observation[];
        hasResultEvidence: boolean;
    };

    const skillsMap: Record<string, SkillAccumulator> = {};
    const scopeKey = (pathId?: string, subjectId?: string, skillId?: string, skillName?: string) =>
        [String(pathId || ''), String(subjectId || ''), String(skillId || skillName || '')].join('::');

    examResults.forEach((result) => {
        result.skillsAnalysis?.forEach((skill) => {
            const key = scopeKey(skill.pathId, skill.subjectId, skill.skillId, skill.skill);
            if (!skillsMap[key]) {
                skillsMap[key] = {
                    weightedMasteryTotal: 0,
                    evidenceCount: 0,
                    observationCount: 0,
                    correctEvidence: 0,
                    skillName: skill.skill,
                    skillId: skill.skillId,
                    pathId: skill.pathId,
                    subjectId: skill.subjectId,
                    sectionId: skill.sectionId,
                    observations: [],
                    hasResultEvidence: true,
                };
            }
            const reportedEvidence = Number(skill.questionCount);
            const evidenceCount = Number.isFinite(reportedEvidence) && reportedEvidence > 0
                ? Math.max(1, Math.round(reportedEvidence))
                : 1;
            const mastery = Math.max(0, Math.min(100, Number(skill.mastery || 0)));
            const reportedCorrect = Number(skill.correctCount);
            const correctEvidence = Number.isFinite(reportedCorrect)
                ? Math.max(0, Math.min(evidenceCount, reportedCorrect))
                : (mastery / 100) * evidenceCount;
            const row = skillsMap[key];
            row.weightedMasteryTotal += mastery * evidenceCount;
            row.evidenceCount += evidenceCount;
            row.observationCount += 1;
            row.correctEvidence += correctEvidence;
            row.hasResultEvidence = true;
            row.observations.push({
                mastery,
                evidenceCount,
                correctEvidence,
                occurredAt: getReportItemTimestamp(result as any),
            });
            if (!row.skillId && skill.skillId) row.skillId = skill.skillId;
            if (!row.pathId && skill.pathId) row.pathId = skill.pathId;
            if (!row.subjectId && skill.subjectId) row.subjectId = skill.subjectId;
            if (!row.sectionId && skill.sectionId) row.sectionId = skill.sectionId;
        });
    });

    const questionById = new Map(questions.map((question) => [question.id, question]));
    const skillById = new Map(skills.map((skill) => [skill.id, skill]));

    // QuestionAttempt is a compatibility fallback per scoped skill. Completed QuizResult
    // evidence has precedence so one answer cannot be counted once as an attempt and again
    // inside the final result.
    questionAttempts.forEach((attempt) => {
        const question = questionById.get(attempt.questionId);
        const questionSkillIds = Array.isArray(attempt.skillIds) && attempt.skillIds.length > 0
            ? attempt.skillIds
            : Array.isArray(question?.skillIds)
                ? question.skillIds
                : [];

        questionSkillIds.forEach((skillId) => {
            const resolvedSkill = skillById.get(skillId);
            if (!resolvedSkill) return;
            const skillName = displayText(resolvedSkill.name);
            if (!skillName) return;

            const pathId = attempt.pathId || resolvedSkill.pathId || question?.pathId;
            const subjectId = attempt.subjectId || resolvedSkill.subjectId || question?.subjectId || question?.subject;
            const sectionId = attempt.sectionId || resolvedSkill.sectionId || question?.sectionId;
            const key = scopeKey(pathId, subjectId, resolvedSkill.id || skillId, skillName);
            if (skillsMap[key]?.hasResultEvidence) return;

            if (!skillsMap[key]) {
                skillsMap[key] = {
                    weightedMasteryTotal: 0,
                    evidenceCount: 0,
                    observationCount: 0,
                    correctEvidence: 0,
                    skillName,
                    skillId: resolvedSkill.id,
                    pathId,
                    subjectId,
                    sectionId,
                    observations: [],
                    hasResultEvidence: false,
                };
            }
            const mastery = attempt.isCorrect ? 100 : 0;
            const row = skillsMap[key];
            row.weightedMasteryTotal += mastery;
            row.evidenceCount += 1;
            row.observationCount += 1;
            row.correctEvidence += attempt.isCorrect ? 1 : 0;
            row.observations.push({
                mastery,
                evidenceCount: 1,
                correctEvidence: attempt.isCorrect ? 1 : 0,
                occurredAt: getReportItemTimestamp(attempt as any),
            });
        });
    });

    return Object.entries(skillsMap)
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
};
