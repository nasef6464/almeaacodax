
import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRight, ChevronLeft, Target, PieChart, BookOpen, Video, Clock, CheckCircle, FileText, Download, Copy, Share2, Sparkles, Loader2, Bell, type LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { StudentNextActionStrip } from '../components/StudentNextActionStrip';
import { useStore } from '../store/useStore';
import { api } from '../services/api';
import { Role, type QuestionAttempt, type QuizResult } from '../types';
import { printElementAsPdf } from '../utils/printPdf';
import { shareTextSummary } from '../utils/shareText';
import { loadXlsx } from '../utils/xlsxLoader';
import {
    MIN_SKILL_EVIDENCE_COUNT,
    buildDirectedQuizManagerLink,
    buildSkillSessionLink,
    displayText,
    filterStudentReportPeriod,
    getReportMasteryTone,
    getReportSkillKey,
    roleScopeTitle,
    scoreTone,
    studentReportPeriodLabels,
    type ScopedAnalyticsOverview,
    type ScopedQuizResult,
    type SkillRecommendation,
    type SmartRemediationPlan,
    type StudentAggregatedSkill,
    type StudentReportPeriod,
} from './Reports/reportDomain';
import { buildSkillRecommendation } from './Reports/recommendationViewModel';
import {
    buildStudentAggregatedSkills,
    buildStudentEvidenceSummary,
    buildStudentPerformanceStats,
    buildStudentSkillReadinessSummary,
} from './Reports/studentAnalyticsViewModel';
import { buildScopedFollowUpSummary, buildScopedInterventionPlan } from './Reports/scopedAnalyticsViewModel';
import {
    buildScopedAvailableGroups,
    buildScopedGroupPerformanceRows,
    buildScopedLatestResults,
    buildScopedTeacherPerformanceRows,
    filterScopedStudentsByGroup,
    getStrongestScopedGroup,
} from './Reports/scopedComparisonViewModel';

const getSkillRecommendation = (
    skill: { skill?: string; skillId?: string } | undefined,
    allSkills: ReturnType<typeof useStore.getState>['skills'],
    lessons: ReturnType<typeof useStore.getState>['lessons'],
    quizzes: ReturnType<typeof useStore.getState>['quizzes'],
    libraryItems: ReturnType<typeof useStore.getState>['libraryItems'],
    questions: ReturnType<typeof useStore.getState>['questions'],
    topics: ReturnType<typeof useStore.getState>['topics'],
): SkillRecommendation =>
    buildSkillRecommendation(skill, {
        allSkills,
        lessons,
        quizzes,
        libraryItems,
        questions,
        topics,
        subjects: useStore.getState().subjects,
        sections: useStore.getState().sections,
    });

