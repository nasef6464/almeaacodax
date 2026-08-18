import { displayText } from './reportDomain';
import type { StudentWeeklyPlanItem } from './studentWeeklyPlanViewModel';

export type StudentReadinessIconKey = 'target' | 'checkCircle' | 'fileText' | 'bookOpen';
export type StudentReadinessStatus = 'needsMeasurement' | 'readyToAdvance' | 'needsPractice' | 'needsRemediation';

export interface StudentReadinessDecision {
    status: StudentReadinessStatus;
    readyToAdvance: boolean;
    badge: string;
    title: string;
    body: string;
    evidence: string;
    actionLabel: string;
    actionHref: string;
    cardClass: string;
    badgeClass: string;
    textClass: string;
    iconKey: StudentReadinessIconKey;
}

export const buildStudentReadinessDecision = (
    isStudentView: boolean,
    studentTodayFocus: StudentWeeklyPlanItem | null,
): StudentReadinessDecision | null => {
    if (!isStudentView) return null;

    if (!studentTodayFocus) {
        return {
            status: 'needsMeasurement',
            readyToAdvance: false,
            badge: 'قرار الانتقال',
            title: 'جاهز تنتقل؟ نحتاج قياس قصير أولًا',
            body: 'حل اختبار ساهر قصير، وبعدها سنحدد المهارة التالية بوضوح.',
            evidence: 'لا توجد بيانات كافية بعد',
            actionLabel: 'ابدأ قياس قصير',
            actionHref: '/dashboard?tab=saher',
            cardClass: 'border-indigo-100 bg-indigo-50/80',
            badgeClass: 'bg-indigo-600 text-white',
            textClass: 'text-indigo-900',
            iconKey: 'target',
        };
    }

    const mastery = Number(studentTodayFocus.mastery || 0);
    const readyToAdvance = mastery >= 75 && Boolean(studentTodayFocus.isReliable);
    const needsPractice = mastery >= 50;
    const skillName = displayText(studentTodayFocus.skill) || 'هذه المهارة';
    const trainingHref = studentTodayFocus.quizLink
        || (studentTodayFocus.skillId ? `/quiz?skillIds=${encodeURIComponent(studentTodayFocus.skillId)}` : '/dashboard?tab=saher');
    const foundationHref = studentTodayFocus.lessonLink || studentTodayFocus.foundationTopicLink || '/courses';

    if (readyToAdvance) {
        return {
            status: 'readyToAdvance',
            readyToAdvance,
            badge: 'جاهز للانتقال',
            title: 'نعم، جاهز تنتقل بعد تثبيت قصير',
            body: `مستواك في ${skillName} مطمئن. نفذ قياسًا قصيرًا للتثبيت ثم انتقل للمهارة التالية.`,
            evidence: `${mastery}% من ${studentTodayFocus.attempts} محاولات`,
            actionLabel: studentTodayFocus.quizLink ? 'اختبار تثبيت' : 'قياس قصير',
            actionHref: trainingHref,
            cardClass: 'border-emerald-100 bg-emerald-50/80',
            badgeClass: 'bg-emerald-600 text-white',
            textClass: 'text-emerald-900',
            iconKey: 'checkCircle',
        };
    }

    if (needsPractice) {
        return {
            status: 'needsPractice',
            readyToAdvance,
            badge: 'راجع ثم قِس',
            title: 'ليس بعد، تحتاج تدريبًا قصيرًا',
            body: `ابدأ بتدريب على ${skillName} ثم أعد القياس. لا تحتاج أكثر من خطوة واحدة الآن.`,
            evidence: studentTodayFocus.isReliable
                ? `${mastery}% من ${studentTodayFocus.attempts} محاولات`
                : `قراءة أولية ${mastery}%`,
            actionLabel: studentTodayFocus.quizLink ? 'ابدأ التدريب' : 'اختيار تدريب',
            actionHref: trainingHref,
            cardClass: 'border-amber-100 bg-amber-50/80',
            badgeClass: 'bg-amber-500 text-white',
            textClass: 'text-amber-900',
            iconKey: 'fileText',
        };
    }

    return {
        status: 'needsRemediation',
        readyToAdvance,
        badge: 'يحتاج علاج',
        title: 'ليس الآن، ابدأ بموضوع التأسيس',
        body: `افتح موضوع التأسيس المرتبط بـ ${skillName}، ثم حل تدريبًا قصيرًا وبعدها أعد القياس.`,
        evidence: studentTodayFocus.isReliable
            ? `${mastery}% من ${studentTodayFocus.attempts} محاولات`
            : `قراءة أولية ${mastery}%`,
        actionLabel: studentTodayFocus.lessonLink || studentTodayFocus.foundationTopicLink
            ? 'فتح موضوع التأسيس'
            : 'استعراض الشروح',
        actionHref: foundationHref,
        cardClass: 'border-rose-100 bg-rose-50/80',
        badgeClass: 'bg-rose-600 text-white',
        textClass: 'text-rose-900',
        iconKey: 'bookOpen',
    };
};
