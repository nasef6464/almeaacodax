import type { QuestionAttempt, QuizResult } from '../../types';
import { sanitizeArabicText } from '../../utils/sanitizeMojibakeArabic';
import type { StudentReportPeriod } from './reportTypes';

export type {
    ScopedAnalyticsOverview,
    ScopedQuizResult,
    SkillRecommendation,
    SmartRemediationPlan,
    StudentAggregatedSkill,
    StudentReportPeriod,
} from './reportTypes';

export const roleScopeTitle: Record<string, string> = {
    admin: 'نطاق المنصة بالكامل',
    supervisor: 'نطاق المجموعات والمدرسة التابعة لك',
    teacher: 'نطاق الطلاب المرتبطين بك',
    parent: 'الأبناء المرتبطون بك',
    student: 'نطاقك الشخصي',
};

export const displayText = (value?: string | null) => sanitizeArabicText(value) || '';
export const MIN_SKILL_EVIDENCE_COUNT = 3;

export const getReportItemTimestamp = (item: Pick<QuizResult, 'date'> & { createdAt?: string | number }) => {
    const raw = item.date || item.createdAt;
    if (typeof raw === 'number') return raw;
    if (!raw) return 0;

    const timestamp = new Date(raw).getTime();
    return Number.isFinite(timestamp) ? timestamp : 0;
};

export const getStudentPeriodStart = (period: StudentReportPeriod) => {
    const now = new Date();
    if (period === 'month') return new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    if (period === 'quarter') return new Date(now.getFullYear(), now.getMonth() - 2, 1).getTime();
    return 0;
};

export const filterStudentReportPeriod = <T extends Pick<QuestionAttempt, 'date'> & { createdAt?: string | number }>(
    items: T[],
    period: StudentReportPeriod,
) => {
    if (period === 'all') return items;

    const start = getStudentPeriodStart(period);
    return items.filter((item) => {
        const timestamp = getReportItemTimestamp(item);
        return timestamp === 0 || timestamp >= start;
    });
};

export const studentReportPeriodLabels: Record<StudentReportPeriod, string> = {
    month: 'هذا الشهر',
    quarter: 'آخر 3 أشهر',
    all: 'كل الفترات',
};

export const getReportSkillKey = (skill: { skill: string; skillId?: string }) => skill.skillId || skill.skill;

export const buildSkillSessionLink = (skill?: { skill?: string; skillId?: string; subjectName?: string; sectionName?: string } | null) => {
    if (!skill) return '/book-session';

    const params = new URLSearchParams();
    if (skill.skillId) params.set('skillId', skill.skillId);
    if (skill.skill) params.set('skillName', displayText(skill.skill));
    if (skill.subjectName) params.set('subjectName', displayText(skill.subjectName));
    if (skill.sectionName) params.set('sectionName', displayText(skill.sectionName));
    params.set('source', 'reports');

    return `/book-session?${params.toString()}`;
};

export const buildDirectedQuizManagerLink = (context?: {
    pathId?: string;
    subjectId?: string;
    sectionId?: string;
    skillId?: string;
    targetUserId?: string;
    targetGroupId?: string;
}) => {
    const params = new URLSearchParams({
        tab: 'quizzes',
        source: 'reports',
        mode: 'central',
    });

    if (context?.pathId) params.set('pathId', context.pathId);
    if (context?.subjectId) params.set('subjectId', context.subjectId);
    if (context?.sectionId) params.set('sectionId', context.sectionId);
    if (context?.skillId) params.set('skillId', context.skillId);
    if (context?.targetUserId) params.set('targetUserId', context.targetUserId);
    if (context?.targetGroupId) params.set('targetGroupId', context.targetGroupId);

    return `/admin-dashboard?${params.toString()}`;
};

export const getReportMasteryTone = (mastery: number) => {
    if (mastery < 50) {
        return {
            label: 'ابدأ بها',
            bg: 'bg-rose-50',
            text: 'text-rose-700',
            bar: 'bg-rose-500',
            border: 'border-rose-100',
        };
    }

    if (mastery < 75) {
        return {
            label: 'راجعها قريبًا',
            bg: 'bg-amber-50',
            text: 'text-amber-700',
            bar: 'bg-amber-500',
            border: 'border-amber-100',
        };
    }

    return {
        label: 'مطمئنة',
        bg: 'bg-emerald-50',
        text: 'text-emerald-700',
        bar: 'bg-emerald-500',
        border: 'border-emerald-100',
    };
};

export const scoreTone = (score: number) => {
    if (score < 60) return 'text-rose-600 bg-rose-50 border-rose-100';
    if (score < 80) return 'text-amber-600 bg-amber-50 border-amber-100';
    return 'text-emerald-600 bg-emerald-50 border-emerald-100';
};