const Reports: React.FC = () => {
    const { examResults, questionAttempts, skills, lessons, quizzes, libraryItems, questions, topics, subjects, sections, paths, groups, users, enrolledPaths, user } = useStore();
    const [scopedAnalytics, setScopedAnalytics] = useState<ScopedAnalyticsOverview | null>(null);
    const [scopedResults, setScopedResults] = useState<ScopedQuizResult[]>([]);
    const [scopedAnalyticsLoading, setScopedAnalyticsLoading] = useState(false);
    const [selectedSkillKey, setSelectedSkillKey] = useState<string | null>(null);
    const [copiedScopedSummary, setCopiedScopedSummary] = useState(false);
    const [copiedInstitutionalAlert, setCopiedInstitutionalAlert] = useState(false);
    const [interventionAlertSending, setInterventionAlertSending] = useState(false);
    const [interventionAlertSent, setInterventionAlertSent] = useState(false);
    const [interventionAlertError, setInterventionAlertError] = useState('');
    const [sharedScopedSummary, setSharedScopedSummary] = useState(false);
    const [copiedStudentSummary, setCopiedStudentSummary] = useState(false);
    const [sharedStudentSummary, setSharedStudentSummary] = useState(false);
    const [smartRemediation, setSmartRemediation] = useState<SmartRemediationPlan | null>(null);
    const [smartRemediationLoading, setSmartRemediationLoading] = useState(false);
    const [scopedSmartRemediation, setScopedSmartRemediation] = useState<SmartRemediationPlan | null>(null);
    const [scopedSmartRemediationLoading, setScopedSmartRemediationLoading] = useState(false);
    const [scopedInterventionPlanCreated, setScopedInterventionPlanCreated] = useState(false);
    const [scopedInterventionPlanError, setScopedInterventionPlanError] = useState('');
    const [studentReportDepth, setStudentReportDepth] = useState<'simple' | 'full'>('simple');
    const [studentReportPeriod, setStudentReportPeriod] = useState<StudentReportPeriod>('month');
    const [selectedStudentPathId, setSelectedStudentPathId] = useState<string>('all');
    const [scopedReportMode, setScopedReportMode] = useState<'combined' | 'aggregated' | 'individual'>('combined');
    const [scopedGroupFilter, setScopedGroupFilter] = useState<string>('all');
    const [selectedFollowUpQuizId, setSelectedFollowUpQuizId] = useState<string>('all');

    useEffect(() => {
        if (!user?.email || user.role === Role.STUDENT) {
            setScopedAnalytics(null);
            return;
        }

        let cancelled = false;
        setScopedAnalyticsLoading(true);

        Promise.all([
            api.getQuizAnalyticsOverview(),
            api.getScopedQuizResults(),
        ])
            .then(([analyticsResponse, resultsResponse]) => {
                if (!cancelled) {
                    setScopedAnalytics(analyticsResponse as ScopedAnalyticsOverview);
                    const scopedPayload = resultsResponse as { results?: ScopedQuizResult[] };
                    setScopedResults(Array.isArray(scopedPayload?.results) ? scopedPayload.results : []);
                }
            })
            .catch((error) => {
                console.warn('Failed to load scoped analytics overview', error);
                if (!cancelled) {
                    setScopedAnalytics(null);
                    setScopedResults([]);
                }
            })
            .finally(() => {
                if (!cancelled) {
                    setScopedAnalyticsLoading(false);
                }
            });

        return () => {
            cancelled = true;
        };
    }, [user?.email, user.role]);

    const studentPeriodExamResults = useMemo(
        () => filterStudentReportPeriod(examResults, studentReportPeriod),
        [examResults, studentReportPeriod],
    );
    const studentPeriodQuestionAttempts = useMemo(
        () => filterStudentReportPeriod(questionAttempts, studentReportPeriod),
        [questionAttempts, studentReportPeriod],
    );
    const studentPeriodLabel = studentReportPeriodLabels[studentReportPeriod];
    const studentReportDataCount = studentPeriodExamResults.length + studentPeriodQuestionAttempts.length;

    // Calculate Performance Analysis
    const stats = useMemo(
        () => buildStudentPerformanceStats(studentPeriodExamResults, studentPeriodQuestionAttempts),
        [studentPeriodExamResults, studentPeriodQuestionAttempts],
    );

    // Aggregate Skill Analysis
    const aggregatedSkills = useMemo(
        () => buildStudentAggregatedSkills({
            examResults: studentPeriodExamResults,
            questionAttempts: studentPeriodQuestionAttempts,
            questions,
            skills,
            subjects,
            sections,
            minSkillEvidence: MIN_SKILL_EVIDENCE_COUNT,
        }),
        [studentPeriodExamResults, studentPeriodQuestionAttempts, questions, sections, skills, subjects],
    );

    const weakestSkill = aggregatedSkills.length > 0 ? aggregatedSkills[0] : null;
    const studentEvidenceSummary = useMemo(
        () => buildStudentEvidenceSummary(aggregatedSkills),
        [aggregatedSkills],
    );
    const studentEnrolledPathIds = useMemo(() => Array.from(new Set(enrolledPaths || [])).filter(Boolean), [enrolledPaths]);
    const studentEnrolledPathLabels = useMemo(
        () => studentEnrolledPathIds.map((pathId, index) => displayText(paths.find((path) => path.id === pathId)?.name) || `مسار مسجل ${index + 1}`),
        [paths, studentEnrolledPathIds],
    );
    const studentReportPathOptions = useMemo(
        () => paths.filter((path) => studentEnrolledPathIds.includes(path.id) || user.role !== Role.STUDENT),
        [paths, studentEnrolledPathIds, user.role],
    );
    const effectiveStudentPathIds = selectedStudentPathId === 'all'
        ? studentEnrolledPathIds
        : [selectedStudentPathId].filter(Boolean);
    const studentPathScopedSkills = useMemo(
        () =>
            effectiveStudentPathIds.length > 0
                ? aggregatedSkills.filter((skill) => skill.pathId && effectiveStudentPathIds.includes(skill.pathId))
                : aggregatedSkills,
        [aggregatedSkills, effectiveStudentPathIds],
    );
    const reportBaseSkills = studentPathScopedSkills.length > 0 ? studentPathScopedSkills : aggregatedSkills;
    const reliableAggregatedSkills = reportBaseSkills.filter((skill) => skill.isReliable);
    const reliableWeakSkills = reliableAggregatedSkills.filter((skill) => skill.mastery < 50);
    const reliableAverageSkills = reliableAggregatedSkills.filter((skill) => skill.mastery >= 50 && skill.mastery < 75);
    const earlyWeakSignals = reportBaseSkills.filter((skill) => skill.mastery < 50 && !skill.isReliable);
    const focusedReportSkills = (
        reliableWeakSkills.length > 0
            ? [...reliableWeakSkills, ...reliableAverageSkills]
            : reliableAggregatedSkills.length > 0
                ? reliableAggregatedSkills
                : reportBaseSkills
    ).slice(0, 6);
    const primaryReportSkill = focusedReportSkills[0] || weakestSkill;
    const selectedReportSkill = aggregatedSkills.find((skill) => getReportSkillKey(skill) === selectedSkillKey) || primaryReportSkill;
    const selectedSkillRecommendation = getSkillRecommendation(selectedReportSkill || undefined, skills, lessons, quizzes, libraryItems, questions, topics);
    const isStudentView = user?.role === Role.STUDENT;
    const hasStudentAnalytics = examResults.length > 0 || questionAttempts.length > 0 || aggregatedSkills.length > 0;
    const isStudentReportFull = studentReportDepth === 'full';
    const studentTrackLabel = studentEnrolledPathLabels.length > 0 ? studentEnrolledPathLabels.join('، ') : '';
    const hasStudentTrackScope = studentEnrolledPathIds.length > 0;
    const skillReadinessSummary = useMemo(
        () => buildStudentSkillReadinessSummary(
            reportBaseSkills,
            reliableAggregatedSkills.length,
            MIN_SKILL_EVIDENCE_COUNT,
        ),
        [reliableAggregatedSkills.length, reportBaseSkills],
    );
    const studentWeeklyPlan = useMemo(() => {
        const dayLabels = ['اليوم 1', 'اليوم 2', 'اليوم 3'];

        return focusedReportSkills.slice(0, 3).map((skill, index) => {
            const recommendation = getSkillRecommendation(skill, skills, lessons, quizzes, libraryItems, questions, topics);

            return {
                day: dayLabels[index],
                skillId: skill.skillId,
                skill: displayText(skill.skill),
                subjectName: displayText(skill.subjectName),
                sectionName: displayText(skill.sectionName),
                mastery: skill.mastery,
                attempts: skill.attempts,
                isReliable: skill.isReliable,
                lessonTitle: recommendation.lessonTitle,
                lessonLink: recommendation.lessonLink,
                lessonTopicTitle: recommendation.lessonTopicTitle,
                foundationTopicLink: recommendation.foundationTopicLink,
                quizTitle: recommendation.quizTitle,
                quizLink: recommendation.quizLink,
                actionText:
                    recommendation.actionText ||
                    (skill.mastery < 50
                        ? 'راجع شرحًا قصيرًا ثم حل تدريبًا بسيطًا.'
                        : 'حل تدريبًا قصيرًا للتأكد من ثبات المستوى.'),
            };
        });
    }, [focusedReportSkills, lessons, quizzes, libraryItems, questions, skills, topics]);
    const studentTodayFocus = studentWeeklyPlan[0] || null;
    const studentQuickActions = useMemo(() => {
        if (!studentTodayFocus) {
            return [
                {
                    title: 'ابدأ بقياس قصير',
                    body: 'اختبار ساهر يحدد أول مهارة تحتاج تركيزًا.',
                    label: 'اختبار ساهر',
                    link: '/dashboard?tab=saher',
                    Icon: CheckCircle,
                    className: 'border-emerald-100 bg-emerald-50 text-emerald-800',
                },
                {
                    title: 'استعرض الشروح',
                    body: 'افتح موضوع تأسيس مناسب بعد أول قياس.',
                    label: 'الشروحات',
                    link: '/courses',
                    Icon: Video,
                    className: 'border-indigo-100 bg-indigo-50 text-indigo-800',
                },
                {
                    title: 'حل تدريب قصير',
                    body: 'تدريب سريع بعد ظهور المهارة الأضعف.',
                    label: 'اختيار تدريب',
                    link: '/my-quizzes',
                    Icon: FileText,
                    className: 'border-amber-100 bg-amber-50 text-amber-800',
                },
            ];
        }

        return [
            {
                title: 'راجع الشرح',
                body: studentTodayFocus.lessonTitle
                    ? displayText(studentTodayFocus.lessonTopicTitle || studentTodayFocus.lessonTitle)
                    : 'أقرب شرح لهذه المهارة.',
                label: studentTodayFocus.lessonLink || studentTodayFocus.foundationTopicLink ? 'فتح الشرح' : 'استعراض الشروحات',
                link: studentTodayFocus.lessonLink || studentTodayFocus.foundationTopicLink || '/courses',
                Icon: Video,
                className: 'border-indigo-100 bg-indigo-50 text-indigo-800',
            },
            {
                title: 'حل تدريب قصير',
                body: studentTodayFocus.quizTitle
                    ? displayText(studentTodayFocus.quizTitle)
                    : 'تدريب موجه على نفس المهارة.',
                label: studentTodayFocus.quizLink ? 'بدء التدريب' : 'اختيار تدريب',
                link: studentTodayFocus.quizLink || (studentTodayFocus.skillId ? `/quiz?skillIds=${encodeURIComponent(studentTodayFocus.skillId)}` : '/dashboard?tab=saher'),
                Icon: FileText,
                className: 'border-amber-100 bg-amber-50 text-amber-800',
            },
            {
                title: 'أعد القياس',
                body: 'اختبار قصير بعد الشرح والتدريب.',
                label: 'قياس التحسن',
                link: studentTodayFocus.quizLink || (studentTodayFocus.skillId ? `/quiz?skillIds=${encodeURIComponent(studentTodayFocus.skillId)}` : '/dashboard?tab=saher'),
                Icon: CheckCircle,
                className: 'border-emerald-100 bg-emerald-50 text-emerald-800',
            },
        ];
    }, [studentTodayFocus]);
    const studentTodayLearningLoop = useMemo(() => {
        if (!studentTodayFocus) {
            return {
                skillName: 'ابدأ بقياس قصير',
                mastery: 0,
                evidenceLabel: 'لا توجد بيانات كافية بعد',
                readinessLabel: 'قياس البداية',
                steps: studentQuickActions.map((action, index) => ({
                    ...action,
                    step: index + 1,
                })),
            };
        }

        const skillName = displayText(studentTodayFocus.skill) || 'المهارة الأضعف';
        const mastery = Number(studentTodayFocus.mastery || 0);
        const evidenceLabel = studentTodayFocus.isReliable
            ? `${studentTodayFocus.attempts} محاولات`
            : `قراءة أولية من ${studentTodayFocus.attempts} محاولة`;
        const readinessLabel = mastery >= 75
            ? 'جاهز للتثبيت'
            : mastery >= 50
                ? 'راجع ثم قِس'
                : 'ابدأ من الشرح';

        return {
            skillName,
            mastery,
            evidenceLabel,
            readinessLabel,
            steps: studentQuickActions.map((action, index) => ({
                ...action,
                step: index + 1,
            })),
        };
    }, [studentQuickActions, studentTodayFocus]);
    const studentReadinessDecision = useMemo(() => {
        if (!isStudentView) return null;

        if (!studentTodayFocus) {
            return {
                status: 'needsMeasurement' as const,
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
                Icon: Target,
            };
        }

        const mastery = Number(studentTodayFocus.mastery || 0);
        const readyToAdvance = mastery >= 75 && Boolean(studentTodayFocus.isReliable);
        const needsPractice = mastery >= 50;
        const skillName = displayText(studentTodayFocus.skill) || 'هذه المهارة';
        const trainingHref = studentTodayFocus.quizLink || (studentTodayFocus.skillId ? `/quiz?skillIds=${encodeURIComponent(studentTodayFocus.skillId)}` : '/dashboard?tab=saher');
        const foundationHref = studentTodayFocus.lessonLink || studentTodayFocus.foundationTopicLink || '/courses';

        if (readyToAdvance) {
            return {
                status: 'readyToAdvance' as const,
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
                Icon: CheckCircle,
            };
        }

        if (needsPractice) {
            return {
                status: 'needsPractice' as const,
                readyToAdvance,
                badge: 'راجع ثم قِس',
                title: 'ليس بعد، تحتاج تدريبًا قصيرًا',
                body: `ابدأ بتدريب على ${skillName} ثم أعد القياس. لا تحتاج أكثر من خطوة واحدة الآن.`,
                evidence: studentTodayFocus.isReliable ? `${mastery}% من ${studentTodayFocus.attempts} محاولات` : `قراءة أولية ${mastery}%`,
                actionLabel: studentTodayFocus.quizLink ? 'ابدأ التدريب' : 'اختيار تدريب',
                actionHref: trainingHref,
                cardClass: 'border-amber-100 bg-amber-50/80',
                badgeClass: 'bg-amber-500 text-white',
                textClass: 'text-amber-900',
                Icon: FileText,
            };
        }

        return {
            status: 'needsRemediation' as const,
            readyToAdvance,
            badge: 'يحتاج علاج',
            title: 'ليس الآن، ابدأ بموضوع التأسيس',
            body: `افتح موضوع التأسيس المرتبط بـ ${skillName}، ثم حل تدريبًا قصيرًا وبعدها أعد القياس.`,
            evidence: studentTodayFocus.isReliable ? `${mastery}% من ${studentTodayFocus.attempts} محاولات` : `قراءة أولية ${mastery}%`,
            actionLabel: studentTodayFocus.lessonLink || studentTodayFocus.foundationTopicLink ? 'فتح موضوع التأسيس' : 'استعراض الشروح',
            actionHref: foundationHref,
            cardClass: 'border-rose-100 bg-rose-50/80',
            badgeClass: 'bg-rose-600 text-white',
            textClass: 'text-rose-900',
            Icon: BookOpen,
        };
    }, [isStudentView, studentTodayFocus]);
    const compactStudentSkillRows = useMemo(() => {
        return focusedReportSkills.slice(0, 5).map((skill) => {
            const recommendation = getSkillRecommendation(skill, skills, lessons, quizzes, libraryItems, questions, topics);
            const quizLink = recommendation.quizLink || (skill.skillId ? `/quiz?skillIds=${encodeURIComponent(skill.skillId)}` : '/dashboard?tab=saher');

            return {
                ...skill,
                tone: getReportMasteryTone(skill.mastery),
                lessonLink: recommendation.lessonLink || recommendation.foundationTopicLink || '/courses',
                lessonLabel: recommendation.lessonTopicTitle || recommendation.lessonTitle || 'شرح',
                quizLink,
                quizLabel: recommendation.quizTitle || 'تدريب',
                retestLink: quizLink,
                evidenceLabel: skill.isReliable
                    ? `${skill.correctAttempts}/${skill.totalEvidence} صحيح`
                    : `قراءة أولية ${skill.correctAttempts}/${skill.totalEvidence}`,
            };
        });
    }, [focusedReportSkills, lessons, quizzes, libraryItems, questions, skills, topics]);
    const studentPrintableSkillRows = compactStudentSkillRows.slice(0, 5);
    const studentAdaptiveLearningBridge = useMemo(() => {
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
    }, [studentTodayFocus]);
    const studentReportNextAction = useMemo(() => {
        if (!isStudentView) return null;

        if (studentTodayFocus) {
            const skillName = displayText(studentTodayFocus.skill) || 'المهارة الأضعف';
            const learningLink = studentTodayFocus.lessonLink || studentTodayFocus.foundationTopicLink || '/courses';
            const trainingLink = studentTodayFocus.quizLink || (studentTodayFocus.skillId ? `/quiz?skillIds=${encodeURIComponent(studentTodayFocus.skillId)}` : '/dashboard?tab=saher');

            return {
                title: `ابدأ بـ ${skillName}`,
                description: 'افتح موضوع التأسيس المرتبط، ثم حل تدريبًا قصيرًا، وبعدها أعد القياس.',
                primaryLabel: studentTodayFocus.lessonLink || studentTodayFocus.foundationTopicLink ? 'فتح موضوع التأسيس' : 'استعراض الشروح',
                primaryHref: learningLink,
                secondaryLabel: 'تدريب قصير',
                secondaryHref: trainingLink,
                tone: studentTodayFocus.mastery < 50 ? 'rose' as const : 'amber' as const,
            };
        }

        return {
            title: 'ابدأ بقياس قصير',
            description: 'حل اختبار ساهر أولًا، وبعدها سيظهر تقرير المهارات والخطة العلاجية تلقائيًا.',
            primaryLabel: 'اختبار ساهر',
            primaryHref: '/dashboard?tab=saher',
            secondaryLabel: 'اختباراتي',
            secondaryHref: '/my-quizzes',
            tone: 'indigo' as const,
        };
    }, [isStudentView, studentTodayFocus]);
    const studentFollowUpSummary = useMemo(() => {
        if (!isStudentView || !hasStudentAnalytics) return '';

        const weakest = focusedReportSkills[0];
        const nextTwo = focusedReportSkills.slice(0, 2).map((skill) => displayText(skill.skill)).filter(Boolean);
        const weaknessLabel = weakest?.isReliable ? 'ضعف مؤكد' : 'إشارة أولية';
        const parts = [
            `متوسطك الحالي ${stats?.averageScore || 0}%.`,
            `الفترة: ${studentPeriodLabel}.`,
            studentTrackLabel ? `المسار: ${studentTrackLabel}.` : 'اختر مسارك حتى نرتب التقارير والاختبارات حسبه.',
            weakest ? `${weaknessLabel}: ${displayText(weakest.skill)} (${weakest.mastery}%) من ${weakest.attempts} محاولة.` : null,
            nextTwo.length ? `الأولوية: ${nextTwo.join('، ')}.` : null,
            'الخطوة: إعادة تعلم قصيرة، تدريب تكيفي، ثم قياس داخل المسار الذكي.',
        ].filter(Boolean);

        return parts.join(' ');
    }, [focusedReportSkills, hasStudentAnalytics, isStudentView, stats?.averageScore, studentPeriodLabel, studentTrackLabel]);
    const copyStudentSummary = async () => {
        if (!studentFollowUpSummary) return;

        try {
            await navigator.clipboard.writeText(studentFollowUpSummary);
            setCopiedStudentSummary(true);
            window.setTimeout(() => setCopiedStudentSummary(false), 1800);
        } catch {
            setCopiedStudentSummary(false);
        }
    };
    const shareStudentSummary = async () => {
        if (!studentFollowUpSummary) return;

        try {
            await shareTextSummary('ملخص تقرير الطالب', studentFollowUpSummary);
            setSharedStudentSummary(true);
            window.setTimeout(() => setSharedStudentSummary(false), 1800);
        } catch {
            setSharedStudentSummary(false);
        }
    };
    const buildSmartRemediation = async () => {
        if (!focusedReportSkills.length) return;

        setSmartRemediationLoading(true);
        try {
            const response = await api.aiRemediationPlan({
                skills: focusedReportSkills.slice(0, 5),
                ageBand: 'general',
            });
            setSmartRemediation(response);
        } catch {
            setSmartRemediation({
                title: 'خطة علاجية قصيرة',
                summary: 'ابدأ بأضعف مهارة، راجع شرحًا بسيطًا، ثم حل تدريبًا قصيرًا وأعد القياس.',
                steps: focusedReportSkills.slice(0, 3).map((skill, index) => ({
                    day: `اليوم ${index + 1}`,
                    skill: [displayText(skill.subjectName), displayText(skill.sectionName), displayText(skill.skill)].filter(Boolean).join(' - '),
                    action: skill.mastery < 50 ? 'راجع شرحًا قصيرًا ثم حل 5 أسئلة سهلة.' : 'حل تدريبًا متدرجًا ثم راجع الأخطاء.',
                    check: 'أعد اختبارًا مصغرًا من 5 أسئلة على نفس المهارة.',
                })),
                parentNote: 'تابع التقدم بهدوء. المطلوب الآن خطوة صغيرة يوميًا وليس ضغطًا زائدًا.',
            });
        } finally {
            setSmartRemediationLoading(false);
        }
    };
    const scopedInterventionPlan = useMemo(
        () => buildScopedInterventionPlan(scopedAnalytics),
        [scopedAnalytics],
    );
    const scopedFollowUpSummary = useMemo(
        () => buildScopedFollowUpSummary(scopedAnalytics, user.role),
        [scopedAnalytics, user.role],
    );
    const copyScopedSummary = async () => {
        if (!scopedFollowUpSummary) return;

        try {
            await navigator.clipboard.writeText(scopedFollowUpSummary);
            setCopiedScopedSummary(true);
            window.setTimeout(() => setCopiedScopedSummary(false), 1800);
        } catch {
            setCopiedScopedSummary(false);
        }
    };
    const shareScopedSummary = async () => {
        if (!scopedFollowUpSummary) return;

        try {
            await shareTextSummary('ملخص متابعة الأداء', scopedFollowUpSummary);
            setSharedScopedSummary(true);
            window.setTimeout(() => setSharedScopedSummary(false), 1800);
        } catch {
            setSharedScopedSummary(false);
        }
    };
    const buildScopedSmartRemediation = async () => {
        if (!scopedAnalytics?.weakestSkills.length) return;

        setScopedSmartRemediationLoading(true);
        setScopedInterventionPlanCreated(false);
        setScopedInterventionPlanError('');
        const skillPayload = scopedAnalytics.weakestSkills.slice(0, 5).map((skill) => ({
            skill: skill.skill,
            skillId: skill.skillId,
            mastery: skill.mastery,
            status: skill.mastery < 50 ? 'weak' : skill.mastery < 75 ? 'average' : 'strong',
            affectedStudents: skill.affectedStudents,
            attempts: skill.attempts,
        }));

        try {
            const response = await api.aiRemediationPlan({
                skills: skillPayload,
                ageBand: 'general',
            });
            setScopedSmartRemediation(response);
        } catch {
            setScopedSmartRemediation({
                title: 'خطة تدخل للنطاق الحالي',
                summary: 'ابدأ بالمهارة الأكثر ضعفًا، وجه شرحًا قصيرًا، ثم اختبار متابعة لقياس التحسن.',
                steps: skillPayload.slice(0, 3).map((skill, index) => ({
                    day: `خطوة ${index + 1}`,
                    skill: displayText(skill.skill),
                    action: index === 0 ? 'أنشئ شرحًا أو حصة قصيرة لهذه المهارة.' : 'وجّه تدريبًا علاجيًا للطلاب المتأثرين.',
                    check: 'أعد القياس باختبار قصير موجه لنفس المهارة.',
                })),
                parentNote: 'تابع الطلاب الضعاف بهدوء، واجعل التغذية الراجعة قصيرة وواضحة بعد كل محاولة.',
            });
        }

        const leadStudent = scopedAnalytics.weakestStudents[0];
        const leadSkill = scopedAnalytics.weakestSkills[0];
        const resolvedSkill = leadSkill?.skillId ? skills.find((skill) => skill.id === leadSkill.skillId) : undefined;
        const subjectId = resolvedSkill?.subjectId || scopedAnalytics.subjectSummaries[0]?.subjectId;
        const pathId = resolvedSkill?.pathId || subjects.find((subject) => subject.id === subjectId)?.pathId || paths[0]?.id;
        if (leadStudent && leadSkill && pathId && [Role.ADMIN, Role.SUPERVISOR, Role.TEACHER].includes(user.role as Role)) {
            try {
                await api.createInterventionStudyPlan({
                    studentId: leadStudent.id,
                    studentName: displayText(leadStudent.name),
                    pathId,
                    subjectId,
                    skillId: leadSkill.skillId,
                    skillName: displayText(leadSkill.skill),
                    dailyMinutes: 90,
                    preferredStartTime: '17:00',
                });
                setScopedInterventionPlanCreated(true);
            } catch (error) {
                setScopedInterventionPlanError(error instanceof Error ? error.message : 'تعذر إنشاء خطة الطالب الآن.');
            }
        }
        setScopedSmartRemediationLoading(false);
    };
    const scopedLeadStudent = scopedAnalytics?.weakestStudents?.[0] || null;
    const scopedLeadSkill = scopedAnalytics?.weakestSkills?.[0] || null;
    const scopedLeadSubject = scopedAnalytics?.subjectSummaries?.[0] || null;
    const scopedAvailableGroups = useMemo(
        () => buildScopedAvailableGroups(scopedAnalytics),
        [scopedAnalytics],
    );
    const scopedFilteredStudents = useMemo(
        () => filterScopedStudentsByGroup(scopedAnalytics, scopedGroupFilter),
        [scopedAnalytics, scopedGroupFilter],
    );
    const scopedLatestResults = useMemo(
        () => buildScopedLatestResults(scopedResults, scopedGroupFilter, scopedFilteredStudents),
        [scopedResults, scopedGroupFilter, scopedFilteredStudents],
    );
    const scopedGroupPerformanceRows = useMemo(
        () => buildScopedGroupPerformanceRows({ scopedAnalytics, scopedResults, groups }),
        [groups, scopedAnalytics, scopedResults],
    );
    const weakestScopedGroup = scopedGroupPerformanceRows[0] || null;
    const strongestScopedGroup = useMemo(
        () => getStrongestScopedGroup(scopedGroupPerformanceRows),
        [scopedGroupPerformanceRows],
    );
    const scopedTeacherPerformanceRows = useMemo(
        () => buildScopedTeacherPerformanceRows({ scopedAnalytics, scopedResults, groups, users }),
        [groups, scopedAnalytics, scopedResults, users],
    );
    const directedFollowUpOptions = useMemo(
        () => (scopedAnalytics?.assignedFollowUps || []).filter((quiz) => {
            const mode = quiz.mode || 'regular';
            const hasTargets = (quiz.targetUserIds || []).length > 0 || (quiz.targetGroupIds || []).length > 0;
            return mode === 'central' || hasTargets;
        }),
        [scopedAnalytics?.assignedFollowUps],
    );
    useEffect(() => {
        if (selectedFollowUpQuizId === 'all') return;
        if (!directedFollowUpOptions.some((quiz) => quiz.id === selectedFollowUpQuizId)) {
            setSelectedFollowUpQuizId('all');
        }
    }, [directedFollowUpOptions, selectedFollowUpQuizId]);
    const selectedFollowUpQuiz = useMemo(
        () => directedFollowUpOptions.find((quiz) => quiz.id === selectedFollowUpQuizId) || null,
        [directedFollowUpOptions, selectedFollowUpQuizId],
    );
    const directedQuizAnalysisResults = useMemo(() => {
        if (!scopedResults.length) return [];

        const targetQuizIds = selectedFollowUpQuizId === 'all'
            ? new Set(directedFollowUpOptions.map((quiz) => quiz.id))
            : new Set([selectedFollowUpQuizId]);
        if (targetQuizIds.size === 0) return [];

        return scopedResults.filter((result) => {
            if (!result.quizId || !targetQuizIds.has(result.quizId)) return false;
            if (scopedGroupFilter === 'all') return true;
            const student = scopedFilteredStudents.find((item) => item.id === result.userId);
            return !!student;
        });
    }, [directedFollowUpOptions, scopedFilteredStudents, scopedGroupFilter, scopedResults, selectedFollowUpQuizId]);
    const directedQuizSkillAnalysis = useMemo(() => {
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
                const key = skillName;
                const current = skillMap.get(key) || {
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
                skillMap.set(key, current);
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
    }, [directedQuizAnalysisResults]);
    const directedQuizStudentAnalysis = useMemo(() => {
        return directedQuizAnalysisResults
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
    }, [directedQuizAnalysisResults]);
    const directedQuizSummary = useMemo(() => {
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
    }, [directedQuizAnalysisResults, directedQuizSkillAnalysis, selectedFollowUpQuiz]);
    const showScopedAggregatedSections = scopedReportMode === 'combined' || scopedReportMode === 'aggregated';
    const showScopedIndividualSections = scopedReportMode === 'combined' || scopedReportMode === 'individual';
    const scopedLeadStudentSummary = useMemo(() => {
        if (!scopedLeadStudent) return '';

        const weakSkillsText = scopedLeadStudent.weakestSkills?.slice(0, 2).map((skill) => `${displayText(skill.skill)} (${skill.mastery}%)`).join('، ');
        return [
            `ابدأ بمتابعة ${displayText(scopedLeadStudent.name)}.`,
            `متوسطه الحالي ${scopedLeadStudent.averageScore}%.`,
            weakSkillsText ? `أبرز المهارات: ${weakSkillsText}.` : null,
            displayText(scopedLeadStudent.recommendedAction) ? `الإجراء المقترح: ${displayText(scopedLeadStudent.recommendedAction)}.` : 'الإجراء المقترح: شرح قصير ثم تدريب علاجي ثم إعادة قياس.',
        ].filter(Boolean).join(' ');
    }, [scopedLeadStudent]);
    const institutionalReportHub = useMemo(() => {
        if (user.role === Role.STUDENT || !scopedAnalytics) return null;

        const roleLabel =
            user.role === Role.ADMIN
                ? 'مدير المنصة'
                : user.role === Role.SUPERVISOR
                    ? 'مشرف'
                    : user.role === Role.TEACHER
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
        const resolvedSkill = scopedLeadSkill?.skillId ? skills.find((skill) => skill.id === scopedLeadSkill.skillId) : undefined;
        const followUpLink = user.role === Role.PARENT
            ? '/dashboard?tab=reports'
            : buildDirectedQuizManagerLink({
                pathId: resolvedSkill?.pathId,
                subjectId: resolvedSkill?.subjectId,
                sectionId: resolvedSkill?.sectionId,
                skillId: scopedLeadSkill?.skillId,
                targetUserId: scopedLeadStudent?.id,
            });
        const studentsLink =
            user.role === Role.ADMIN
                ? '/admin-dashboard?tab=users'
                : user.role === Role.SUPERVISOR
                    ? '/admin-dashboard?tab=schools'
                    : user.role === Role.TEACHER
                        ? '/admin-dashboard?tab=quizzes'
                        : '/dashboard?tab=reports';
        const alertLink = user.role === Role.ADMIN ? '/admin-dashboard?tab=notifications' : '/reports';
        const alertText = [
            `تنبيه متابعة من منصة المئة - ${roleLabel}`,
            targetLine,
            scopedLeadSkill ? `أولوية المهارة: ${displayText(scopedLeadSkill.skill)} (${scopedLeadSkill.mastery}%).` : null,
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
    }, [scopedAnalytics, scopedLeadSkill, scopedLeadStudent, scopedLeadSubject, skills, user.role]);
    const copyInstitutionalAlert = async () => {
        if (!institutionalReportHub?.alertText) return;

        try {
            await navigator.clipboard.writeText(institutionalReportHub.alertText);
            setCopiedInstitutionalAlert(true);
            window.setTimeout(() => setCopiedInstitutionalAlert(false), 1800);
        } catch {
            setCopiedInstitutionalAlert(false);
        }
    };
    const canSendInterventionAlert =
        Boolean(institutionalReportHub?.alertText && scopedLeadStudent) &&
        [Role.ADMIN, Role.SUPERVISOR, Role.TEACHER].includes(user.role as Role);
    const sendInterventionAlert = async () => {
        if (!canSendInterventionAlert || !scopedLeadStudent || !institutionalReportHub?.alertText) return;

        setInterventionAlertSending(true);
        setInterventionAlertError('');
        try {
            await api.sendInterventionAlert({
                studentId: scopedLeadStudent.id,
                studentName: displayText(scopedLeadStudent.name),
                skillName: displayText(scopedLeadSkill?.skill),
                mastery: scopedLeadSkill?.mastery,
                title: 'تنبيه تدخل علاجي',
                body: institutionalReportHub.alertText,
                channels: ['in_app'],
            });
            setInterventionAlertSent(true);
            window.setTimeout(() => setInterventionAlertSent(false), 2200);
        } catch (error) {
            setInterventionAlertError(error instanceof Error ? error.message : 'تعذر إرسال التنبيه الآن.');
        } finally {
            setInterventionAlertSending(false);
        }
    };
    const scopedSkillReportCards = useMemo(() => {
        return (scopedAnalytics?.weakestSkills || []).slice(0, 4).map((skill) => {
            const tone = skill.mastery < 50
                ? {
                    label: 'دعم عاجل',
                    card: 'border-rose-100 bg-rose-50/70',
                    text: 'text-rose-700',
                    bar: 'bg-rose-500',
                }
                : {
                    label: 'دعم قريب',
                    card: 'border-amber-100 bg-amber-50/70',
                    text: 'text-amber-700',
                    bar: 'bg-amber-500',
                };
            const recommendation = getSkillRecommendation(skill, skills, lessons, quizzes, libraryItems, questions, topics);

            return {
                ...skill,
                tone,
                lessonLink: recommendation.lessonLink,
                lessonTitle: recommendation.lessonTopicTitle || recommendation.lessonTitle,
                quizLink: recommendation.quizLink,
                quizTitle: recommendation.quizTitle,
            };
        });
    }, [lessons, libraryItems, questions, quizzes, scopedAnalytics?.weakestSkills, skills, topics]);
    const scopedStudentFocusCards = useMemo(() => {
        return scopedFilteredStudents.slice(0, 4).map((student) => {
            const topSkills = (student.weakestSkills || []).slice(0, 2);
            const primarySkillName = topSkills[0]?.skill;
            const resolvedSkill = primarySkillName
                ? skills.find((skill) => displayText(skill.name) === displayText(primarySkillName))
                : undefined;

            return {
                ...student,
                topSkills,
                followUpLink: buildDirectedQuizManagerLink({
                    pathId: resolvedSkill?.pathId,
                    subjectId: resolvedSkill?.subjectId,
                    sectionId: resolvedSkill?.sectionId,
                    skillId: resolvedSkill?.id,
                    targetUserId: student.id,
                    targetGroupId: student.groupIds?.[0],
                }),
                tone: student.averageScore < 50
                    ? 'border-rose-100 bg-rose-50/70 text-rose-700'
                    : 'border-amber-100 bg-amber-50/70 text-amber-700',
            };
        });
    }, [scopedFilteredStudents, skills]);
    const downloadScopedSkillsWorkbook = async () => {
        if (!scopedAnalytics?.weakestSkills?.length) return;

        const XLSX = await loadXlsx();
        const workbook = XLSX.utils.book_new();
        const rows = [
            ['المهارة', 'المحور', 'نسبة الإتقان', 'طلاب متأثرون', 'محاولات', 'الإجراء المقترح', 'شرح / دعم', 'اختبار موجه'],
            ...scopedSkillReportCards.map((skill) => [
                displayText(skill.skill) || '-',
                displayText(skill.section) || '-',
                `${skill.mastery}%`,
                skill.affectedStudents,
                skill.attempts,
                displayText(skill.recommendedAction) || 'شرح قصير ثم تدريب علاجي ثم اختبار متابعة.',
                displayText(skill.lessonTitle) || '-',
                displayText(skill.quizTitle) || '-',
            ]),
        ];

        XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(rows), 'skills-report');
        XLSX.writeFile(workbook, `skills-report-${new Date().toISOString().slice(0, 10)}.xlsx`);
    };
    const downloadScopedStudentsWorkbook = async () => {
        if (!scopedAnalytics?.weakestStudents?.length) return;

        const XLSX = await loadXlsx();
        const workbook = XLSX.utils.book_new();
        const rows = [
            ['الطالب', 'المجموعات', 'متوسط الأداء', 'عدد المحاولات', 'مهارات تحتاج دعم', 'أبرز المهارات', 'الإجراء المقترح'],
            ...scopedStudentFocusCards.map((student) => [
                displayText(student.name) || '-',
                student.groupNames?.length ? student.groupNames.map((name) => displayText(name)).join('، ') : '-',
                `${student.averageScore}%`,
                student.attempts,
                student.weakSkillCount,
                student.topSkills.length ? student.topSkills.map((skill) => `${displayText(skill.skill)} ${skill.mastery}%`).join('، ') : '-',
                displayText(student.recommendedAction) || 'شرح قصير ثم تدريب موجه ثم قياس.',
            ]),
        ];

        XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(rows), 'students-report');
        XLSX.writeFile(workbook, `students-performance-report-${new Date().toISOString().slice(0, 10)}.xlsx`);
    };
    const downloadDirectedQuizAnalysisWorkbook = async () => {
        if (!directedQuizAnalysisResults.length) return;

        const XLSX = await loadXlsx();
        const workbook = XLSX.utils.book_new();
        const summaryRows = [
            ['البند', 'القيمة'],
            ['نوع التقرير', 'تحليل اختبار موجه'],
            ['الاختبار', directedQuizSummary.title],
            ['النطاق', roleScopeTitle[user.role] || 'النطاق الحالي'],
            ['المجموعة', scopedGroupFilter === 'all' ? 'كل المجموعات' : scopedGroupFilter],
            ['عدد المحاولات', directedQuizSummary.attempts],
            ['متوسط الأداء', `${directedQuizSummary.averageScore}%`],
            ['طلاب يحتاجون متابعة', directedQuizSummary.needsFollowUp],
            ['أضعف مهارة', directedQuizSummary.weakestSkill ? `${directedQuizSummary.weakestSkill.skill} ${directedQuizSummary.weakestSkill.mastery}%` : '-'],
        ];
        const skillRows = [
            ['المهارة', 'متوسط الإتقان', 'عدد الأدلة', 'طلاب متأثرون'],
            ...directedQuizSkillAnalysis.map((skill) => [
                displayText(skill.skill) || '-',
                `${skill.mastery}%`,
                skill.attempts,
                skill.affectedStudents,
            ]),
        ];
        const studentRows = [
            ['الطالب', 'اسم الاختبار', 'الدرجة', 'عدد الأسئلة', 'الصحيح', 'الخطأ', 'أضعف المهارات', 'التاريخ'],
            ...directedQuizStudentAnalysis.map(({ result, weakSkills }) => [
                displayText(result.studentName || result.studentEmail) || '-',
                displayText(result.quizTitle) || '-',
                `${Number(result.score || 0)}%`,
                result.totalQuestions || 0,
                result.correctAnswers || 0,
                result.wrongAnswers || 0,
                weakSkills.length ? weakSkills.map((skill) => `${displayText(skill.skill)} ${Number(skill.mastery || 0)}%`).join('، ') : '-',
                displayText(result.date || result.createdAt) || '-',
            ]),
        ];

        XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(summaryRows), 'summary');
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(skillRows), 'skills');
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(studentRows), 'students');
        XLSX.writeFile(workbook, `directed-quiz-analysis-${new Date().toISOString().slice(0, 10)}.xlsx`);
    };
    const downloadStudentSkillsWorkbook = async () => {
        if (!aggregatedSkills.length) return;

        const XLSX = await loadXlsx();
        const workbook = XLSX.utils.book_new();
        const rows = [
            ['المادة', 'المهارة الرئيسية', 'المهارة', 'نسبة الإتقان', 'الحالة', 'شرح مقترح', 'تدريب مقترح'],
            ...aggregatedSkills.map((skill) => {
                const recommendation = getSkillRecommendation(skill, skills, lessons, quizzes, libraryItems, questions, topics);
                const tone = getReportMasteryTone(skill.mastery);

                return [
                    displayText(skill.subjectName) || '-',
                    displayText(skill.sectionName) || '-',
                    displayText(skill.skill) || '-',
                    `${skill.mastery}%`,
                    tone.label,
                    displayText(recommendation.lessonTitle || recommendation.lessonTopicTitle) || '-',
                    displayText(recommendation.quizTitle) || '-',
                ];
            }),
        ];

        XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(rows), 'my-skills');
        XLSX.writeFile(workbook, `my-skills-report-${new Date().toISOString().slice(0, 10)}.xlsx`);
    };
    const downloadStudentAttemptsWorkbook = async () => {
        if (!studentPeriodExamResults.length) return;

        const XLSX = await loadXlsx();
        const workbook = XLSX.utils.book_new();
        const rows = [
            ['اسم الاختبار', 'الدرجة', 'عدد الأسئلة', 'الصحيح', 'الخطأ', 'بدون إجابة', 'الوقت', 'التاريخ', 'أضعف مهارة'],
            ...studentPeriodExamResults.map((result) => {
                const weakSkill = [...(result.skillsAnalysis || [])].sort((a, b) => Number(a.mastery || 0) - Number(b.mastery || 0))[0];

                return [
                    displayText(result.quizTitle) || '-',
                    `${result.score}%`,
                    result.totalQuestions,
                    result.correctAnswers,
                    result.wrongAnswers,
                    result.unanswered,
                    displayText(result.timeSpent) || '-',
                    displayText(result.date) || '-',
                    weakSkill ? `${displayText(weakSkill.skill)} ${Number(weakSkill.mastery || 0)}%` : '-',
                ];
            }),
        ];

        XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(rows), 'my-attempts');
        XLSX.writeFile(workbook, `my-attempts-report-${new Date().toISOString().slice(0, 10)}.xlsx`);
    };
    const downloadPerformanceWorkbook = async () => {
        const XLSX = await loadXlsx();
        const workbook = XLSX.utils.book_new();
        const now = new Date().toLocaleString('ar-SA');
        const summaryRows = isStudentView
            ? [
                ['البند', 'القيمة'],
                ['نوع التقرير', 'تقرير طالب'],
                ['تاريخ التصدير', now],
                ['الفترة', studentPeriodLabel],
                ['متوسط الأداء', `${stats?.averageScore || 0}%`],
                ['أفضل محور', `${displayText(stats?.bestSubject?.name)} - ${stats?.bestSubject?.score || 0}%`],
                ['أضعف محور', `${displayText(stats?.worstSubject?.name)} - ${stats?.worstSubject?.score || 0}%`],
                ['عدد المهارات الضعيفة', skillReadinessSummary.weak],
                ['عدد المهارات المتوسطة', skillReadinessSummary.average],
                ['عدد المهارات المطمئنة', skillReadinessSummary.strong],
                ['الملخص', studentFollowUpSummary || skillReadinessSummary.message],
            ]
            : [
                ['البند', 'القيمة'],
                ['نوع التقرير', roleScopeTitle[user.role] || 'تقرير نطاق'],
                ['تاريخ التصدير', now],
                ['عدد الطلاب', scopedAnalytics?.scope.studentCount || 0],
                ['عدد المجموعات', scopedAnalytics?.scope.groupCount || 0],
                ['محاولات الاختبار', scopedAnalytics?.scope.quizAttempts || 0],
                ['إجابات مرصودة', scopedAnalytics?.scope.questionAttempts || 0],
                ['أفضل فصل', strongestScopedGroup ? `${displayText(strongestScopedGroup.groupName)} - ${strongestScopedGroup.averageScore}%` : '-'],
                ['أضعف فصل', weakestScopedGroup ? `${displayText(weakestScopedGroup.groupName)} - ${weakestScopedGroup.averageScore}%` : '-'],
                ['أول مهارة تحتاج تدخل', displayText(scopedLeadSkill?.skill) || '-'],
                ['أول طالب للمتابعة', displayText(scopedLeadStudent?.name) || '-'],
                ['الملخص', scopedFollowUpSummary || 'لا توجد بيانات كافية بعد.'],
            ];

        const skillRows = isStudentView
            ? [
                ['المادة', 'المهارة الرئيسية', 'المهارة', 'نسبة الإتقان', 'الحالة', 'الإجراء المقترح', 'شرح مقترح', 'اختبار مقترح'],
                ...studentPrintableSkillRows.map((skill) => {
                    const recommendation = getSkillRecommendation(skill, skills, lessons, quizzes, libraryItems, questions, topics);
                    const tone = getReportMasteryTone(skill.mastery);

                    return [
                        displayText(skill.subjectName) || '-',
                        displayText(skill.sectionName) || '-',
                        displayText(skill.skill) || '-',
                        `${skill.mastery}%`,
                        tone.label,
                        displayText(recommendation.actionText) || 'شرح قصير ثم تدريب ثم إعادة قياس.',
                        displayText(recommendation.lessonTitle) || '-',
                        displayText(recommendation.quizTitle) || '-',
                    ];
                }),
            ]
            : [
                ['المهارة', 'المهارة الرئيسية', 'نسبة الإتقان', 'طلاب متأثرون', 'محاولات', 'الإجراء المقترح'],
                ...(scopedAnalytics?.weakestSkills || []).map((skill) => [
                    displayText(skill.skill) || '-',
                    displayText(skill.section) || '-',
                    `${skill.mastery}%`,
                    skill.affectedStudents,
                    skill.attempts,
                    displayText(skill.recommendedAction) || 'شرح قصير ثم تدريب علاجي ثم اختبار متابعة.',
                ]),
            ];

        const actionRows = isStudentView
            ? [
                ['اليوم', 'المادة', 'المهارة الرئيسية', 'المهارة', 'الإتقان', 'الخطوة العملية', 'شرح', 'رابط الشرح', 'اختبار', 'رابط الاختبار'],
                ...studentWeeklyPlan.map((step) => [
                    displayText(step.day),
                    displayText(step.subjectName) || '-',
                    displayText(step.sectionName) || '-',
                    displayText(step.skill) || '-',
                    `${step.mastery}%`,
                    displayText(step.actionText) || '-',
                    displayText(step.lessonTitle) || '-',
                    step.lessonLink || '-',
                    displayText(step.quizTitle) || '-',
                    step.quizLink || '-',
                ]),
            ]
            : [
                ['الأولوية', 'العنوان', 'التفصيل', 'الإجراء العملي'],
                ...scopedInterventionPlan.map((item, index) => [
                    index + 1,
                    displayText(item.title),
                    displayText(item.label),
                    displayText(item.body),
                ]),
            ];

        const groupRows = [
            ['الفصل/المجموعة', 'متوسط الأداء', 'عدد الطلاب', 'طلاب متعثرون', 'محاولات', 'محاولات تحتاج متابعة'],
            ...scopedGroupPerformanceRows.map((group) => [
                displayText(group.groupName) || '-',
                `${group.averageScore}%`,
                group.studentCount,
                group.weakStudentCount,
                group.attempts,
                group.weakAttempts,
            ]),
        ];
        const teacherRows = [
            ['المعلم', 'عدد الفصول', 'متوسط الأداء', 'طلاب متعثرون', 'محاولات'],
            ...scopedTeacherPerformanceRows.map((teacher) => [
                teacher.name,
                teacher.groupCount,
                `${teacher.averageScore}%`,
                teacher.weakStudentCount,
                teacher.attempts,
            ]),
        ];

        const attemptsRows = isStudentView
            ? [
                ['اسم الاختبار', 'الدرجة', 'عدد الأسئلة', 'الصحيح', 'الخطأ', 'بدون إجابة', 'الوقت', 'التاريخ'],
                ...studentPeriodExamResults.map((result) => [
                    displayText(result.quizTitle) || '-',
                    `${result.score}%`,
                    result.totalQuestions,
                    result.correctAnswers,
                    result.wrongAnswers,
                    result.unanswered,
                    displayText(result.timeSpent) || '-',
                    displayText(result.date) || '-',
                ]),
            ]
            : [
                ['الطالب', 'اسم الاختبار', 'الدرجة', 'عدد الأسئلة', 'الصحيح', 'الخطأ', 'التاريخ'],
                ...scopedResults.slice(0, 200).map((result) => [
                    displayText(result.studentName || result.studentEmail) || '-',
                    displayText(result.quizTitle) || '-',
                    `${Number(result.score || 0)}%`,
                    result.totalQuestions || 0,
                    result.correctAnswers || 0,
                    result.wrongAnswers || 0,
                    displayText(result.date || result.createdAt) || '-',
                ]),
            ];

        XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(summaryRows), 'summary');
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(skillRows), 'skills');
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(actionRows), 'action-plan');
        if (!isStudentView) {
            XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(groupRows), 'groups');
            XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(teacherRows), 'teachers');
        }
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(attemptsRows), 'attempts');
        XLSX.writeFile(workbook, isStudentView ? 'student-performance-report.xlsx' : 'scoped-performance-report.xlsx');
    };

    if (isStudentView && !hasStudentAnalytics) {
        return (
            <div className="space-y-6 pb-20 animate-fade-in">
                <header className="flex items-center gap-3 sm:gap-4">
                    <Link to="/dashboard" className="text-gray-500 hover:text-gray-700">
                        <ArrowRight size={24} />
                    </Link>
                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold text-gray-800 leading-tight">تقارير الأداء</h1>
                        <p className="text-sm text-gray-500">نظرة شاملة على مستوى التقدم</p>
                    </div>
                </header>
                <EmptyState
                    eyebrow="تقريرك يبدأ بعد أول قياس"
                    title="لا توجد بيانات كافية"
                    description="حل اختبارًا قصيرًا واحدًا، وبعدها سنعرض لك المهارة الأضعف والخطوة التالية مباشرة."
                    icon={<PieChart size={24} />}
                    primaryAction={{ label: 'ابدأ أول اختبار', href: '/quiz', icon: <Target size={16} /> }}
                    secondaryAction={{ label: 'اختباراتي', href: '/dashboard?tab=quizzes', icon: <FileText size={16} /> }}
                    tone="indigo"
                />
            </div>
        );
    }

    if (user?.role === Role.PARENT) {
        const latestResult = scopedLatestResults[0];
        const averageScore = scopedResults.length
            ? Math.round(scopedResults.reduce((total, result) => total + (Number(result.score) || 0), 0) / scopedResults.length)
            : 0;
        const weakSkill = scopedAnalytics?.weakestSkills?.[0] || null;
        const leadStudent = scopedAnalytics?.weakestStudents?.[0] || null;
        const parentWeakSkillRecommendation = getSkillRecommendation(weakSkill || undefined, skills, lessons, quizzes, libraryItems, questions, topics);
        const parentSkillActions = [
            parentWeakSkillRecommendation.lessonLink
                ? {
                    title: 'فتح الشرح',
                    body: displayText(parentWeakSkillRecommendation.lessonTopicTitle || parentWeakSkillRecommendation.lessonTitle) || 'شرح المهارة الأضعف',
                    link: parentWeakSkillRecommendation.lessonLink,
                    Icon: BookOpen,
                    className: 'border-indigo-100 bg-indigo-50 text-indigo-800 hover:bg-indigo-100',
                }
                : null,
            parentWeakSkillRecommendation.quizLink
                ? {
                    title: 'بدء تدريب',
                    body: displayText(parentWeakSkillRecommendation.quizTitle) || 'تدريب قصير على نفس المهارة',
                    link: parentWeakSkillRecommendation.quizLink,
                    Icon: FileText,
                    className: 'border-amber-100 bg-amber-50 text-amber-800 hover:bg-amber-100',
                }
                : null,
            weakSkill
                ? {
                    title: 'حصة علاجية',
                    body: 'عند تكرار الضعف في نفس المهارة',
                    link: buildSkillSessionLink({ skill: weakSkill.skill, skillId: weakSkill.skillId, sectionName: weakSkill.section }),
                    Icon: Clock,
                    className: 'border-emerald-100 bg-emerald-50 text-emerald-800 hover:bg-emerald-100',
                }
                : null,
        ].filter(Boolean) as Array<{ title: string; body: string; link: string; Icon: LucideIcon; className: string }>;
        const parentBriefSummary = scopedFollowUpSummary || [
            `الأداء العام ${averageScore}%.`,
            weakSkill ? `ابدأ بمتابعة ${displayText(weakSkill.skill)}.` : null,
            leadStudent ? `أكثر طالب يحتاج متابعة الآن: ${displayText(leadStudent.name)}.` : null,
            'الخطوة العملية: شرح قصير، تدريب بسيط، ثم إعادة قياس هادئة.',
        ].filter(Boolean).join(' ');
        const copyParentBriefSummary = async () => {
            if (!parentBriefSummary) return;

            try {
                await navigator.clipboard.writeText(parentBriefSummary);
                setCopiedScopedSummary(true);
                window.setTimeout(() => setCopiedScopedSummary(false), 1800);
            } catch {
                setCopiedScopedSummary(false);
            }
        };
        const shareParentBriefSummary = async () => {
            if (!parentBriefSummary) return;

            try {
                await shareTextSummary('ملخص ولي الأمر', parentBriefSummary);
                setSharedScopedSummary(true);
                window.setTimeout(() => setSharedScopedSummary(false), 1800);
            } catch {
                setSharedScopedSummary(false);
            }
        };
        const parentActionItems = [
            {
                title: 'اليوم',
                body: weakSkill
                    ? `${displayText(weakSkill.skill)}: شرح قصير ثم سؤالان.`
                    : 'ابدأ باختبار قصير لتظهر المهارة الأضعف.',
                tone: 'bg-emerald-50 text-emerald-800 border-emerald-100',
            },
            {
                title: 'بعد الشرح',
                body: '5 أسئلة فقط على نفس الفكرة.',
                tone: 'bg-indigo-50 text-indigo-800 border-indigo-100',
            },
            {
                title: 'نهاية الأسبوع',
                body: averageScore < 60
                    ? 'أعد القياس، وإن بقي الضعف احجز حصة.'
                    : 'أعد قياسًا بسيطًا ثم انتقل لمهارة أخرى.',
                tone: 'bg-amber-50 text-amber-800 border-amber-100',
            },
        ];

        return (
            <div id="reports-print-area" className="space-y-6 pb-20 animate-fade-in">
                <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3 sm:gap-4">
                        <Link to="/dashboard" className="text-gray-500 hover:text-gray-700">
                            <ArrowRight size={24} />
                        </Link>
                        <div>
                            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 leading-tight">تقرير ولي الأمر</h1>
                            <p className="text-sm text-gray-500">ملخص بسيط وواضح عن أداء الأبناء بدون تفاصيل مرهقة.</p>
                        </div>
                    </div>
                    <div className="print-hide flex flex-wrap gap-2">
                        <button
                            data-testid="parent-report-copy"
                            onClick={copyParentBriefSummary}
                            disabled={!parentBriefSummary}
                            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {copiedScopedSummary ? <CheckCircle size={16} /> : <Copy size={16} />}
                            {copiedScopedSummary ? 'تم النسخ' : 'نسخ الملخص'}
                        </button>
                        <button
                            data-testid="parent-report-share"
                            onClick={shareParentBriefSummary}
                            disabled={!parentBriefSummary}
                            className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-100 bg-white px-4 py-2 text-sm font-bold text-emerald-700 shadow-sm hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {sharedScopedSummary ? <CheckCircle size={16} /> : <Share2 size={16} />}
                            {sharedScopedSummary ? 'تمت المشاركة' : 'مشاركة'}
                        </button>
                        <button
                            data-testid="parent-report-pdf"
                            onClick={() => printElementAsPdf('reports-print-area', 'تقرير ولي الأمر')}
                            className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-100 bg-white px-4 py-2 text-sm font-bold text-emerald-700 shadow-sm hover:bg-emerald-50"
                        >
                            <Download size={16} />
                            تحميل PDF
                        </button>
                    </div>
                </header>

                {scopedAnalyticsLoading ? (
                    <Card className="p-8 text-center text-sm font-bold text-gray-500">
                        جارٍ تحميل تقرير الأبناء...
                    </Card>
                ) : !scopedAnalytics || scopedResults.length === 0 ? (
                    <Card className="p-10 text-center">
                        <PieChart size={42} className="mx-auto mb-4 text-gray-300" />
                        <h2 className="text-xl font-black text-gray-900">لا توجد نتائج بعد</h2>
                        <p className="mx-auto mt-2 max-w-xl text-sm leading-7 text-gray-500">
                            بعد أن يحل الطالب أول اختبار ستظهر هنا الدرجة، آخر محاولة، والمهارة التي تحتاج متابعة.
                        </p>
                    </Card>
                ) : (
                    <>
                        <Card className="overflow-hidden border border-emerald-100 bg-white p-6 shadow-sm">
                            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                                <div>
                                    <div className="mb-2 inline-flex rounded-full bg-emerald-50 px-3 py-1 text-sm font-bold text-emerald-700">الملخص السريع</div>
                                    <h2 className="text-2xl font-black text-gray-900">الأداء العام {averageScore}%</h2>
                                    <p className="mt-2 max-w-2xl text-sm leading-7 text-gray-600">
                                        {averageScore >= 80
                                            ? 'الأداء مطمئن. استمر في متابعة تدريب قصير أسبوعيًا.'
                                            : averageScore >= 60
                                                ? 'المستوى جيد، ويحتاج مراجعة هادئة للمهارات الأضعف.'
                                                : 'يحتاج الطالب متابعة قريبة، ابدأ بمهارة واحدة فقط حتى لا تزيد عليه الضغط.'}
                                    </p>
                                </div>
                                <div className="grid grid-cols-3 gap-3 text-center">
                                    <div className="rounded-2xl bg-emerald-50 p-4">
                                        <div className="text-2xl font-black text-emerald-700">{scopedAnalytics.scope.studentCount}</div>
                                        <div className="mt-1 text-xs font-bold text-emerald-700">أبناء</div>
                                    </div>
                                    <div className="rounded-2xl bg-indigo-50 p-4">
                                        <div className="text-2xl font-black text-indigo-700">{scopedAnalytics.scope.quizAttempts}</div>
                                        <div className="mt-1 text-xs font-bold text-indigo-700">محاولات</div>
                                    </div>
                                    <div className="rounded-2xl bg-amber-50 p-4">
                                        <div className="text-2xl font-black text-amber-700">{scopedAnalytics.weakestSkills.length}</div>
                                        <div className="mt-1 text-xs font-bold text-amber-700">مهارات</div>
                                    </div>
                                </div>
                            </div>
                        </Card>

                        <Card className="p-5 border-emerald-100 bg-white">
                            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                <div>
                                    <div className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
                                        ملخص ولي الأمر
                                    </div>
                                    <h2 className="mt-3 text-xl font-black text-gray-900">المتابعة اليوم</h2>
                                    <p className="mt-2 max-w-3xl text-sm leading-7 text-gray-600">
                                        {parentBriefSummary}
                                    </p>
                                </div>
                                <Link
                                    to="/book-session"
                                    className="print-hide inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-sm font-black text-white hover:bg-emerald-700"
                                >
                                    <Clock size={15} />
                                    حصة علاجية عند الحاجة
                                </Link>
                            </div>
                            <div className="mt-5 grid gap-3 md:grid-cols-3">
                                {parentActionItems.map((item) => (
                                    <div key={item.title} className={`rounded-2xl border p-4 ${item.tone}`}>
                                        <div className="text-xs font-black opacity-80">{item.title}</div>
                                        <p className="mt-2 text-sm font-bold leading-7">{item.body}</p>
                                    </div>
                                ))}
                            </div>
                            {parentSkillActions.length > 0 ? (
                                <div className="print-hide mt-4 grid gap-3 md:grid-cols-3">
                                    {parentSkillActions.map(({ title, body, link, Icon, className }) => (
                                        <Link
                                            key={title}
                                            to={link}
                                            className={`flex min-h-[88px] flex-col justify-between rounded-2xl border p-3 transition ${className}`}
                                        >
                                            <div className="flex items-center gap-2 text-sm font-black">
                                                <Icon size={17} />
                                                {title}
                                            </div>
                                            <div className="mt-2 text-xs font-bold leading-5 opacity-80">{body}</div>
                                        </Link>
                                    ))}
                                </div>
                            ) : null}
                            <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 p-3 text-sm font-bold leading-6 text-slate-600">
                                المهارات الظاهرة هنا مبنية على {scopedAnalytics.scope.minSkillEvidence || MIN_SKILL_EVIDENCE_COUNT} محاولات أو أكثر، والإشارات الأولية لا تُحسب ضعفًا مؤكدًا.
                            </div>
                        </Card>

                        <div className="grid gap-4 lg:grid-cols-3">
                            <Card className="p-5">
                                <div className="text-xs font-bold text-gray-500">آخر نتيجة</div>
                                <div className="mt-3 text-xl font-black text-gray-900">{displayText(latestResult?.quizTitle) || 'لا يوجد اختبار'}</div>
                                <div className="mt-2 text-sm text-gray-500">{displayText(latestResult?.studentName || latestResult?.studentEmail) || 'طالب مرتبط'}</div>
                                <div className={`mt-4 inline-flex rounded-2xl border px-4 py-3 text-2xl font-black ${scoreTone(Number(latestResult?.score) || 0)}`}>
                                    {Math.round(Number(latestResult?.score) || 0)}%
                                </div>
                            </Card>

                            <Card className="p-5">
                                <div className="text-xs font-bold text-gray-500">تقرير مهارة من الاختبارات</div>
                                <div className="mt-3 text-xl font-black text-gray-900">{displayText(weakSkill?.skill) || 'بانتظار بيانات المهارات'}</div>
                                <div className="mt-2 text-sm text-gray-500">{displayText(weakSkill?.section) || 'مهارة عامة'}</div>
                                <div className="mt-2 rounded-xl bg-slate-50 px-3 py-2 text-xs font-bold leading-5 text-slate-600">
                                    {weakSkill
                                        ? `ظهر الضعف من ${weakSkill.attempts} إجابات، ومتأثر به ${weakSkill.affectedStudents} طالب داخل حساب ولي الأمر.`
                                        : 'سيظهر هنا التحليل بعد محاولات اختبار كافية.'}
                                </div>
                                <div className="mt-4 rounded-full bg-gray-100 h-2 overflow-hidden">
                                    <div className="h-full rounded-full bg-amber-500" style={{ width: `${Math.max(0, Math.min(100, Number(weakSkill?.mastery) || 0))}%` }} />
                                </div>
                                <div className="mt-2 text-xs font-bold text-amber-700">الإتقان: {Math.round(Number(weakSkill?.mastery) || 0)}%</div>
                            </Card>

                            <Card className="p-5">
                                <div className="text-xs font-bold text-gray-500">المتابعة المقترحة</div>
                                <div className="mt-3 text-xl font-black text-gray-900">{displayText(leadStudent?.name) || 'كل الأبناء'}</div>
                                <p className="mt-3 text-sm leading-7 text-gray-600">شرح قصير ثم تدريب بسيط.</p>
                            </Card>
                        </div>

                        <Card className="p-5">
                            <div className="mb-4 flex items-center justify-between gap-3">
                                <div>
                                    <h2 className="text-lg font-black text-gray-900">آخر المحاولات</h2>
                                    <p className="mt-1 text-sm text-gray-500">قائمة مختصرة تكفي للمتابعة اليومية.</p>
                                </div>
                                <Link to="/dashboard?tab=parent-results" className="rounded-xl bg-emerald-50 px-4 py-2 text-sm font-black text-emerald-700 hover:bg-emerald-100">
                                    عرض النتائج
                                </Link>
                            </div>
                            <div className="space-y-3">
                                {scopedLatestResults.slice(0, 4).map((result) => (
                                    <div key={result.id || result._id || `${result.quizTitle}-${result.date}`} className="flex flex-col gap-2 rounded-2xl border border-gray-100 bg-gray-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                                        <div>
                                            <div className="font-black text-gray-900">{displayText(result.quizTitle)}</div>
                                            <div className="mt-1 text-xs font-bold text-gray-500">{displayText(result.studentName || result.studentEmail) || 'طالب مرتبط'} - {displayText(result.date || result.createdAt) || 'تاريخ غير محدد'}</div>
                                        </div>
                                        <div className={`self-start rounded-xl border px-3 py-2 text-lg font-black sm:self-auto ${scoreTone(Number(result.score) || 0)}`}>
                                            {Math.round(Number(result.score) || 0)}%
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    </>
                )}
            </div>
        );
    }

    return (
        <div id="reports-print-area" className="space-y-8 pb-20 animate-fade-in">
            {/* Header */}
            <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3 sm:gap-4">
                    <Link to="/dashboard" className="text-gray-500 hover:text-gray-700">
                        <ArrowRight size={24} />
                    </Link>
                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold text-gray-800 leading-tight">تقارير الأداء</h1>
                        <p className="text-sm text-gray-500">تحليل ذكي لمستواك بناءً على نتائج اختباراتك</p>
                    </div>
                </div>
                <div className="print-hide flex flex-wrap gap-2">
                    <button
                        data-testid="student-report-export-pdf"
                        onClick={() => printElementAsPdf('reports-print-area', 'تقرير الأداء')}
                        className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-indigo-100 bg-white px-3 py-2 text-xs font-black text-indigo-700 shadow-sm hover:bg-indigo-50 sm:text-sm"
                    >
                        <Download size={15} />
                        PDF
                    </button>
                    <button
                        data-testid="student-report-export-excel"
                        onClick={downloadPerformanceWorkbook}
                        className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-emerald-100 bg-white px-3 py-2 text-xs font-black text-emerald-700 shadow-sm hover:bg-emerald-50 sm:text-sm"
                    >
                        <FileText size={15} />
                        Excel
                    </button>
                    {isStudentView && hasStudentAnalytics ? (
                    <button
                        data-testid="student-report-depth-toggle"
                        onClick={() => setStudentReportDepth((current) => (current === 'simple' ? 'full' : 'simple'))}
                        className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 shadow-sm hover:bg-slate-50 sm:text-sm"
                    >
                        <Sparkles size={15} />
                        {isStudentReportFull ? 'ملخص' : 'تفاصيل'}
                    </button>
                    ) : null}
                </div>
            </header>

            {studentReportNextAction && isStudentView ? (
                <StudentNextActionStrip
                    title={studentReportNextAction.title}
                    description={studentReportNextAction.description}
                    primaryLabel={studentReportNextAction.primaryLabel}
                    primaryHref={studentReportNextAction.primaryHref}
                    secondaryLabel={studentReportNextAction.secondaryLabel}
                    secondaryHref={studentReportNextAction.secondaryHref}
                    tone={studentReportNextAction.tone}
                    icon={<Target size={18} className={studentReportNextAction.tone === 'rose' ? 'text-rose-600' : studentReportNextAction.tone === 'amber' ? 'text-amber-600' : 'text-indigo-600'} />}
                />
            ) : null}

            {(isStudentView ? hasStudentAnalytics : true) ? (
            <Card
                aria-label={isStudentView ? 'تقرير مبسط للطالب' : roleScopeTitle[user.role] || 'تقرير نطاق'}
                className={isStudentView ? 'p-6 border-0 shadow-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white overflow-hidden relative' : 'p-4 sm:p-6 border-0 shadow-sm bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white overflow-hidden relative'}
            >
                {!isStudentView ? (
                    <>
                        <div className="absolute -left-10 -top-10 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
                        <div className="absolute -bottom-12 right-10 h-40 w-40 rounded-full bg-indigo-400/20 blur-3xl" />
                    </>
                ) : (
                    <>
                        <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-10 rounded-full blur-3xl -mr-20 -mt-20"></div>
                        <div className="absolute bottom-0 left-0 w-40 h-40 bg-teal-300 opacity-20 rounded-full blur-2xl -ml-10 -mb-10"></div>
                    </>
                )}
                <div className={isStudentView ? 'relative z-10 flex flex-col gap-6 w-full' : 'relative z-10 grid gap-5 lg:grid-cols-[1.1fr_0.9fr] lg:items-center'}>
                    {!isStudentView && (
                    <div>
                        <div className={isStudentView ? 'mb-2 inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-black text-indigo-700' : 'mb-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-black text-indigo-100'}>
                            <Sparkles size={14} />
                            القرار السريع من التقرير
                        </div>
                        <h2 className={isStudentView ? 'text-lg font-black leading-7 text-gray-900 sm:text-xl' : 'text-2xl font-black leading-9'}>
                            {isStudentView ? 'ابدأ بخطوة واحدة واضحة اليوم' : 'ابدأ التدخل من أعلى نقطة تأثير'}
                        </h2>
                        <p className={isStudentView ? 'mt-1 max-w-3xl text-xs font-medium leading-relaxed text-gray-500 line-clamp-2' : 'mt-3 max-w-3xl text-sm leading-8 text-indigo-100'}>
                            {isStudentView
                                ? (studentFollowUpSummary || 'حل اختبارًا قصيرًا أولًا حتى نحدد المهارة التي تحتاج متابعة.')
                                : (scopedFollowUpSummary || 'بمجرد تحميل بيانات النطاق سيظهر هنا ملخص سريع للطالب أو المهارة التي تحتاج تدخلًا.')}
                        </p>
                        {isStudentView ? (
                            <p className="mt-1 text-xs font-black text-slate-400">
                                {studentPeriodLabel} - {studentReportDataCount} نتيجة أو إجابة مرصودة.
                            </p>
                        ) : null}
                        <div className="print-hide mt-3 flex flex-wrap gap-2">
                            {isStudentView ? (
                                <>
                                    <button
                                        onClick={copyStudentSummary}
                                        className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-black text-white hover:bg-indigo-700 sm:text-sm"
                                    >
                                        {copiedStudentSummary ? <CheckCircle size={16} /> : <Copy size={16} />}
                                        {copiedStudentSummary ? 'تم النسخ' : 'نسخ ملخص'}
                                    </button>
                                    <button
                                        onClick={shareStudentSummary}
                                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-50 sm:text-sm"
                                    >
                                        {sharedStudentSummary ? <CheckCircle size={16} /> : <Share2 size={16} />}
                                        {sharedStudentSummary ? 'تمت المشاركة' : 'مشاركة'}
                                    </button>
                                </>
                            ) : (
                                <>
                                    <button
                                        onClick={copyScopedSummary}
                                        disabled={!scopedFollowUpSummary}
                                        className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-black text-slate-900 hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        {copiedScopedSummary ? <CheckCircle size={15} /> : <Copy size={15} />}
                                        {copiedScopedSummary ? 'تم' : 'نسخ'}
                                    </button>
                                    <button
                                        onClick={shareScopedSummary}
                                        disabled={!scopedFollowUpSummary}
                                        className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-black text-white hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        {sharedScopedSummary ? <CheckCircle size={15} /> : <Share2 size={15} />}
                                        {sharedScopedSummary ? 'تم' : 'مشاركة'}
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                    )}
                    <div className={isStudentView ? 'flex w-full gap-3 sm:gap-4 flex-wrap sm:flex-nowrap' : 'grid gap-3 sm:grid-cols-3 lg:grid-cols-1'}>
                        <div className={isStudentView ? 'flex-1 rounded-2xl bg-white/10 border border-white/20 p-4 backdrop-blur-sm' : 'rounded-2xl border border-white/10 bg-white/10 p-3'}>
                            <div className={isStudentView ? 'text-xs font-bold text-teal-100' : 'text-xs font-bold text-indigo-100'}>أهم مؤشر</div>
                            <div className={isStudentView ? 'mt-2 text-3xl font-black text-white' : 'mt-2 text-xl font-black'}>
                                {isStudentView ? `${stats?.averageScore ?? 0}%` : `${scopedAnalytics?.scope.studentCount ?? 0} طالب`}
                            </div>
                            <div className={isStudentView ? 'mt-1 text-xs font-bold text-teal-100' : 'mt-1 text-xs font-bold text-indigo-100'}>
                                {isStudentView ? 'متوسط الأداء' : 'داخل نطاق المتابعة'}
                            </div>
                        </div>
                        <div className={isStudentView ? 'flex-[1.5] rounded-2xl bg-white/10 border border-white/20 p-4 backdrop-blur-sm' : 'rounded-2xl border border-white/10 bg-white/10 p-3'}>
                            <div className={isStudentView ? 'text-xs font-bold text-teal-100' : 'text-xs font-bold text-indigo-100'}>أولوية المراجعة الآن</div>
                            <div className={isStudentView ? 'mt-2 text-xl font-black leading-7 text-white' : 'mt-2 text-sm font-black leading-6'}>
                                {isStudentView
                                    ? displayText(weakestSkill?.skill) || 'ابدأ باختبار قصير'
                                    : displayText(scopedAnalytics?.weakestSkills?.[0]?.skill) || 'بانتظار بيانات المهارات'}
                            </div>
                        </div>
                        <div className={isStudentView ? 'flex-1 rounded-2xl bg-white/10 border border-white/20 p-4 backdrop-blur-sm' : 'rounded-2xl border border-white/10 bg-white/10 p-3'}>
                            <div className={isStudentView ? 'text-xs font-bold text-teal-100' : 'text-xs font-bold text-indigo-100'}>الخطوة التالية</div>
                            <div className={isStudentView ? 'mt-2 text-sm font-bold leading-6 text-emerald-50' : 'mt-2 text-sm font-bold leading-6'}>
                                {isStudentView ? 'شرح قصير ثم اختبار سريع' : 'تدخل موجه + اختبار متابعة'}
                            </div>
                        </div>
                    </div>
                </div>
            </Card>
            ) : null}

            {!isStudentView && (
                <Card className="p-4 border-0 shadow-sm bg-white">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between mb-4">
                        <div>
                            <h2 className="text-lg font-black text-gray-900 leading-tight">تقارير الدور</h2>
                            <p className="text-sm text-gray-500 mt-1">{roleScopeTitle[user.role] || 'نطاقك الحالي'}</p>
                        </div>
                        <div className="text-xs px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 font-bold">
                            {user.role === Role.ADMIN ? 'مدير' : user.role === Role.SUPERVISOR ? 'مشرف' : user.role === Role.TEACHER ? 'معلم' : 'ولي أمر'}
                        </div>
                    </div>
                    <div className="mb-4 flex flex-wrap items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setScopedReportMode('combined')}
                            className={`rounded-full px-3 py-1.5 text-xs font-black transition ${scopedReportMode === 'combined' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                        >
                            عرض كامل
                        </button>
                        <button
                            type="button"
                            onClick={() => setScopedReportMode('aggregated')}
                            className={`rounded-full px-3 py-1.5 text-xs font-black transition ${scopedReportMode === 'aggregated' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                        >
                            تقرير مجمّع
                        </button>
                        <button
                            type="button"
                            onClick={() => setScopedReportMode('individual')}
                            className={`rounded-full px-3 py-1.5 text-xs font-black transition ${scopedReportMode === 'individual' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                        >
                            تقرير مفرد
                        </button>
                        {scopedAvailableGroups.length > 0 ? (
                            <select
                                value={scopedGroupFilter}
                                onChange={(event) => setScopedGroupFilter(event.target.value)}
                                className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-black text-slate-700 focus:border-indigo-400 focus:outline-none"
                            >
                                <option value="all">كل المجموعات</option>
                                {scopedAvailableGroups.map((groupName) => (
                                    <option key={groupName} value={groupName}>{groupName}</option>
                                ))}
                            </select>
                        ) : null}
                    </div>

                    {scopedAnalyticsLoading ? (
                        <div className="text-sm text-gray-500">جارٍ تحميل التقارير المجمعة...</div>
                    ) : scopedAnalytics ? (
                        <div className="space-y-5">
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                                <div className="rounded-2xl bg-gray-50 p-3">
                                    <div className="text-xs text-gray-500 mb-1">الطلاب داخل النطاق</div>
                                    <div className="text-xl font-black text-gray-900">{scopedAnalytics.scope.studentCount}</div>
                                </div>
                                <div className="rounded-2xl bg-amber-50 p-3">
                                    <div className="text-xs text-amber-600 mb-1">المحاولات</div>
                                    <div className="text-xl font-black text-amber-700">{scopedAnalytics.scope.quizAttempts}</div>
                                </div>
                                <div className="rounded-2xl bg-rose-50 p-3">
                                    <div className="text-xs text-rose-600 mb-1">بحاجة متابعة</div>
                                    <div className="text-xl font-black text-rose-700">{scopedAnalytics.weakestStudents.length}</div>
                                </div>
                                <div className="rounded-2xl bg-purple-50 p-3">
                                    <div className="text-xs text-purple-600 mb-1">إجابات</div>
                                    <div className="text-xl font-black text-purple-700">{scopedAnalytics.scope.questionAttempts || 0}</div>
                                </div>
                            </div>
                            <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-xs font-bold leading-6 text-slate-600">
                                يتم عرض المهارات الضعيفة المؤكدة فقط بعد {scopedAnalytics.scope.minSkillEvidence || MIN_SKILL_EVIDENCE_COUNT} محاولات أو أكثر.
                                {scopedAnalytics.scope.earlyWeakSkillSignalCount ? ` توجد ${scopedAnalytics.scope.earlyWeakSkillSignalCount} إشارة أولية تحتاج قياسًا إضافيًا قبل الحكم.` : ''}
                            </div>

                            {user.role === Role.SUPERVISOR || user.role === Role.ADMIN || user.role === Role.TEACHER ? (
                                <div className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
                                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                                        <div>
                                            <div className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">
                                                مركز قرار المشرف
                                            </div>
                                            <h3 className="mt-2 text-lg font-black text-gray-900">ابدأ من فصل، طالب، مهارة</h3>
                                            <p className="mt-1 text-xs font-bold leading-6 text-gray-500">
                                                ملخص تنفيذي من نفس نتائج الاختبارات، ثم تدخل علاجي وقياس متابعة.
                                            </p>
                                        </div>
                                        <div className="print-hide flex flex-wrap gap-2">
                                            <button
                                                type="button"
                                                data-testid="staff-intervention-create"
                                                onClick={buildScopedSmartRemediation}
                                                disabled={scopedSmartRemediationLoading || !scopedAnalytics.weakestSkills.length}
                                                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-black text-white shadow-sm hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                                            >
                                                {scopedSmartRemediationLoading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                                                أنشئ تدخل علاجي
                                            </button>
                                            <button
                                                type="button"
                                                data-testid="staff-management-export"
                                                onClick={downloadPerformanceWorkbook}
                                                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-700 shadow-sm hover:bg-emerald-100"
                                            >
                                                <Download size={14} />
                                                تصدير الإدارة
                                            </button>
                                        </div>
                                    </div>
                                    {scopedInterventionPlanCreated || scopedInterventionPlanError ? (
                                        <div
                                            role="status"
                                            className={`mt-3 rounded-2xl border px-3 py-2 text-xs font-bold leading-6 ${
                                                scopedInterventionPlanCreated
                                                    ? 'border-emerald-100 bg-emerald-50 text-emerald-700'
                                                    : 'border-rose-100 bg-rose-50 text-rose-700'
                                            }`}
                                        >
                                            {scopedInterventionPlanCreated
                                                ? 'تم إنشاء خطة علاج داخل حساب الطالب المحدد، ويمكنه فتحها من صفحة خطتي.'
                                                : displayText(scopedInterventionPlanError)}
                                        </div>
                                    ) : null}
                                    <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                                        <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-3">
                                            <div className="text-xs font-black text-emerald-700">أفضل فصل</div>
                                            <div className="mt-2 text-base font-black leading-6 text-gray-900">
                                                {displayText(strongestScopedGroup?.groupName) || 'بانتظار نتائج الفصول'}
                                            </div>
                                            <div className="mt-1 text-xs font-bold text-emerald-700">
                                                {strongestScopedGroup ? `${strongestScopedGroup.averageScore}% - ${strongestScopedGroup.attempts} محاولة` : 'لا توجد محاولات كافية'}
                                            </div>
                                        </div>
                                        <div className="rounded-2xl border border-rose-100 bg-rose-50 p-3">
                                            <div className="text-xs font-black text-rose-700">أضعف فصل</div>
                                            <div className="mt-2 text-base font-black leading-6 text-gray-900">
                                                {displayText(weakestScopedGroup?.groupName) || 'بانتظار نتائج الفصول'}
                                            </div>
                                            <div className="mt-1 text-xs font-bold text-rose-700">
                                                {weakestScopedGroup ? `${weakestScopedGroup.weakStudentCount} طلاب متعثرون - ${weakestScopedGroup.averageScore}%` : 'لا توجد إشارة واضحة'}
                                            </div>
                                        </div>
                                        <div className="rounded-2xl border border-amber-100 bg-amber-50 p-3">
                                            <div className="text-xs font-black text-amber-700">طالب متعثر</div>
                                            <div className="mt-2 text-base font-black leading-6 text-gray-900">
                                                {displayText(scopedLeadStudent?.name) || 'لا يوجد طالب محدد'}
                                            </div>
                                            <div className="mt-1 text-xs font-bold text-amber-700">
                                                {scopedLeadStudent ? `${scopedLeadStudent.averageScore}% - ${scopedLeadStudent.weakSkillCount} مهارات` : 'المؤشرات مطمئنة حاليًا'}
                                            </div>
                                        </div>
                                        <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-3">
                                            <div className="text-xs font-black text-indigo-700">مهارة مشتركة ضعيفة</div>
                                            <div className="mt-2 text-base font-black leading-6 text-gray-900">
                                                {displayText(scopedLeadSkill?.skill) || 'بانتظار بيانات المهارات'}
                                            </div>
                                            <div className="mt-1 text-xs font-bold text-indigo-700">
                                                {scopedLeadSkill ? `${scopedLeadSkill.affectedStudents} طلاب - ${scopedLeadSkill.mastery}%` : 'اربط الاختبارات بالمهارات أولًا'}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="mt-3 rounded-2xl bg-slate-50 px-3 py-2 text-xs font-bold leading-6 text-slate-600">
                                        القرار المقترح: {scopedLeadSkill
                                            ? `تدخل قصير على ${displayText(scopedLeadSkill.skill)} ثم اختبار متابعة.`
                                            : scopedLeadStudent
                                                ? `ابدأ بمتابعة ${displayText(scopedLeadStudent.name)} ثم قياس قصير.`
                                                : 'وجّه اختبارًا تشخيصيًا قصيرًا حتى تظهر الأولويات.'}
                                    </div>
                                </div>
                            ) : null}

                            {institutionalReportHub ? (
                                <div className="rounded-3xl border border-indigo-100 bg-indigo-50/60 p-4">
                                    <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                                        <div className="min-w-0">
                                            <div className="inline-flex rounded-full bg-white px-3 py-1 text-xs font-black text-indigo-700">
                                                مركز متابعة مؤسسي
                                            </div>
                                            <h3 className="mt-2 text-lg font-black leading-7 text-gray-900">
                                                {institutionalReportHub.roleLabel}: خطوة تشغيل واضحة
                                            </h3>
                                            <p className="mt-1 text-sm font-bold leading-7 text-gray-600">
                                                {institutionalReportHub.nextAction}
                                            </p>
                                        </div>
                                        <div className="print-hide grid gap-2 sm:grid-cols-2 xl:min-w-[520px]">
                                            <Link
                                                to={institutionalReportHub.followUpLink}
                                                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-black text-white shadow-sm hover:bg-indigo-700"
                                            >
                                                <Target size={14} />
                                                توجيه اختبار
                                            </Link>
                                            <button
                                                type="button"
                                                onClick={copyInstitutionalAlert}
                                                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-white px-3 py-2 text-xs font-black text-emerald-700 shadow-sm hover:bg-emerald-50"
                                            >
                                                {copiedInstitutionalAlert ? <CheckCircle size={14} /> : <Copy size={14} />}
                                                {copiedInstitutionalAlert ? 'تم النسخ' : 'نسخ تنبيه'}
                                            </button>
                                            <button
                                                type="button"
                                                data-testid="staff-intervention-alert-send"
                                                onClick={() => void sendInterventionAlert()}
                                                disabled={!canSendInterventionAlert || interventionAlertSending}
                                                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-white px-3 py-2 text-xs font-black text-amber-700 shadow-sm hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-50"
                                            >
                                                {interventionAlertSending ? <Loader2 size={14} className="animate-spin" /> : interventionAlertSent ? <CheckCircle size={14} /> : <Bell size={14} />}
                                                {interventionAlertSending ? 'إرسال' : interventionAlertSent ? 'تم الإرسال' : 'إرسال تنبيه'}
                                            </button>
                                            <Link
                                                to={institutionalReportHub.studentsLink}
                                                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-white px-3 py-2 text-xs font-black text-slate-700 shadow-sm hover:bg-slate-50"
                                            >
                                                <FileText size={14} />
                                                إدارة النطاق
                                            </Link>
                                            <button
                                                type="button"
                                                data-testid="staff-students-export"
                                                onClick={downloadScopedStudentsWorkbook}
                                                disabled={!scopedStudentFocusCards.length}
                                                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-white px-3 py-2 text-xs font-black text-rose-700 shadow-sm hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
                                            >
                                                <Download size={14} />
                                                تصدير الطلاب
                                            </button>
                                        </div>
                                    </div>
                                    <div className="mt-3 grid gap-2 md:grid-cols-3">
                                        <div className="rounded-2xl bg-white/80 px-3 py-2 text-xs font-bold leading-6 text-slate-600">
                                            النطاق: {roleScopeTitle[user.role] || 'النطاق الحالي'}
                                        </div>
                                        <div className="rounded-2xl bg-white/80 px-3 py-2 text-xs font-bold leading-6 text-slate-600">
                                            الهدف: {institutionalReportHub.targetLine}
                                        </div>
                                        {interventionAlertError ? (
                                            <div role="alert" className="rounded-2xl border border-rose-100 bg-rose-50 px-3 py-2 text-xs font-bold leading-6 text-rose-700">
                                                {displayText(interventionAlertError)}
                                            </div>
                                        ) : null}
                                        <Link
                                            to={institutionalReportHub.alertLink}
                                            className="print-hide rounded-2xl bg-white/80 px-3 py-2 text-xs font-black leading-6 text-indigo-700 hover:bg-white"
                                        >
                                            فتح مركز التنبيهات
                                        </Link>
                                    </div>
                                </div>
                            ) : null}

                            {user.role === Role.SUPERVISOR || user.role === Role.ADMIN || user.role === Role.TEACHER ? (
                                <div className="rounded-3xl border border-emerald-100 bg-white p-4 shadow-sm">
                                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                        <div>
                                            <div className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
                                                تحليل اختبار موجه
                                            </div>
                                            <h3 className="mt-2 text-lg font-black text-gray-900">نتائج الطلاب والمهارات لنفس الاختبار</h3>
                                            <p className="mt-1 max-w-2xl text-xs font-bold leading-6 text-gray-500">
                                                مناسب عندما يوجه المشرف أو المدير اختبارًا لمجموعة طلاب ويريد تقريرًا سريعًا: متوسط الأداء، أضعف المهارات، والطلاب الذين يحتاجون متابعة.
                                            </p>
                                        </div>
                                        <div className="print-hide flex flex-wrap items-center gap-2">
                                            <select
                                                value={selectedFollowUpQuizId}
                                                onChange={(event) => setSelectedFollowUpQuizId(event.target.value)}
                                                className="max-w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 focus:border-emerald-400 focus:outline-none"
                                            >
                                                <option value="all">كل الاختبارات الموجهة</option>
                                                {directedFollowUpOptions.map((quiz) => (
                                                    <option key={quiz.id} value={quiz.id}>{displayText(quiz.title)}</option>
                                                ))}
                                            </select>
                                            <button
                                                type="button"
                                                data-testid="directed-quiz-analysis-export"
                                                onClick={downloadDirectedQuizAnalysisWorkbook}
                                                disabled={!directedQuizAnalysisResults.length}
                                                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-black text-white shadow-sm hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                                            >
                                                <Download size={14} />
                                                تصدير تحليل الاختبار
                                            </button>
                                        </div>
                                    </div>

                                    <div className="mt-4 grid gap-3 md:grid-cols-4">
                                        <div className="rounded-2xl bg-slate-50 p-3">
                                            <div className="text-xs font-bold text-slate-500">الاختبار</div>
                                            <div className="mt-2 text-sm font-black leading-6 text-slate-900">{directedQuizSummary.title}</div>
                                        </div>
                                        <div className="rounded-2xl bg-emerald-50 p-3">
                                            <div className="text-xs font-bold text-emerald-700">محاولات</div>
                                            <div className="mt-2 text-2xl font-black text-emerald-700">{directedQuizSummary.attempts}</div>
                                        </div>
                                        <div className="rounded-2xl bg-indigo-50 p-3">
                                            <div className="text-xs font-bold text-indigo-700">متوسط الأداء</div>
                                            <div className="mt-2 text-2xl font-black text-indigo-700">{directedQuizSummary.averageScore}%</div>
                                        </div>
                                        <div className="rounded-2xl bg-rose-50 p-3">
                                            <div className="text-xs font-bold text-rose-700">يحتاجون متابعة</div>
                                            <div className="mt-2 text-2xl font-black text-rose-700">{directedQuizSummary.needsFollowUp}</div>
                                        </div>
                                    </div>

                                    {directedQuizAnalysisResults.length > 0 ? (
                                        <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_1fr]">
                                            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
                                                <div className="mb-3 text-sm font-black text-gray-900">أضعف المهارات في الاختبار</div>
                                                <div className="space-y-2">
                                                    {directedQuizSkillAnalysis.slice(0, 5).map((skill) => (
                                                        <div key={skill.skill} className="rounded-xl bg-white p-3">
                                                            <div className="flex items-center justify-between gap-3">
                                                                <div className="min-w-0 text-sm font-black text-gray-900">{displayText(skill.skill)}</div>
                                                                <div className={`rounded-full px-2.5 py-1 text-xs font-black ${skill.mastery < 50 ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700'}`}>
                                                                    {skill.mastery}%
                                                                </div>
                                                            </div>
                                                            <div className="mt-2 text-xs font-bold text-gray-500">
                                                                {skill.affectedStudents} طالب متأثر - {skill.attempts} دليل من الإجابات
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
                                                <div className="mb-3 text-sm font-black text-gray-900">أول الطلاب للمتابعة</div>
                                                <div className="space-y-2">
                                                    {directedQuizStudentAnalysis.slice(0, 5).map(({ result, studentName, score, weakSkills }) => (
                                                        <div key={result.id || result._id || `${result.userId}-${result.date}`} className="rounded-xl bg-white p-3">
                                                            <div className="flex items-center justify-between gap-3">
                                                                <div className="min-w-0 text-sm font-black text-gray-900">{studentName}</div>
                                                                <div className={`rounded-full px-2.5 py-1 text-xs font-black ${score >= 75 ? 'bg-emerald-50 text-emerald-700' : score >= 50 ? 'bg-amber-50 text-amber-700' : 'bg-rose-50 text-rose-700'}`}>
                                                                    {score}%
                                                                </div>
                                                            </div>
                                                            <div className="mt-2 text-xs font-bold leading-5 text-gray-500">
                                                                {weakSkills.length
                                                                    ? `متابعة: ${weakSkills.map((skill) => `${displayText(skill.skill)} ${Number(skill.mastery || 0)}%`).join('، ')}`
                                                                    : 'لا توجد مهارة ضعيفة واضحة في هذه المحاولة.'}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm font-bold leading-7 text-slate-500">
                                            لا توجد محاولات مسجلة لهذا الاختبار الموجه داخل الفلتر الحالي بعد.
                                        </div>
                                    )}
                                </div>
                            ) : null}

                            <div className={`grid gap-4 ${showScopedAggregatedSections && showScopedIndividualSections ? 'xl:grid-cols-[1.25fr_0.95fr]' : 'xl:grid-cols-1'}`}>
                                {showScopedAggregatedSections ? (
                                <div className="rounded-3xl border border-indigo-100 bg-white p-4">
                                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                        <div>
                                            <div className="inline-flex rounded-full bg-indigo-50 px-3 py-1 text-xs font-black text-indigo-700">
                                                تقرير مهارات الاختبارات
                                            </div>
                                            <h3 className="mt-2 text-lg font-black text-gray-900">مهارات تحتاج دعم</h3>
                                            <p className="mt-1 text-xs font-bold leading-5 text-gray-500">
                                                مرتبة من نتائج الاختبارات داخل نطاق دورك فقط.
                                            </p>
                                        </div>
                                        <div className="print-hide flex flex-wrap items-center gap-2">
                                            <span className="rounded-full bg-slate-50 px-3 py-1 text-xs font-black text-slate-700">
                                                {scopedSkillReportCards.length} أولويات
                                            </span>
                                            <button
                                                type="button"
                                                onClick={downloadScopedSkillsWorkbook}
                                                disabled={!scopedSkillReportCards.length}
                                                className="inline-flex items-center gap-1.5 rounded-full bg-indigo-600 px-3 py-1.5 text-xs font-black text-white shadow-sm hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                                            >
                                                <Download size={13} />
                                                Excel
                                            </button>
                                        </div>
                                    </div>
                                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                                        {scopedSkillReportCards.length > 0 ? scopedSkillReportCards.map((skill) => (
                                            <div key={skill.skillId || skill.skill} className={`rounded-2xl border p-3 ${skill.tone.card}`}>
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="min-w-0">
                                                        <span className={`rounded-full bg-white px-3 py-1 text-[11px] font-black ${skill.tone.text}`}>
                                                            {skill.tone.label}
                                                        </span>
                                                        <div className="mt-2 text-base font-black leading-6 text-gray-900">{displayText(skill.skill)}</div>
                                                        <div className="mt-1 text-xs font-bold text-gray-500">{displayText(skill.section) || 'مهارة عامة'}</div>
                                                    </div>
                                                    <div className={`text-xl font-black ${skill.tone.text}`}>{skill.mastery}%</div>
                                                </div>
                                                <div className="mt-3 h-2 overflow-hidden rounded-full bg-white">
                                                    <div className={`h-full rounded-full ${skill.tone.bar}`} style={{ width: `${Math.max(0, Math.min(100, skill.mastery))}%` }} />
                                                </div>
                                                <div className="mt-2 grid grid-cols-2 gap-2 text-xs font-bold">
                                                    <div className="rounded-xl bg-white/80 px-3 py-1.5">طلاب: {skill.affectedStudents}</div>
                                                    <div className="rounded-xl bg-white/80 px-3 py-1.5">محاولات: {skill.attempts}</div>
                                                </div>
                                                <div className="mt-2 rounded-xl bg-white/80 px-3 py-2 text-xs font-bold leading-5 text-slate-600">
                                                    دليل الاختبار: الحكم يظهر بعد {skill.evidenceThreshold || MIN_SKILL_EVIDENCE_COUNT} محاولات أو أكثر، ثم يقترح اختبار متابعة على نفس المهارة.
                                                </div>
                                                <div className="print-hide mt-2 grid gap-2 sm:grid-cols-2">
                                                    <Link
                                                        to={skill.quizLink || '/quiz'}
                                                        className="rounded-xl bg-white px-3 py-2 text-center text-xs font-black text-amber-700 hover:bg-amber-50"
                                                    >
                                                        اختبار
                                                    </Link>
                                                    <Link
                                                        to={skill.lessonLink || buildSkillSessionLink({ skill: skill.skill, skillId: skill.skillId, sectionName: skill.section })}
                                                        className="rounded-xl bg-white px-3 py-2 text-center text-xs font-black text-indigo-700 hover:bg-indigo-50"
                                                    >
                                                        شرح
                                                    </Link>
                                                </div>
                                            </div>
                                        )) : (
                                            <div className="rounded-2xl border border-dashed border-gray-200 bg-slate-50 p-5 text-sm font-bold leading-7 text-gray-500 md:col-span-2">
                                                لا توجد مهارات ضعيفة مجمعة الآن.
                                            </div>
                                        )}
                                    </div>
                                </div>
                                ) : null}

                                {showScopedIndividualSections ? (
                                <div className="rounded-3xl border border-rose-100 bg-white p-4">
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <div className="inline-flex rounded-full bg-rose-50 px-3 py-1 text-xs font-black text-rose-700">
                                                تقرير الطلاب
                                            </div>
                                            <h3 className="mt-2 text-lg font-black text-gray-900">طلاب للمتابعة</h3>
                                        </div>
                                        <div className="print-hide flex flex-wrap items-center gap-2">
                                            <span className="rounded-full bg-slate-50 px-3 py-1 text-xs font-black text-slate-700">
                                                {scopedStudentFocusCards.length}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={downloadScopedStudentsWorkbook}
                                                disabled={!scopedStudentFocusCards.length}
                                                className="inline-flex items-center gap-1.5 rounded-full bg-rose-600 px-3 py-1.5 text-xs font-black text-white shadow-sm hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
                                            >
                                                <Download size={13} />
                                                Excel
                                            </button>
                                        </div>
                                    </div>
                                    <div className="mt-4 space-y-3">
                                        {scopedStudentFocusCards.length > 0 ? scopedStudentFocusCards.map((student) => (
                                            <div key={student.id} className="rounded-2xl border border-gray-100 bg-slate-50 p-3">
                                                <div className="flex items-center justify-between gap-3">
                                                    <div className="min-w-0">
                                                        <div className="font-black leading-7 text-gray-900">{displayText(student.name)}</div>
                                                        <div className="mt-1 text-xs font-bold text-gray-500">{student.attempts} محاولات - {student.weakSkillCount} مهارات</div>
                                                        {student.groupNames?.length ? (
                                                            <div className="mt-1 text-[11px] font-black text-indigo-600">
                                                                {student.groupNames.slice(0, 2).map((name) => displayText(name)).join('، ')}
                                                            </div>
                                                        ) : null}
                                                    </div>
                                                    <div className={`rounded-xl border px-3 py-1.5 text-base font-black ${student.tone}`}>
                                                        {student.averageScore}%
                                                    </div>
                                                </div>
                                                {student.topSkills.length > 0 ? (
                                                    <div className="mt-3 flex flex-wrap gap-2">
                                                        {student.topSkills.map((skill) => (
                                                            <span key={`${student.id}-${skill.skill}`} className="rounded-full bg-white px-3 py-1 text-[11px] font-black text-rose-700">
                                                                {displayText(skill.skill)} {skill.mastery}%
                                                            </span>
                                                        ))}
                                                    </div>
                                                ) : null}
                                                <div className="print-hide mt-2 flex flex-wrap gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => navigator.clipboard.writeText([
                                                            `الطالب: ${displayText(student.name)}`,
                                                            `المتوسط: ${student.averageScore}%`,
                                                            student.topSkills.length ? `المهارات: ${student.topSkills.map((skill) => `${displayText(skill.skill)} ${skill.mastery}%`).join('، ')}` : '',
                                                            'الخطوة: شرح قصير ثم تدريب موجه ثم قياس.'
                                                        ].filter(Boolean).join('\n')).catch(() => undefined)}
                                                        className="rounded-full bg-white px-3 py-1.5 text-xs font-black text-indigo-700 hover:bg-indigo-50"
                                                    >
                                                        نسخ
                                                    </button>
                                                    <Link to={student.followUpLink} className="rounded-full bg-indigo-600 px-3 py-1.5 text-xs font-black text-white hover:bg-indigo-700">
                                                        توجيه اختبار
                                                    </Link>
                                                </div>
                                            </div>
                                        )) : (
                                            <div className="rounded-2xl border border-dashed border-gray-200 bg-slate-50 p-5 text-sm font-bold leading-7 text-gray-500">
                                                لا يوجد طالب يحتاج متابعة واضحة الآن.
                                            </div>
                                        )}
                                    </div>
                                </div>
                                ) : null}
                            </div>

                            {showScopedAggregatedSections ? (
                                <div data-testid="staff-comparison-report" className="mt-4 grid gap-4 xl:grid-cols-2">
                                    <div className="rounded-3xl border border-slate-100 bg-white p-4">
                                        <div className="mb-3 flex items-center justify-between gap-3">
                                            <div>
                                                <div className="text-xs font-black text-indigo-700">مقارنة الفصول</div>
                                                <h3 className="mt-1 text-lg font-black text-gray-900">أداء الفصول داخل النطاق</h3>
                                            </div>
                                            <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-black text-indigo-700">{scopedGroupPerformanceRows.length}</span>
                                        </div>
                                        <div className="overflow-x-auto">
                                            <table className="w-full min-w-[520px] text-right text-xs">
                                                <thead className="border-b border-slate-100 text-slate-500">
                                                    <tr><th className="px-2 py-2">الفصل</th><th className="px-2 py-2">المتوسط</th><th className="px-2 py-2">الطلاب الضعاف</th><th className="px-2 py-2">المحاولات</th></tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100">
                                                    {scopedGroupPerformanceRows.map((group) => (
                                                        <tr key={group.groupName}>
                                                            <td className="px-2 py-2 font-black text-gray-900">{displayText(group.groupName)}</td>
                                                            <td className="px-2 py-2 font-black text-indigo-700">{group.averageScore}%</td>
                                                            <td className="px-2 py-2 font-bold text-rose-700">{group.weakStudentCount}</td>
                                                            <td className="px-2 py-2 font-bold text-gray-600">{group.attempts}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                        {!scopedGroupPerformanceRows.length ? <div className="pt-3 text-xs font-bold text-gray-500">لا توجد نتائج كافية للمقارنة بعد.</div> : null}
                                    </div>
                                    <div className="rounded-3xl border border-slate-100 bg-white p-4">
                                        <div className="mb-3 flex items-center justify-between gap-3">
                                            <div>
                                                <div className="text-xs font-black text-emerald-700">مقارنة المعلمين</div>
                                                <h3 className="mt-1 text-lg font-black text-gray-900">أداء المعلمين المرتبطين</h3>
                                            </div>
                                            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">{scopedTeacherPerformanceRows.length}</span>
                                        </div>
                                        <div className="overflow-x-auto">
                                            <table className="w-full min-w-[520px] text-right text-xs">
                                                <thead className="border-b border-slate-100 text-slate-500">
                                                    <tr><th className="px-2 py-2">المعلم</th><th className="px-2 py-2">الفصول</th><th className="px-2 py-2">المتوسط</th><th className="px-2 py-2">الضعاف</th></tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100">
                                                    {scopedTeacherPerformanceRows.map((teacher) => (
                                                        <tr key={teacher.id}>
                                                            <td className="px-2 py-2 font-black text-gray-900">{displayText(teacher.name)}</td>
                                                            <td className="px-2 py-2 font-bold text-gray-600">{teacher.groupCount}</td>
                                                            <td className="px-2 py-2 font-black text-emerald-700">{teacher.averageScore}%</td>
                                                            <td className="px-2 py-2 font-bold text-rose-700">{teacher.weakStudentCount}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                        {!scopedTeacherPerformanceRows.length ? <div className="pt-3 text-xs font-bold text-gray-500">لا توجد نتائج معلم مرتبطة بفصول هذا النطاق بعد.</div> : null}
                                    </div>
                                </div>
                            ) : null}

                            <div className="rounded-3xl border border-gray-100 bg-slate-50/70 p-4">
                                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between mb-3">
                                    <div>
                                        <div className="text-lg font-black text-gray-900">خطة تدخل مختصرة</div>
                                        <p className="text-sm leading-6 text-gray-500">تشخيص، تدخل، ثم قياس.</p>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        <button
                                            onClick={copyScopedSummary}
                                            className="print-hide inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-black text-indigo-700 hover:bg-indigo-50"
                                        >
                                            {copiedScopedSummary ? <CheckCircle size={13} /> : <Copy size={13} />}
                                            {copiedScopedSummary ? 'تم' : 'نسخ'}
                                        </button>
                                        <button
                                            onClick={shareScopedSummary}
                                            className="print-hide inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-black text-emerald-700 hover:bg-emerald-50"
                                        >
                                            {sharedScopedSummary ? <CheckCircle size={13} /> : <Share2 size={13} />}
                                            {sharedScopedSummary ? 'تم' : 'مشاركة'}
                                        </button>
                                        <button
                                            onClick={buildScopedSmartRemediation}
                                            disabled={scopedSmartRemediationLoading || !scopedAnalytics.weakestSkills.length}
                                            className="print-hide inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-800 hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-60"
                                        >
                                            {scopedSmartRemediationLoading ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
                                            {scopedSmartRemediationLoading ? 'تجهيز' : 'اقتراح'}
                                        </button>
                                    </div>
                                </div>
                                {scopedFollowUpSummary ? (
                                    <div className="mb-3 rounded-2xl border border-white bg-white/70 p-3 text-xs font-bold leading-6 text-slate-600">
                                        {scopedFollowUpSummary}
                                    </div>
                                ) : null}
                                <div className="mb-3 grid gap-3 lg:grid-cols-3">
                                    <div className="rounded-2xl border border-rose-100 bg-white p-3">
                                        <div className="text-xs font-black text-rose-600">أولوية الطالب</div>
                                        <div className="mt-2 text-base font-black leading-6 text-gray-900">
                                            {displayText(scopedLeadStudent?.name) || 'بانتظار ظهور طالب يحتاج متابعة'}
                                        </div>
                                        <p className="mt-2 text-xs font-bold leading-6 text-gray-600">
                                            {scopedLeadStudent
                                                ? `${scopedLeadStudent.averageScore}% - ${scopedLeadStudent.weakSkillCount} مهارات`
                                                : 'تظهر بعد توفر بيانات كافية.'}
                                        </p>
                                        {scopedLeadStudent ? (
                                            <div className="print-hide mt-2 flex flex-wrap gap-2">
                                                <button
                                                    onClick={() => navigator.clipboard.writeText(scopedLeadStudentSummary).catch(() => undefined)}
                                                    className="rounded-full bg-rose-50 px-3 py-1.5 text-xs font-black text-rose-700 hover:bg-rose-100"
                                                >
                                                    نسخ
                                                </button>
                                                <Link to="/dashboard?tab=reports" className="rounded-full bg-gray-100 px-3 py-1.5 text-xs font-black text-gray-700 hover:bg-gray-200">
                                                    تقرير
                                                </Link>
                                            </div>
                                        ) : null}
                                    </div>
                                    <div className="rounded-2xl border border-amber-100 bg-white p-3">
                                        <div className="text-xs font-black text-amber-600">أولوية المهارة</div>
                                        <div className="mt-2 text-base font-black leading-6 text-gray-900">
                                            {displayText(scopedLeadSkill?.skill) || 'بانتظار بيانات المهارات'}
                                        </div>
                                        <p className="mt-2 text-xs font-bold leading-6 text-gray-600">
                                            {scopedLeadSkill
                                                ? `${scopedLeadSkill.affectedStudents} طلاب - ${scopedLeadSkill.mastery}%`
                                                : 'تظهر بعد تراكم النتائج.'}
                                        </p>
                                        {scopedLeadSkill ? (
                                            <div className="print-hide mt-2 flex flex-wrap gap-2">
                                                <Link to="/quiz" className="rounded-full bg-amber-50 px-3 py-1.5 text-xs font-black text-amber-700 hover:bg-amber-100">
                                                    اختبار
                                                </Link>
                                                <Link to={buildSkillSessionLink({ skill: scopedLeadSkill.skill, skillId: scopedLeadSkill.skillId, sectionName: scopedLeadSkill.section })} className="rounded-full bg-gray-100 px-3 py-1.5 text-xs font-black text-gray-700 hover:bg-gray-200">
                                                    شرح
                                                </Link>
                                            </div>
                                        ) : null}
                                    </div>
                                    <div className="rounded-2xl border border-indigo-100 bg-white p-3">
                                        <div className="text-xs font-black text-indigo-600">أولوية المادة</div>
                                        <div className="mt-2 text-base font-black leading-6 text-gray-900">
                                            {displayText(scopedLeadSubject?.subjectName) || 'بانتظار توزيع المواد'}
                                        </div>
                                        <p className="mt-2 text-xs font-bold leading-6 text-gray-600">
                                            {scopedLeadSubject
                                                ? `${scopedLeadSubject.weakStudents} طلاب - ${scopedLeadSubject.mastery}%`
                                                : 'تظهر عند وجود فرق واضح.'}
                                        </p>
                                        {scopedLeadSubject ? (
                                            <div className="mt-2 rounded-xl bg-indigo-50 px-3 py-2 text-xs font-bold leading-6 text-indigo-700">
                                                تدريب قصير ثم قياس.
                                            </div>
                                        ) : null}
                                    </div>
                                </div>
                                <div className="grid gap-3 lg:grid-cols-3">
                                    {scopedInterventionPlan.map((item) => (
                                        <div key={item.title} className={`rounded-2xl border p-3 ${item.className}`}>
                                            <div className="text-xs font-black opacity-70">{item.title}</div>
                                            <div className="mt-2 text-sm font-black leading-6">{item.label}</div>
                                            <p className="mt-1 text-xs font-bold leading-6">{item.body}</p>
                                        </div>
                                    ))}
                                </div>
                                {scopedSmartRemediation ? (
                                    <div className="mt-4 rounded-3xl border border-amber-100 bg-white/80 p-4">
                                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                            <div>
                                                <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-amber-700">
                                                    <Sparkles size={14} />
                                                    خطة ذكية قابلة للتنفيذ
                                                </div>
                                                <div className="text-base font-black text-gray-900">{displayText(scopedSmartRemediation.title) || 'خطة تدخل للنطاق الحالي'}</div>
                                                <p className="mt-2 text-xs font-bold leading-6 text-gray-600">
                                                    {displayText(scopedSmartRemediation.summary) || 'ابدأ بالمهارة الأكثر ضعفًا، ثم أنشئ متابعة قصيرة وقابلة للقياس.'}
                                                </p>
                                            </div>
                                            <Link to="/quiz" className="self-start rounded-xl bg-slate-900 px-3 py-2 text-xs font-black text-white hover:bg-slate-800">
                                                اختبار متابعة
                                            </Link>
                                        </div>
                                        <div className="mt-3 grid gap-3 lg:grid-cols-3">
                                            {(scopedSmartRemediation.steps || []).slice(0, 3).map((step, index) => (
                                                <div key={`${step.day || index}-${step.skill || index}`} className="rounded-2xl border border-gray-100 bg-slate-50 p-3">
                                                    <div className="rounded-full bg-white px-3 py-1 text-xs font-black text-indigo-700 inline-flex">
                                                        {displayText(step.day) || `خطوة ${index + 1}`}
                                                    </div>
                                                    <div className="mt-2 font-black leading-6 text-gray-900">{displayText(step.skill) || 'مهارة تحتاج متابعة'}</div>
                                                    <p className="mt-1 text-xs font-bold leading-6 text-gray-600">{displayText(step.action) || 'وجّه نشاطًا علاجيًا قصيرًا.'}</p>
                                                    <div className="mt-2 text-xs font-bold leading-6 text-gray-500">
                                                        قياس: {displayText(step.check) || 'اختبار قصير.'}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        {scopedSmartRemediation.parentNote ? (
                                            <div className="mt-3 rounded-2xl bg-emerald-50 px-4 py-3 text-xs font-bold leading-6 text-emerald-800">
                                                متابعة: {displayText(scopedSmartRemediation.parentNote)}
                                            </div>
                                        ) : null}
                                    </div>
                                ) : null}
                            </div>

                            {showScopedIndividualSections ? (
                            <div className="rounded-3xl border border-gray-100 bg-white p-4">
                                <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                    <div>
                                        <div className="text-lg font-black text-gray-900">محاولات حديثة</div>
                                    </div>
                                    <span className="self-start rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">
                                        {scopedLatestResults.length} محاولة حديثة
                                    </span>
                                </div>
                                {scopedLatestResults.length > 0 ? (
                                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                                        {scopedLatestResults.map((result, index) => {
                                            const resultId = String(result.id || result._id || `${result.userId || 'student'}-${index}`);
                                            const weakSkills = (result.skillsAnalysis || [])
                                                .filter((skill) => Number(skill.mastery ?? 100) < 75)
                                                .slice(0, 2);
                                            const primaryWeakSkill = weakSkills[0];
                                            const resolvedAttemptSkill = primaryWeakSkill?.skill
                                                ? skills.find((skill) => displayText(skill.name) === displayText(primaryWeakSkill.skill))
                                                : undefined;
                                            const attemptStudent = result.userId
                                                ? scopedAnalytics.weakestStudents.find((student) => student.id === result.userId)
                                                : undefined;
                                            const attemptFollowUpLink = buildDirectedQuizManagerLink({
                                                pathId: resolvedAttemptSkill?.pathId,
                                                subjectId: resolvedAttemptSkill?.subjectId,
                                                sectionId: resolvedAttemptSkill?.sectionId,
                                                skillId: resolvedAttemptSkill?.id,
                                                targetUserId: result.userId || attemptStudent?.id,
                                                targetGroupId: attemptStudent?.groupIds?.[0],
                                            });
                                            const resultDate = result.date || result.createdAt;

                                            return (
                                                <div key={resultId} className="rounded-2xl border border-gray-100 bg-slate-50 p-3">
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div className="min-w-0">
                                                            <div className="text-xs font-bold text-gray-500">{displayText(result.studentName) || 'طالب'}</div>
                                                            <div className="mt-1 font-black leading-6 text-gray-900">{displayText(result.quizTitle) || 'اختبار'}</div>
                                                        </div>
                                                        <div className={`rounded-full px-3 py-1 text-sm font-black ${Number(result.score || 0) >= 75 ? 'bg-emerald-50 text-emerald-700' : Number(result.score || 0) >= 50 ? 'bg-amber-50 text-amber-700' : 'bg-rose-50 text-rose-700'}`}>
                                                            {Number(result.score || 0)}%
                                                        </div>
                                                    </div>
                                                    <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                                                        <div className="rounded-xl bg-white px-3 py-1.5">
                                                            <div className="font-bold text-gray-500">صحيح</div>
                                                            <div className="mt-1 font-black text-gray-900">{Number(result.correctAnswers || 0)}</div>
                                                        </div>
                                                        <div className="rounded-xl bg-white px-3 py-1.5">
                                                            <div className="font-bold text-gray-500">الأسئلة</div>
                                                            <div className="mt-1 font-black text-gray-900">{Number(result.totalQuestions || 0)}</div>
                                                        </div>
                                                    </div>
                                                    {weakSkills.length ? (
                                                        <>
                                                            <div className="mt-2 text-xs font-bold leading-6 text-rose-700">
                                                                متابعة: {weakSkills.map((skill) => `${displayText(skill.skill) || 'مهارة'} (${Number(skill.mastery || 0)}%)`).join('، ')}
                                                            </div>
                                                            <Link
                                                                to={attemptFollowUpLink}
                                                                className="print-hide mt-2 inline-flex rounded-full bg-indigo-600 px-3 py-1.5 text-xs font-black text-white hover:bg-indigo-700"
                                                            >
                                                                اختبار متابعة
                                                            </Link>
                                                        </>
                                                    ) : (
                                                        <div className="mt-2 text-xs font-bold leading-6 text-emerald-700">لا توجد أولوية واضحة.</div>
                                                    )}
                                                    {resultDate ? (
                                                        <div className="mt-2 text-[11px] font-bold text-gray-400">
                                                            {new Date(resultDate).toLocaleDateString('ar-SA')}
                                                        </div>
                                                    ) : null}
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="rounded-2xl border border-dashed border-gray-200 bg-slate-50 p-4 text-sm leading-7 text-gray-500">
                                        لا توجد محاولات حديثة داخل هذا النطاق بعد. بعد أول اختبار للطالب ستظهر المحاولة هنا مباشرة للمشرف أو ولي الأمر المرتبط.
                                    </div>
                                )}
                            </div>
                            ) : null}

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                <div className="space-y-3">
                                    <div className="font-black text-gray-900">مواد تحتاج تدخل</div>
                                    {scopedAnalytics.subjectSummaries.length > 0 ? scopedAnalytics.subjectSummaries.slice(0, 6).map((subject) => (
                                        <div key={subject.subjectId || subject.subjectName} className="border border-gray-100 rounded-xl p-3 bg-gray-50/50 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                            <div>
                                                <div className="font-bold text-gray-900">{displayText(subject.subjectName)}</div>
                                                <div className="text-xs text-gray-500">طلاب ضعفاء: {subject.weakStudents}</div>
                                                <div className="mt-1 text-xs font-bold text-indigo-600">تدريب قصير ثم قياس.</div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <div className={`text-lg font-black ${subject.mastery < 50 ? 'text-rose-600' : 'text-amber-600'}`}>{subject.mastery}%</div>
                                                <Link
                                                    to={buildDirectedQuizManagerLink({
                                                        subjectId: subject.subjectId,
                                                        targetUserId: scopedLeadStudent?.id,
                                                        targetGroupId: scopedLeadStudent?.groupIds?.[0],
                                                    })}
                                                    className="print-hide rounded-full bg-indigo-600 px-3 py-1.5 text-xs font-black text-white hover:bg-indigo-700"
                                                >
                                                    توجيه اختبار
                                                </Link>
                                            </div>
                                        </div>
                                    )) : (
                                        <div className="border border-dashed border-gray-200 rounded-xl p-4 text-sm text-gray-500">لا توجد مواد تحتاج تدخلًا ظاهرًا الآن.</div>
                                    )}
                                </div>

                                <div className="space-y-3">
                                    <div className="font-black text-gray-900">اختبارات موجهة</div>
                                    {scopedAnalytics.assignedFollowUps.length > 0 ? scopedAnalytics.assignedFollowUps.slice(0, 5).map((quiz) => {
                                        const targetUserCount = quiz.targetUserIds?.length || 0;
                                        const targetGroupCount = quiz.targetGroupIds?.length || 0;
                                        const targetLabel = targetUserCount > 0 || targetGroupCount > 0
                                            ? `${targetUserCount ? `${targetUserCount} طالب` : ''}${targetUserCount && targetGroupCount ? ' - ' : ''}${targetGroupCount ? `${targetGroupCount} مجموعة` : ''}`
                                            : 'النطاق الحالي';

                                        return (
                                            <div key={quiz.id} className="border border-gray-100 rounded-xl p-3 bg-white flex items-center justify-between gap-3">
                                                <div>
                                                    <div className="font-bold text-gray-900">{displayText(quiz.title)}</div>
                                                    <div className="text-xs text-gray-500">
                                                        {quiz.mode === 'central' ? 'اختبار مركزي موجه' : 'اختبار ساهر جاهز'}
                                                        {quiz.dueDate ? ` - حتى ${new Date(quiz.dueDate).toLocaleDateString('ar-SA')}` : ''}
                                                    </div>
                                                    <div className="mt-1 inline-flex rounded-full bg-indigo-50 px-2.5 py-1 text-[11px] font-black text-indigo-700">
                                                        موجه إلى: {targetLabel}
                                                    </div>
                                                </div>
                                                <Link to={`/quiz/${quiz.id}`} className="px-3 py-1.5 rounded-lg bg-gray-900 text-white text-xs font-black hover:bg-gray-800">
                                                    فتح
                                                </Link>
                                            </div>
                                        );
                                    }) : (
                                        <div className="border border-dashed border-gray-200 rounded-xl p-4 text-sm text-gray-500">لا توجد اختبارات متابعة موجهة داخل هذا النطاق حاليًا.</div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="rounded-3xl border border-indigo-100 bg-indigo-50/60 p-4">
                                <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                                    <div>
                                        <div className="inline-flex rounded-full bg-white px-3 py-1 text-xs font-black text-indigo-700">
                                            مركز متابعة مؤسسي
                                        </div>
                                        <h3 className="mt-2 text-lg font-black leading-7 text-gray-900">ابدأ بقياس تشخيصي قصير</h3>
                                        <p className="mt-1 text-sm font-bold leading-7 text-gray-600">
                                            لا توجد بيانات مجمعة كافية بعد. وجّه اختبارًا قصيرًا للمسار أو المجموعة، ثم ستظهر تقارير الطلاب والمهارات تلقائيًا.
                                        </p>
                                    </div>
                                    <div className="print-hide grid gap-2 sm:grid-cols-2 xl:min-w-[520px]">
                                        <Link
                                            to={buildDirectedQuizManagerLink()}
                                            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-black text-white shadow-sm hover:bg-indigo-700"
                                        >
                                            <Target size={14} />
                                            توجيه اختبار
                                        </Link>
                                        <button
                                            type="button"
                                            onClick={() => navigator.clipboard.writeText('تنبيه متابعة من منصة المئة: نرجو حل الاختبار التشخيصي القصير حتى يظهر تقرير المهارات وخطة المتابعة.').catch(() => undefined)}
                                            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-white px-3 py-2 text-xs font-black text-emerald-700 shadow-sm hover:bg-emerald-50"
                                        >
                                            <Copy size={14} />
                                            نسخ تنبيه
                                        </button>
                                        <Link
                                            to={user.role === Role.ADMIN ? '/admin-dashboard?tab=users' : user.role === Role.SUPERVISOR ? '/admin-dashboard?tab=schools' : '/admin-dashboard?tab=quizzes'}
                                            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-white px-3 py-2 text-xs font-black text-slate-700 shadow-sm hover:bg-slate-50"
                                        >
                                            <FileText size={14} />
                                            إدارة النطاق
                                        </Link>
                                        <Link
                                            to={user.role === Role.ADMIN ? '/admin-dashboard?tab=notifications' : '/reports'}
                                            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-white px-3 py-2 text-xs font-black text-amber-700 shadow-sm hover:bg-amber-50"
                                        >
                                            <Share2 size={14} />
                                            فتح التنبيهات
                                        </Link>
                                    </div>
                                </div>
                            </div>
                            <div className="border border-dashed border-gray-200 rounded-xl p-4 text-sm text-gray-500">
                                لا توجد بيانات مجمعة كافية لهذا الدور حتى الآن. إن كان الدور ولي أمر، اربطه أولًا بالطلاب من إدارة المستخدمين.
                            </div>
                        </div>
                    )}
                </Card>
            )}

            {isStudentView && hasStudentAnalytics && (
            <>
            <Card className={`p-3 sm:p-4 border shadow-sm ${hasStudentTrackScope ? 'border-emerald-100 bg-emerald-50/70' : 'border-amber-100 bg-amber-50/80'}`}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <div className={`text-xs font-black ${hasStudentTrackScope ? 'text-emerald-700' : 'text-amber-700'}`}>
                            {hasStudentTrackScope ? 'تقاريرك مرتبة حسب مسارك' : 'اختر مسارك أولًا'}
                        </div>
                        <p className="mt-1 text-sm font-bold leading-6 text-gray-700">
                            {hasStudentTrackScope
                                ? `نركز الآن على: ${studentTrackLabel}.`
                                : 'عند اختيار المسار ستظهر لك الاختبارات والتقارير المناسبة مثل نافس أو القدرات أو التحصيلي.'}
                        </p>
                        <p className="mt-1 text-xs font-bold leading-5 text-gray-500">
                            القياس مبني على {studentEvidenceSummary.totalQuestions} سؤال عبر {studentEvidenceSummary.uniqueSkills} مهارة.
                        </p>
                        {studentReportPathOptions.length > 0 ? (
                            <select
                                value={selectedStudentPathId}
                                onChange={(event) => setSelectedStudentPathId(event.target.value)}
                                className="print-hide mt-3 w-full rounded-xl border border-white/70 bg-white px-3 py-2 text-sm font-black text-gray-700 sm:max-w-xs"
                            >
                                <option value="all">كل مساراتي</option>
                                {studentReportPathOptions.map((path) => (
                                    <option key={path.id} value={path.id}>{displayText(path.name)}</option>
                                ))}
                            </select>
                        ) : null}
                    </div>
                    <Link
                        to="/dashboard?tab=paths"
                        className={`print-hide inline-flex items-center justify-center rounded-xl px-3 py-2 text-xs font-black sm:text-sm ${hasStudentTrackScope ? 'bg-white text-emerald-700 hover:bg-emerald-100' : 'bg-amber-500 text-white hover:bg-amber-600'}`}
                    >
                        {hasStudentTrackScope ? 'إدارة المسارات' : 'اختيار المسار'}
                    </Link>
                </div>
            </Card>

            {studentReadinessDecision ? (
                <Card
                    className={`p-3 sm:p-4 border shadow-sm ${studentReadinessDecision.cardClass}`}
                    data-testid="student-readiness-decision"
                >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                                <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-black ${studentReadinessDecision.badgeClass}`}>
                                    <studentReadinessDecision.Icon size={13} />
                                    {studentReadinessDecision.badge}
                                </span>
                                <span className="rounded-full bg-white/80 px-3 py-1 text-[11px] font-black text-slate-600 ring-1 ring-white">
                                    {studentReadinessDecision.evidence}
                                </span>
                            </div>
                            <h2 className={`mt-2 text-base font-black leading-7 sm:text-lg ${studentReadinessDecision.textClass}`}>
                                {studentReadinessDecision.title}
                            </h2>
                            <p className="mt-1 text-xs font-bold leading-6 text-slate-600 sm:text-sm">
                                {studentReadinessDecision.body}
                            </p>
                        </div>
                        <Link
                            to={studentReadinessDecision.actionHref}
                            className="print-hide inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-white px-3 py-2 text-xs font-black text-slate-800 shadow-sm ring-1 ring-white/80 hover:bg-slate-50 sm:text-sm"
                            data-testid="student-readiness-decision-action"
                        >
                            {studentReadinessDecision.actionLabel}
                            <ChevronLeft size={15} />
                        </Link>
                    </div>
                </Card>
            ) : null}

            {studentAdaptiveLearningBridge && isStudentReportFull ? (
                <Card className="p-4 sm:p-5 border border-violet-100 bg-white shadow-sm">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div className="min-w-0">
                            <div className="inline-flex rounded-full bg-violet-50 px-3 py-1 text-xs font-black text-violet-700">
                                إعادة التعلم والتعلم التكيفي
                            </div>
                            <h2 className="mt-3 text-xl font-black leading-8 text-gray-900">
                                مسار ذكي لمهارة: {studentAdaptiveLearningBridge.skillName || 'المهارة الأضعف'}
                            </h2>
                            <p className="mt-2 max-w-3xl text-sm font-bold leading-7 text-gray-600">
                                {studentAdaptiveLearningBridge.evidenceLine} اتبع الترتيب: إعادة تعلم قصيرة، تدريب تكيفي، ثم قياس جديد داخل المسار الذكي.
                            </p>
                        </div>
                        <div className="print-hide grid gap-2 sm:grid-cols-2 lg:min-w-[640px] xl:grid-cols-4">
                            <Link
                                to={studentAdaptiveLearningBridge.relearnLink}
                                className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-violet-100 bg-violet-50 px-3 py-2 text-xs font-black text-violet-700 hover:bg-violet-100 sm:text-sm"
                            >
                                <BookOpen size={15} />
                                إعادة التعلم
                            </Link>
                            <Link
                                to={studentAdaptiveLearningBridge.adaptiveTrainingLink}
                                className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-xs font-black text-amber-700 hover:bg-amber-100 sm:text-sm"
                            >
                                <FileText size={15} />
                                تدريب تكيفي
                            </Link>
                            <Link
                                to={studentAdaptiveLearningBridge.smartPathLink}
                                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-black text-white hover:bg-emerald-700 sm:text-sm"
                            >
                                <Target size={15} />
                                المسار الذكي
                            </Link>
                            <Link
                                to={studentAdaptiveLearningBridge.retestLink}
                                className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-700 hover:bg-emerald-100 sm:text-sm"
                            >
                                <CheckCircle size={15} />
                                قياس جديد
                            </Link>
                        </div>
                    </div>
                </Card>
            ) : null}

            {studentTodayLearningLoop ? (
                <Card className="p-3 sm:p-4 border border-slate-100 bg-white shadow-sm" data-testid="student-today-learning-loop">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="rounded-full bg-indigo-50 px-3 py-1 text-[11px] font-black text-indigo-700">
                                    خطة اليوم
                                </span>
                                <span className="rounded-full bg-slate-50 px-3 py-1 text-[11px] font-black text-slate-600">
                                    {studentTodayLearningLoop.readinessLabel}
                                </span>
                                <span className="rounded-full bg-white px-3 py-1 text-[11px] font-black text-slate-500 ring-1 ring-slate-100">
                                    {studentTodayLearningLoop.evidenceLabel}
                                </span>
                            </div>
                            <h2 className="mt-2 text-lg font-black leading-7 text-gray-900">
                                {studentTodayLearningLoop.skillName}
                            </h2>
                            <p className="mt-1 text-xs font-bold text-gray-500">
                                اتبع الترتيب فقط: شرح، تدريب، قياس. لا تحتاج تفتح كل التقرير الآن.
                            </p>
                        </div>
                        <div className="print-hide grid gap-2 sm:grid-cols-3 lg:min-w-[560px]" data-testid="student-today-learning-loop-actions">
                            {studentTodayLearningLoop.steps.map((action) => {
                                const Icon = action.Icon;

                                return (
                                    <Link
                                        key={`${action.title}-${action.step}`}
                                        to={action.link}
                                        className={`group rounded-2xl border p-3 transition hover:-translate-y-0.5 hover:shadow-sm ${action.className}`}
                                    >
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-white text-xs font-black shadow-sm">
                                                {action.step}
                                            </span>
                                            <Icon size={16} />
                                        </div>
                                        <div className="mt-2 text-sm font-black">{action.title}</div>
                                        <div className="mt-1 line-clamp-1 text-[11px] font-bold opacity-80">{action.body}</div>
                                        <div className="mt-2 text-[11px] font-black underline-offset-4 group-hover:underline">
                                            {action.label}
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                </Card>
            ) : null}

            {!isStudentReportFull ? (
                <Card className="p-4 sm:p-6 border-0 shadow-sm bg-white">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                            <div className="mb-2 inline-flex rounded-full bg-slate-50 px-3 py-1 text-xs font-black text-slate-500">
                                تقرير أداء المهارات من الاختبارات
                            </div>
                            <h2 className="text-xl font-black text-gray-900">المهارات التي تبدأ بها</h2>
                        </div>
                        <div className="print-hide flex flex-wrap gap-2">
                            {(['month', 'quarter', 'all'] as StudentReportPeriod[]).map((period) => (
                                <button
                                    key={period}
                                    onClick={() => setStudentReportPeriod(period)}
                                    className={`rounded-xl px-3 py-2 text-xs font-black transition ${studentReportPeriod === period ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                                >
                                    {studentReportPeriodLabels[period]}
                                </button>
                            ))}
                            <button
                                onClick={() => setStudentReportDepth('full')}
                                className="rounded-xl bg-white px-3 py-2 text-xs font-black text-indigo-700 ring-1 ring-indigo-100 hover:bg-indigo-50"
                            >
                                تفاصيل
                            </button>
                        </div>
                    </div>

                    <div className="mt-5 space-y-2">
                        {studentPrintableSkillRows.length > 0 ? studentPrintableSkillRows.map((skill) => (
                            <div key={getReportSkillKey(skill)} className={`rounded-2xl border p-3 ${skill.tone.bg} ${skill.tone.border}`}>
                                <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto_auto] lg:items-center">
                                    <div className="min-w-0">
                                        <div className="font-black leading-7 text-gray-900 break-words">{displayText(skill.skill)}</div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className={`w-14 text-center text-2xl font-black ${skill.tone.text}`}>{skill.mastery}%</div>
                                        <div className="h-2 w-24 overflow-hidden rounded-full bg-white/80">
                                            <div className={`h-full rounded-full ${skill.tone.bar}`} style={{ width: `${skill.mastery}%` }} />
                                        </div>
                                    </div>
                                    <div className="print-hide flex flex-wrap gap-2 lg:justify-end">
                                        <Link to={skill.lessonLink} className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-white px-3 py-2 text-xs font-black text-indigo-700 ring-1 ring-indigo-100 hover:bg-indigo-50">
                                            <Video size={14} />
                                            شرح
                                        </Link>
                                        <Link to={skill.quizLink} className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-white px-3 py-2 text-xs font-black text-amber-700 ring-1 ring-amber-100 hover:bg-amber-50">
                                            <FileText size={14} />
                                            تدريب
                                        </Link>
                                        <Link to={skill.retestLink} className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-white px-3 py-2 text-xs font-black text-emerald-700 ring-1 ring-emerald-100 hover:bg-emerald-50">
                                            <CheckCircle size={14} />
                                            قياس
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        )) : (
                            <div className="rounded-3xl border border-dashed border-gray-200 bg-gray-50 p-6 text-center text-sm font-bold leading-7 text-gray-500">
                                لا توجد مهارات كافية في {studentPeriodLabel}. اختر فترة أطول أو حل اختبارًا قصيرًا مرتبطًا بالمهارات.
                            </div>
                        )}
                    </div>

                </Card>
            ) : null}

            {smartRemediation && isStudentReportFull ? (
                <Card className="p-4 sm:p-6 border-0 shadow-sm bg-gradient-to-br from-amber-50 via-white to-emerald-50">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-black text-amber-700 shadow-sm">
                                <Sparkles size={14} />
                                خطة علاجية مولدة من أدائك
                            </div>
                            <h2 className="text-xl font-black text-gray-900">{displayText(smartRemediation.title) || 'خطة علاجية قصيرة'}</h2>
                            <p className="mt-2 max-w-4xl text-sm leading-7 text-gray-600">
                                {displayText(smartRemediation.summary) || 'ابدأ بأضعف مهارة، راجع شرحًا بسيطًا، ثم حل تدريبًا قصيرًا وأعد القياس.'}
                            </p>
                        </div>
                        <Link to="/plan" className="self-start rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700">
                            تحويلها لخطة مذاكرة
                        </Link>
                    </div>

                    <div className="mt-5 grid gap-3 md:grid-cols-3">
                        {(smartRemediation.steps || []).slice(0, 3).map((step, index) => (
                            <div key={`${step.day || index}-${step.skill || index}`} className="rounded-2xl border border-white bg-white/80 p-4 shadow-sm">
                                <div className="flex items-center justify-between gap-2">
                                    <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-800">
                                        {displayText(step.day) || `اليوم ${index + 1}`}
                                    </span>
                                    <CheckCircle size={18} className="text-emerald-500" />
                                </div>
                                <div className="mt-3 text-base font-black leading-7 text-gray-900">{displayText(step.skill) || 'مهارة تحتاج متابعة'}</div>
                                <p className="mt-2 text-sm leading-7 text-gray-600">{displayText(step.action) || 'راجع شرحًا قصيرًا ثم حل تدريبًا بسيطًا.'}</p>
                                <div className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-xs font-bold leading-6 text-slate-600">
                                    التحقق: {displayText(step.check) || 'أعد القياس بسؤال أو اختبار قصير.'}
                                </div>
                            </div>
                        ))}
                    </div>

                    {smartRemediation.parentNote ? (
                        <div className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-bold leading-7 text-emerald-800">
                            ملاحظة لولي الأمر: {displayText(smartRemediation.parentNote)}
                        </div>
                    ) : null}
                </Card>
            ) : null}

            {isStudentReportFull ? (
            <Card className="p-4 sm:p-6 border-0 shadow-sm bg-white">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between mb-5">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">مهاراتك أولًا</h2>
                        <p className="text-sm text-gray-500 mt-1">
                            نرتب المهارات من الأضعف للأقوى بناءً على الأسئلة التي حللتها في كل اختبار، ثم نقترح لك خطوة علاجية مناسبة.
                        </p>
                    </div>
                    <div className="print-hide flex flex-wrap gap-2">
                        <button
                            onClick={() => {
                                void buildSmartRemediation();
                            }}
                            disabled={smartRemediationLoading || focusedReportSkills.length === 0}
                            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-amber-400 px-4 py-2 text-sm font-bold text-slate-900 hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {smartRemediationLoading ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
                            {smartRemediationLoading ? 'تجهيز' : 'اقتراح خطة'}
                        </button>
                        <Link to="/dashboard?tab=saher" className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-700">
                            اختبر مهارة جديدة
                        </Link>
                    </div>
                </div>

                {selectedReportSkill ? (
                    <div className="mb-5 rounded-3xl border border-rose-100 bg-gradient-to-br from-rose-50 via-white to-amber-50 p-4 sm:p-5">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                            <div className="min-w-0">
                                <div className="mb-3 inline-flex rounded-full bg-white px-3 py-1 text-xs font-black text-rose-700">
                                    المهارة التي تبدأ بها اليوم
                                </div>
                                <div className="grid grid-cols-1 gap-2 text-xs font-bold sm:grid-cols-3">
                                    {selectedReportSkill.subjectName ? (
                                        <div className="rounded-xl bg-white px-3 py-2 text-gray-700">
                                            <span className="mb-1 block text-gray-400">المادة</span>
                                            {displayText(selectedReportSkill.subjectName)}
                                        </div>
                                    ) : null}
                                    {selectedReportSkill.sectionName ? (
                                        <div className="rounded-xl bg-white px-3 py-2 text-indigo-700">
                                            <span className="mb-1 block text-indigo-300">المهارة الرئيسية</span>
                                            {displayText(selectedReportSkill.sectionName)}
                                        </div>
                                    ) : null}
                                    <div className="rounded-xl bg-white px-3 py-2 text-rose-700">
                                        <span className="mb-1 block text-rose-300">المهارة الفرعية</span>
                                        {displayText(selectedReportSkill.skill)}
                                    </div>
                                </div>
                                <p className="mt-3 text-sm leading-7 text-gray-600">
                                    {displayText(selectedSkillRecommendation.actionText) || 'ابدأ بمراجعة قصيرة، ثم حل تدريبًا بسيطًا، وبعدها أعد القياس.'}
                                </p>
                            </div>
                            <div className="grid w-full gap-2 sm:grid-cols-2 lg:w-auto lg:min-w-[320px]">
                                {selectedSkillRecommendation.lessonLink ? (
                                    <Link to={selectedSkillRecommendation.lessonLink} className="rounded-xl bg-white px-4 py-3 text-sm font-black text-indigo-700 border border-indigo-100 hover:bg-indigo-50 flex items-center justify-center gap-2">
                                        <Video size={16} />
                                        {selectedSkillRecommendation.lessonTopicTitle ? `شرح: ${selectedSkillRecommendation.lessonTopicTitle}` : 'ابدأ بالشرح'}
                                    </Link>
                                ) : (
                                    <Link to="/courses" className="rounded-xl bg-white px-4 py-3 text-sm font-black text-slate-600 border border-slate-200 hover:bg-slate-50 flex items-center justify-center gap-2">
                                        <Video size={16} />
                                        استعرض الشروح
                                    </Link>
                                )}
                                {selectedSkillRecommendation.quizLink ? (
                                    <Link to={selectedSkillRecommendation.quizLink} className="rounded-xl bg-white px-4 py-3 text-sm font-black text-amber-700 border border-amber-100 hover:bg-amber-50 flex items-center justify-center gap-2">
                                        <FileText size={16} />
                                        ابدأ بالتدريب
                                    </Link>
                                ) : (
                                    <Link to="/dashboard?tab=saher" className="rounded-xl bg-white px-4 py-3 text-sm font-black text-slate-600 border border-slate-200 hover:bg-slate-50 flex items-center justify-center gap-2">
                                        <FileText size={16} />
                                        ابحث عن تدريب
                                    </Link>
                                )}
                                {selectedSkillRecommendation.resourceUrl ? (
                                    <a href={selectedSkillRecommendation.resourceUrl} target="_blank" rel="noreferrer" className="rounded-xl bg-white px-4 py-3 text-sm font-black text-slate-700 border border-slate-200 hover:bg-slate-50 flex items-center justify-center gap-2">
                                        <BookOpen size={16} />
                                        ملف مساعد
                                    </a>
                                ) : null}
                                <Link to={buildSkillSessionLink(selectedReportSkill)} className="rounded-xl bg-indigo-600 px-4 py-3 text-sm font-black text-white hover:bg-indigo-700 flex items-center justify-center gap-2">
                                    <Clock size={16} />
                                    حجز حصة
                                </Link>
                            </div>
                        </div>
                    </div>
                ) : null}

                <div className="mb-5 grid grid-cols-1 gap-3 lg:grid-cols-[1fr_2fr]">
                    <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-4">
                        <div className="text-xs font-black text-indigo-600">قراءة سريعة للتقرير</div>
                        <p className="mt-2 text-sm font-bold leading-7 text-indigo-900">{skillReadinessSummary.message}</p>
                        <div className="mt-3 text-xs font-bold text-indigo-500">
                            إجمالي المهارات المرصودة: {skillReadinessSummary.total}
                            {skillReadinessSummary.early > 0 ? ` - إشارات أولية تحتاج تأكيد: ${skillReadinessSummary.early}` : ''}
                        </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                        <div className="rounded-2xl bg-rose-50 p-4 text-center">
                            <div className="text-2xl font-black text-rose-700">{skillReadinessSummary.weak}</div>
                            <div className="mt-1 text-xs font-bold text-rose-600">ابدأ بها</div>
                        </div>
                        <div className="rounded-2xl bg-amber-50 p-4 text-center">
                            <div className="text-2xl font-black text-amber-700">{skillReadinessSummary.average}</div>
                            <div className="mt-1 text-xs font-bold text-amber-600">تحت المراجعة</div>
                        </div>
                        <div className="rounded-2xl bg-emerald-50 p-4 text-center">
                            <div className="text-2xl font-black text-emerald-700">{skillReadinessSummary.strong}</div>
                            <div className="mt-1 text-xs font-bold text-emerald-600">مطمئنة</div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {focusedReportSkills.map((skill) => {
                        const tone = getReportMasteryTone(skill.mastery);
                        const isSelected = selectedReportSkill && getReportSkillKey(selectedReportSkill) === getReportSkillKey(skill);

                        return (
                            <button
                                key={getReportSkillKey(skill)}
                                onClick={() => setSelectedSkillKey(getReportSkillKey(skill))}
                                className={`text-right rounded-2xl border p-4 transition-all hover:shadow-md ${tone.bg} ${isSelected ? `${tone.border} ring-2 ring-indigo-100` : 'border-transparent'}`}
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <div className={`inline-flex rounded-full px-3 py-1 text-[11px] font-black ${tone.text} bg-white/70`}>
                                            {tone.label}
                                        </div>
                                        <div className="mt-3 font-black text-gray-900 leading-7 break-words">{displayText(skill.skill)}</div>
                                    </div>
                                    <div className={`text-2xl font-black ${tone.text}`}>{skill.mastery}%</div>
                                </div>
                                <div className="mt-4 h-2 rounded-full bg-white/70 overflow-hidden">
                                    <div className={`h-full rounded-full ${tone.bar}`} style={{ width: `${skill.mastery}%` }} />
                                </div>
                                <div className="mt-3 text-xs font-bold text-gray-500">
                                    {skill.isReliable ? 'قياس مؤكد من عدة محاولات' : `قراءة أولية حتى ${MIN_SKILL_EVIDENCE_COUNT} محاولات`}
                                </div>
                            </button>
                        );
                    })}
                </div>

                {selectedReportSkill ? (
                    <div className="mt-5 rounded-3xl border border-indigo-100 bg-indigo-50/60 p-4 sm:p-5">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                            <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2 mb-3">
                                    <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-indigo-700">مقترحات لهذه المهارة</span>
                                </div>
                                <h3 className="text-lg font-black text-gray-900 break-words">{displayText(selectedReportSkill.skill)}</h3>
                                <p className="mt-2 text-sm leading-7 text-gray-600">
                                    اختر من المقترحات التالية ما يناسب وقتك الآن. الأفضل أن تبدأ بالشرح ثم تنتقل للتدريب.
                                </p>
                                <p className="mt-2 text-xs font-bold text-indigo-600">
                                    يمكنك تغيير المقترحات بالضغط على أي مهارة من البطاقات بالأعلى.
                                </p>
                            </div>
                            <div className="grid w-full gap-2 sm:grid-cols-2 lg:w-auto lg:min-w-[360px]">
                                {selectedSkillRecommendation.lessonLink ? (
                                    <Link to={selectedSkillRecommendation.lessonLink} className="rounded-xl bg-white px-4 py-3 text-sm font-black text-indigo-700 border border-indigo-100 hover:bg-indigo-50 flex items-center gap-2">
                                        <Video size={16} />
                                        {selectedSkillRecommendation.lessonTopicTitle ? `درس: ${selectedSkillRecommendation.lessonTopicTitle}` : 'فيديو أو درس'}
                                    </Link>
                                ) : (
                                    <Link to="/courses" className="rounded-xl bg-white px-4 py-3 text-sm font-black text-slate-600 border border-slate-200 hover:bg-slate-50 flex items-center gap-2">
                                        <Video size={16} />
                                        استعرض الشروح
                                    </Link>
                                )}
                                {selectedSkillRecommendation.quizLink ? (
                                    <Link to={selectedSkillRecommendation.quizLink} className="rounded-xl bg-white px-4 py-3 text-sm font-black text-amber-700 border border-amber-100 hover:bg-amber-50 flex items-center gap-2">
                                        <FileText size={16} />
                                        اختبار علاجي
                                    </Link>
                                ) : (
                                    <Link to="/dashboard?tab=saher" className="rounded-xl bg-white px-4 py-3 text-sm font-black text-slate-600 border border-slate-200 hover:bg-slate-50 flex items-center gap-2">
                                        <FileText size={16} />
                                        ابحث عن اختبار
                                    </Link>
                                )}
                                {selectedSkillRecommendation.resourceUrl ? (
                                    <a href={selectedSkillRecommendation.resourceUrl} target="_blank" rel="noreferrer" className="rounded-xl bg-white px-4 py-3 text-sm font-black text-slate-700 border border-slate-200 hover:bg-slate-50 flex items-center gap-2">
                                        <BookOpen size={16} />
                                        ملف داعم
                                    </a>
                                ) : null}
                                <Link to={buildSkillSessionLink(selectedReportSkill)} className="rounded-xl bg-indigo-600 px-4 py-3 text-sm font-black text-white hover:bg-indigo-700 flex items-center gap-2">
                                    <Clock size={16} />
                                    حجز حصة
                                </Link>
                            </div>
                        </div>
                    </div>
                ) : null}
            </Card>
            ) : null}

            {isStudentReportFull && studentWeeklyPlan.length > 0 ? (
                <Card className="p-4 sm:p-6 border-0 shadow-sm bg-white">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between mb-5">
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">خطة أسبوعية صغيرة</h2>
                            <p className="text-sm text-gray-500 mt-1">
                                ثلاث خطوات خفيفة تبدأ من أضعف المهارات، مناسبة للمذاكرة اليومية وولي الأمر يقدر يتابعها بسهولة.
                            </p>
                        </div>
                        <Link to="/plan" className="self-start rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-700 hover:bg-emerald-100">
                            افتح خطتي الدراسية
                        </Link>
                    </div>
                    <div className="grid gap-3 md:grid-cols-3">
                        {studentWeeklyPlan.map((item) => (
                            <div key={`${item.day}-${item.skill}`} className="rounded-2xl border border-gray-100 bg-slate-50 p-4">
                                <div className="flex items-center justify-between gap-2">
                                    <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-indigo-700">{item.day}</span>
                                    <span className={`rounded-full px-3 py-1 text-xs font-black ${item.mastery < 50 ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700'}`}>
                                        {item.mastery}%
                                    </span>
                                </div>
                                <div className="mt-3 font-black text-gray-900 leading-7 break-words">{item.skill}</div>
                                {(item.subjectName || item.sectionName) ? (
                                    <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] font-bold text-gray-500">
                                        {item.subjectName ? <span className="rounded-full bg-white px-2 py-1">المادة: {displayText(item.subjectName)}</span> : null}
                                        {item.sectionName ? <span className="rounded-full bg-white px-2 py-1">المهارة الرئيسية: {displayText(item.sectionName)}</span> : null}
                                    </div>
                                ) : null}
                                <p className="mt-2 text-sm leading-7 text-gray-600">{displayText(item.actionText)}</p>
                                <div className="mt-3 space-y-1 text-xs text-gray-500">
                                    {item.lessonTitle ? <div>شرح مقترح: <span className="font-bold">{displayText(item.lessonTitle)}</span></div> : null}
                                    {item.lessonTopicTitle ? <div>داخل موضوع: <span className="font-bold">{displayText(item.lessonTopicTitle)}</span></div> : null}
                                    {item.quizTitle ? <div>تدريب مقترح: <span className="font-bold">{displayText(item.quizTitle)}</span></div> : null}
                                </div>
                                <div className="print-hide mt-4 grid gap-2">
                                    {item.lessonLink ? (
                                        <Link to={item.lessonLink} className="rounded-xl bg-indigo-600 px-3 py-2 text-center text-xs font-black text-white hover:bg-indigo-700">
                                            فتح شرح اليوم
                                        </Link>
                                    ) : null}
                                    {item.quizLink ? (
                                        <Link to={item.quizLink} className="rounded-xl bg-amber-50 px-3 py-2 text-center text-xs font-black text-amber-700 hover:bg-amber-100">
                                            فتح تدريب اليوم
                                        </Link>
                                    ) : null}
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>
            ) : null}

            </>
            )}
        </div>
    );
};

export default Reports;
