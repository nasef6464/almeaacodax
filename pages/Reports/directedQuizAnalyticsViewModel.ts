import {
    displayText,
    type ScopedAnalyticsOverview,
    type ScopedQuizResult,
} from './reportDomain';

type AssignedFollowUp = ScopedAnalyticsOverview['assignedFollowUps'][number];
type ScopedStudent = ScopedAnalyticsOverview['weakestStudents'][number];

export interface DirectedQuizSkillAnalysisRow {
    skill: string;
    mastery: number;
    attempts: number;
    affectedStudents: number;
}

export interface DirectedQuizStudentAnalysisRow {
    result: ScopedQuizResult;
    studentName: string;
    score: number;
    weakSkills: NonNullable<ScopedQuizResult['skillsAnalysis']>;
}

export interface DirectedQuizSummary {
    attempts: number;
    averageScore: number;
    needsFollowUp: number;
    weakestSkill: DirectedQuizSkillAnalysisRow | null;
    title: string;
}

export const buildDirectedFollowUpOptions = (
    scopedAnalytics: ScopedAnalyticsOverview | null,
): AssignedFollowUp[] =>
    (scopedAnalytics?.assignedFollowUps || []).filter((quiz) => {
        const mode = quiz.mode || 'regular';
        const hasTargets = (quiz.targetUserIds || []).length > 0 || (quiz.targetGroupIds || []).length > 0;
        return mode === 'central' || hasTargets;
    });

export const selectDirectedFollowUpQuiz = (
    options: AssignedFollowUp[],
    selectedFollowUpQuizId: string,
): AssignedFollowUp | null =>
    options.find((quiz) => quiz.id === selectedFollowUpQuizId) || null;

export const buildDirectedQuizAnalysisResults = ({
    scopedResults,
    selectedFollowUpQuizId,
    directedFollowUpOptions,
    scopedGroupFilter,
    scopedFilteredStudents,
}: {
    scopedResults: ScopedQuizResult[];
    selectedFollowUpQuizId: string;
    directedFollowUpOptions: AssignedFollowUp[];
    scopedGroupFilter: string;
    scopedFilteredStudents: ScopedStudent[];
}): ScopedQuizResult[] => {
    if (!scopedResults.length) return [];

    const targetQuizIds = selectedFollowUpQuizId === 'all'
        ? new Set(directedFollowUpOptions.map((quiz) => quiz.id))
        : new Set([selectedFollowUpQuizId]);
    if (targetQuizIds.size === 0) return [];

    return scopedResults.filter((result) => {
        if (!result.quizId || !targetQuizIds.has(result.quizId)) return false;
        if (scopedGroupFilter === 'all') return true;
        return scopedFilteredStudents.some((student) => student.id === result.userId);
    });
};

export const buildDirectedQuizSkillAnalysis = (
    directedQuizAnalysisResults: ScopedQuizResult[],
): DirectedQuizSkillAnalysisRow[] => {
    const skillMap = new Map<string, {
        skill: string;
        masterySum: number;
        attempts: number;
        affectedStudents: Set<string>;
    }>();

    directedQuizAnalysisResults.forEach((result) => {
        (result.skillsAnalysis || []).forEach((skill) => {
            const skillName = displayText(skill.skill);
            if (!skillName) return;
            const current = skillMap.get(skillName) || {
                skill: skillName,
                masterySum: 0,
                attempts: 0,
                affectedStudents: new Set<string>(),
            };
            const mastery = Number(skill.mastery || 0);
            current.masterySum += mastery;
            current.attempts += 1;
            if (mastery < 75 && result.userId) {
                current.affectedStudents.add(String(result.userId));
            }
            skillMap.set(skillName, current);
        });
    });

    return Array.from(skillMap.values())
        .map((item) => ({
            skill: item.skill,
            mastery: Math.round(item.masterySum / Math.max(item.attempts, 1)),
            attempts: item.attempts,
            affectedStudents: item.affectedStudents.size,
        }))
        .sort((a, b) => a.mastery - b.mastery)
        .slice(0, 8);
};

export const buildDirectedQuizStudentAnalysis = (
    directedQuizAnalysisResults: ScopedQuizResult[],
): DirectedQuizStudentAnalysisRow[] =>
    directedQuizAnalysisResults
        .map((result) => {
            const weakSkills = (result.skillsAnalysis || [])
                .filter((skill) => Number(skill.mastery || 0) < 75)
                .sort((a, b) => Number(a.mastery || 0) - Number(b.mastery || 0))
                .slice(0, 3);

            return {
                result,
                studentName: displayText(result.studentName || result.studentEmail) || 'طالب',
                score: Number(result.score || 0),
                weakSkills,
            };
        })
        .sort((a, b) => a.score - b.score)
        .slice(0, 12);

export const buildDirectedQuizSummary = (
    directedQuizAnalysisResults: ScopedQuizResult[],
    directedQuizSkillAnalysis: DirectedQuizSkillAnalysisRow[],
    selectedFollowUpQuiz: AssignedFollowUp | null,
): DirectedQuizSummary => {
    const attempts = directedQuizAnalysisResults.length;
    const averageScore = attempts
        ? Math.round(directedQuizAnalysisResults.reduce((sum, result) => sum + Number(result.score || 0), 0) / attempts)
        : 0;
    const needsFollowUp = directedQuizAnalysisResults.filter((result) => Number(result.score || 0) < 75).length;
    const weakestSkill = directedQuizSkillAnalysis[0] || null;

    return {
        attempts,
        averageScore,
        needsFollowUp,
        weakestSkill,
        title: selectedFollowUpQuiz ? displayText(selectedFollowUpQuiz.title) : 'كل الاختبارات الموجهة',
    };
};
