import { displayText } from './reportDomain';
import type { StudentWeeklyPlanItem } from './studentWeeklyPlanViewModel';
import { buildReadinessInterpretation } from '../../services/masteryPolicy';
import { buildSkillMasteryReviewActionLink, buildSkillRecheckActionLink, buildSkillRemediationActionLink } from '../../utils/skillActionLinks';

export type StudentReadinessIconKey = 'target' | 'checkCircle' | 'fileText' | 'bookOpen';
export type StudentReadinessStatus = 'needsMeasurement' | 'readyToAdvance' | 'needsPractice' | 'needsRemediation';

export interface ServerReadinessSnapshot {
    score: number;
    status: 'needs_measurement' | 'ready_to_advance' | 'ready_for_recheck' | 'building';
    mastery: number;
    coverage: number;
    evidenceConfidence: number;
    recency: number;
    totalSkills: number;
    reliableSkills: number;
    totalEvidence: number;
    explanation: string;
}

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
    serverReadiness?: ServerReadinessSnapshot | null,
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
    const actionContext = {
        pathId: studentTodayFocus.pathId,
        subjectId: studentTodayFocus.subjectId,
        sectionId: studentTodayFocus.sectionId,
        skillId: studentTodayFocus.skillId,
    };
    const localReadiness = buildReadinessInterpretation({
        mastery,
        evidenceCount: studentTodayFocus.attempts,
        coverage: studentTodayFocus.isReliable ? 1 : 0,
    });
    const readinessStatus = serverReadiness?.status || localReadiness.status;
    const readyToAdvance = readinessStatus === 'ready_to_advance';
    const skillName = displayText(studentTodayFocus.skill) || 'هذه المهارة';
    const recheckHref = buildSkillRecheckActionLink(actionContext)
        || studentTodayFocus.quizLink
        || '/dashboard?tab=saher';
    const remediationHref = buildSkillRemediationActionLink(actionContext)
        || studentTodayFocus.quizLink
        || '/dashboard?tab=saher';
    const masteryReviewHref = buildSkillMasteryReviewActionLink(actionContext)
        || recheckHref;
    const foundationHref = studentTodayFocus.lessonLink || studentTodayFocus.foundationTopicLink || '/courses';
    const evidenceText = serverReadiness
        ? `${serverReadiness.mastery}% • تغطية ${Math.round(serverReadiness.coverage * 100)}% • ${serverReadiness.totalEvidence} دليل`
        : studentTodayFocus.isReliable
            ? `${mastery}% من ${studentTodayFocus.attempts} محاولات`
            : `قراءة أولية ${mastery}%`;

    if (readinessStatus === 'ready_to_advance') {
        return {
            status: 'readyToAdvance',
            readyToAdvance,
            badge: 'جاهز للانتقال',
            title: 'جاهز للانتقال بعد تثبيت قصير',
            body: serverReadiness?.explanation || `مستواك في ${skillName} مطمئن. نفذ مراجعة إتقان قصيرة ثم انتقل للمهارة التالية.`,
            evidence: evidenceText,
            actionLabel: 'مراجعة إتقان',
            actionHref: masteryReviewHref,
            cardClass: 'border-emerald-100 bg-emerald-50/80',
            badgeClass: 'bg-emerald-600 text-white',
            textClass: 'text-emerald-900',
            iconKey: 'checkCircle',
        };
    }

    if (readinessStatus === 'needs_measurement') {
        return {
            status: 'needsMeasurement',
            readyToAdvance,
            badge: 'نحتاج قياسًا',
            title: 'نحتاج قياسًا قصيرًا قبل قرار الانتقال',
            body: serverReadiness?.explanation || 'الأدلة الحالية غير كافية للحكم بثقة.',
            evidence: evidenceText,
            actionLabel: 'ابدأ القياس',
            actionHref: recheckHref,
            cardClass: 'border-indigo-100 bg-indigo-50/80',
            badgeClass: 'bg-indigo-600 text-white',
            textClass: 'text-indigo-900',
            iconKey: 'target',
        };
    }

    if (readinessStatus === 'ready_for_recheck') {
        return {
            status: 'needsPractice',
            readyToAdvance,
            badge: 'راجع ثم قِس',
            title: 'قريب من الجاهزية؛ أعد القياس بعد تدريب قصير',
            body: serverReadiness?.explanation || `راجع ${skillName} بتدريب مركز ثم أعد القياس.`,
            evidence: evidenceText,
            actionLabel: 'تدريب ثم قياس',
            actionHref: recheckHref,
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
        title: 'ابدأ بالعلاج ثم أعد القياس',
        body: serverReadiness?.explanation || `افتح موضوع التأسيس المرتبط بـ ${skillName}، ثم حل تدريبًا قصيرًا وبعدها أعد القياس.`,
        evidence: evidenceText,
        actionLabel: studentTodayFocus.lessonLink || studentTodayFocus.foundationTopicLink
            ? 'فتح موضوع التأسيس'
            : 'تدريب علاجي',
        actionHref: studentTodayFocus.lessonLink || studentTodayFocus.foundationTopicLink
            ? foundationHref
            : remediationHref,
        cardClass: 'border-rose-100 bg-rose-50/80',
        badgeClass: 'bg-rose-600 text-white',
        textClass: 'text-rose-900',
        iconKey: 'bookOpen',
    };
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
