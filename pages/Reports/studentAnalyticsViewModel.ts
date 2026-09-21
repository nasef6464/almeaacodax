import type {
    CategorySection,
    CategorySubject,
    Question,
    QuestionAttempt,
    QuizResult,
    Skill,
} from '../../types';
import { displayText, type StudentAggregatedSkill } from './reportDomain';

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
    const skillsMap: Record<string, {
        weightedMasteryTotal: number;
        evidenceCount: number;
        observationCount: number;
        correctEvidence: number;
        skillName: string;
        skillId?: string;
        pathId?: string;
        subjectId?: string;
        sectionId?: string;
    }> = {};

    examResults.forEach((result) => {
        result.skillsAnalysis?.forEach((skill) => {
            const skillKey = skill.skillId || skill.skill;
            if (!skillsMap[skillKey]) {
                skillsMap[skillKey] = {
                    weightedMasteryTotal: 0,
                    evidenceCount: 0,
                    observationCount: 0,
                    correctEvidence: 0,
                    skillName: skill.skill,
                    skillId: skill.skillId,
                    pathId: skill.pathId,
                    subjectId: skill.subjectId,
                    sectionId: skill.sectionId,
                };
            }
            const reportedEvidence = Number(skill.questionCount);
            const evidenceCount = Number.isFinite(reportedEvidence) && reportedEvidence > 0
                ? Math.max(1, Math.round(reportedEvidence))
                : 1;
            const reportedCorrect = Number(skill.correctCount);
            const correctEvidence = Number.isFinite(reportedCorrect)
                ? Math.max(0, Math.min(evidenceCount, reportedCorrect))
                : (Math.max(0, Math.min(100, Number(skill.mastery || 0))) / 100) * evidenceCount;
            skillsMap[skillKey].weightedMasteryTotal += Math.max(0, Math.min(100, Number(skill.mastery || 0))) * evidenceCount;
            skillsMap[skillKey].evidenceCount += evidenceCount;
            skillsMap[skillKey].observationCount += 1;
            skillsMap[skillKey].correctEvidence += correctEvidence;
            if (!skillsMap[skillKey].skillId && skill.skillId) skillsMap[skillKey].skillId = skill.skillId;
            if (!skillsMap[skillKey].pathId && skill.pathId) skillsMap[skillKey].pathId = skill.pathId;
            if (!skillsMap[skillKey].subjectId && skill.subjectId) skillsMap[skillKey].subjectId = skill.subjectId;
            if (!skillsMap[skillKey].sectionId && skill.sectionId) skillsMap[skillKey].sectionId = skill.sectionId;
        });
    });

    if (Object.keys(skillsMap).length === 0 && questionAttempts.length > 0) {
        const questionById = new Map(questions.map((question) => [question.id, question]));
        const skillById = new Map(skills.map((skill) => [skill.id, skill]));

        questionAttempts.forEach((attempt) => {
            const question = questionById.get(attempt.questionId);
            const questionSkillIds = Array.isArray(question?.skillIds) ? question.skillIds : [];

            questionSkillIds.forEach((skillId) => {
                const resolvedSkill = skillById.get(skillId);
                if (!resolvedSkill) return;

                const skillName = displayText(resolvedSkill.name);
                if (!skillName) return;

                if (!skillsMap[skillId]) {
                    skillsMap[skillId] = {
                        weightedMasteryTotal: 0,
                        evidenceCount: 0,
                        observationCount: 0,
                        correctEvidence: 0,
                        skillName,
                        skillId: resolvedSkill.id,
                        pathId: resolvedSkill.pathId,
                        subjectId: resolvedSkill.subjectId,
                        sectionId: resolvedSkill.sectionId,
                    };
                }

                skillsMap[skillId].weightedMasteryTotal += attempt.isCorrect ? 100 : 0;
                skillsMap[skillId].evidenceCount += 1;
                skillsMap[skillId].observationCount += 1;
                skillsMap[skillId].correctEvidence += attempt.isCorrect ? 1 : 0;
            });
        });
    }

    return Object.entries(skillsMap)
        .map(([skill, data]): StudentAggregatedSkill => {
            const mastery = Math.round(data.weightedMasteryTotal / Math.max(data.evidenceCount, 1));
            const resolvedSkill = data.skillId
                ? skills.find((item) => item.id === data.skillId)
                : skills.find((item) => displayText(item.name) === displayText(skill));
            const pathId = data.pathId || resolvedSkill?.pathId;
            const subjectName = resolvedSkill?.subjectId
                ? displayText(subjects.find((subject) => subject.id === resolvedSkill.subjectId)?.name)
                : undefined;
            const sectionName = resolvedSkill?.sectionId
                ? displayText(sections.find((section) => section.id === resolvedSkill.sectionId)?.name)
                : undefined;

            return {
                skill: displayText(data.skillName || skill),
                skillId: data.skillId,
                pathId,
                subjectName,
                sectionName,
                mastery,
                attempts: data.observationCount,
                correctAttempts: Math.round(data.correctEvidence),
                totalEvidence: data.evidenceCount,
                isReliable: data.evidenceCount >= minSkillEvidence,
                status: mastery < 50 ? 'weak' : mastery < 75 ? 'average' : 'strong',
            };
        })
        .sort((a, b) => a.mastery - b.mastery);
};
