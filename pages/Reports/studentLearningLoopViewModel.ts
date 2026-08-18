import { displayText } from './reportDomain';
import type { StudentWeeklyPlanItem } from './studentWeeklyPlanViewModel';

export type StudentLearningActionIconKey = 'checkCircle' | 'video' | 'fileText';

export interface StudentLearningAction {
    title: string;
    body: string;
    label: string;
    link: string;
    iconKey: StudentLearningActionIconKey;
    className: string;
}

export interface StudentTodayLearningLoop {
    skillName: string;
    mastery: number;
    evidenceLabel: string;
    readinessLabel: string;
    steps: Array<StudentLearningAction & { step: number }>;
}

export const buildStudentQuickActions = (
    studentTodayFocus: StudentWeeklyPlanItem | null,
): StudentLearningAction[] => {
    if (!studentTodayFocus) {
        return [
            {
                title: 'ابدأ بقياس قصير',
                body: 'اختبار ساهر يحدد أول مهارة تحتاج تركيزًا.',
                label: 'اختبار ساهر',
                link: '/dashboard?tab=saher',
                iconKey: 'checkCircle',
                className: 'border-emerald-100 bg-emerald-50 text-emerald-800',
            },
            {
                title: 'استعرض الشروح',
                body: 'افتح موضوع تأسيس مناسب بعد أول قياس.',
                label: 'الشروحات',
                link: '/courses',
                iconKey: 'video',
                className: 'border-indigo-100 bg-indigo-50 text-indigo-800',
            },
            {
                title: 'حل تدريب قصير',
                body: 'تدريب سريع بعد ظهور المهارة الأضعف.',
                label: 'اختيار تدريب',
                link: '/my-quizzes',
                iconKey: 'fileText',
                className: 'border-amber-100 bg-amber-50 text-amber-800',
            },
        ];
    }

    const quizLink = studentTodayFocus.quizLink
        || (studentTodayFocus.skillId ? `/quiz?skillIds=${encodeURIComponent(studentTodayFocus.skillId)}` : '/dashboard?tab=saher');

    return [
        {
            title: 'راجع الشرح',
            body: studentTodayFocus.lessonTitle
                ? displayText(studentTodayFocus.lessonTopicTitle || studentTodayFocus.lessonTitle)
                : 'أقرب شرح لهذه المهارة.',
            label: studentTodayFocus.lessonLink || studentTodayFocus.foundationTopicLink ? 'فتح الشرح' : 'استعراض الشروحات',
            link: studentTodayFocus.lessonLink || studentTodayFocus.foundationTopicLink || '/courses',
            iconKey: 'video',
            className: 'border-indigo-100 bg-indigo-50 text-indigo-800',
        },
        {
            title: 'حل تدريب قصير',
            body: studentTodayFocus.quizTitle
                ? displayText(studentTodayFocus.quizTitle)
                : 'تدريب موجه على نفس المهارة.',
            label: studentTodayFocus.quizLink ? 'بدء التدريب' : 'اختيار تدريب',
            link: quizLink,
            iconKey: 'fileText',
            className: 'border-amber-100 bg-amber-50 text-amber-800',
        },
        {
            title: 'أعد القياس',
            body: 'اختبار قصير بعد الشرح والتدريب.',
            label: 'قياس التحسن',
            link: quizLink,
            iconKey: 'checkCircle',
            className: 'border-emerald-100 bg-emerald-50 text-emerald-800',
        },
    ];
};

export const buildStudentTodayLearningLoop = (
    studentTodayFocus: StudentWeeklyPlanItem | null,
    studentQuickActions: StudentLearningAction[],
): StudentTodayLearningLoop => {
    const steps = studentQuickActions.map((action, index) => ({ ...action, step: index + 1 }));

    if (!studentTodayFocus) {
        return {
            skillName: 'ابدأ بقياس قصير',
            mastery: 0,
            evidenceLabel: 'لا توجد بيانات كافية بعد',
            readinessLabel: 'قياس البداية',
            steps,
        };
    }

    const mastery = Number(studentTodayFocus.mastery || 0);

    return {
        skillName: displayText(studentTodayFocus.skill) || 'المهارة الأضعف',
        mastery,
        evidenceLabel: studentTodayFocus.isReliable
            ? `${studentTodayFocus.attempts} محاولات`
            : `قراءة أولية من ${studentTodayFocus.attempts} محاولة`,
        readinessLabel: mastery >= 75
            ? 'جاهز للتثبيت'
            : mastery >= 50
                ? 'راجع ثم قِس'
                : 'ابدأ من الشرح',
        steps,
    };
};
