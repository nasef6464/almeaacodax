import { Role, type Skill } from '../../types';
import {
    buildDirectedQuizManagerLink,
    displayText,
    type ScopedAnalyticsOverview,
} from './reportDomain';

type ScopedLeadStudent = ScopedAnalyticsOverview['weakestStudents'][number] | null | undefined;
type ScopedLeadSkill = ScopedAnalyticsOverview['weakestSkills'][number] | null | undefined;
type ScopedLeadSubject = ScopedAnalyticsOverview['subjectSummaries'][number] | null | undefined;

export interface InstitutionalReportHub {
    roleLabel: string;
    nextAction: string;
    targetLine: string;
    followUpLink: string;
    studentsLink: string;
    alertLink: string;
    alertText: string;
}

export const buildScopedLeadStudentSummary = (
    scopedLeadStudent: ScopedLeadStudent,
): string => {
    if (!scopedLeadStudent) return '';

    const weakSkillsText = scopedLeadStudent.weakestSkills
        ?.slice(0, 2)
        .map((skill) => `${displayText(skill.skill)} (${skill.mastery}%)`)
        .join('، ');

    return [
        `ابدأ بمتابعة ${displayText(scopedLeadStudent.name)}.`,
        `متوسطه الحالي ${scopedLeadStudent.averageScore}%.`,
        weakSkillsText ? `أبرز المهارات: ${weakSkillsText}.` : null,
        displayText(scopedLeadStudent.recommendedAction)
            ? `الإجراء المقترح: ${displayText(scopedLeadStudent.recommendedAction)}.`
            : 'الإجراء المقترح: شرح قصير ثم تدريب علاجي ثم إعادة قياس.',
    ].filter(Boolean).join(' ');
};

export const buildInstitutionalReportHub = ({
    role,
    scopedAnalytics,
    scopedLeadSkill,
    scopedLeadStudent,
    scopedLeadSubject,
    skills,
}: {
    role: Role;
    scopedAnalytics: ScopedAnalyticsOverview | null;
    scopedLeadSkill: ScopedLeadSkill;
    scopedLeadStudent: ScopedLeadStudent;
    scopedLeadSubject: ScopedLeadSubject;
    skills: Skill[];
}): InstitutionalReportHub | null => {
    if (role === Role.STUDENT || !scopedAnalytics) return null;

    const roleLabel =
        role === Role.ADMIN
            ? 'مدير المنصة'
            : role === Role.SUPERVISOR
                ? 'مشرف'
                : role === Role.TEACHER
                    ? 'معلم'
                    : 'ولي أمر';
    const nextAction = scopedLeadSkill
        ? `وجّه اختبار متابعة على ${displayText(scopedLeadSkill.skill)} للطلاب المتأثرين.`
        : scopedLeadStudent
            ? `ابدأ برسالة متابعة إلى ${displayText(scopedLeadStudent.name)}.`
            : 'انتظر نتائج أكثر أو وجّه اختبارًا تشخيصيًا قصيرًا.';
    const targetLine = scopedLeadStudent
        ? `${displayText(scopedLeadStudent.name)} يحتاج متابعة بمتوسط ${scopedLeadStudent.averageScore}%.`
        : scopedLeadSkill
            ? `${scopedLeadSkill.affectedStudents} طلاب متأثرون بمهارة ${displayText(scopedLeadSkill.skill)}.`
            : `${scopedAnalytics.scope.studentCount} طالب داخل النطاق.`;
    const resolvedSkill = scopedLeadSkill?.skillId
        ? skills.find((skill) => skill.id === scopedLeadSkill.skillId)
        : undefined;
    const followUpLink = role === Role.PARENT
        ? '/dashboard?tab=reports'
        : buildDirectedQuizManagerLink({
            pathId: resolvedSkill?.pathId,
            subjectId: resolvedSkill?.subjectId,
            sectionId: resolvedSkill?.sectionId,
            skillId: scopedLeadSkill?.skillId,
            targetUserId: scopedLeadStudent?.id,
        });
    const studentsLink =
        role === Role.ADMIN
            ? '/admin-dashboard?tab=users'
            : role === Role.SUPERVISOR
                ? '/admin-dashboard?tab=schools'
                : role === Role.TEACHER
                    ? '/admin-dashboard?tab=quizzes'
                    : '/dashboard?tab=reports';
    const alertLink = role === Role.ADMIN ? '/admin-dashboard?tab=notifications' : '/reports';
    const alertText = [
        `تنبيه متابعة من منصة المئة - ${roleLabel}`,
        targetLine,
        scopedLeadSkill
            ? `أولوية المهارة: ${displayText(scopedLeadSkill.skill)} (${scopedLeadSkill.mastery}%).`
            : null,
        scopedLeadSubject ? `المادة: ${displayText(scopedLeadSubject.subjectName)}.` : null,
        'المطلوب: شرح قصير، تدريب علاجي، ثم اختبار قياس قصير.',
    ].filter(Boolean).join('\n');

    return {
        roleLabel,
        nextAction,
        targetLine,
        followUpLink,
        studentsLink,
        alertLink,
        alertText,
    };
};
