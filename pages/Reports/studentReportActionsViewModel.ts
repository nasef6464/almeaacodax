import { displayText, type StudentAggregatedSkill } from './reportDomain';
import type { StudentWeeklyPlanItem } from './studentWeeklyPlanViewModel';

export interface StudentAdaptiveLearningBridge {
    skillName: string;
    evidenceLine: string;
    relearnLink: string;
    adaptiveTrainingLink: string;
    smartPathLink: string;
    retestLink: string;
}

export interface StudentReportNextAction {
    title: string;
    description: string;
    primaryLabel: string;
    primaryHref: string;
    secondaryLabel: string;
    secondaryHref: string;
    tone: 'rose' | 'amber' | 'indigo';
}

export interface StudentFollowUpSummaryInput {
    isStudentView: boolean;
    hasStudentAnalytics: boolean;
    focusedReportSkills: StudentAggregatedSkill[];
    averageScore?: number | null;
    studentPeriodLabel: string;
    studentTrackLabel: string;
}

export const buildStudentAdaptiveLearningBridge = (
    studentTodayFocus: StudentWeeklyPlanItem | null,
): StudentAdaptiveLearningBridge | null => {
    if (!studentTodayFocus) return null;

    const skillParam = studentTodayFocus.skillId ? `?skillIds=${encodeURIComponent(studentTodayFocus.skillId)}` : '';

    return {
        skillName: displayText(studentTodayFocus.skill),
        evidenceLine: studentTodayFocus.isReliable
            ? `الحكم مؤكد من ${studentTodayFocus.attempts} محاولات على المهارة.`
            : `هذه قراءة أولية من ${studentTodayFocus.attempts} محاولة وتحتاج قياسًا إضافيًا.`,
        relearnLink: studentTodayFocus.lessonLink || studentTodayFocus.foundationTopicLink || '/courses',
        adaptiveTrainingLink: studentTodayFocus.quizLink || (studentTodayFocus.skillId ? `/quiz${skillParam}` : '/dashboard?tab=saher'),
        smartPathLink: '/plan',
        retestLink: studentTodayFocus.quizLink || (studentTodayFocus.skillId ? `/quiz${skillParam}` : '/dashboard?tab=saher'),
    };
};

export const buildStudentReportNextAction = (
    isStudentView: boolean,
    studentTodayFocus: StudentWeeklyPlanItem | null,
): StudentReportNextAction | null => {
    if (!isStudentView) return null;

    if (studentTodayFocus) {
        const skillName = displayText(studentTodayFocus.skill) || 'المهارة الأضعف';
        const learningLink = studentTodayFocus.lessonLink || studentTodayFocus.foundationTopicLink || '/courses';
        const trainingLink = studentTodayFocus.quizLink || (studentTodayFocus.skillId ? `/quiz?skillIds=${encodeURIComponent(studentTodayFocus.skillId)}` : '/dashboard?tab=saher');

        return {
            title: `ابدأ بـ ${skillName}`,
            description: 'افتح موضوع التأسيس المرتبط، ثم حل تدريبًا قصيرًا، وبعدها أعد القياس.',
            primaryLabel: studentTodayFocus.lessonLink || studentTodayFocus.foundationTopicLink ? 'فتح موضوع التأسيس' : 'استعراض الشروحات',
            primaryHref: learningLink,
            secondaryLabel: 'تدريب قصير',
            secondaryHref: trainingLink,
            tone: studentTodayFocus.mastery < 50 ? 'rose' : 'amber',
        };
    }

    return {
        title: 'ابدأ بقياس قصير',
        description: 'حل اختبار ساهر أولًا، وبعدها سيظهر تقرير المهارات والخطة العلاجية تلقائيًا.',
        primaryLabel: 'اختبار ساهر',
        primaryHref: '/dashboard?tab=saher',
        secondaryLabel: 'اختباراتي',
        secondaryHref: '/my-quizzes',
        tone: 'indigo',
    };
};

export const buildStudentFollowUpSummary = ({
    isStudentView,
    hasStudentAnalytics,
    focusedReportSkills,
    averageScore,
    studentPeriodLabel,
    studentTrackLabel,
}: StudentFollowUpSummaryInput): string => {
    if (!isStudentView || !hasStudentAnalytics) return '';

    const weakest = focusedReportSkills[0];
    const nextTwo = focusedReportSkills.slice(0, 2).map((skill) => displayText(skill.skill)).filter(Boolean);
    const weaknessLabel = weakest?.isReliable ? 'ضعف مؤكد' : 'إشارة أولية';
    const parts = [
        `متوسطك الحالي ${averageScore || 0}%.`,
        `الفترة: ${studentPeriodLabel}.`,
        studentTrackLabel ? `المسار: ${studentTrackLabel}.` : 'اختر مسارك حتى نرتب التقارير والاختبارات حسبه.',
        weakest ? `${weaknessLabel}: ${displayText(weakest.skill)} (${weakest.mastery}%) من ${weakest.attempts} محاولة.` : null,
        nextTwo.length ? `الأولوية: ${nextTwo.join('، ')}.` : null,
        'الخطوة: إعادة تعلم قصيرة، تدريب تكيفي، ثم قياس داخل المسار الذكي.',
    ].filter(Boolean);

    return parts.join(' ');
};
