
import React, { useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { ArrowRight, ChevronLeft, Target, PieChart, BookOpen, Video, Clock, CheckCircle, FileText, Download, Copy, Share2, Sparkles, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { useStore } from '../store/useStore';
import { api } from '../services/api';
import { Role } from '../types';
import { sanitizeArabicText } from '../utils/sanitizeMojibakeArabic';
import { printElementAsPdf } from '../utils/printPdf';
import { shareTextSummary } from '../utils/shareText';
import { matchesEntityId } from '../utils/entityIds';

interface ScopedAnalyticsOverview {
    scope: {
        role: string;
        studentCount: number;
        groupCount: number;
        quizAttempts: number;
        questionAttempts?: number;
    };
    weakestStudents: Array<{
        id: string;
        name: string;
        averageScore: number;
        attempts: number;
        weakSkillCount: number;
        schoolName?: string;
        groupNames?: string[];
        weakestSkills?: Array<{ skill: string; mastery: number }>;
        recommendedAction?: string;
    }>;
    weakestSkills: Array<{
        skillId?: string;
        skill: string;
        section?: string;
        mastery: number;
        affectedStudents: number;
        attempts: number;
        recommendedAction?: string;
    }>;
    subjectSummaries: Array<{
        subjectId?: string;
        subjectName: string;
        mastery: number;
        weakStudents: number;
    }>;
    assignedFollowUps: Array<{
        id: string;
        title: string;
        mode: 'regular' | 'saher' | 'central';
        dueDate?: string;
    }>;
}

interface ScopedQuizResult {
    id?: string;
    _id?: string;
    userId?: string;
    studentName?: string;
    studentEmail?: string;
    quizTitle: string;
    score: number;
    totalQuestions?: number;
    correctAnswers?: number;
    wrongAnswers?: number;
    date?: string;
    createdAt?: string;
    skillsAnalysis?: Array<{ skill?: string; mastery?: number; status?: string }>;
}

const roleScopeTitle: Record<string, string> = {
    admin: 'نطاق المنصة بالكامل',
    supervisor: 'نطاق المجموعات والمدرسة التابعة لك',
    teacher: 'نطاق الطلاب المرتبطين بك',
    parent: 'الأبناء المرتبطون بك',
    student: 'نطاقك الشخصي',
};

const displayText = (value?: string | null) => sanitizeArabicText(value) || '';

const getReportSkillKey = (skill: { skill: string; skillId?: string }) => skill.skillId || skill.skill;

const buildSkillSessionLink = (skill?: { skill?: string; skillId?: string; subjectName?: string; sectionName?: string } | null) => {
    if (!skill) return '/book-session';

    const params = new URLSearchParams();
    if (skill.skillId) params.set('skillId', skill.skillId);
    if (skill.skill) params.set('skillName', displayText(skill.skill));
    if (skill.subjectName) params.set('subjectName', displayText(skill.subjectName));
    if (skill.sectionName) params.set('sectionName', displayText(skill.sectionName));
    params.set('source', 'reports');

    return `/book-session?${params.toString()}`;
};

const getReportMasteryTone = (mastery: number) => {
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

const scoreTone = (score: number) => {
    if (score < 60) return 'text-rose-600 bg-rose-50 border-rose-100';
    if (score < 80) return 'text-amber-600 bg-amber-50 border-amber-100';
    return 'text-emerald-600 bg-emerald-50 border-emerald-100';
};

interface SkillRecommendation {
    lessonTitle?: string;
    lessonLink?: string;
    lessonTopicTitle?: string;
    quizTitle?: string;
    quizLink?: string;
    resourceTitle?: string;
    resourceUrl?: string;
    subjectName?: string;
    sectionName?: string;
    actionText?: string;
}

interface SmartRemediationPlan {
    title?: string;
    summary?: string;
    steps?: Array<{ day?: string; skill?: string; action?: string; check?: string }>;
    parentNote?: string;
}

const getSkillRecommendation = (
    skill: { skill?: string; skillId?: string } | undefined,
    allSkills: ReturnType<typeof useStore.getState>['skills'],
    lessons: ReturnType<typeof useStore.getState>['lessons'],
    quizzes: ReturnType<typeof useStore.getState>['quizzes'],
    libraryItems: ReturnType<typeof useStore.getState>['libraryItems'],
    questions: ReturnType<typeof useStore.getState>['questions'],
    topics: ReturnType<typeof useStore.getState>['topics'],
): SkillRecommendation => {
    if (!skill) return {};

    const resolvedSkill = skill.skillId
        ? allSkills.find((item) => item.id === skill.skillId)
        : allSkills.find((item) => displayText(item.name) === displayText(skill.skill));

    if (!resolvedSkill) return {};

    const recommendedLesson = lessons.find(
        (lesson) =>
            lesson.skillIds?.includes(resolvedSkill.id) &&
            lesson.showOnPlatform !== false &&
            (!lesson.approvalStatus || lesson.approvalStatus === 'approved'),
    );
    const recommendedQuiz = quizzes.find((quiz) =>
        quiz.showOnPlatform !== false &&
        quiz.isPublished !== false &&
        (!quiz.approvalStatus || quiz.approvalStatus === 'approved') &&
        (quiz.questionIds?.some((questionId) => questions.find((question) => question.id === questionId)?.skillIds?.includes(resolvedSkill.id)) ||
            quiz.skillIds?.includes(resolvedSkill.id))
    );
    const recommendedResource = libraryItems.find(
        (item) =>
            item.skillIds?.includes(resolvedSkill.id) &&
            item.showOnPlatform !== false &&
            (!item.approvalStatus || item.approvalStatus === 'approved'),
    );
    const recommendationPathId = resolvedSkill.pathId;
    const recommendationSubjectId = resolvedSkill.subjectId;
    const recommendationSectionId = resolvedSkill.sectionId;
    const recommendedTopic =
        recommendedLesson && recommendationPathId && recommendationSubjectId
            ? topics.find(
                (topic) =>
                    topic.pathId === recommendationPathId &&
                    topic.subjectId === recommendationSubjectId &&
                    topic.showOnPlatform !== false &&
                    (topic.lessonIds || []).some((lessonId) => matchesEntityId(recommendedLesson, lessonId)),
            )
            : undefined;
    const lessonLink =
        recommendationPathId && recommendationSubjectId
            ? (() => {
                const params = new URLSearchParams({
                    subject: recommendationSubjectId,
                    tab: 'skills',
                });

                if (recommendedTopic?.id && recommendedLesson?.id) {
                    params.set('topic', recommendedTopic.id);
                    params.set('content', 'lessons');
                    params.set('lesson', recommendedLesson.id);
                }

                return `/category/${recommendationPathId}?${params.toString()}`;
            })()
            : undefined;

    return {
        lessonTitle: displayText(recommendedLesson?.title),
        lessonLink,
        lessonTopicTitle: displayText(recommendedTopic?.title),
        quizTitle: displayText(recommendedQuiz?.title),
        quizLink: recommendedQuiz?.id ? `/quiz/${recommendedQuiz.id}` : undefined,
        resourceTitle: displayText(recommendedResource?.title),
        resourceUrl: recommendedResource?.url,
        subjectName: recommendationSubjectId ? displayText(useStore.getState().subjects.find((item) => item.id === recommendationSubjectId)?.name) : undefined,
        sectionName: recommendationSectionId ? displayText(useStore.getState().sections.find((item) => item.id === recommendationSectionId)?.name) : undefined,
        actionText:
            recommendedLesson && recommendedQuiz
                ? 'ابدأ بالشرح أولًا ثم نفّذ اختبارًا قصيرًا لقياس التحسن.'
                : recommendedLesson
                    ? 'هذه المهارة تحتاج مراجعة شرحها قبل أي تدريب إضافي.'
                    : recommendedQuiz
                        ? 'هذه المهارة جاهزة لتدريب علاجي مباشر عبر الاختبار المقترح.'
                        : recommendedResource
                            ? 'راجع الملف الداعم ثم ارجع لتكرار التدريب على نفس المهارة.'
                            : 'أعد المحاولة عبر اختبار ساهر مخصص لهذه المهارة.',
    };
};

const Reports: React.FC = () => {
    const { examResults, questionAttempts, skills, lessons, quizzes, libraryItems, questions, topics, subjects, sections, user } = useStore();
    const [scopedAnalytics, setScopedAnalytics] = useState<ScopedAnalyticsOverview | null>(null);
    const [scopedResults, setScopedResults] = useState<ScopedQuizResult[]>([]);
    const [scopedAnalyticsLoading, setScopedAnalyticsLoading] = useState(false);
    const [selectedSkillKey, setSelectedSkillKey] = useState<string | null>(null);
    const [copiedScopedSummary, setCopiedScopedSummary] = useState(false);
    const [sharedScopedSummary, setSharedScopedSummary] = useState(false);
    const [copiedStudentSummary, setCopiedStudentSummary] = useState(false);
    const [sharedStudentSummary, setSharedStudentSummary] = useState(false);
    const [smartRemediation, setSmartRemediation] = useState<SmartRemediationPlan | null>(null);
    const [smartRemediationLoading, setSmartRemediationLoading] = useState(false);
    const [scopedSmartRemediation, setScopedSmartRemediation] = useState<SmartRemediationPlan | null>(null);
    const [scopedSmartRemediationLoading, setScopedSmartRemediationLoading] = useState(false);
    const [studentReportDepth, setStudentReportDepth] = useState<'simple' | 'full'>('simple');

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

    // Calculate Performance Analysis
    const stats = useMemo(() => {
        if (examResults.length === 0) {
            if (questionAttempts.length === 0) return null;

            const answeredAttempts = questionAttempts.filter((attempt) => attempt.selectedOptionIndex >= 0);
            const correctAttempts = answeredAttempts.filter((attempt) => attempt.isCorrect).length;
            const averageScore = answeredAttempts.length > 0 ? Math.round((correctAttempts / answeredAttempts.length) * 100) : 0;

            return {
                averageScore,
                bestSubject: { name: 'تدريبات الأسئلة', score: averageScore },
                worstSubject: { name: 'تحتاج متابعة', score: averageScore },
            };
        }

        const totalScore = examResults.reduce((acc, curr) => acc + curr.score, 0);
        const averageScore = Math.round(totalScore / examResults.length);

        // Group by quizTitle (as a proxy for subject)
        const subjectScores: Record<string, { total: number, count: number }> = {};
        examResults.forEach(result => {
            // Try to extract a general subject name from the quiz title (e.g., "اختبار الهندسة" -> "الهندسة")
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
            const avg = data.total / data.count;
            if (avg >= bestSubject.score) bestSubject = { name, score: Math.round(avg) };
            if (avg <= worstSubject.score) worstSubject = { name, score: Math.round(avg) };
        });

        return { averageScore, bestSubject, worstSubject };
    }, [examResults, questionAttempts]);

    // Aggregate Skill Analysis
    const aggregatedSkills = useMemo(() => {
        const skillsMap: Record<string, { totalMastery: number, count: number, skillId?: string }> = {};
        
        examResults.forEach(result => {
            if (result.skillsAnalysis) {
                result.skillsAnalysis.forEach(skill => {
                    if (!skillsMap[skill.skill]) {
                        skillsMap[skill.skill] = { totalMastery: 0, count: 0, skillId: skill.skillId };
                    }
                    skillsMap[skill.skill].totalMastery += skill.mastery;
                    skillsMap[skill.skill].count += 1;
                    if (!skillsMap[skill.skill].skillId && skill.skillId) {
                        skillsMap[skill.skill].skillId = skill.skillId;
                    }
                });
            }
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

                    if (!skillsMap[skillName]) {
                        skillsMap[skillName] = { totalMastery: 0, count: 0, skillId: resolvedSkill.id };
                    }

                    skillsMap[skillName].totalMastery += attempt.isCorrect ? 100 : 0;
                    skillsMap[skillName].count += 1;
                });
            });
        }

        return Object.entries(skillsMap).map(([skill, data]) => {
            const mastery = Math.round(data.totalMastery / data.count);
            const resolvedSkill = data.skillId
                ? skills.find((item) => item.id === data.skillId)
                : skills.find((item) => displayText(item.name) === displayText(skill));
            const subjectName = resolvedSkill?.subjectId
                ? displayText(subjects.find((subject) => subject.id === resolvedSkill.subjectId)?.name)
                : undefined;
            const sectionName = resolvedSkill?.sectionId
                ? displayText(sections.find((section) => section.id === resolvedSkill.sectionId)?.name)
                : undefined;

            return {
                skill: displayText(skill),
                skillId: data.skillId,
                subjectName,
                sectionName,
                mastery,
                status: mastery < 50 ? 'weak' : mastery < 75 ? 'average' : 'strong'
            };
        }).sort((a, b) => a.mastery - b.mastery); // Sort by weakest first
    }, [examResults, questionAttempts, questions, sections, skills, subjects]);

    const weakestSkill = aggregatedSkills.length > 0 ? aggregatedSkills[0] : null;
    const focusedReportSkills = aggregatedSkills.slice(0, 6);
    const selectedReportSkill = aggregatedSkills.find((skill) => getReportSkillKey(skill) === selectedSkillKey) || weakestSkill;
    const selectedSkillRecommendation = getSkillRecommendation(selectedReportSkill || undefined, skills, lessons, quizzes, libraryItems, questions, topics);
    const isStudentView = user.role === Role.STUDENT;
    const hasStudentAnalytics = examResults.length > 0 || aggregatedSkills.length > 0;
    const isStudentReportFull = studentReportDepth === 'full';
    const showCompactStudentView = isStudentView && !isStudentReportFull;
    const skillReadinessSummary = useMemo(() => {
        const weak = aggregatedSkills.filter((skill) => skill.mastery < 50).length;
        const average = aggregatedSkills.filter((skill) => skill.mastery >= 50 && skill.mastery < 75).length;
        const strong = aggregatedSkills.filter((skill) => skill.mastery >= 75).length;
        const total = aggregatedSkills.length;

        return {
            weak,
            average,
            strong,
            total,
            message:
                weak > 0
                    ? `ابدأ بـ ${weak} مهارة تحتاج دعمًا واضحًا.`
                    : average > 0
                        ? `مستواك جيد، وراجع ${average} مهارة لتثبيت التحسن.`
                        : total > 0
                            ? 'مؤشراتك مطمئنة. حافظ على التدريب القصير.'
                            : 'ابدأ اختبارًا قصيرًا حتى تظهر خريطة مهاراتك.',
        };
    }, [aggregatedSkills]);
    const studentWeeklyPlan = useMemo(() => {
        const dayLabels = ['اليوم 1', 'اليوم 2', 'اليوم 3'];

        return focusedReportSkills.slice(0, 3).map((skill, index) => {
            const recommendation = getSkillRecommendation(skill, skills, lessons, quizzes, libraryItems, questions, topics);

            return {
                day: dayLabels[index],
                skill: displayText(skill.skill),
                subjectName: displayText(skill.subjectName),
                sectionName: displayText(skill.sectionName),
                mastery: skill.mastery,
                lessonTitle: recommendation.lessonTitle,
                lessonLink: recommendation.lessonLink,
                lessonTopicTitle: recommendation.lessonTopicTitle,
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
        if (!studentTodayFocus) return [];

        return [
            {
                title: 'راجع الشرح',
                body: studentTodayFocus.lessonTitle
                    ? `ابدأ بشرح ${displayText(studentTodayFocus.lessonTopicTitle || studentTodayFocus.lessonTitle)}.`
                    : 'افتح الشروحات واختر أقرب درس لهذه المهارة.',
                label: studentTodayFocus.lessonLink ? 'فتح الشرح' : 'استعراض الشروحات',
                link: studentTodayFocus.lessonLink || '/courses',
                Icon: Video,
                className: 'border-indigo-100 bg-indigo-50 text-indigo-800',
            },
            {
                title: 'حل تدريب قصير',
                body: studentTodayFocus.quizTitle
                    ? `بعد الشرح حل ${displayText(studentTodayFocus.quizTitle)} بدون استعجال.`
                    : 'حل تدريبًا قصيرًا من مركز الاختبارات على نفس المهارة.',
                label: studentTodayFocus.quizLink ? 'بدء التدريب' : 'اختيار تدريب',
                link: studentTodayFocus.quizLink || '/quizzes',
                Icon: FileText,
                className: 'border-amber-100 bg-amber-50 text-amber-800',
            },
            {
                title: 'أعد القياس',
                body: 'بعد المراجعة والتدريب، كرر قياسًا قصيرًا حتى نعرف هل تحسنت المهارة أم تحتاج مراجعة ثانية.',
                label: 'قياس التحسن',
                link: studentTodayFocus.quizLink || '/quizzes',
                Icon: CheckCircle,
                className: 'border-emerald-100 bg-emerald-50 text-emerald-800',
            },
        ];
    }, [studentTodayFocus]);
    const studentFollowUpSummary = useMemo(() => {
        if (!isStudentView || !hasStudentAnalytics) return '';

        const weakest = focusedReportSkills[0];
        const nextTwo = focusedReportSkills.slice(0, 2).map((skill) => displayText(skill.skill)).filter(Boolean);
        const parts = [
            `متوسطك الحالي ${stats?.averageScore || 0}%.`,
            weakest ? `ابدأ بمهارة ${displayText(weakest.skill)} (${weakest.mastery}%).` : null,
            nextTwo.length ? `أمامك هذا الأسبوع: ${nextTwo.join('، ')}.` : null,
            'الخطوة التالية: شرح قصير ثم تدريب بسيط ثم إعادة قياس.',
        ].filter(Boolean);

        return parts.join(' ');
    }, [focusedReportSkills, hasStudentAnalytics, isStudentView, stats?.averageScore]);
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
    const scopedInterventionPlan = useMemo(() => {
        if (!scopedAnalytics) return [];

        const weakestScopedSkill = scopedAnalytics.weakestSkills[0];
        const weakestScopedStudent = scopedAnalytics.weakestStudents[0];
        const weakestScopedSubject = scopedAnalytics.subjectSummaries[0];

        return [
            {
                title: 'ابدأ بالمهارة الأكثر احتياجًا',
                label: weakestScopedSkill ? `${displayText(weakestScopedSkill.skill)} - ${weakestScopedSkill.mastery}%` : 'بانتظار بيانات مهارات أكثر',
                body: weakestScopedSkill
                    ? `وجّه شرحًا قصيرًا وتدريبًا علاجيًا للطلاب المتأثرين (${weakestScopedSkill.affectedStudents}) ثم أعد القياس باختبار قصير.`
                    : 'بعد أول محاولات كافية، سيظهر هنا أكثر محور يحتاج تدخلًا.',
                className: 'border-rose-100 bg-rose-50 text-rose-800',
            },
            {
                title: 'تابع الطالب الأكثر احتياجًا',
                label: weakestScopedStudent ? `${displayText(weakestScopedStudent.name)} - ${weakestScopedStudent.averageScore}%` : 'لا يوجد طالب يحتاج تدخلًا واضحًا',
                body: weakestScopedStudent
                    ? `ابدأ برسالة متابعة أو حصة قصيرة، وركّز على ${weakestScopedStudent.weakestSkills?.slice(0, 2).map((skill) => displayText(skill.skill)).join('، ') || 'المهارات الأضعف لديه'}.`
                    : 'عند ظهور طلاب يحتاجون دعمًا سيقترح النظام أول طالب تبدأ به.',
                className: 'border-amber-100 bg-amber-50 text-amber-800',
            },
            {
                title: 'حوّلها لخطة متابعة',
                label: weakestScopedSubject ? `${displayText(weakestScopedSubject.subjectName)} - ${weakestScopedSubject.mastery}%` : 'اختر مادة للمتابعة',
                body: weakestScopedSubject
                    ? `أنشئ اختبار متابعة أو تدريبًا قصيرًا في هذه المادة للطلاب الضعاف (${weakestScopedSubject.weakStudents}).`
                    : 'اربط الاختبارات بالمواد والمهارات حتى يظهر اقتراح المتابعة تلقائيًا.',
                className: 'border-indigo-100 bg-indigo-50 text-indigo-800',
            },
        ];
    }, [scopedAnalytics]);
    const scopedFollowUpSummary = useMemo(() => {
        if (!scopedAnalytics) return '';

        const weakestScopedSkill = scopedAnalytics.weakestSkills[0];
        const weakestScopedStudent = scopedAnalytics.weakestStudents[0];
        const weakestScopedSubject = scopedAnalytics.subjectSummaries[0];
        const parts = [
            `نطاق المتابعة: ${roleScopeTitle[user.role] || 'النطاق الحالي'}.`,
            `عدد الطلاب: ${scopedAnalytics.scope.studentCount}.`,
            `محاولات الاختبار: ${scopedAnalytics.scope.quizAttempts}.`,
            weakestScopedSkill ? `أضعف مهارة: ${displayText(weakestScopedSkill.skill)} (${weakestScopedSkill.mastery}%).` : null,
            weakestScopedStudent ? `أول طالب للمتابعة: ${displayText(weakestScopedStudent.name)} (${weakestScopedStudent.averageScore}%).` : null,
            weakestScopedSubject ? `المادة التي تحتاج تدخلًا: ${displayText(weakestScopedSubject.subjectName)} (${weakestScopedSubject.mastery}%).` : null,
            'الإجراء المقترح: شرح قصير، تدريب علاجي، ثم اختبار قياس قصير.',
        ].filter(Boolean);

        return parts.join(' ');
    }, [scopedAnalytics, user.role]);
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
        } finally {
            setScopedSmartRemediationLoading(false);
        }
    };
    const scopedLeadStudent = scopedAnalytics?.weakestStudents?.[0] || null;
    const scopedLeadSkill = scopedAnalytics?.weakestSkills?.[0] || null;
    const scopedLeadSubject = scopedAnalytics?.subjectSummaries?.[0] || null;
    const scopedLatestResults = useMemo(() => scopedResults.slice(0, 6), [scopedResults]);
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
    const downloadPerformanceWorkbook = () => {
        const workbook = XLSX.utils.book_new();
        const now = new Date().toLocaleString('ar-SA');
        const summaryRows = isStudentView
            ? [
                ['البند', 'القيمة'],
                ['نوع التقرير', 'تقرير طالب'],
                ['تاريخ التصدير', now],
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
                ['أول مهارة تحتاج تدخل', displayText(scopedLeadSkill?.skill) || '-'],
                ['أول طالب للمتابعة', displayText(scopedLeadStudent?.name) || '-'],
                ['الملخص', scopedFollowUpSummary || 'لا توجد بيانات كافية بعد.'],
            ];

        const skillRows = isStudentView
            ? [
                ['المادة', 'المهارة الرئيسية', 'المهارة', 'نسبة الإتقان', 'الحالة', 'الإجراء المقترح', 'شرح مقترح', 'اختبار مقترح'],
                ...aggregatedSkills.map((skill) => {
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

        const attemptsRows = [
            ['اسم الاختبار', 'الدرجة', 'عدد الأسئلة', 'الصحيح', 'الخطأ', 'بدون إجابة', 'الوقت', 'التاريخ'],
            ...examResults.map((result) => [
                displayText(result.quizTitle) || '-',
                `${result.score}%`,
                result.totalQuestions,
                result.correctAnswers,
                result.wrongAnswers,
                result.unanswered,
                displayText(result.timeSpent) || '-',
                displayText(result.date) || '-',
            ]),
        ];

        XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(summaryRows), 'summary');
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(skillRows), 'skills');
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(actionRows), 'action-plan');
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
                <Card className="p-12 text-center flex flex-col items-center justify-center border-dashed border-2 border-gray-200">
                    <div className="w-20 h-20 bg-gray-50 text-gray-400 rounded-full flex items-center justify-center mb-4">
                        <PieChart size={40} />
                    </div>
                    <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-2 leading-tight">لا توجد بيانات كافية</h2>
                    <p className="text-gray-500 mb-6">قم بإجراء بعض الاختبارات لنتمكن من تحليل أدائك وتقديم توصيات مخصصة لك.</p>
                    <Link to="/quiz" className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-indigo-700 transition-colors">
                        ابدأ أول اختبار
                    </Link>
                </Card>
            </div>
        );
    }

    if (user.role === Role.PARENT) {
        const latestResult = scopedLatestResults[0];
        const averageScore = scopedResults.length
            ? Math.round(scopedResults.reduce((total, result) => total + (Number(result.score) || 0), 0) / scopedResults.length)
            : 0;
        const weakSkill = scopedAnalytics?.weakestSkills?.[0] || null;
        const leadStudent = scopedAnalytics?.weakestStudents?.[0] || null;
        const parentBriefSummary = scopedFollowUpSummary || [
            `الأداء العام ${averageScore}%.`,
            weakSkill ? `ابدأ بمتابعة ${displayText(weakSkill.skill)}.` : null,
            leadStudent ? `أكثر طالب يحتاج متابعة الآن: ${displayText(leadStudent.name)}.` : null,
            'الخطوة العملية: شرح قصير، 5 أسئلة، ثم إعادة قياس هادئة.',
        ].filter(Boolean).join(' ');
        const parentActionItems = [
            {
                title: 'اليوم',
                body: weakSkill
                    ? `اسأل الطالب عن ${displayText(weakSkill.skill)}، وشاهد معه شرحًا قصيرًا لا يزيد عن 15 دقيقة.`
                    : 'اطلب من الطالب حل اختبار قصير حتى تظهر المهارة التي تحتاج متابعة.',
                tone: 'bg-emerald-50 text-emerald-800 border-emerald-100',
            },
            {
                title: 'بعد الشرح',
                body: 'خليه يحل 5 أسئلة فقط على نفس الفكرة. الهدف الفهم، وليس كثرة الأسئلة.',
                tone: 'bg-indigo-50 text-indigo-800 border-indigo-100',
            },
            {
                title: 'نهاية الأسبوع',
                body: averageScore < 60
                    ? 'أعد قياس نفس المهارة. إذا بقيت أقل من 60%، احجز حصة علاجية قصيرة.'
                    : 'أعد قياسًا بسيطًا. إذا تحسنت النتيجة، انتقل لمهارة أخرى بهدوء.',
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
                            onClick={copyScopedSummary}
                            disabled={!parentBriefSummary}
                            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {copiedScopedSummary ? <CheckCircle size={16} /> : <Copy size={16} />}
                            {copiedScopedSummary ? 'تم النسخ' : 'نسخ الملخص'}
                        </button>
                        <button
                            onClick={shareScopedSummary}
                            disabled={!parentBriefSummary}
                            className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-100 bg-white px-4 py-2 text-sm font-bold text-emerald-700 shadow-sm hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {sharedScopedSummary ? <CheckCircle size={16} /> : <Share2 size={16} />}
                            {sharedScopedSummary ? 'تمت المشاركة' : 'مشاركة'}
                        </button>
                        <button
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
                        <Card className="overflow-hidden border-0 bg-gradient-to-br from-emerald-600 to-slate-900 p-6 text-white shadow-sm">
                            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                                <div>
                                    <div className="mb-2 text-sm font-bold text-emerald-100">الملخص السريع</div>
                                    <h2 className="text-2xl font-black">الأداء العام {averageScore}%</h2>
                                    <p className="mt-2 max-w-2xl text-sm leading-7 text-emerald-50">
                                        {averageScore >= 80
                                            ? 'الأداء مطمئن. استمر في متابعة تدريب قصير أسبوعيًا.'
                                            : averageScore >= 60
                                                ? 'المستوى جيد، ويحتاج مراجعة هادئة للمهارات الأضعف.'
                                                : 'يحتاج الطالب متابعة قريبة، ابدأ بمهارة واحدة فقط حتى لا تزيد عليه الضغط.'}
                                    </p>
                                </div>
                                <div className="grid grid-cols-3 gap-3 text-center">
                                    <div className="rounded-2xl bg-white/10 p-4">
                                        <div className="text-2xl font-black">{scopedAnalytics.scope.studentCount}</div>
                                        <div className="mt-1 text-xs font-bold text-emerald-100">أبناء</div>
                                    </div>
                                    <div className="rounded-2xl bg-white/10 p-4">
                                        <div className="text-2xl font-black">{scopedAnalytics.scope.quizAttempts}</div>
                                        <div className="mt-1 text-xs font-bold text-emerald-100">محاولات</div>
                                    </div>
                                    <div className="rounded-2xl bg-white/10 p-4">
                                        <div className="text-2xl font-black">{scopedAnalytics.weakestSkills.length}</div>
                                        <div className="mt-1 text-xs font-bold text-emerald-100">مهارات</div>
                                    </div>
                                </div>
                            </div>
                        </Card>

                        <Card className="p-5 border-emerald-100 bg-white">
                            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                <div>
                                    <div className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
                                        مناسب لولي الأمر
                                    </div>
                                    <h2 className="mt-3 text-xl font-black text-gray-900">ماذا أفعل الآن؟</h2>
                                    <p className="mt-2 max-w-3xl text-sm leading-7 text-gray-600">
                                        {parentBriefSummary}
                                    </p>
                                </div>
                                <Link
                                    to="/book-session"
                                    className="print-hide inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-black text-white hover:bg-emerald-700"
                                >
                                    <Clock size={16} />
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
                            <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm leading-7 text-slate-600">
                                علامة تستدعي متابعة أقرب: تكرار نفس المهارة تحت 50% في أكثر من محاولة، أو ترك الاختبار بدون إجابات كثيرة.
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
                                <div className="text-xs font-bold text-gray-500">أهم مهارة تحتاج متابعة</div>
                                <div className="mt-3 text-xl font-black text-gray-900">{displayText(weakSkill?.skill) || 'بانتظار بيانات المهارات'}</div>
                                <div className="mt-2 text-sm text-gray-500">{displayText(weakSkill?.section) || 'مهارة عامة'}</div>
                                <div className="mt-4 rounded-full bg-gray-100 h-2 overflow-hidden">
                                    <div className="h-full rounded-full bg-amber-500" style={{ width: `${Math.max(0, Math.min(100, Number(weakSkill?.mastery) || 0))}%` }} />
                                </div>
                                <div className="mt-2 text-xs font-bold text-amber-700">الإتقان: {Math.round(Number(weakSkill?.mastery) || 0)}%</div>
                            </Card>

                            <Card className="p-5">
                                <div className="text-xs font-bold text-gray-500">المتابعة المقترحة</div>
                                <div className="mt-3 text-xl font-black text-gray-900">{displayText(leadStudent?.name) || 'كل الأبناء'}</div>
                                <p className="mt-3 text-sm leading-7 text-gray-600">
                                    راجع معه المهارة الأضعف لمدة 15 دقيقة، ثم اطلب منه حل تدريب قصير. ركز على التشجيع وليس اللوم.
                                </p>
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
                <button
                    onClick={() => printElementAsPdf('reports-print-area', 'تقرير الأداء')}
                    className="print-hide inline-flex items-center justify-center gap-2 rounded-xl border border-indigo-100 bg-white px-4 py-2 text-sm font-bold text-indigo-700 shadow-sm hover:bg-indigo-50"
                >
                    <Download size={16} />
                    تحميل PDF
                </button>
                <button
                    onClick={downloadPerformanceWorkbook}
                    className="print-hide inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-100 bg-white px-4 py-2 text-sm font-bold text-emerald-700 shadow-sm hover:bg-emerald-50"
                >
                    <FileText size={16} />
                    تصدير Excel
                </button>
                {isStudentView && hasStudentAnalytics ? (
                    <button
                        onClick={() => setStudentReportDepth((current) => (current === 'simple' ? 'full' : 'simple'))}
                        className="print-hide inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50"
                    >
                        <Sparkles size={16} />
                        {isStudentReportFull ? 'العودة للملخص السريع' : 'عرض التقرير الكامل'}
                    </button>
                ) : null}
            </header>

            <Card className="p-4 sm:p-6 border-0 shadow-sm bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white overflow-hidden relative">
                <div className="absolute -left-10 -top-10 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
                <div className="absolute -bottom-12 right-10 h-40 w-40 rounded-full bg-indigo-400/20 blur-3xl" />
                <div className="relative z-10 grid gap-5 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
                    <div>
                        <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-black text-indigo-100">
                            <Sparkles size={14} />
                            القرار السريع من التقرير
                        </div>
                        <h2 className="text-2xl font-black leading-9">
                            {isStudentView ? 'ابدأ بخطوة واحدة واضحة اليوم' : 'ابدأ التدخل من أعلى نقطة تأثير'}
                        </h2>
                        <p className="mt-3 max-w-3xl text-sm leading-8 text-indigo-100">
                            {isStudentView
                                ? (studentFollowUpSummary || 'حل اختبارًا قصيرًا أولًا حتى نحدد المهارة التي تحتاج متابعة.')
                                : (scopedFollowUpSummary || 'بمجرد تحميل بيانات النطاق سيظهر هنا ملخص سريع للطالب أو المهارة التي تحتاج تدخلًا.')}
                        </p>
                        <div className="print-hide mt-4 flex flex-wrap gap-2">
                            {isStudentView ? (
                                <>
                                    <button
                                        onClick={copyStudentSummary}
                                        className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-black text-slate-900 hover:bg-indigo-50"
                                    >
                                        {copiedStudentSummary ? <CheckCircle size={16} /> : <Copy size={16} />}
                                        {copiedStudentSummary ? 'تم النسخ' : 'نسخ ملخص ولي الأمر'}
                                    </button>
                                    <button
                                        onClick={shareStudentSummary}
                                        className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-black text-white hover:bg-white/15"
                                    >
                                        {sharedStudentSummary ? <CheckCircle size={16} /> : <Share2 size={16} />}
                                        {sharedStudentSummary ? 'تمت المشاركة' : 'مشاركة الملخص'}
                                    </button>
                                </>
                            ) : (
                                <>
                                    <button
                                        onClick={copyScopedSummary}
                                        disabled={!scopedFollowUpSummary}
                                        className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-black text-slate-900 hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        {copiedScopedSummary ? <CheckCircle size={16} /> : <Copy size={16} />}
                                        {copiedScopedSummary ? 'تم النسخ' : 'نسخ ملخص المتابعة'}
                                    </button>
                                    <button
                                        onClick={shareScopedSummary}
                                        disabled={!scopedFollowUpSummary}
                                        className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-black text-white hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        {sharedScopedSummary ? <CheckCircle size={16} /> : <Share2 size={16} />}
                                        {sharedScopedSummary ? 'تمت المشاركة' : 'مشاركة الملخص'}
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                        <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
                            <div className="text-xs font-bold text-indigo-100">أهم مؤشر</div>
                            <div className="mt-2 text-2xl font-black">
                                {isStudentView ? `${stats?.averageScore ?? 0}%` : `${scopedAnalytics?.scope.studentCount ?? 0} طالب`}
                            </div>
                            <div className="mt-1 text-xs font-bold text-indigo-100">
                                {isStudentView ? 'متوسط الأداء' : 'داخل نطاق المتابعة'}
                            </div>
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
                            <div className="text-xs font-bold text-indigo-100">أولوية الآن</div>
                            <div className="mt-2 text-base font-black leading-7">
                                {isStudentView
                                    ? displayText(weakestSkill?.skill) || 'ابدأ باختبار قصير'
                                    : displayText(scopedAnalytics?.weakestSkills?.[0]?.skill) || 'بانتظار بيانات المهارات'}
                            </div>
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
                            <div className="text-xs font-bold text-indigo-100">الخطوة التالية</div>
                            <div className="mt-2 text-sm font-bold leading-7">
                                {isStudentView ? 'شرح قصير + تدريب + إعادة قياس' : 'تدخل موجه + اختبار متابعة'}
                            </div>
                        </div>
                    </div>
                </div>
            </Card>

            {!isStudentView && (
                <Card className="p-4 sm:p-6 border-0 shadow-sm bg-white">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-5">
                        <div>
                            <h2 className="text-lg sm:text-xl font-bold text-gray-900 leading-tight">لوحة المتابعة حسب الدور</h2>
                            <p className="text-sm text-gray-500 mt-1">
                                {roleScopeTitle[user.role] || 'نطاقك الحالي'} - لمتابعة الطلاب الضعاف والمهارات الأضعف وخطط التدخل.
                            </p>
                        </div>
                        <div className="text-xs px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 font-bold">
                            {user.role === Role.ADMIN ? 'مدير' : user.role === Role.SUPERVISOR ? 'مشرف' : user.role === Role.TEACHER ? 'معلم' : 'ولي أمر'}
                        </div>
                    </div>

                    {scopedAnalyticsLoading ? (
                        <div className="text-sm text-gray-500">جارٍ تحميل التقارير المجمعة...</div>
                    ) : scopedAnalytics ? (
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                <div className="rounded-2xl bg-gray-50 p-4">
                                    <div className="text-xs text-gray-500 mb-1">الطلاب داخل النطاق</div>
                                    <div className="text-2xl font-black text-gray-900">{scopedAnalytics.scope.studentCount}</div>
                                </div>
                                <div className="rounded-2xl bg-amber-50 p-4">
                                    <div className="text-xs text-amber-600 mb-1">محاولات الاختبار</div>
                                    <div className="text-2xl font-black text-amber-700">{scopedAnalytics.scope.quizAttempts}</div>
                                </div>
                                <div className="rounded-2xl bg-rose-50 p-4">
                                    <div className="text-xs text-rose-600 mb-1">الطلاب الأضعف</div>
                                    <div className="text-2xl font-black text-rose-700">{scopedAnalytics.weakestStudents.length}</div>
                                </div>
                                <div className="rounded-2xl bg-purple-50 p-4">
                                    <div className="text-xs text-purple-600 mb-1">إجابات مرصودة</div>
                                    <div className="text-2xl font-black text-purple-700">{scopedAnalytics.scope.questionAttempts || 0}</div>
                                    <div className="mt-1 text-[11px] font-bold text-purple-500">من كل سؤال يحله الطالب</div>
                                </div>
                            </div>

                            <div className="rounded-3xl border border-gray-100 bg-slate-50/70 p-4 sm:p-5">
                                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between mb-4">
                                    <div>
                                        <div className="text-lg font-black text-gray-900">خطة تدخل سريعة لهذا النطاق</div>
                                        <p className="text-sm leading-7 text-gray-500">
                                            ثلاث خطوات عملية تصلح للمدير أو المعلم أو المشرف أو ولي الأمر، وتظهر في ملف PDF للمتابعة.
                                        </p>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        <button
                                            onClick={copyScopedSummary}
                                            className="print-hide inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-black text-indigo-700 hover:bg-indigo-50"
                                        >
                                            {copiedScopedSummary ? <CheckCircle size={13} /> : <Copy size={13} />}
                                            {copiedScopedSummary ? 'تم النسخ' : 'نسخ ملخص المتابعة'}
                                        </button>
                                        <button
                                            onClick={shareScopedSummary}
                                            className="print-hide inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-black text-emerald-700 hover:bg-emerald-50"
                                        >
                                            {sharedScopedSummary ? <CheckCircle size={13} /> : <Share2 size={13} />}
                                            {sharedScopedSummary ? 'تمت المشاركة' : 'مشاركة'}
                                        </button>
                                        <button
                                            onClick={buildScopedSmartRemediation}
                                            disabled={scopedSmartRemediationLoading || !scopedAnalytics.weakestSkills.length}
                                            className="print-hide inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-800 hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-60"
                                        >
                                            {scopedSmartRemediationLoading ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
                                            {scopedSmartRemediationLoading ? 'جارٍ التجهيز' : 'تدخل ذكي'}
                                        </button>
                                        <span className="self-start rounded-full bg-white px-3 py-1 text-xs font-black text-indigo-700">تشخيص - علاج - قياس</span>
                                    </div>
                                </div>
                                {scopedFollowUpSummary ? (
                                    <div className="mb-4 rounded-2xl border border-white bg-white/70 p-3 text-sm leading-7 text-slate-600">
                                        {scopedFollowUpSummary}
                                    </div>
                                ) : null}
                                <div className="mb-4 grid gap-3 lg:grid-cols-3">
                                    <div className="rounded-2xl border border-rose-100 bg-white p-4">
                                        <div className="text-xs font-black text-rose-600">أولوية الطالب</div>
                                        <div className="mt-2 text-base font-black leading-7 text-gray-900">
                                            {displayText(scopedLeadStudent?.name) || 'بانتظار ظهور طالب يحتاج متابعة'}
                                        </div>
                                        <p className="mt-2 text-sm leading-7 text-gray-600">
                                            {scopedLeadStudent
                                                ? `${scopedLeadStudent.averageScore}% متوسط الأداء - ${scopedLeadStudent.weakSkillCount} مهارات تحتاج دعمًا.`
                                                : 'عند ظهور بيانات كافية سيظهر هنا أول طالب تحتاج أن تبدأ به.'}
                                        </p>
                                        {scopedLeadStudent ? (
                                            <div className="print-hide mt-3 flex flex-wrap gap-2">
                                                <button
                                                    onClick={() => navigator.clipboard.writeText(scopedLeadStudentSummary).catch(() => undefined)}
                                                    className="rounded-full bg-rose-50 px-3 py-1.5 text-xs font-black text-rose-700 hover:bg-rose-100"
                                                >
                                                    نسخ خطة المتابعة
                                                </button>
                                                <Link to="/dashboard?tab=reports" className="rounded-full bg-gray-100 px-3 py-1.5 text-xs font-black text-gray-700 hover:bg-gray-200">
                                                    فتح التقارير
                                                </Link>
                                            </div>
                                        ) : null}
                                    </div>
                                    <div className="rounded-2xl border border-amber-100 bg-white p-4">
                                        <div className="text-xs font-black text-amber-600">أولوية المهارة الجماعية</div>
                                        <div className="mt-2 text-base font-black leading-7 text-gray-900">
                                            {displayText(scopedLeadSkill?.skill) || 'بانتظار بيانات المهارات'}
                                        </div>
                                        <p className="mt-2 text-sm leading-7 text-gray-600">
                                            {scopedLeadSkill
                                                ? `${scopedLeadSkill.affectedStudents} طلاب متأثرون - ${scopedLeadSkill.mastery}% إتقان حالي.`
                                                : 'عند تراكم النتائج سيظهر هنا أول محور يحتاج تدخلاً جماعيًا.'}
                                        </p>
                                        {scopedLeadSkill ? (
                                            <div className="print-hide mt-3 flex flex-wrap gap-2">
                                                <Link to="/quiz" className="rounded-full bg-amber-50 px-3 py-1.5 text-xs font-black text-amber-700 hover:bg-amber-100">
                                                    اختبار متابعة
                                                </Link>
                                                <Link to={buildSkillSessionLink({ skill: scopedLeadSkill.skill, skillId: scopedLeadSkill.skillId, sectionName: scopedLeadSkill.section })} className="rounded-full bg-gray-100 px-3 py-1.5 text-xs font-black text-gray-700 hover:bg-gray-200">
                                                    حجز شرح
                                                </Link>
                                            </div>
                                        ) : null}
                                    </div>
                                    <div className="rounded-2xl border border-indigo-100 bg-white p-4">
                                        <div className="text-xs font-black text-indigo-600">أولوية المادة</div>
                                        <div className="mt-2 text-base font-black leading-7 text-gray-900">
                                            {displayText(scopedLeadSubject?.subjectName) || 'بانتظار توزيع المواد'}
                                        </div>
                                        <p className="mt-2 text-sm leading-7 text-gray-600">
                                            {scopedLeadSubject
                                                ? `${scopedLeadSubject.weakStudents} طلاب يحتاجون دعمًا - ${scopedLeadSubject.mastery}% مستوى المادة حاليًا.`
                                                : 'عند ظهور فروق واضحة بين المواد سيقترح لك التقرير المادة التي تبدأ بها.'}
                                        </p>
                                        {scopedLeadSubject ? (
                                            <div className="mt-3 rounded-xl bg-indigo-50 px-3 py-2 text-xs font-bold leading-6 text-indigo-700">
                                                الإجراء المقترح: تدريب قصير في هذه المادة ثم قياس تحسن الطلاب الضعاف خلال نفس الأسبوع.
                                            </div>
                                        ) : null}
                                    </div>
                                </div>
                                <div className="grid gap-3 lg:grid-cols-3">
                                    {scopedInterventionPlan.map((item) => (
                                        <div key={item.title} className={`rounded-2xl border p-4 ${item.className}`}>
                                            <div className="text-xs font-black opacity-70">{item.title}</div>
                                            <div className="mt-2 text-base font-black leading-7">{item.label}</div>
                                            <p className="mt-2 text-sm leading-7">{item.body}</p>
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
                                                <div className="text-lg font-black text-gray-900">{displayText(scopedSmartRemediation.title) || 'خطة تدخل للنطاق الحالي'}</div>
                                                <p className="mt-2 text-sm leading-7 text-gray-600">
                                                    {displayText(scopedSmartRemediation.summary) || 'ابدأ بالمهارة الأكثر ضعفًا، ثم أنشئ متابعة قصيرة وقابلة للقياس.'}
                                                </p>
                                            </div>
                                            <Link to="/quiz" className="self-start rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white hover:bg-slate-800">
                                                إنشاء اختبار متابعة
                                            </Link>
                                        </div>
                                        <div className="mt-4 grid gap-3 lg:grid-cols-3">
                                            {(scopedSmartRemediation.steps || []).slice(0, 3).map((step, index) => (
                                                <div key={`${step.day || index}-${step.skill || index}`} className="rounded-2xl border border-gray-100 bg-slate-50 p-4">
                                                    <div className="rounded-full bg-white px-3 py-1 text-xs font-black text-indigo-700 inline-flex">
                                                        {displayText(step.day) || `خطوة ${index + 1}`}
                                                    </div>
                                                    <div className="mt-3 font-black leading-7 text-gray-900">{displayText(step.skill) || 'مهارة تحتاج متابعة'}</div>
                                                    <p className="mt-2 text-sm leading-7 text-gray-600">{displayText(step.action) || 'وجّه نشاطًا علاجيًا قصيرًا.'}</p>
                                                    <div className="mt-3 text-xs font-bold leading-6 text-gray-500">
                                                        قياس التحسن: {displayText(step.check) || 'اختبار قصير بعد التدخل.'}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        {scopedSmartRemediation.parentNote ? (
                                            <div className="mt-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-bold leading-7 text-emerald-800">
                                                توجيه متابعة: {displayText(scopedSmartRemediation.parentNote)}
                                            </div>
                                        ) : null}
                                    </div>
                                ) : null}
                            </div>

                            <div className="rounded-3xl border border-gray-100 bg-white p-4 sm:p-5">
                                <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                    <div>
                                        <div className="text-lg font-black text-gray-900">آخر محاولات داخل النطاق</div>
                                        <p className="text-sm leading-7 text-gray-500">
                                            هذه القائمة تربط المشرف وولي الأمر بنتائج الطلاب الفعلية، وليست أرقامًا عامة فقط.
                                        </p>
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
                                            const resultDate = result.date || result.createdAt;

                                            return (
                                                <div key={resultId} className="rounded-2xl border border-gray-100 bg-slate-50 p-4">
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div className="min-w-0">
                                                            <div className="text-xs font-bold text-gray-500">{displayText(result.studentName) || 'طالب'}</div>
                                                            <div className="mt-1 font-black leading-7 text-gray-900">{displayText(result.quizTitle) || 'اختبار'}</div>
                                                        </div>
                                                        <div className={`rounded-full px-3 py-1 text-sm font-black ${Number(result.score || 0) >= 75 ? 'bg-emerald-50 text-emerald-700' : Number(result.score || 0) >= 50 ? 'bg-amber-50 text-amber-700' : 'bg-rose-50 text-rose-700'}`}>
                                                            {Number(result.score || 0)}%
                                                        </div>
                                                    </div>
                                                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                                                        <div className="rounded-xl bg-white px-3 py-2">
                                                            <div className="font-bold text-gray-500">صحيح</div>
                                                            <div className="mt-1 font-black text-gray-900">{Number(result.correctAnswers || 0)}</div>
                                                        </div>
                                                        <div className="rounded-xl bg-white px-3 py-2">
                                                            <div className="font-bold text-gray-500">الأسئلة</div>
                                                            <div className="mt-1 font-black text-gray-900">{Number(result.totalQuestions || 0)}</div>
                                                        </div>
                                                    </div>
                                                    {weakSkills.length ? (
                                                        <div className="mt-3 text-xs font-bold leading-6 text-rose-700">
                                                            أولوية متابعة: {weakSkills.map((skill) => `${displayText(skill.skill) || 'مهارة'} (${Number(skill.mastery || 0)}%)`).join('، ')}
                                                        </div>
                                                    ) : (
                                                        <div className="mt-3 text-xs font-bold leading-6 text-emerald-700">لا توجد مهارات ضعيفة واضحة في هذه المحاولة.</div>
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

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                <div className="space-y-3">
                                    <div className="font-bold text-gray-900">الطلاب الأضعف حاليًا</div>
                                    {scopedAnalytics.weakestStudents.length > 0 ? scopedAnalytics.weakestStudents.slice(0, 5).map((student) => (
                                        <div key={student.id} className="border border-gray-100 rounded-xl p-4 bg-gray-50/60">
                                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-2">
                                                <div>
                                                    <div className="font-bold text-gray-900">{displayText(student.name)}</div>
                                                    <div className="text-xs text-gray-500">
                                                        {displayText(student.schoolName) || 'بدون مدرسة'}
                                                        {student.groupNames?.length ? ` - ${student.groupNames.map(displayText).join('، ')}` : ''}
                                                    </div>
                                                </div>
                                                <div className={`text-lg font-black ${student.averageScore < 50 ? 'text-rose-600' : 'text-amber-600'}`}>
                                                    {student.averageScore}%
                                                </div>
                                            </div>
                                            <div className="text-xs text-gray-600 space-y-1">
                                                <div>عدد المحاولات: <span className="font-bold">{student.attempts}</span></div>
                                                <div>المهارات الضعيفة: <span className="font-bold">{student.weakSkillCount}</span></div>
                                                {student.weakestSkills?.length ? (
                                                    <div>
                                                        أبرز نقاط الضعف:
                                                        <span className="font-bold"> {student.weakestSkills.map((skill) => `${displayText(skill.skill)} (${skill.mastery}%)`).join(' - ')}</span>
                                                    </div>
                                                ) : null}
                                                {student.recommendedAction ? <div className="text-indigo-700">الإجراء المقترح: <span className="font-bold">{displayText(student.recommendedAction)}</span></div> : null}
                                            </div>
                                            <div className="print-hide mt-3 flex flex-wrap gap-2">
                                                <button
                                                    onClick={() => navigator.clipboard.writeText([
                                                        `الطالب: ${displayText(student.name)}`,
                                                        `المتوسط الحالي: ${student.averageScore}%`,
                                                        student.weakestSkills?.length ? `أبرز المهارات: ${student.weakestSkills.map((skill) => `${displayText(skill.skill)} (${skill.mastery}%)`).join('، ')}` : '',
                                                        displayText(student.recommendedAction) ? `الإجراء المقترح: ${displayText(student.recommendedAction)}` : 'الإجراء المقترح: شرح قصير ثم تدريب علاجي.'
                                                    ].filter(Boolean).join('\n')).catch(() => undefined)}
                                                    className="rounded-full bg-white px-3 py-1.5 text-xs font-black text-indigo-700 hover:bg-indigo-50"
                                                >
                                                    نسخ المتابعة
                                                </button>
                                                <Link to="/dashboard?tab=reports" className="rounded-full bg-white px-3 py-1.5 text-xs font-black text-gray-700 hover:bg-gray-100">
                                                    فتح تقارير الطالب
                                                </Link>
                                            </div>
                                        </div>
                                    )) : (
                                        <div className="border border-dashed border-gray-200 rounded-xl p-4 text-sm text-gray-500">لا توجد بيانات طلاب مرتبطة بهذا النطاق بعد.</div>
                                    )}
                                </div>

                                <div className="space-y-3">
                                    <div className="font-bold text-gray-900">المهارات الأضعف على مستوى النطاق</div>
                                    {scopedAnalytics.weakestSkills.length > 0 ? scopedAnalytics.weakestSkills.slice(0, 6).map((skill) => (
                                        <div key={`${skill.skillId || skill.skill}`} className="border border-gray-100 rounded-xl p-4 bg-white">
                                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-2">
                                                <div>
                                                    <div className="font-bold text-gray-900">{displayText(skill.skill)}</div>
                                                    <div className="text-xs text-gray-500">{displayText(skill.section) || 'مهارة فرعية'}</div>
                                                </div>
                                                <div className={`text-lg font-black ${skill.mastery < 50 ? 'text-rose-600' : 'text-amber-600'}`}>{skill.mastery}%</div>
                                            </div>
                                            <div className="text-xs text-gray-600 space-y-1">
                                                <div>طلاب متأثرون: <span className="font-bold">{skill.affectedStudents}</span></div>
                                                <div>محاولات مرتبطة: <span className="font-bold">{skill.attempts}</span></div>
                                                {skill.recommendedAction ? <div className="text-indigo-700">التدخل المقترح: <span className="font-bold">{displayText(skill.recommendedAction)}</span></div> : null}
                                            </div>
                                            <div className="print-hide mt-3 flex flex-wrap gap-2">
                                                <Link to="/quiz" className="rounded-full bg-amber-50 px-3 py-1.5 text-xs font-black text-amber-700 hover:bg-amber-100">
                                                    اختبار موجه
                                                </Link>
                                                <Link to={buildSkillSessionLink({ skill: skill.skill, skillId: skill.skillId, sectionName: skill.section })} className="rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-black text-indigo-700 hover:bg-indigo-100">
                                                    شرح أو حصة
                                                </Link>
                                            </div>
                                        </div>
                                    )) : (
                                        <div className="border border-dashed border-gray-200 rounded-xl p-4 text-sm text-gray-500">لا توجد مهارات ضعيفة مجمعة حتى الآن.</div>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                <div className="space-y-3">
                                    <div className="font-bold text-gray-900">المواد التي تحتاج تدخلًا</div>
                                    {scopedAnalytics.subjectSummaries.length > 0 ? scopedAnalytics.subjectSummaries.slice(0, 6).map((subject) => (
                                        <div key={subject.subjectId || subject.subjectName} className="border border-gray-100 rounded-xl p-4 bg-gray-50/50 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                            <div>
                                                <div className="font-bold text-gray-900">{displayText(subject.subjectName)}</div>
                                                <div className="text-xs text-gray-500">طلاب ضعفاء: {subject.weakStudents}</div>
                                                <div className="mt-2 text-xs font-bold text-indigo-600">
                                                    التدخل المقترح: تدريب قصير في المادة ثم قياس خلال نفس الأسبوع.
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <div className={`text-lg font-black ${subject.mastery < 50 ? 'text-rose-600' : 'text-amber-600'}`}>{subject.mastery}%</div>
                                                <Link to="/quizzes" className="print-hide rounded-full bg-white px-3 py-1.5 text-xs font-black text-gray-700 hover:bg-gray-100">
                                                    اختبارات المادة
                                                </Link>
                                            </div>
                                        </div>
                                    )) : (
                                        <div className="border border-dashed border-gray-200 rounded-xl p-4 text-sm text-gray-500">لا توجد مواد تحتاج تدخلًا ظاهرًا الآن.</div>
                                    )}
                                </div>

                                <div className="space-y-3">
                                    <div className="font-bold text-gray-900">اختبارات المتابعة الموجهة</div>
                                    {scopedAnalytics.assignedFollowUps.length > 0 ? scopedAnalytics.assignedFollowUps.slice(0, 5).map((quiz) => (
                                        <div key={quiz.id} className="border border-gray-100 rounded-xl p-4 bg-white flex items-center justify-between gap-3">
                                            <div>
                                                <div className="font-bold text-gray-900">{displayText(quiz.title)}</div>
                                                <div className="text-xs text-gray-500">
                                                    {quiz.mode === 'central' ? 'اختبار مركزي موجه' : 'اختبار ساهر جاهز'}
                                                    {quiz.dueDate ? ` - حتى ${new Date(quiz.dueDate).toLocaleDateString('ar-SA')}` : ''}
                                                </div>
                                            </div>
                                            <Link to={`/quiz/${quiz.id}`} className="px-3 py-2 rounded-lg bg-gray-900 text-white text-sm font-bold hover:bg-gray-800">
                                                فتح
                                            </Link>
                                        </div>
                                    )) : (
                                        <div className="border border-dashed border-gray-200 rounded-xl p-4 text-sm text-gray-500">لا توجد اختبارات متابعة موجهة داخل هذا النطاق حاليًا.</div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="border border-dashed border-gray-200 rounded-xl p-4 text-sm text-gray-500">
                            لا توجد بيانات مجمعة كافية لهذا الدور حتى الآن. إن كان الدور ولي أمر، اربطه أولًا بالطلاب من إدارة المستخدمين.
                        </div>
                    )}
                </Card>
            )}

            {isStudentView && hasStudentAnalytics && (
            <>
            <Card className="p-4 sm:p-6 border-0 shadow-sm bg-slate-900 text-white overflow-hidden">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                        <div className="mb-3 inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-black text-indigo-100">
                            تقرير مبسط للطالب
                        </div>
                        <h2 className="text-2xl font-black leading-tight">خطوة واحدة واضحة اليوم</h2>
                        <p className="mt-3 max-w-3xl text-sm leading-7 text-indigo-100">
                            {studentFollowUpSummary}
                        </p>
                    </div>
                    <div className="grid min-w-full gap-2 sm:min-w-[320px] sm:grid-cols-2 lg:min-w-[380px]">
                        <button
                            onClick={copyStudentSummary}
                            className="print-hide inline-flex items-center justify-center gap-2 rounded-xl bg-white/10 px-4 py-3 text-sm font-black text-white transition hover:bg-white/20"
                        >
                            {copiedStudentSummary ? <CheckCircle size={16} /> : <Copy size={16} />}
                            {copiedStudentSummary ? 'تم النسخ' : 'نسخ الملخص'}
                        </button>
                        <button
                            onClick={shareStudentSummary}
                            className="print-hide inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-black text-indigo-800 transition hover:bg-indigo-50"
                        >
                            {sharedStudentSummary ? <CheckCircle size={16} /> : <Share2 size={16} />}
                            {sharedStudentSummary ? 'تمت المشاركة' : 'مشاركة'}
                        </button>
                        <Link to="/plan" className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-3 text-sm font-black text-white transition hover:bg-emerald-600 sm:col-span-2">
                            <Target size={16} />
                            افتح الخطة الذكية
                        </Link>
                        {isStudentReportFull ? (
                            <button
                                onClick={() => {
                                    void buildSmartRemediation();
                                }}
                                disabled={smartRemediationLoading || focusedReportSkills.length === 0}
                                className="print-hide inline-flex items-center justify-center gap-2 rounded-xl bg-amber-400 px-4 py-3 text-sm font-black text-slate-900 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60 sm:col-span-2"
                            >
                                {smartRemediationLoading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                                {smartRemediationLoading ? 'جارٍ تجهيز الخطة...' : 'اقتراح علاجي ذكي'}
                            </button>
                        ) : (
                            <button
                                onClick={() => setStudentReportDepth('full')}
                                className="print-hide inline-flex items-center justify-center gap-2 rounded-xl bg-amber-400 px-4 py-3 text-sm font-black text-slate-900 transition hover:bg-amber-300 sm:col-span-2"
                            >
                                <Sparkles size={16} />
                                عرض التقرير الكامل
                            </button>
                        )}
                    </div>
                </div>
            </Card>

            {!isStudentReportFull ? (
                <Card className="p-4 sm:p-6 border-0 shadow-sm bg-white">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                            <h2 className="text-xl font-black text-gray-900">ابدأ من هذه المهارة فقط</h2>
                            <p className="mt-1 text-sm leading-7 text-gray-500">
                                هنا نعرض للطالب أقل قدر من التفاصيل: مهارة واحدة، ثم ثلاث خطوات تنفيذ. باقي التحليل موجود في التقرير الكامل.
                            </p>
                        </div>
                        <button
                            onClick={() => setStudentReportDepth('full')}
                            className="print-hide self-start rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-700"
                        >
                            عرض كل التفاصيل
                        </button>
                    </div>

                    <div className="mt-5">
                        {focusedReportSkills.length > 0 ? focusedReportSkills.slice(0, 1).map((skill, index) => {
                            const tone = getReportMasteryTone(skill.mastery);
                            const recommendation = getSkillRecommendation(skill, skills, lessons, quizzes, libraryItems, questions, topics);

                            return (
                                <div key={`${getReportSkillKey(skill)}-${index}`} className={`rounded-3xl border p-4 sm:p-5 ${tone.bg} ${tone.border}`}>
                                    <div className="grid gap-4 lg:grid-cols-[minmax(0,0.95fr)_1.4fr]">
                                        <div>
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="min-w-0">
                                                    <span className={`inline-flex rounded-full bg-white/80 px-3 py-1 text-xs font-black ${tone.text}`}>
                                                        ابدأ هنا
                                                    </span>
                                                    <div className="mt-3 text-lg font-black leading-8 text-gray-900 break-words">{displayText(skill.skill)}</div>
                                                </div>
                                                <div className={`text-3xl font-black ${tone.text}`}>{skill.mastery}%</div>
                                            </div>
                                            <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/70">
                                                <div className={`h-full rounded-full ${tone.bar}`} style={{ width: `${skill.mastery}%` }} />
                                            </div>
                                            <div className="mt-3 grid gap-2 text-xs font-bold text-gray-600">
                                                {skill.subjectName ? <span className="rounded-xl bg-white/80 px-3 py-2">المادة: {displayText(skill.subjectName)}</span> : null}
                                                {skill.sectionName ? <span className="rounded-xl bg-white/80 px-3 py-2">المهارة الرئيسية: {displayText(skill.sectionName)}</span> : null}
                                            </div>
                                            <p className="mt-3 text-sm font-bold leading-7 text-gray-700">
                                                {displayText(recommendation.actionText) || 'راجع شرحًا قصيرًا ثم حل تدريبًا بسيطًا.'}
                                            </p>
                                        </div>
                                        <div className="grid gap-3 sm:grid-cols-3">
                                            {studentQuickActions.map(({ title, body, label, link, Icon, className }) => (
                                                <Link key={title} to={link} className={`print-hide flex min-h-[154px] flex-col justify-between rounded-2xl border p-4 transition hover:-translate-y-0.5 hover:shadow-sm ${className}`}>
                                                    <div>
                                                        <Icon size={20} />
                                                        <div className="mt-3 text-sm font-black">{title}</div>
                                                        <p className="mt-2 text-xs font-bold leading-6 opacity-80">{body}</p>
                                                    </div>
                                                    <span className="mt-4 inline-flex justify-center rounded-xl bg-white px-3 py-2 text-xs font-black text-slate-800">
                                                        {label}
                                                    </span>
                                                </Link>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            );
                        }) : (
                            <div className="rounded-3xl border border-dashed border-gray-200 bg-gray-50 p-6 text-center text-sm font-bold leading-7 text-gray-500">
                                لا توجد مهارات كافية بعد. حل اختبارًا قصيرًا مرتبطًا بالمهارات، وسيظهر هنا ملخص واضح تلقائيًا.
                            </div>
                        )}
                    </div>

                    {showCompactStudentView ? (
                        <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 p-4">
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                <div>
                                    <div className="text-sm font-black text-gray-900">لماذا التقرير قصير؟</div>
                                    <p className="mt-1 text-sm leading-7 text-gray-500">
                                        المقصود أن يعرف الطالب ماذا يذاكر الآن فقط. المدير وولي الأمر والتقرير الكامل يحتفظون بالتفاصيل والأرقام.
                                    </p>
                                </div>
                                <button
                                    onClick={() => setStudentReportDepth('full')}
                                    className="self-start rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-700"
                                >
                                    فتح التفاصيل
                                </button>
                            </div>
                        </div>
                    ) : null}
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
                    <Link to="/quizzes" className="self-start rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-700">
                        اختبر مهارة جديدة
                    </Link>
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
                                    <Link to="/quizzes" className="rounded-xl bg-white px-4 py-3 text-sm font-black text-slate-600 border border-slate-200 hover:bg-slate-50 flex items-center justify-center gap-2">
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
                                <div className="mt-3 text-xs font-bold text-gray-500">اضغط لعرض المقترحات</div>
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
                                    <Link to="/quizzes" className="rounded-xl bg-white px-4 py-3 text-sm font-black text-slate-600 border border-slate-200 hover:bg-slate-50 flex items-center gap-2">
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
