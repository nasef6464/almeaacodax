import {
    displayText,
    roleScopeTitle,
    type ScopedAnalyticsOverview,
} from './reportDomain';

export interface ScopedInterventionPlanItem {
    title: string;
    label: string;
    body: string;
    className: string;
}

export const buildScopedInterventionPlan = (
    scopedAnalytics: ScopedAnalyticsOverview | null,
): ScopedInterventionPlanItem[] => {
    if (!scopedAnalytics) return [];

    const weakestScopedSkill = scopedAnalytics.weakestSkills[0];
    const weakestScopedStudent = scopedAnalytics.weakestStudents[0];
    const weakestScopedSubject = scopedAnalytics.subjectSummaries[0];

    return [
        {
            title: 'ابدأ بالمهارة الأكثر احتياجًا',
            label: weakestScopedSkill
                ? `${displayText(weakestScopedSkill.skill)} - ${weakestScopedSkill.mastery}%`
                : 'بانتظار بيانات مهارات أكثر',
            body: weakestScopedSkill
                ? `وجّه شرحًا قصيرًا وتدريبًا علاجيًا للطلاب المتأثرين (${weakestScopedSkill.affectedStudents}) ثم أعد القياس باختبار قصير.`
                : 'بعد أول محاولات كافية، سيظهر هنا أكثر محور يحتاج تدخلًا.',
            className: 'border-rose-100 bg-rose-50 text-rose-800',
        },
        {
            title: 'تابع الطالب الأكثر احتياجًا',
            label: weakestScopedStudent
                ? `${displayText(weakestScopedStudent.name)} - ${weakestScopedStudent.averageScore}%`
                : 'لا يوجد طالب يحتاج تدخلًا واضحًا',
            body: weakestScopedStudent
                ? `ابدأ برسالة متابعة أو حصة قصيرة، وركّز على ${weakestScopedStudent.weakestSkills?.slice(0, 2).map((skill) => displayText(skill.skill)).join('، ') || 'المهارات الأضعف لديه'}.`
                : 'عند ظهور طلاب يحتاجون دعمًا سيقترح النظام أول طالب تبدأ به.',
            className: 'border-amber-100 bg-amber-50 text-amber-800',
        },
        {
            title: 'حوّلها لمسار تعلم تكيفي',
            label: weakestScopedSubject
                ? `${displayText(weakestScopedSubject.subjectName)} - ${weakestScopedSubject.mastery}%`
                : 'اختر مادة للمتابعة',
            body: weakestScopedSubject
                ? `أنشئ اختبار متابعة وتدريبًا تكيفيًا في هذه المادة للطلاب الضعاف (${weakestScopedSubject.weakStudents}) ثم اربطه بخطة إعادة تعلم.`
                : 'اربط الاختبارات بالمواد والمهارات حتى يظهر مسار إعادة التعلم تلقائيًا.',
            className: 'border-indigo-100 bg-indigo-50 text-indigo-800',
        },
    ];
};

export const buildScopedFollowUpSummary = (
    scopedAnalytics: ScopedAnalyticsOverview | null,
    role: string,
): string => {
    if (!scopedAnalytics) return '';

    const weakestScopedSkill = scopedAnalytics.weakestSkills[0];
    const weakestScopedStudent = scopedAnalytics.weakestStudents[0];
    const weakestScopedSubject = scopedAnalytics.subjectSummaries[0];
    const parts = [
        `نطاق المتابعة: ${roleScopeTitle[role] || 'النطاق الحالي'}.`,
        `عدد الطلاب: ${scopedAnalytics.scope.studentCount}.`,
        `محاولات الاختبار: ${scopedAnalytics.scope.quizAttempts}.`,
        weakestScopedSkill
            ? `أضعف مهارة: ${displayText(weakestScopedSkill.skill)} (${weakestScopedSkill.mastery}%).`
            : null,
        weakestScopedStudent
            ? `أول طالب للمتابعة: ${displayText(weakestScopedStudent.name)} (${weakestScopedStudent.averageScore}%).`
            : null,
        weakestScopedSubject
            ? `المادة التي تحتاج تدخلًا: ${displayText(weakestScopedSubject.subjectName)} (${weakestScopedSubject.mastery}%).`
            : null,
        'الإجراء المقترح: شرح قصير، تدريب علاجي، ثم اختبار قياس قصير.',
    ].filter(Boolean);

    return parts.join(' ');
};
