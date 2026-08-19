import type { StudentAggregatedSkill } from './reportDomain';

export interface StudentEvidenceSummary {
    totalQuestions: number;
    uniqueSkills: number;
}

export interface StudentSkillReadinessSummary {
    weak: number;
    early: number;
    average: number;
    strong: number;
    total: number;
    reliable: number;
    minEvidence: number;
    message: string;
}

export const buildStudentEvidenceSummary = (
    aggregatedSkills: StudentAggregatedSkill[],
): StudentEvidenceSummary => ({
    totalQuestions: aggregatedSkills.reduce(
        (sum, skill) => sum + (skill.totalEvidence || skill.attempts || 0),
        0,
    ),
    uniqueSkills: aggregatedSkills.length,
});

export const buildStudentSkillReadinessSummary = (
    reportBaseSkills: StudentAggregatedSkill[],
    reliableSkillCount: number,
    minSkillEvidence: number,
): StudentSkillReadinessSummary => {
    const weak = reportBaseSkills.filter((skill) => skill.mastery < 50 && skill.isReliable).length;
    const early = reportBaseSkills.filter((skill) => skill.mastery < 50 && !skill.isReliable).length;
    const average = reportBaseSkills.filter((skill) => skill.mastery >= 50 && skill.mastery < 75).length;
    const strong = reportBaseSkills.filter((skill) => skill.mastery >= 75).length;
    const total = reportBaseSkills.length;

    return {
        weak,
        early,
        average,
        strong,
        total,
        reliable: reliableSkillCount,
        minEvidence: minSkillEvidence,
        message:
            weak > 0
                ? `ابدأ بـ ${weak} مهارة ضعفها مؤكد بعد ${minSkillEvidence} محاولات أو أكثر.`
                : average > 0
                    ? `مستواك جيد، وراجع ${average} مهارة لتثبيت التحسن.`
                    : early > 0
                        ? `${early} مهارة بها إشارات أولية وتحتاج محاولات أكثر قبل الحكم.`
                        : total > 0
                            ? 'مؤشراتك مطمئنة. حافظ على التدريب القصير.'
                            : 'ابدأ اختبارًا قصيرًا حتى تظهر خريطة مهاراتك.',
    };
};
