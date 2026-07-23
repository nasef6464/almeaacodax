import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    Activity,
    Bell,
    BookOpen,
    Building2,
    CreditCard,
    FileQuestion,
    FolderOpen,
    LayoutDashboard,
    Settings,
    Target,
    User,
    Users,
    Award,
    AlertTriangle,
    CheckCircle2,
    EyeOff,
    Video,
    Bot,
    Megaphone,
    Type,
    QrCode,
} from 'lucide-react';
import { DashboardLayout } from '../../components/DashboardLayout';
import { useStore } from '../../store/useStore';
import { Role } from '../../types';
import { api } from '../../services/api';

const lazyNamed = <TProps extends object>(
    loader: () => Promise<Record<string, React.ComponentType<TProps>>>,
    exportName: string,
) =>
    React.lazy(async () => {
        const module = await loader();
        return { default: module[exportName] };
    });

const UsersManager = lazyNamed(() => import('./UsersManager'), 'UsersManager');
const SchoolsManager = lazyNamed(() => import('./SchoolsManager'), 'SchoolsManager');
const SchoolPortalManager = lazyNamed(() => import('./SchoolPortalManager'), 'SchoolPortalManager');
const PathsManager = lazyNamed(() => import('./PathsManager'), 'PathsManager');
const QuestionBankManager = lazyNamed(() => import('./QuestionBankManager'), 'QuestionBankManager');
const LessonsManager = lazyNamed(() => import('./LessonsManager'), 'LessonsManager');
const LibraryManager = lazyNamed<{ subjectId: string }>(() => import('./LibraryManager'), 'LibraryManager');
const QuizzesManager = lazyNamed(() => import('./QuizzesManager'), 'QuizzesManager');
const SkillsTreeManager = lazyNamed(() => import('./SkillsTreeManager'), 'SkillsTreeManager');
const FinancialManager = lazyNamed(() => import('./FinancialManager'), 'FinancialManager');
const MembershipsManager = lazyNamed(() => import('./MembershipsManager'), 'MembershipsManager');
const NotificationsManager = lazyNamed(() => import('./NotificationsManager'), 'NotificationsManager');
const HomepageManager = lazyNamed(() => import('./HomepageManager'), 'HomepageManager');
const PlatformFontsManager = lazyNamed(() => import('./PlatformFontsManager'), 'PlatformFontsManager');
const PlatformIntegrationsManager = lazyNamed(() => import('./PlatformIntegrationsManager'), 'PlatformIntegrationsManager');
const LiveSessionsManager = lazyNamed(() => import('./LiveSessionsManager'), 'LiveSessionsManager');
const BackupManager = lazyNamed(() => import('./BackupManager'), 'BackupManager');
const OperationsCommandCenter = lazyNamed(() => import('./OperationsCommandCenter'), 'OperationsCommandCenter');
const AiAssistantManager = lazyNamed(() => import('./AiAssistantManager'), 'AiAssistantManager');
const MockExamManager = lazyNamed(() => import('./MockExamManager'), 'MockExamManager');
const AnnouncementAdsManager = lazyNamed(() => import('./AnnouncementAdsManager'), 'AnnouncementAdsManager');
const PublicBarcodeTestsManager = lazyNamed(() => import('./PublicBarcodeTestsManager'), 'PublicBarcodeTestsManager');

type ReviewQueueItem = {
    id: string;
    itemId: string;
    contentType: 'course' | 'lesson' | 'question' | 'quiz' | 'library';
    type: string;
    title: string;
    ownerType: string;
};

type TeacherContributionItem = {
    id: string;
    name: string;
    managedPaths: number;
    managedSubjects: number;
    totalItems: number;
    pendingItems: number;
    approvedItems: number;
    publishedItems: number;
};

type AiStatus = {
    provider: 'gemini' | 'ollama' | 'lmstudio' | 'none';
    ollamaConfigured: boolean;
    lmStudioConfigured?: boolean;
    geminiConfigured: boolean;
    model: string;
    timeoutMs: number;
};

type OperationalStatus = {
    checkedAt: string;
    database: { status: string; name: string };
    counts: Record<string, number>;
    visible: Record<string, number>;
    learningReadiness: {
        score: number;
        usableSpaces: number;
        emptySpaces: number;
        spaces: Array<{
            pathId: string;
            subjectId: string;
            subjectName: string;
            total: number;
            topics: number;
            lessons: number;
            quizzes: number;
            courses: number;
            library: number;
        }>;
    };
    issues: {
        missingTopicSubjects: number;
        missingLessonRefs: number;
        missingQuizRefs: number;
        unplayableLinkedLessons: number;
    };
    deployment: {
        api: string;
        database: string;
        frontend: string;
        nodeEnv: string;
        clientUrl: string;
    };
};

const AdminTabLoading = () => (
    <div className="rounded-3xl border border-gray-100 bg-white p-10 text-center shadow-sm">
        <div className="mx-auto mb-4 h-12 w-12 animate-pulse rounded-2xl bg-indigo-50" />
        <div className="text-sm font-black text-gray-700">Ø¬Ø§Ø±ÙŠ ØªØ¬Ù‡ÙŠØ² Ø§Ù„Ù‚Ø³Ù…...</div>
        <div className="mt-2 text-xs text-gray-400">ÙŠØªÙ… ØªØ­Ù…ÙŠÙ„ Ø£Ø¯ÙˆØ§Øª Ø§Ù„Ø¥Ø¯Ø§Ø±Ø© Ø§Ù„Ù…Ø·Ù„ÙˆØ¨Ø© ÙÙ‚Ø·.</div>
    </div>
);

const normalizeAdminTabId = (tabId?: string | null) => {
    if (tabId === 'courses') return 'paths';
    if (tabId === 'groups') return 'schools';
    return tabId || undefined;
};

const getRequestedAdminTab = () => {
    const hashQuery = window.location.hash.includes('?') ? window.location.hash.split('?')[1] : '';
    const requestedTab = new URLSearchParams(hashQuery || window.location.search).get('tab');
    return normalizeAdminTabId(requestedTab);
};

export const AdminDashboard: React.FC = () => {
    const {
        user,
        users,
        groups,
        courses,
        quizzes,
        questions,
        lessons,
        libraryItems,
        b2bPackages,
        accessCodes,
        subjects,
        paths,
        examResults,
        updateCourse,
        updateLesson,
        updateQuestion,
        updateQuiz,
        updateLibraryItem,
    } = useStore();
    const [activeTab, setActiveTab] = useState(() => getRequestedAdminTab() || (user.role === Role.ADMIN ? 'paths' : 'overview'));
    const [tabRequestVersion, setTabRequestVersion] = useState(0);
    const [weakStudentFilters, setWeakStudentFilters] = useState({ schoolId: 'all', grade: 'all', classId: 'all', status: 'all' });
    const [studentActionState, setStudentActionState] = useState<{ studentId: string; action: 'alert' | 'quiz' } | null>(null);
    const [studentActionFeedback, setStudentActionFeedback] = useState('');
    const [weeklyAlertState, setWeeklyAlertState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
    const [selectedLibrarySubjectId, setSelectedLibrarySubjectId] = useState('');
    const [aiStatus, setAiStatus] = useState<AiStatus | null>(null);
    const [aiStatusLoading, setAiStatusLoading] = useState(false);
    const [aiStatusError, setAiStatusError] = useState<string | null>(null);
    const [operationalStatus, setOperationalStatus] = useState<OperationalStatus | null>(null);
    const [operationalStatusError, setOperationalStatusError] = useState<string | null>(null);

    useEffect(() => {
        const syncRequestedTab = () => {
            const requestedTab = getRequestedAdminTab();
            if (requestedTab) {
                if (requestedTab !== activeTab) {
                    setActiveTab(requestedTab);
                }
                setTabRequestVersion((current) => current + 1);
            }
        };

        window.addEventListener('hashchange', syncRequestedTab);
        syncRequestedTab();
        return () => window.removeEventListener('hashchange', syncRequestedTab);
    }, [activeTab]);

    const loadAiStatus = async () => {
        if (user.role !== Role.ADMIN) {
            return;
        }

        setAiStatusLoading(true);
        setAiStatusError(null);
        setOperationalStatusError(null);

        try {
            const [aiResponse, operationsResponse] = await Promise.all([
                api.aiStatus(),
                api.getOperationalStatus(),
            ]);
            setAiStatus(aiResponse as AiStatus);
            setOperationalStatus(operationsResponse as OperationalStatus);
        } catch (error) {
            console.error('Failed to load AI status', error);
            setAiStatusError('ØªØ¹Ø°Ø± Ù‚Ø±Ø§Ø¡Ø© Ø­Ø§Ù„Ø© Ø§Ù„Ø°ÙƒØ§Ø¡ Ø§Ù„Ø§ØµØ·Ù†Ø§Ø¹ÙŠ Ø§Ù„Ø¢Ù†. ØªØ£ÙƒØ¯ Ù…Ù† ØªØ´ØºÙŠÙ„ Ø§Ù„Ø®Ø§Ø¯Ù… Ø«Ù… Ø£Ø¹Ø¯ Ø§Ù„Ù…Ø­Ø§ÙˆÙ„Ø©.');
            setOperationalStatusError('ØªØ¹Ø°Ø± Ù‚Ø±Ø§Ø¡Ø© Ø­Ø§Ù„Ø© Ø§Ù„ØªØ´ØºÙŠÙ„ Ù…Ù† Ø§Ù„Ø®Ø§Ø¯Ù… Ø§Ù„Ø¢Ù†.');
        } finally {
            setAiStatusLoading(false);
        }
    };

    useEffect(() => {
        if (activeTab !== 'settings' || user.role !== Role.ADMIN) {
            return;
        }

        const requestIdle = window.requestIdleCallback?.bind(window);
        if (requestIdle) {
            const handle = requestIdle(() => {
                void loadAiStatus();
            }, { timeout: 1800 });
            return () => window.cancelIdleCallback?.(handle);
        }

        const timer = window.setTimeout(() => {
            void loadAiStatus();
        }, 600);
        return () => window.clearTimeout(timer);
    }, [activeTab, user.role]);

    const setActiveAdminTab = useCallback((tabId: string) => {
        const normalizedTabId = normalizeAdminTabId(tabId) || tabId;
        setActiveTab(normalizedTabId);

        const url = new URL(window.location.href);
        url.searchParams.set('tab', normalizedTabId);
        window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
    }, []);

    const librarySubjectOptions = useMemo(
        () =>
            subjects
                .map((subject) => ({
                    subject,
                    path: paths.find((path) => path.id === subject.pathId),
                    fileCount: libraryItems.filter((item) => item.subjectId === subject.id).length,
                    readyCount: libraryItems.filter(
                        (item) =>
                            item.subjectId === subject.id &&
                            item.showOnPlatform !== false &&
                            item.approvalStatus === 'approved' &&
                            Boolean(item.url?.trim()) &&
                            Boolean(item.sectionId) &&
                            Boolean((item.skillIds || []).length),
                    ).length,
                }))
                .sort((a, b) => {
                    const pathCompare = (a.path?.name || '').localeCompare(b.path?.name || '', 'ar');
                    if (pathCompare !== 0) return pathCompare;
                    return a.subject.name.localeCompare(b.subject.name, 'ar');
                }),
        [libraryItems, paths, subjects],
    );

    useEffect(() => {
        if (selectedLibrarySubjectId && librarySubjectOptions.some((item) => item.subject.id === selectedLibrarySubjectId)) {
            return;
        }

        setSelectedLibrarySubjectId(librarySubjectOptions[0]?.subject.id || '');
    }, [librarySubjectOptions, selectedLibrarySubjectId]);

    const overviewStats = useMemo(() => {
        const pendingCourses = courses.filter((item) => item.approvalStatus === 'pending_review').length;
        const pendingLessons = lessons.filter((item) => item.approvalStatus === 'pending_review').length;
        const pendingQuestions = questions.filter((item) => item.approvalStatus === 'pending_review').length;
        const pendingQuizzes = quizzes.filter((item) => item.approvalStatus === 'pending_review').length;
        const pendingLibrary = libraryItems.filter((item) => item.approvalStatus === 'pending_review').length;
        const totalStudents = users.filter((user) => user.role === Role.STUDENT).length;
        const totalTeachers = users.filter((user) => user.role === Role.TEACHER).length;
        const totalSchools = groups.filter((group) => group.type === 'SCHOOL').length;

        return {
            totalStudents,
            totalTeachers,
            totalSchools,
            totalResults: examResults.length,
            pendingReview: pendingCourses + pendingLessons + pendingQuestions + pendingQuizzes + pendingLibrary,
            pendingBreakdown: {
                courses: pendingCourses,
                lessons: pendingLessons,
                questions: pendingQuestions,
                quizzes: pendingQuizzes,
                library: pendingLibrary,
            },
        };
    }, [courses, examResults.length, groups, lessons, libraryItems, questions, quizzes, users]);

    const platformReadiness = useMemo(() => {
        const getSkillIds = (item: {
            skillIds?: string[];
            skillId?: string;
            mainSkillId?: string;
            subSkillId?: string;
        }) =>
            [
                ...(item.skillIds || []),
                item.skillId,
                item.mainSkillId,
                item.subSkillId,
            ].filter(Boolean);

        const questionsById = new Map(questions.map((question) => [question.id, question]));
        const hiddenCourses = courses.filter((item) => item.showOnPlatform === false || item.isPublished === false).length;
        const hiddenLessons = lessons.filter((item) => item.showOnPlatform === false).length;
        const hiddenQuizzes = quizzes.filter((item) => item.showOnPlatform === false || item.isPublished === false).length;
        const hiddenLibrary = libraryItems.filter((item) => item.showOnPlatform === false).length;
        const quizzesWithoutQuestions = quizzes.filter((quiz) => (quiz.questionIds || []).length === 0).length;
        const quizzesWithoutSkills = quizzes.filter((quiz) => {
            const quizSkillIds = getSkillIds(quiz);
            const questionSkillIds = (quiz.questionIds || []).flatMap((questionId) => getSkillIds(questionsById.get(questionId) || {}));
            return [...quizSkillIds, ...questionSkillIds].length === 0;
        }).length;
        const lessonsWithoutSkills = lessons.filter((lesson) => getSkillIds(lesson).length === 0).length;
        const libraryWithoutSkills = libraryItems.filter((item) => getSkillIds(item).length === 0).length;
        const questionsWithoutSkills = questions.filter((question) => getSkillIds(question).length === 0).length;
        const hiddenContent = hiddenCourses + hiddenLessons + hiddenQuizzes + hiddenLibrary;
        const unlinkedContent = quizzesWithoutSkills + lessonsWithoutSkills + libraryWithoutSkills + questionsWithoutSkills;
        const totalManagedContent = courses.length + lessons.length + quizzes.length + libraryItems.length + questions.length;
        const issueCount =
            overviewStats.pendingReview +
            hiddenContent +
            quizzesWithoutQuestions +
            unlinkedContent;
        const readinessScore = totalManagedContent
            ? Math.max(0, Math.min(100, Math.round(((totalManagedContent - issueCount) / totalManagedContent) * 100)))
            : 100;

        const nextActions = [
            overviewStats.pendingReview > 0
                ? `Ø±Ø§Ø¬Ø¹ ${overviewStats.pendingReview.toLocaleString('ar-EG')} Ø¹Ù†ØµØ±Ù‹Ø§ Ø¨Ø§Ù†ØªØ¸Ø§Ø± Ø§Ù„Ø§Ø¹ØªÙ…Ø§Ø¯ Ù‚Ø¨Ù„ Ø¸Ù‡ÙˆØ±Ù‡ Ù„Ù„Ø·Ù„Ø§Ø¨.`
                : '',
            hiddenContent > 0
                ? `Ø§ÙØ­Øµ ${hiddenContent.toLocaleString('ar-EG')} Ø¹Ù†ØµØ±Ù‹Ø§ Ù…Ø®ÙÙŠÙ‹Ø§ Ø£Ùˆ ØºÙŠØ± Ù…Ù†Ø´ÙˆØ± Ù‚Ø¨Ù„ Ø§Ù„Ø¥Ø·Ù„Ø§Ù‚.`
                : '',
            quizzesWithoutQuestions > 0
                ? `Ø£Ø¶Ù Ø£Ø³Ø¦Ù„Ø© Ø¥Ù„Ù‰ ${quizzesWithoutQuestions.toLocaleString('ar-EG')} Ø§Ø®ØªØ¨Ø§Ø±Ù‹Ø§ Ø­ØªÙ‰ Ù„Ø§ ÙŠØ¸Ù‡Ø± ÙØ§Ø±ØºÙ‹Ø§.`
                : '',
            unlinkedContent > 0
                ? `Ø§Ø±Ø¨Ø· ${unlinkedContent.toLocaleString('ar-EG')} Ø¹Ù†ØµØ±Ù‹Ø§ Ø¨Ø§Ù„Ù…Ù‡Ø§Ø±Ø§Øª Ø­ØªÙ‰ ØªØ¹Ù…Ù„ Ø§Ù„ØªÙ‚Ø§Ø±ÙŠØ± ÙˆØ§Ù„ØªÙˆØµÙŠØ§Øª Ø¨Ø¯Ù‚Ø©.`
                : '',
        ].filter(Boolean);

        return {
            hiddenContent,
            unlinkedContent,
            quizzesWithoutQuestions,
            readinessScore,
            nextActions,
            details: {
                questionsWithoutSkills,
                lessonsWithoutSkills,
                quizzesWithoutSkills,
                libraryWithoutSkills,
            },
        };
    }, [courses, lessons, libraryItems, overviewStats.pendingReview, questions, quizzes]);

    const dailyOperationQueue = useMemo(() => {
        const items = [
            {
                id: 'pending-review',
                title: 'Ù…Ø±Ø§Ø¬Ø¹Ø© ÙˆØ§Ø¹ØªÙ…Ø§Ø¯ Ø§Ù„Ù…Ø­ØªÙˆÙ‰',
                description: 'ÙŠÙˆØ¬Ø¯ Ù…Ø­ØªÙˆÙ‰ Ø£Ø¶Ø§ÙÙ‡ Ø§Ù„ÙØ±ÙŠÙ‚ ÙˆÙŠÙ†ØªØ¸Ø± Ù‚Ø±Ø§Ø± Ø§Ù„Ø§Ø¹ØªÙ…Ø§Ø¯ Ù‚Ø¨Ù„ Ø¸Ù‡ÙˆØ±Ù‡ Ù„Ù„Ø·Ù„Ø§Ø¨.',
                count: overviewStats.pendingReview,
                tab: 'overview',
                actionLabel: 'Ø±Ø§Ø¬Ø¹ Ø·Ø§Ø¨ÙˆØ± Ø§Ù„Ø§Ø¹ØªÙ…Ø§Ø¯',
                color: 'amber',
            },
            {
                id: 'empty-quizzes',
                title: 'Ø§Ø®ØªØ¨Ø§Ø±Ø§Øª Ø¨Ù„Ø§ Ø£Ø³Ø¦Ù„Ø©',
                description: 'Ø£ÙŠ Ø§Ø®ØªØ¨Ø§Ø± Ø¨Ù„Ø§ Ø£Ø³Ø¦Ù„Ø© Ù‚Ø¯ ÙŠØ¸Ù‡Ø± Ù„Ù„Ø·Ø§Ù„Ø¨ ÙØ§Ø±ØºÙ‹Ø§ Ø£Ùˆ ÙŠØ±Ø¨Ùƒ Ø±Ø­Ù„Ø© Ø§Ù„Ø§Ø®ØªØ¨Ø§Ø±.',
                count: platformReadiness.quizzesWithoutQuestions,
                tab: 'quizzes',
                actionLabel: 'ÙØªØ­ Ù…Ø±ÙƒØ² Ø§Ù„Ø§Ø®ØªØ¨Ø§Ø±Ø§Øª',
                color: 'rose',
            },
            {
                id: 'question-skills',
                title: 'Ø£Ø³Ø¦Ù„Ø© ØºÙŠØ± Ù…Ø±Ø¨ÙˆØ·Ø© Ø¨Ù…Ù‡Ø§Ø±Ø§Øª',
                description: 'Ø±Ø¨Ø· Ø§Ù„Ø£Ø³Ø¦Ù„Ø© Ø¨Ø§Ù„Ù…Ù‡Ø§Ø±Ø§Øª ÙŠØ¬Ø¹Ù„ Ø§Ù„ØªÙ‚Ø§Ø±ÙŠØ± ÙˆØ§Ù„ØªÙˆØµÙŠØ§Øª Ø§Ù„Ø°ÙƒÙŠØ© Ø£Ø¯Ù‚.',
                count: platformReadiness.details.questionsWithoutSkills,
                tab: 'questions',
                actionLabel: 'ÙØªØ­ Ø¨Ù†Ùƒ Ø§Ù„Ø£Ø³Ø¦Ù„Ø©',
                color: 'indigo',
            },
            {
                id: 'lesson-skills',
                title: 'Ø¯Ø±ÙˆØ³ ØºÙŠØ± Ù…Ø±Ø¨ÙˆØ·Ø© Ø¨Ù…Ù‡Ø§Ø±Ø§Øª',
                description: 'Ø±Ø¨Ø· Ø§Ù„Ø¯Ø±ÙˆØ³ Ø¨Ø§Ù„Ù…Ù‡Ø§Ø±Ø§Øª ÙŠØ³Ø§Ø¹Ø¯ Ø§Ù„Ø·Ø§Ù„Ø¨ ÙŠÙ†ØªÙ‚Ù„ Ù…Ù† Ù†ØªÙŠØ¬Ø© Ø§Ù„Ø§Ø®ØªØ¨Ø§Ø± Ø¥Ù„Ù‰ Ø§Ù„Ø¹Ù„Ø§Ø¬ Ø§Ù„Ù…Ù†Ø§Ø³Ø¨.',
                count: platformReadiness.details.lessonsWithoutSkills,
                tab: 'lessons',
                actionLabel: 'ÙØªØ­ Ù…Ø±ÙƒØ² Ø§Ù„Ø¯Ø±ÙˆØ³',
                color: 'emerald',
            },
            {
                id: 'hidden-content',
                title: 'Ù…Ø­ØªÙˆÙ‰ Ù…Ø®ÙÙŠ Ø¹Ù† Ø§Ù„Ø·Ù„Ø§Ø¨',
                description: 'Ø±Ø§Ø¬Ø¹ Ø§Ù„Ø¹Ù†Ø§ØµØ± Ø§Ù„Ù…Ø®ÙÙŠØ© Ø­ØªÙ‰ ØªØªØ£ÙƒØ¯ Ø£Ù†Ù‡Ø§ Ù…Ù‚ØµÙˆØ¯Ø© ÙˆÙ„ÙŠØ³Øª Ø³Ø¨Ø¨Ù‹Ø§ ÙÙŠ Ø§Ø®ØªÙØ§Ø¡ Ù…Ø§Ø¯Ø© Ø£Ùˆ Ù…Ø³Ø§Ø±.',
                count: platformReadiness.hiddenContent,
                tab: 'paths',
                actionLabel: 'ÙØªØ­ Ù…Ø³Ø§Ø­Ø§Øª Ø§Ù„ØªØ¹Ù„Ù…',
                color: 'slate',
            },
            {
                id: 'library-skills',
                title: 'Ù…Ù„ÙØ§Øª Ù…ÙƒØªØ¨Ø© Ø¨Ù„Ø§ Ù…Ù‡Ø§Ø±Ø§Øª',
                description: 'Ø±Ø¨Ø· Ù…Ù„ÙØ§Øª Ø§Ù„Ù…Ø±Ø§Ø¬Ø¹Ø© Ø¨Ø§Ù„Ù…Ù‡Ø§Ø±Ø§Øª ÙŠØ¬Ø¹Ù„Ù‡Ø§ ØªØ¸Ù‡Ø± ÙƒØªÙˆØµÙŠØ§Øª Ø¹Ù„Ø§Ø¬ÙŠØ© Ø¨Ø¹Ø¯ Ø§Ù„Ø§Ø®ØªØ¨Ø§Ø±.',
                count: platformReadiness.details.libraryWithoutSkills,
                tab: 'library',
                actionLabel: 'ÙØªØ­ Ù…Ø±ÙƒØ² Ø§Ù„Ù…ÙƒØªØ¨Ø©',
                color: 'purple',
            },
        ];

        return items
            .filter((item) => item.count > 0)
            .sort((a, b) => b.count - a.count)
            .slice(0, 6);
    }, [
        overviewStats.pendingReview,
        platformReadiness.details.lessonsWithoutSkills,
        platformReadiness.details.libraryWithoutSkills,
        platformReadiness.details.questionsWithoutSkills,
        platformReadiness.hiddenContent,
        platformReadiness.quizzesWithoutQuestions,
    ]);

    const schoolCommandCenter = useMemo(() => {
        const schools = groups.filter((group) => group.type === 'SCHOOL');
        const classes = groups.filter((group) => group.type === 'CLASS');
        const students = users.filter((item) => item.role === Role.STUDENT);
        const parents = users.filter((item) => item.role === Role.PARENT);
        const supervisors = users.filter((item) => item.role === Role.SUPERVISOR || item.role === Role.TEACHER);
        const activeCodes = accessCodes.filter((code) => Number(code.expiresAt || 0) > Date.now());

        const schoolRows = schools.map((school) => {
            const schoolClasses = classes.filter((group) => group.parentId === school.id);
            const classIds = new Set(schoolClasses.map((group) => group.id));
            const schoolStudents = students.filter((student) => student.schoolId === school.id || (student.groupIds || []).some((groupId) => classIds.has(groupId)));
            const studentIds = new Set(schoolStudents.map((student) => student.id));
            const schoolResults = examResults.filter((result) => result.userId && studentIds.has(result.userId));
            const average = schoolResults.length
                ? Math.round(schoolResults.reduce((sum, result) => sum + Number(result.score || 0), 0) / schoolResults.length)
                : 0;
            const studentsWithoutClass = schoolStudents.filter((student) => !(student.groupIds || []).some((groupId) => classIds.has(groupId))).length;
            const studentsWithoutParent = schoolStudents.filter((student) => !parents.some((parent) => (parent.linkedStudentIds || []).includes(student.id))).length;
            const schoolPackages = b2bPackages.filter((pkg) => pkg.schoolId === school.id && pkg.status === 'active').length;
            const schoolCodes = activeCodes.filter((code) => code.schoolId === school.id).length;
            const schoolSupervisors = supervisors.filter((staff) =>
                staff.schoolId === school.id ||
                (staff.groupIds || []).includes(school.id) ||
                (staff.groupIds || []).some((groupId) => classIds.has(groupId)) ||
                (school.supervisorIds || []).includes(staff.id),
            ).length;
            const issueCount = [
                schoolClasses.length === 0,
                schoolSupervisors === 0,
                schoolStudents.length === 0,
                schoolPackages === 0,
                schoolCodes === 0,
                studentsWithoutClass > 0,
                studentsWithoutParent > 0,
            ].filter(Boolean).length;

            return {
                id: school.id,
                name: school.name,
                classCount: schoolClasses.length,
                studentCount: schoolStudents.length,
                supervisorCount: schoolSupervisors,
                packageCount: schoolPackages,
                activeCodeCount: schoolCodes,
                studentsWithoutClass,
                studentsWithoutParent,
                quizAttempts: schoolResults.length,
                average,
                issueCount,
            };
        });

        const needsSetup = schoolRows
            .filter((school) => school.issueCount > 0)
            .sort((a, b) => b.issueCount - a.issueCount || a.average - b.average)
            .slice(0, 5);
        const performanceWatch = schoolRows
            .filter((school) => school.quizAttempts > 0)
            .sort((a, b) => a.average - b.average)
            .slice(0, 5);

        return {
            schoolCount: schools.length,
            classCount: classes.length,
            schoolStudentCount: students.filter((student) => Boolean(student.schoolId)).length,
            studentsWithoutClass: schoolRows.reduce((sum, school) => sum + school.studentsWithoutClass, 0),
            studentsWithoutParent: schoolRows.reduce((sum, school) => sum + school.studentsWithoutParent, 0),
            activeSchoolPackages: b2bPackages.filter((pkg) => pkg.status === 'active').length,
            activeCodes: activeCodes.length,
            needsSetup,
            performanceWatch,
        };
    }, [accessCodes, b2bPackages, examResults, groups, users]);

    const reviewQueue = useMemo<ReviewQueueItem[]>(() => {
        const normalizeItem = (
            type: string,
            contentType: ReviewQueueItem['contentType'],
            item: { id: string; title?: string; question?: string; text?: string; name?: string; ownerType?: string; approvalStatus?: string },
        ): ReviewQueueItem => ({
            id: `${type}-${item.id}`,
            itemId: item.id,
            contentType,
            type,
            title: item.title || item.name || item.question || item.text || 'Ø¹Ù†ØµØ± Ø¨Ø¯ÙˆÙ† Ø¹Ù†ÙˆØ§Ù†',
            ownerType: item.ownerType || 'platform',
        });

        return [
            ...courses.filter((item) => item.approvalStatus === 'pending_review').map((item) => normalizeItem('Ø¯ÙˆØ±Ø©', 'course', item)),
            ...lessons.filter((item) => item.approvalStatus === 'pending_review').map((item) => normalizeItem('Ø¯Ø±Ø³', 'lesson', item)),
            ...questions.filter((item) => item.approvalStatus === 'pending_review').map((item) => normalizeItem('Ø³Ø¤Ø§Ù„', 'question', item)),
            ...quizzes.filter((item) => item.approvalStatus === 'pending_review').map((item) => normalizeItem('Ø§Ø®ØªØ¨Ø§Ø±', 'quiz', item)),
            ...libraryItems.filter((item) => item.approvalStatus === 'pending_review').map((item) => normalizeItem('Ù…Ù„Ù', 'library', item)),
        ].slice(0, 8);
    }, [courses, lessons, libraryItems, questions, quizzes]);

    const reviewContentItem = (item: ReviewQueueItem, decision: 'approved' | 'rejected') => {
        if (user.role !== Role.ADMIN) return;

        const isApproved = decision === 'approved';
        const basePayload = {
            approvalStatus: decision,
            approvedBy: isApproved ? user.id : undefined,
            approvedAt: isApproved ? Date.now() : undefined,
            reviewerNotes: isApproved ? 'ØªÙ… Ø§Ù„Ø§Ø¹ØªÙ…Ø§Ø¯ Ø§Ù„Ø³Ø±ÙŠØ¹ Ù…Ù† Ù„ÙˆØ­Ø© Ø§Ù„Ø¥Ø¯Ø§Ø±Ø©.' : 'ØªÙ… Ø§Ù„Ø±ÙØ¶ Ø§Ù„Ø³Ø±ÙŠØ¹ Ù…Ù† Ù„ÙˆØ­Ø© Ø§Ù„Ø¥Ø¯Ø§Ø±Ø©.',
        };

        if (item.contentType === 'course') {
            updateCourse(item.itemId, {
                ...basePayload,
                isPublished: isApproved,
                showOnPlatform: isApproved,
            });
            return;
        }

        if (item.contentType === 'lesson') {
            updateLesson(item.itemId, {
                ...basePayload,
                showOnPlatform: isApproved,
            });
            return;
        }

        if (item.contentType === 'question') {
            updateQuestion(item.itemId, basePayload);
            return;
        }

        if (item.contentType === 'quiz') {
            updateQuiz(item.itemId, {
                ...basePayload,
                isPublished: isApproved,
                showOnPlatform: isApproved,
            });
            return;
        }

        updateLibraryItem(item.itemId, {
            ...basePayload,
            showOnPlatform: isApproved,
        });
    };

    const teacherContributionStats = useMemo<TeacherContributionItem[]>(() => {
        const teachers = users.filter((item) => item.role === Role.TEACHER);

        const countTeacherItems = (teacherId: string) => {
            const matchesTeacher = (item: {
                ownerId?: string;
                createdBy?: string;
                assignedTeacherId?: string;
                approvalStatus?: string;
                isPublished?: boolean;
            }) =>
                item.ownerId === teacherId || item.createdBy === teacherId || item.assignedTeacherId === teacherId;

            const teacherItems = [
                ...courses.filter(matchesTeacher),
                ...lessons.filter(matchesTeacher),
                ...questions.filter(matchesTeacher),
                ...quizzes.filter(matchesTeacher),
                ...libraryItems.filter(matchesTeacher),
            ];

            return {
                totalItems: teacherItems.length,
                pendingItems: teacherItems.filter((item) => item.approvalStatus === 'pending_review').length,
                approvedItems: teacherItems.filter((item) => item.approvalStatus === 'approved').length,
                publishedItems: teacherItems.filter((item) => 'isPublished' in item && !!item.isPublished).length,
            };
        };

        return teachers
            .map((teacher) => {
                const counts = countTeacherItems(teacher.id);
                return {
                    id: teacher.id,
                    name: teacher.name,
                    managedPaths: teacher.managedPathIds?.length || 0,
                    managedSubjects: teacher.managedSubjectIds?.length || 0,
                    ...counts,
                };
            })
            .filter((teacher) => teacher.totalItems > 0 || teacher.managedPaths > 0 || teacher.managedSubjects > 0)
            .sort((a, b) => b.pendingItems - a.pendingItems || b.totalItems - a.totalItems)
            .slice(0, 8);
    }, [courses, lessons, libraryItems, questions, quizzes, users]);

    const currentTeacherContribution = useMemo(
        () => teacherContributionStats.find((item) => item.id === user.id) || null,
        [teacherContributionStats, user.id],
    );

    const aiProviderMeta = useMemo(() => {
        const provider = aiStatus?.provider || 'none';

        if (provider === 'ollama') {
            return {
                label: 'Ollama / Gemma Ù…Ø­Ù„ÙŠ',
                badge: 'Ø¨Ø¯ÙˆÙ† ØªÙƒÙ„ÙØ© Ù„ÙƒÙ„ Ø·Ù„Ø¨',
                color: 'emerald',
                description: 'Ø§Ù„Ù…Ù†ØµØ© ØªØ³ØªØ®Ø¯Ù… Ù†Ù…ÙˆØ°Ø¬Ù‹Ø§ Ù…Ø­Ù„ÙŠÙ‹Ø§ Ù…ÙØªÙˆØ­ Ø§Ù„Ù…ØµØ¯Ø± Ø¹Ù†Ø¯ ØªÙˆÙØ± OllamaØŒ ÙˆÙ‡Ø°Ø§ Ù‡Ùˆ Ø§Ù„Ø§Ø®ØªÙŠØ§Ø± Ø§Ù„Ø£ÙØ¶Ù„ Ù„ØªÙ‚Ù„ÙŠÙ„ Ø§Ù„ØªÙƒÙ„ÙØ© Ù…Ø³ØªÙ‚Ø¨Ù„Ø§Ù‹.',
            };
        }

        if (provider === 'gemini') {
            return {
                label: 'Gemini API',
                badge: 'Ù…Ø²ÙˆØ¯ Ø®Ø§Ø±Ø¬ÙŠ',
                color: 'blue',
                description: 'Ø§Ù„Ù…Ù†ØµØ© ØªØ³ØªØ®Ø¯Ù… Ù…ÙØªØ§Ø­ Gemini Ø§Ù„Ø®Ø§Ø±Ø¬ÙŠ Ù„ØªÙˆÙ„ÙŠØ¯ Ø§Ù„ØªØ­Ù„ÙŠÙ„Ø§Øª ÙˆØ§Ù„Ù…Ù‚ØªØ±Ø­Ø§Øª Ø§Ù„Ø°ÙƒÙŠØ© Ø¹Ø¨Ø± Ø§Ù„Ø®Ø§Ø¯Ù… ÙˆÙ„ÙŠØ³ Ù…Ù† Ø§Ù„Ù…ØªØµÙØ­.',
            };
        }

        if (provider === 'lmstudio') {
            return {
                label: 'LM Studio Ù…Ø­Ù„ÙŠ',
                badge: 'Ù†Ù…ÙˆØ°Ø¬ Ù…Ø­Ù„ÙŠ OpenAI-compatible',
                color: 'emerald',
                description: 'Ø§Ù„Ù…Ù†ØµØ© ØªØ³ØªØ®Ø¯Ù… Ø®Ø§Ø¯Ù… LM Studio Ø§Ù„Ù…Ø­Ù„ÙŠ Ø¹Ø¨Ø± Ø¨ÙˆØ§Ø¨Ø© Ø§Ù„Ø®Ø§Ø¯Ù…ØŒ ÙˆÙ‡Ø°Ø§ ÙŠØ³Ù…Ø­ Ø¨ØªØ´ØºÙŠÙ„ Ù†Ù…Ø§Ø°Ø¬ Ù…ÙØªÙˆØ­Ø© Ø§Ù„Ù…ØµØ¯Ø± Ø¨Ø¯ÙˆÙ† ÙƒØ´Ù Ù…ÙØ§ØªÙŠØ­ ÙÙŠ Ø§Ù„Ù…ØªØµÙØ­.',
            };
        }

        return {
            label: 'Fallback Ø¢Ù…Ù†',
            badge: 'ØªØ´ØºÙŠÙ„ Ø§Ø­ØªÙŠØ§Ø·ÙŠ',
            color: 'slate',
            description: 'Ù„Ø§ ÙŠÙˆØ¬Ø¯ Ù…Ø²ÙˆØ¯ Ø°ÙƒØ§Ø¡ Ù…ÙØ¹Ù‘Ù„ Ø­Ø§Ù„ÙŠÙ‹Ø§ØŒ Ù„Ø°Ù„Ùƒ ØªØ³ØªØ®Ø¯Ù… Ø§Ù„Ù…Ù†ØµØ© Ø±Ø¯ÙˆØ¯Ù‹Ø§ Ø¢Ù…Ù†Ø© Ø¯Ø§Ø®Ù„ÙŠØ© Ø­ØªÙ‰ Ù„Ø§ ØªØªÙˆÙ‚Ù ØªØ¬Ø±Ø¨Ø© Ø§Ù„Ø·Ø§Ù„Ø¨.',
        };
    }, [aiStatus?.provider]);

    const supervisorScopeSummary = useMemo(() => {
        const directGroupIds = new Set(user.groupIds || []);
        const directGroups = groups.filter((group) => directGroupIds.has(group.id) || group.supervisorIds.includes(user.id));
        const scopedSchoolIds = new Set<string>();
        if (user.schoolId) scopedSchoolIds.add(user.schoolId);
        directGroups.forEach((group) => {
            if (group.type === 'SCHOOL') scopedSchoolIds.add(group.id);
            if (group.parentId) scopedSchoolIds.add(group.parentId);
        });

        const scopedGroupIds = new Set<string>([
            ...Array.from(directGroupIds),
            ...directGroups.map((group) => group.id),
        ]);
        groups.forEach((group) => {
            if (group.parentId && scopedSchoolIds.has(group.parentId)) {
                scopedGroupIds.add(group.id);
            }
        });

        const scopedGroupList = groups.filter((group) => scopedGroupIds.has(group.id) || scopedSchoolIds.has(group.id));
        const scopedGroupStudentIds = new Set(scopedGroupList.flatMap((group) => group.studentIds || []));
        const scopedStudents = users.filter((item) => {
            if (item.role !== Role.STUDENT) {
                return false;
            }

            const sharesGroup = (item.groupIds || []).some((groupId) => scopedGroupIds.has(groupId));
            const sharesSchool = !!item.schoolId && scopedSchoolIds.has(item.schoolId);
            const linkedByGroup = scopedGroupStudentIds.has(item.id);
            return sharesGroup || sharesSchool || linkedByGroup;
        });
        const scopedStudentIds = new Set(scopedStudents.map((student) => student.id));
        const scopedResults = examResults.filter((result) => result.userId && scopedStudentIds.has(result.userId));

        const assignedFollowUps = quizzes.filter((quiz) => {
            const targetsScopedGroup = (quiz.targetGroupIds || []).some((groupId) => scopedGroupIds.has(groupId));
            const targetsScopedStudent = (quiz.targetUserIds || []).some((studentId) =>
                scopedStudentIds.has(studentId),
            );
            return targetsScopedGroup || targetsScopedStudent;
        });

        const averageScore = scopedResults.length
            ? Math.round(scopedResults.reduce((total, result) => total + Number(result.score || 0), 0) / scopedResults.length)
            : 0;

        const weakSkillMap = new Map<string, { skill: string; total: number; count: number; students: Set<string> }>();
        scopedResults.forEach((result) => {
            (result.skillsAnalysis || []).forEach((skill) => {
                const skillName = String(skill.skill || '').trim();
                if (!skillName) return;
                const key = skill.skillId || skillName;
                const current = weakSkillMap.get(key) || { skill: skillName, total: 0, count: 0, students: new Set<string>() };
                current.total += Number(skill.mastery || 0);
                current.count += 1;
                if (result.userId) current.students.add(result.userId);
                weakSkillMap.set(key, current);
            });
        });

        const weakestSkills = Array.from(weakSkillMap.values())
            .map((skill) => ({
                skill: skill.skill,
                mastery: skill.count ? Math.round(skill.total / skill.count) : 0,
                attempts: skill.count,
                affectedStudents: skill.students.size,
            }))
            .filter((skill) => skill.mastery < 70)
            .sort((a, b) => a.mastery - b.mastery || b.affectedStudents - a.affectedStudents)
            .slice(0, 4);

        const studentsNeedingFollowUp = scopedStudents
            .map((student) => {
                const studentResults = scopedResults.filter((result) => result.userId === student.id);
                const orderedResults = [...studentResults].sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
                const studentAverage = studentResults.length
                    ? Math.round(studentResults.reduce((total, result) => total + Number(result.score || 0), 0) / studentResults.length)
                    : 0;
                const latestResult = orderedResults[0];
                const studentClass = scopedGroupList.find((group) =>
                    group.type !== 'SCHOOL' &&
                    ((group.studentIds || []).includes(student.id) || (student.groupIds || []).includes(group.id)),
                );
                const studentSchool = scopedGroupList.find((group) =>
                    group.type === 'SCHOOL' &&
                    (group.id === student.schoolId || group.id === studentClass?.parentId),
                );
                const groupSettings = studentClass?.metadata?.settings as Record<string, unknown> | undefined;
                const gradeName = String(
                    groupSettings?.grade || groupSettings?.gradeName || groupSettings?.stage || groupSettings?.level || 'ØºÙŠØ± Ù…Ø­Ø¯Ø¯',
                ).trim();
                const topWeakSkills = [...(latestResult?.skillsAnalysis || [])]
                    .filter((skill) => Number(skill.mastery || 0) < 70)
                    .sort((a, b) => Number(a.mastery || 0) - Number(b.mastery || 0))
                    .slice(0, 2)
                    .map((skill) => skill.skill)
                    .filter(Boolean);
                const followUpReason = studentResults.length === 0
                    ? 'Ù„Ù… ÙŠØ¨Ø¯Ø£'
                    : studentAverage < 60
                        ? 'Ø¶Ø¹Ù'
                        : 'Ù…ØªØ§Ø¨Ø¹Ø©';
                const status = studentResults.length === 0 || studentAverage < 60
                    ? 'danger'
                    : studentAverage < 70
                        ? 'watch'
                        : 'good';
                const hasAssignedFollowUp = assignedFollowUps.some((quiz) =>
                    (quiz.targetUserIds || []).includes(student.id)
                    || (studentClass?.id ? (quiz.targetGroupIds || []).includes(studentClass.id) : false),
                );

                return {
                    id: student.id,
                    name: student.name,
                    schoolId: studentSchool?.id || student.schoolId || '',
                    schoolName: studentSchool?.name || 'Ø¨Ø¯ÙˆÙ† Ù…Ø¯Ø±Ø³Ø©',
                    gradeName,
                    classId: studentClass?.id || '',
                    className: studentClass?.name || 'Ø¨Ø¯ÙˆÙ† ÙØµÙ„',
                    average: studentAverage,
                    attempts: studentResults.length,
                    latestQuiz: latestResult?.quizTitle || 'Ù„Ù… ÙŠØ¨Ø¯Ø£ Ø¨Ø¹Ø¯',
                    weakSkills: topWeakSkills,
                    followUpReason,
                    status,
                    hasAssignedFollowUp,
                    latestScore: latestResult ? Number(latestResult.score || 0) : null,
                    previousScore: orderedResults[1] ? Number(orderedResults[1].score || 0) : null,
                };
            })
            .filter((student) => student.attempts === 0 || student.average < 70)
            .sort((a, b) => a.attempts - b.attempts || a.average - b.average)
            .slice(0, 6);

        const groupPerformanceSnapshots = scopedGroupList
            .filter((group) => group.type !== 'SCHOOL')
            .map((group) => {
                const groupStudentIds = new Set(group.studentIds || []);
                const groupResults = scopedResults.filter((result) => result.userId && groupStudentIds.has(result.userId));
                const groupAverage = groupResults.length
                    ? Math.round(groupResults.reduce((total, result) => total + Number(result.score || 0), 0) / groupResults.length)
                    : 0;

                return {
                    id: group.id,
                    name: group.name,
                    studentCount: group.studentIds?.length || 0,
                    average: groupAverage,
                    attempts: groupResults.length,
                    weakStudents: Array.from(groupStudentIds).filter((studentId) =>
                        studentsNeedingFollowUp.some((student) => student.id === studentId),
                    ).length,
                    status: groupResults.length === 0 || groupAverage < 60 ? 'danger' : groupAverage < 70 ? 'watch' : 'good',
                };
            });
        const groupSnapshots = [...groupPerformanceSnapshots]
            .sort((a, b) => a.average - b.average || b.studentCount - a.studentCount)
            .slice(0, 6);
        const groupsWithResults = groupPerformanceSnapshots.filter((group) => group.attempts > 0);
        const bestClass = [...groupsWithResults].sort((a, b) => b.average - a.average || b.studentCount - a.studentCount)[0] || null;
        const weakestClass = [...groupsWithResults].sort((a, b) => a.average - b.average || b.studentCount - a.studentCount)[0] || null;
        const improvedStudentsCount = scopedStudents.filter((student) => {
            const results = scopedResults
                .filter((result) => result.userId === student.id)
                .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
            return results.length >= 2 && Number(results[0].score || 0) > Number(results[1].score || 0);
        }).length;
        const pendingFollowUpStudents = studentsNeedingFollowUp.filter((student) => !student.hasAssignedFollowUp);

        return {
            schoolCount: scopedSchoolIds.size,
            groupCount: scopedGroupList.length,
            studentCount: scopedStudents.length,
            followUpCount: assignedFollowUps.length,
            resultCount: scopedResults.length,
            averageScore,
            weakStudentsCount: studentsNeedingFollowUp.length,
            inactiveStudentsCount: studentsNeedingFollowUp.filter((student) => student.attempts === 0).length,
            improvedStudentsCount,
            pendingFollowUpCount: pendingFollowUpStudents.length,
            pendingFollowUpStudents,
            weakestSkills,
            studentsNeedingFollowUp,
            strugglingStudents: studentsNeedingFollowUp,
            groupSnapshots,
            bestClass,
            weakestClass,
        };
    }, [examResults, groups, quizzes, user.groupIds, user.id, user.schoolId, users]);

    const visibleWeakStudents = useMemo(() => supervisorScopeSummary.studentsNeedingFollowUp.filter((student) => {
        const matchesSchool = weakStudentFilters.schoolId === 'all' || student.schoolId === weakStudentFilters.schoolId;
        const matchesGrade = weakStudentFilters.grade === 'all' || student.gradeName === weakStudentFilters.grade;
        const matchesClass = weakStudentFilters.classId === 'all' || student.classId === weakStudentFilters.classId;
        const matchesStatus = weakStudentFilters.status === 'all'
            || (weakStudentFilters.status === 'inactive' && student.attempts === 0)
            || (weakStudentFilters.status === 'low' && student.attempts > 0 && student.average < 70)
            || (weakStudentFilters.status === 'urgent' && student.status === 'danger');
        return matchesSchool && matchesGrade && matchesClass && matchesStatus;
    }), [supervisorScopeSummary.studentsNeedingFollowUp, weakStudentFilters]);

    const supervisorWeakStudentOptions = useMemo(() => {
        const students = supervisorScopeSummary.studentsNeedingFollowUp;
        return {
            schools: Array.from(new Map(students.filter((student) => student.schoolId).map((student) => [student.schoolId, student.schoolName] as const)).entries()),
            grades: Array.from(new Set(students.map((student) => student.gradeName).filter(Boolean))),
            classes: Array.from(new Map(students.filter((student) => student.classId).map((student) => [student.classId, student.className] as const)).entries()),
        };
    }, [supervisorScopeSummary.studentsNeedingFollowUp]);

    const openStudentReport = (studentId: string) => {
        window.location.assign(`/reports?studentId=${encodeURIComponent(studentId)}`);
    };

    const openStudentQuiz = (studentId: string) => {
        const params = new URLSearchParams({ tab: 'quizzes', mode: 'central', source: 'school-portal', targetUserId: studentId });
        window.location.hash = `/admin-dashboard?${params.toString()}`;
    };

    const sendStudentFollowUpAlert = async (student: (typeof supervisorScopeSummary.studentsNeedingFollowUp)[number]) => {
        setStudentActionState({ studentId: student.id, action: 'alert' });
        setStudentActionFeedback('');
        try {
            await api.sendStudentAlert({
                studentIds: [student.id],
                title: 'ØªÙ†Ø¨ÙŠÙ‡ Ù…ØªØ§Ø¨Ø¹Ø© Ø¯Ø±Ø§Ø³ÙŠØ©',
                body: `ÙŠØ±Ø¬Ù‰ Ø¨Ø¯Ø¡ Ù…ØªØ§Ø¨Ø¹Ø© ${student.name} Ø¹Ø¨Ø± ${student.latestQuiz}. Ø§Ù„Ø³Ø¨Ø¨: ${student.followUpReason}.`,
                channels: ['in_app'],
            });
            setStudentActionFeedback(`ØªÙ… Ø¥Ø±Ø³Ø§Ù„ ØªÙ†Ø¨ÙŠÙ‡ Ø¥Ù„Ù‰ ${student.name}.`);
        } catch {
            setStudentActionFeedback('ØªØ¹Ø°Ø± Ø¥Ø±Ø³Ø§Ù„ Ø§Ù„ØªÙ†Ø¨ÙŠÙ‡. ØªØ­Ù‚Ù‚ Ù…Ù† Ø§ØªØµØ§Ù„ Ø§Ù„Ø®Ø§Ø¯Ù… ÙˆÙ†Ø·Ø§Ù‚ Ø§Ù„Ù…Ø´Ø±Ù.');
        } finally {
            setStudentActionState(null);
        }
    };

    const sendWeeklyFollowUpAlert = async () => {
        const pendingStudents = supervisorScopeSummary.pendingFollowUpStudents;
        if (!pendingStudents.length) return;
        setWeeklyAlertState('sending');
        try {
            const weakestSkill = supervisorScopeSummary.weakestSkills[0]?.skill || 'Ø§Ù„Ù…Ù‡Ø§Ø±Ø§Øª Ø§Ù„Ø£Ø³Ø§Ø³ÙŠØ©';
            await api.sendStudentAlert({
                studentIds: pendingStudents.map((student) => student.id),
                title: 'Ù…Ù„Ø®Øµ Ø§Ù„Ù…ØªØ§Ø¨Ø¹Ø© Ø§Ù„Ø£Ø³Ø¨ÙˆØ¹ÙŠ',
                body: `ØªÙˆØ¬Ø¯ ${pendingStudents.length} Ø­Ø§Ù„Ø© ØªØ­ØªØ§Ø¬ Ù…ØªØ§Ø¨Ø¹Ø©. Ø§Ø¨Ø¯Ø£ Ø¨Ù…Ù‡Ø§Ø±Ø© ${weakestSkill} Ø«Ù… Ø±Ø§Ø¬Ø¹ ØªÙ‚Ø±ÙŠØ± Ø§Ù„Ø·Ø§Ù„Ø¨.`,
                channels: ['in_app'],
            });
            setWeeklyAlertState('sent');
        } catch {
            setWeeklyAlertState('error');
        }
    };

    const supervisorActionCards = useMemo(() => [
        {
            title: 'Ø§Ù„Ø·Ù„Ø§Ø¨ Ø§Ù„Ø°ÙŠÙ† ÙŠØ­ØªØ§Ø¬ÙˆÙ† Ù…ØªØ§Ø¨Ø¹Ø©',
            value: supervisorScopeSummary.weakStudentsCount,
            hint: 'Ø§Ø¨Ø¯Ø£ Ø¨Ù…Ù† Ù„Ù… ÙŠØ®ØªØ¨Ø± Ø£Ùˆ Ù…ØªÙˆØ³Ø·Ù‡ Ø£Ù‚Ù„ Ù…Ù† 70%.',
            actionLabel: 'ÙØªØ­ Ø§Ù„ØªÙ‚Ø±ÙŠØ±',
            action: () => { window.location.assign('/reports'); },
            tone: 'rose',
        },
        {
            title: 'Ø§Ø®ØªØ¨Ø§Ø± Ù…ÙˆØ¬Ù‡ Ù„Ù„Ù†Ø·Ø§Ù‚',
            value: supervisorScopeSummary.followUpCount,
            hint: 'Ø§Ø³ØªØ®Ø¯Ù…Ù‡ Ù„Ù‚ÙŠØ§Ø³ ÙØµÙ„ Ø£Ùˆ Ù…Ø¯Ø±Ø³Ø© Ø£Ùˆ Ø·Ù„Ø§Ø¨ Ù…Ø­Ø¯Ø¯ÙŠÙ†.',
            actionLabel: 'ØªÙˆØ¬ÙŠÙ‡ Ø§Ø®ØªØ¨Ø§Ø±',
            action: () => setActiveAdminTab('quizzes'),
            tone: 'emerald',
        },
        {
            title: 'Ù…ØªØ§Ø¨Ø¹Ø© Ø§Ù„ÙØµÙˆÙ„ ÙˆØ§Ù„Ø·Ù„Ø§Ø¨',
            value: supervisorScopeSummary.groupCount,
            hint: 'Ø±Ø§Ø¬Ø¹ Ø§Ù„ÙØµÙˆÙ„ ÙˆØ§Ù„Ø·Ù„Ø§Ø¨ Ø§Ù„Ù…Ø±ØªØ¨Ø·ÙŠÙ† Ø¨Ø­Ø³Ø§Ø¨Ùƒ.',
            actionLabel: 'Ø¨ÙˆØ§Ø¨Ø© Ø§Ù„Ù…Ø¯Ø±Ø³Ø©',
            action: () => setActiveAdminTab('school-portal'),
            tone: 'indigo',
        },
        {
            title: 'Ø±Ø³Ø§Ù„Ø© Ù…ØªØ§Ø¨Ø¹Ø© Ø¬Ø§Ù‡Ø²Ø©',
            value: supervisorScopeSummary.studentCount,
            hint: 'Ø¬Ù‡Ø² Ù‚Ø§Ø¦Ù…Ø© Ø§Ù„Ø·Ù„Ø§Ø¨ Ù…Ù† Ø§Ù„ØªÙ‚Ø±ÙŠØ± Ø«Ù… Ø£Ø±Ø³Ù„ ØªÙ†Ø¨ÙŠÙ‡Ù‹Ø§ Ù…Ù†Ø§Ø³Ø¨Ù‹Ø§.',
            actionLabel: 'Ù‚Ø§Ø¦Ù…Ø© Ø§Ù„Ø·Ù„Ø§Ø¨',
            action: () => setActiveAdminTab('school-portal'),
            tone: 'amber',
        },
    ], [supervisorScopeSummary.followUpCount, supervisorScopeSummary.groupCount, supervisorScopeSummary.studentCount, supervisorScopeSummary.weakStudentsCount]);

    const menuItems = useMemo(() => {
        const adminItems = [
            { id: 'overview', label: 'Ù†Ø¸Ø±Ø© Ø¹Ø§Ù…Ø©', icon: <LayoutDashboard size={20} /> },
            { id: 'paths', label: 'Ø¥Ø¯Ø§Ø±Ø© Ø§Ù„Ù…Ø³Ø§Ø±Ø§Øª (Ù…Ø³Ø§Ø­Ø§Øª Ø§Ù„Ø¹Ù…Ù„)', icon: <FolderOpen size={20} /> },
            { id: 'lessons', label: 'Ù…Ø±ÙƒØ² Ø§Ù„Ø¯Ø±ÙˆØ³', icon: <BookOpen size={20} /> },
            { id: 'library', label: 'Ù…Ø±ÙƒØ² Ø§Ù„Ù…ÙƒØªØ¨Ø© ÙˆÙ…Ù„ÙØ§Øª Ø§Ù„Ø¯Ø¹Ù…', icon: <BookOpen size={20} /> },
            { id: 'quizzes', label: 'Ù…Ø±ÙƒØ² Ø§Ù„Ø§Ø®ØªØ¨Ø§Ø±Ø§Øª', icon: <FileQuestion size={20} /> },
            { id: 'mock-exams', label: 'Ù…Ø±ÙƒØ² Ø§Ù„Ø§Ø®ØªØ¨Ø§Ø±Ø§Øª Ø§Ù„Ù…Ø­Ø§ÙƒÙŠØ©', icon: <Award size={20} /> },
            { id: 'questions', label: 'Ù…Ø±ÙƒØ² Ø§Ù„Ø£Ø³Ø¦Ù„Ø©', icon: <Target size={20} /> },
            { id: 'skills', label: 'Ù…Ø±ÙƒØ² Ø§Ù„Ù…Ù‡Ø§Ø±Ø§Øª', icon: <Award size={20} /> },
            { id: 'users', label: 'Ø¥Ø¯Ø§Ø±Ø© Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù…ÙŠÙ†', icon: <Users size={20} /> },
            { id: 'schools', label: 'ØªØ´ØºÙŠÙ„ Ø§Ù„Ù…Ø¯Ø§Ø±Ø³', icon: <Building2 size={20} /> },
            { id: 'memberships', label: 'Ø§Ù„Ø¹Ø¶ÙˆÙŠØ§Øª', icon: <CreditCard size={20} /> },
            { id: 'financial', label: 'Ø§Ù„Ù…Ø§Ù„ÙŠØ© ÙˆØ§Ù„Ø§Ø´ØªØ±Ø§ÙƒØ§Øª', icon: <CreditCard size={20} /> },
            { id: 'notifications', label: 'Ø§Ù„Ø¥Ø´Ø¹Ø§Ø±Ø§Øª', icon: <Bell size={20} /> },
            { id: 'monitoring', label: 'Ù…Ø±Ø§Ù‚Ø¨Ø© Ø§Ù„Ù†Ø¸Ø§Ù…', icon: <Activity size={20} /> },
            { id: 'settings', label: 'Ø§Ù„Ø¥Ø¹Ø¯Ø§Ø¯Ø§Øª', icon: <Settings size={20} /> },
        ];

        if (user.role === Role.TEACHER) {
            return adminItems.filter((item) => ['overview', 'lessons', 'library', 'quizzes', 'mock-exams', 'questions', 'skills'].includes(item.id));
        }

        if (user.role === Role.SUPERVISOR) {
            return adminItems.filter((item) => ['overview'].includes(item.id));
        }

        return adminItems;
    }, [user.role]);

    const enhancedMenuItems = useMemo(() => {
        let nextItems = [...menuItems];
        const notificationsIndex = nextItems.findIndex((item) => item.id === 'notifications');
        const insertIndex = notificationsIndex === -1 ? nextItems.length : notificationsIndex;

        if (user.role === Role.ADMIN && !nextItems.some((item) => item.id === 'homepage')) {
            nextItems = [
                ...nextItems.slice(0, insertIndex),
                { id: 'homepage', label: 'Ø¥Ø¯Ø§Ø±Ø© Ø§Ù„ØµÙØ­Ø© Ø§Ù„Ø±Ø¦ÙŠØ³ÙŠØ©', icon: <BookOpen size={20} /> },
                ...nextItems.slice(insertIndex),
            ];
        }

        if (user.role === Role.ADMIN && !nextItems.some((item) => item.id === 'announcement-ads')) {
            const homepageIndex = nextItems.findIndex((item) => item.id === 'homepage');
            const targetIndex = homepageIndex === -1 ? insertIndex : homepageIndex + 1;
            nextItems = [
                ...nextItems.slice(0, targetIndex),
                { id: 'announcement-ads', label: 'Ø¥Ø¯Ø§Ø±Ø© Ø§Ù„Ø¥Ø¹Ù„Ø§Ù†Ø§Øª', icon: <Megaphone size={20} /> },
                ...nextItems.slice(targetIndex),
            ];
        }

        if (user.role === Role.ADMIN && !nextItems.some((item) => item.id === 'platform-fonts')) {
            const adsIndex = nextItems.findIndex((item) => item.id === 'announcement-ads');
            const targetIndex = adsIndex === -1 ? insertIndex : adsIndex + 1;
            nextItems = [
                ...nextItems.slice(0, targetIndex),
                { id: 'platform-fonts', label: 'Ø¥Ø¯Ø§Ø±Ø© Ø®Ø·ÙˆØ· Ø§Ù„Ù…Ù†ØµØ©', icon: <Type size={20} /> },
                ...nextItems.slice(targetIndex),
            ];
        }

        if (user.role === Role.ADMIN && !nextItems.some((item) => item.id === 'platform-integrations')) {
            const fontsIndex = nextItems.findIndex((item) => item.id === 'platform-fonts');
            const targetIndex = fontsIndex === -1 ? insertIndex : fontsIndex + 1;
            nextItems = [
                ...nextItems.slice(0, targetIndex),
                { id: 'platform-integrations', label: 'Ø¥Ø¯Ø§Ø±Ø© Ø§Ù„ØªÙƒØ§Ù…Ù„Ø§Øª ÙˆØ§Ù„ØªØ³Ø¬ÙŠÙ„', icon: <Settings size={20} /> },
                ...nextItems.slice(targetIndex),
            ];
        }

        if (user.role === Role.ADMIN && !nextItems.some((item) => item.id === 'backups')) {
            const settingsIndex = nextItems.findIndex((item) => item.id === 'settings');
            const targetIndex = settingsIndex === -1 ? nextItems.length : settingsIndex;
            nextItems = [
                ...nextItems.slice(0, targetIndex),
                { id: 'backups', label: 'Ø§Ù„Ù†Ø³Ø® Ø§Ù„Ø§Ø­ØªÙŠØ§Ø·ÙŠ', icon: <Activity size={20} /> },
                ...nextItems.slice(targetIndex),
            ];
        }

        if (user.role === Role.ADMIN && !nextItems.some((item) => item.id === 'ai-assistant')) {
            const monitoringIndex = nextItems.findIndex((item) => item.id === 'monitoring');
            const targetIndex = monitoringIndex === -1 ? nextItems.length : monitoringIndex + 1;
            nextItems = [
                ...nextItems.slice(0, targetIndex),
                { id: 'ai-assistant', label: 'Ø¥Ø¯Ø§Ø±Ø© Ø§Ù„Ù…Ø³Ø§Ø¹Ø¯ Ø§Ù„Ø°ÙƒÙŠ', icon: <Bot size={20} /> },
                ...nextItems.slice(targetIndex),
            ];
        }

        if (!nextItems.some((item) => item.id === 'live-sessions') && [Role.ADMIN, Role.TEACHER].includes(user.role)) {
            const dynamicInsertIndex = nextItems.findIndex((item) => item.id === 'notifications');
            const targetIndex = dynamicInsertIndex === -1 ? nextItems.length : dynamicInsertIndex;
            nextItems = [
                ...nextItems.slice(0, targetIndex),
                { id: 'live-sessions', label: 'Ø§Ù„Ø­ØµØµ Ø§Ù„Ù…Ø¨Ø§Ø´Ø±Ø©', icon: <Video size={20} /> },
                ...nextItems.slice(targetIndex),
            ];
        }

        if (!nextItems.some((item) => item.id === 'barcode-tests') && [Role.ADMIN, Role.TEACHER].includes(user.role)) {
            const quizzesIndex = nextItems.findIndex((item) => item.id === 'quizzes');
            const targetIndex = quizzesIndex === -1 ? nextItems.length : quizzesIndex + 1;
            nextItems = [
                ...nextItems.slice(0, targetIndex),
                { id: 'barcode-tests', label: 'Ø§Ø®ØªØ¨Ø§Ø±Ø§Øª Ø¨Ø§Ø±ÙƒÙˆØ¯', icon: <QrCode size={20} /> },
                ...nextItems.slice(targetIndex),
            ];
        }

        if ([Role.ADMIN, Role.SUPERVISOR].includes(user.role) && !nextItems.some((item) => item.id === 'school-portal')) {
            const schoolsIndex = nextItems.findIndex((item) => item.id === 'schools');
            const overviewIndex = nextItems.findIndex((item) => item.id === 'overview');
            const targetIndex = schoolsIndex === -1 ? (overviewIndex === -1 ? 0 : overviewIndex + 1) : schoolsIndex + 1;
            nextItems = [
                ...nextItems.slice(0, targetIndex),
                { id: 'school-portal', label: user.role === Role.ADMIN ? 'Ø¨ÙˆØ§Ø¨Ø© Ù…ØªØ§Ø¨Ø¹Ø© Ø§Ù„Ù…Ø¯Ø§Ø±Ø³' : 'Ø¨ÙˆØ§Ø¨Ø© Ù…Ø¯Ø±Ø³ØªÙŠ', icon: <Building2 size={20} /> },
                ...nextItems.slice(targetIndex),
            ];
        }

        if (user.role === Role.SUPERVISOR && !nextItems.some((item) => item.id === 'reports')) {
            const portalIndex = nextItems.findIndex((item) => item.id === 'school-portal');
            const targetIndex = portalIndex === -1 ? nextItems.length : portalIndex + 1;
            nextItems = [
                ...nextItems.slice(0, targetIndex),
                { id: 'reports', label: 'Ø§Ù„ØªÙ‚Ø§Ø±ÙŠØ±', icon: <Activity size={20} /> },
                ...nextItems.slice(targetIndex),
            ];
        }

        return nextItems;
    }, [menuItems, user.role]);

    useEffect(() => {
        if (!enhancedMenuItems.some((item) => item.id === activeTab)) {
            if (user.role === Role.SUPERVISOR && activeTab === 'quizzes') {
                return;
            }
            setActiveTab(enhancedMenuItems[0]?.id || 'overview');
        }
    }, [activeTab, enhancedMenuItems, user.role]);

    const renderSidebar = () => (
        <div className="py-6 space-y-1">
            <div className="mb-8 px-6">
                <h2 className="text-xl font-bold text-gray-900">Ù„ÙˆØ­Ø© Ø§Ù„Ø¥Ø¯Ø§Ø±Ø©</h2>
                <p className="text-sm text-gray-500 mt-1">
                    {user.role === Role.ADMIN ? 'Ø§Ù„ØªØ­ÙƒÙ… Ø§Ù„ÙƒØ§Ù…Ù„ Ø¨Ø§Ù„Ù…Ù†ØµØ©' : user.role === Role.TEACHER ? 'Ù„ÙˆØ­Ø© ØªØ´ØºÙŠÙ„ Ø§Ù„Ù…Ø¹Ù„Ù… ÙˆØ§Ù„Ù…Ø­ØªÙˆÙ‰' : 'Ù„ÙˆØ­Ø© Ù…ØªØ§Ø¨Ø¹Ø© Ø§Ù„Ù…Ø´Ø±Ù'}
                </p>
            </div>
            {enhancedMenuItems.map((item) => (
                <button
                    key={item.id}
                    onClick={() => item.id === 'reports' ? window.location.assign('/reports') : setActiveAdminTab(item.id)}
                    className={`w-full flex items-center gap-3 px-6 py-3 transition-colors ${
                        activeTab === item.id
                            ? 'bg-amber-50 text-amber-600 font-bold border-r-4 border-amber-500'
                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 border-r-4 border-transparent'
                    }`}
                >
                    <div className={activeTab === item.id ? 'text-amber-500' : 'text-gray-400'}>{item.icon}</div>
                    <span className="text-sm">{item.label}</span>
                </button>
            ))}
        </div>
    );

    const renderOverview = () => (
        <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-gray-900">{user.role === Role.SUPERVISOR ? 'Ù…Ø±ÙƒØ² Ù…ØªØ§Ø¨Ø¹Ø© Ø§Ù„Ø·Ù„Ø§Ø¨' : 'Ù†Ø¸Ø±Ø© Ø¹Ø§Ù…Ø© (Overview)'}</h1>
                <div className="text-sm text-gray-500 bg-white px-4 py-2 rounded-lg border border-gray-200 shadow-sm">
                    Ø¢Ø®Ø± ØªØ­Ø¯ÙŠØ«: Ù…Ø¨Ø§Ø´Ø± Ù…Ù† Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„Ù…Ù†ØµØ©
                </div>
            </div>

            {user.role !== Role.SUPERVISOR && (
            <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                    {
                        title: 'Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø§Ù„Ø·Ù„Ø§Ø¨',
                        value: overviewStats.totalStudents.toLocaleString('ar-EG'),
                        trend: `${overviewStats.totalSchools} Ù…Ø¯Ø±Ø³Ø©`,
                        color: 'text-blue-600',
                        bg: 'bg-blue-50',
                    },
                    {
                        title: 'Ø§Ù„Ù…Ø¹Ù„Ù…ÙˆÙ† Ø§Ù„Ù†Ø´Ø·ÙˆÙ†',
                        value: overviewStats.totalTeachers.toLocaleString('ar-EG'),
                        trend: 'Ø¨ØµÙ„Ø§Ø­ÙŠØ§Øª ØªØ¯Ø±ÙŠØ³',
                        color: 'text-emerald-600',
                        bg: 'bg-emerald-50',
                    },
                    {
                        title: 'Ø§Ù„Ù…Ø­ØªÙˆÙ‰ Ø¨Ø§Ù†ØªØ¸Ø§Ø± Ø§Ø¹ØªÙ…Ø§Ø¯',
                        value: overviewStats.pendingReview.toLocaleString('ar-EG'),
                        trend: `${overviewStats.pendingBreakdown.questions} Ø³Ø¤Ø§Ù„ / ${overviewStats.pendingBreakdown.lessons} Ø¯Ø±Ø³`,
                        color: 'text-purple-600',
                        bg: 'bg-purple-50',
                    },
                    {
                        title: 'Ù†ØªØ§Ø¦Ø¬ Ø§Ù„Ø§Ø®ØªØ¨Ø§Ø±Ø§Øª',
                        value: overviewStats.totalResults.toLocaleString('ar-EG'),
                        trend: `${overviewStats.pendingBreakdown.quizzes} Ø§Ø®ØªØ¨Ø§Ø±Ù‹Ø§ Ù…Ø¹Ù„Ù‚Ù‹Ø§`,
                        color: 'text-amber-600',
                        bg: 'bg-amber-50',
                    },
                ].map((kpi) => (
                    <div key={kpi.title} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start">
                            <h3 className="text-gray-500 text-sm font-medium">{kpi.title}</h3>
                            <span className={`text-xs font-bold px-2 py-1 rounded-full ${kpi.bg} ${kpi.color}`}>
                                {kpi.trend}
                            </span>
                        </div>
                        <p className="text-3xl font-bold text-gray-900 mt-4">{kpi.value}</p>
                    </div>
                ))}
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                        <h3 className="text-lg font-black text-gray-900">Ù…Ø±ÙƒØ² Ø§Ù„ØªØ´ØºÙŠÙ„ Ø§Ù„ÙŠÙˆÙ…ÙŠ</h3>
                        <p className="mt-1 text-sm leading-6 text-gray-500">
                            Ù‡Ø°Ù‡ Ø§Ù„Ù‚Ø§Ø¦Ù…Ø© ØªØ¬Ù…Ø¹ Ø£Ù‡Ù… Ø§Ù„Ø£Ø´ÙŠØ§Ø¡ Ø§Ù„ØªÙŠ Ù‚Ø¯ ØªÙ…Ù†Ø¹ Ø§Ù„Ø·Ø§Ù„Ø¨ Ù…Ù† Ø±Ø¤ÙŠØ© Ø§Ù„Ù…Ø­ØªÙˆÙ‰ Ø£Ùˆ Ø§Ù„Ø§Ø³ØªÙØ§Ø¯Ø© Ù…Ù† Ø§Ù„ØªÙ‚Ø§Ø±ÙŠØ±. Ø§Ø¨Ø¯Ø£ Ù…Ù† Ø§Ù„Ø£Ø¹Ù„Ù‰ Ø«Ù… Ø§Ù†ØªÙ‚Ù„ Ù„Ù„Ù…Ø±ÙƒØ² Ø§Ù„Ù…Ù†Ø§Ø³Ø¨ Ù„Ù„Ø¥ØµÙ„Ø§Ø­.
                        </p>
                    </div>
                    <div className={`rounded-2xl px-5 py-3 text-center ${
                        dailyOperationQueue.length === 0
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-amber-50 text-amber-700'
                    }`}>
                        <div className="text-xs font-bold">Ù…Ù‡Ø§Ù… Ø­Ø±Ø¬Ø© Ø§Ù„Ø¢Ù†</div>
                        <div className="mt-1 text-2xl font-black">{dailyOperationQueue.length}</div>
                    </div>
                </div>

                {dailyOperationQueue.length > 0 ? (
                    <div className="mt-5 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {dailyOperationQueue.map((item) => (
                            <div key={item.id} className="rounded-2xl border border-gray-100 bg-gray-50/70 p-4">
                                <div className="mb-3 flex items-start justify-between gap-3">
                                    <div className={`rounded-xl px-3 py-1 text-xs font-black ${
                                        item.color === 'rose' ? 'bg-rose-100 text-rose-700' :
                                        item.color === 'indigo' ? 'bg-indigo-100 text-indigo-700' :
                                        item.color === 'emerald' ? 'bg-emerald-100 text-emerald-700' :
                                        item.color === 'purple' ? 'bg-purple-100 text-purple-700' :
                                        item.color === 'slate' ? 'bg-slate-100 text-slate-700' :
                                        'bg-amber-100 text-amber-700'
                                    }`}>
                                        {item.count.toLocaleString('ar-EG')}
                                    </div>
                                    <h4 className="text-right font-black text-gray-900">{item.title}</h4>
                                </div>
                                <p className="min-h-[48px] text-right text-xs leading-6 text-gray-500">{item.description}</p>
                                <button
                                    onClick={() => setActiveAdminTab(item.tab)}
                                    className="mt-4 w-full rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-black text-white hover:bg-gray-800"
                                >
                                    {item.actionLabel}
                                </button>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="mt-5 rounded-2xl border border-emerald-100 bg-emerald-50 p-5 text-sm font-bold leading-7 text-emerald-700">
                        Ù„Ø§ ØªÙˆØ¬Ø¯ Ø¹ÙˆØ§Ø¦Ù‚ ØªØ´ØºÙŠÙ„ÙŠØ© Ø¸Ø§Ù‡Ø±Ø© Ø§Ù„Ø¢Ù†. Ø§Ù„Ù…Ø­ØªÙˆÙ‰ Ø§Ù„Ù…Ù†Ø´ÙˆØ± ÙˆØ§Ù„Ø§Ø®ØªØ¨Ø§Ø±Ø§Øª ÙˆØ§Ù„Ø±Ø¨Ø· Ø¨Ø§Ù„Ù…Ù‡Ø§Ø±Ø§Øª ÙÙŠ Ø­Ø§Ù„Ø© Ø¬ÙŠØ¯Ø© Ø­Ø³Ø¨ Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„Ø­Ø§Ù„ÙŠØ©.
                    </div>
                )}
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div>
                        <h3 className="text-lg font-bold text-gray-900">Ù…Ø¤Ø´Ø± Ø¬Ø§Ù‡Ø²ÙŠØ© Ø§Ù„Ù…Ù†ØµØ© Ù‚Ø¨Ù„ Ø§Ù„Ù†Ø´Ø±</h3>
                        <p className="text-sm text-gray-500 mt-1">
                            ÙØ­Øµ Ø³Ø±ÙŠØ¹ ÙŠØ³Ø§Ø¹Ø¯Ùƒ ØªØ¹Ø±Ù Ù‡Ù„ Ø§Ù„Ù…Ø­ØªÙˆÙ‰ Ø¬Ø§Ù‡Ø² Ù„Ù„Ø·Ù„Ø§Ø¨ Ø£Ù… ÙŠØ­ØªØ§Ø¬ Ù…Ø±Ø§Ø¬Ø¹Ø© Ø£Ùˆ Ø±Ø¨Ø· Ù…Ù‡Ø§Ø±Ø§Øª.
                        </p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="w-20 h-20 rounded-full border-8 border-emerald-100 flex items-center justify-center bg-emerald-50">
                            <span className="text-xl font-black text-emerald-700">{platformReadiness.readinessScore}%</span>
                        </div>
                        <div>
                            <div className="text-sm text-gray-500">Ø­Ø§Ù„Ø© Ø§Ù„ØªØ´ØºÙŠÙ„</div>
                            <div className={`font-black ${platformReadiness.readinessScore >= 85 ? 'text-emerald-700' : platformReadiness.readinessScore >= 60 ? 'text-amber-700' : 'text-rose-700'}`}>
                                {platformReadiness.readinessScore >= 85 ? 'Ø¬Ø§Ù‡Ø²ÙŠØ© Ø¹Ø§Ù„ÙŠØ©' : platformReadiness.readinessScore >= 60 ? 'ØªØ­ØªØ§Ø¬ Ø¶Ø¨Ø· Ø¨Ø³ÙŠØ·' : 'ØªØ­ØªØ§Ø¬ Ù…Ø±Ø§Ø¬Ø¹Ø© Ù‚Ø¨Ù„ Ø§Ù„Ù†Ø´Ø±'}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                    {[
                        {
                            title: 'Ø¨Ø§Ù†ØªØ¸Ø§Ø± Ø§Ù„Ø§Ø¹ØªÙ…Ø§Ø¯',
                            value: overviewStats.pendingReview,
                            hint: 'Ø¯ÙˆØ±Ø§ØªØŒ Ø¯Ø±ÙˆØ³ØŒ Ø£Ø³Ø¦Ù„Ø© Ø£Ùˆ Ø§Ø®ØªØ¨Ø§Ø±Ø§Øª Ø£Ø¶ÙŠÙØª ÙˆØªØ­ØªØ§Ø¬ Ù‚Ø±Ø§Ø± Ù†Ø´Ø±.',
                            icon: <AlertTriangle size={18} />,
                            color: 'amber',
                        },
                        {
                            title: 'Ù…Ø®ÙÙŠ Ø¹Ù† Ø§Ù„Ø·Ù„Ø§Ø¨',
                            value: platformReadiness.hiddenContent,
                            hint: 'Ø¹Ù†Ø§ØµØ± Ù…ÙˆØ¬ÙˆØ¯Ø© ÙÙŠ Ø§Ù„Ø¥Ø¯Ø§Ø±Ø© Ù„ÙƒÙ†Ù‡Ø§ Ù„Ù† ØªØ¸Ù‡Ø± ÙÙŠ ÙˆØ§Ø¬Ù‡Ø© Ø§Ù„Ø·Ø§Ù„Ø¨.',
                            icon: <EyeOff size={18} />,
                            color: 'slate',
                        },
                        {
                            title: 'Ø§Ø®ØªØ¨Ø§Ø±Ø§Øª Ø¨Ù„Ø§ Ø£Ø³Ø¦Ù„Ø©',
                            value: platformReadiness.quizzesWithoutQuestions,
                            hint: 'Ø§Ø®ØªØ¨Ø§Ø±Ø§Øª ØªØ­ØªØ§Ø¬ Ø³Ø­Ø¨ Ø£Ø³Ø¦Ù„Ø© Ù…Ù† Ø¨Ù†Ùƒ Ø§Ù„Ø£Ø³Ø¦Ù„Ø© Ù‚Ø¨Ù„ Ø¹Ø±Ø¶Ù‡Ø§.',
                            icon: <FileQuestion size={18} />,
                            color: 'rose',
                        },
                        {
                            title: 'Ù…Ø­ØªÙˆÙ‰ Ø¨Ù„Ø§ Ù…Ù‡Ø§Ø±Ø§Øª',
                            value: platformReadiness.unlinkedContent,
                            hint: 'ÙŠØ¤Ø«Ø± Ø¹Ù„Ù‰ ØªÙ‚Ø§Ø±ÙŠØ± Ø§Ù„Ø¶Ø¹Ù ÙˆØ§Ù„ØªÙˆØµÙŠØ§Øª Ø§Ù„Ø°ÙƒÙŠØ© Ø¨Ø¹Ø¯ Ø§Ù„Ø§Ø®ØªØ¨Ø§Ø±.',
                            icon: <Target size={18} />,
                            color: 'indigo',
                        },
                    ].map((item) => (
                        <div key={item.title} className="rounded-2xl border border-gray-100 bg-gray-50/70 p-4">
                            <div className="flex items-center justify-between mb-3">
                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                                    item.color === 'amber' ? 'bg-amber-100 text-amber-700' :
                                    item.color === 'rose' ? 'bg-rose-100 text-rose-700' :
                                    item.color === 'indigo' ? 'bg-indigo-100 text-indigo-700' :
                                    'bg-slate-100 text-slate-700'
                                }`}>
                                    {item.icon}
                                </div>
                                <span className="text-2xl font-black text-gray-900">{item.value.toLocaleString('ar-EG')}</span>
                            </div>
                            <h4 className="font-black text-gray-900">{item.title}</h4>
                            <p className="text-xs text-gray-500 mt-2 leading-6">{item.hint}</p>
                        </div>
                    ))}
                </div>

                <div className="px-6 pb-6">
                    <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4">
                        <div className="flex items-center gap-2 font-black text-emerald-800 mb-3">
                            <CheckCircle2 size={18} />
                            Ø£ÙˆÙ„ÙˆÙŠØ© Ø§Ù„Ø¹Ù…Ù„ Ø§Ù„ØªØ§Ù„ÙŠØ©
                        </div>
                        {platformReadiness.nextActions.length > 0 ? (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                                {platformReadiness.nextActions.slice(0, 4).map((action) => (
                                    <div key={action} className="rounded-xl bg-white border border-emerald-100 px-4 py-3 text-sm text-gray-700">
                                        {action}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-emerald-700">
                                Ù…Ù…ØªØ§Ø². Ù„Ø§ ØªÙˆØ¬Ø¯ Ø¹ÙˆØ§Ø¦Ù‚ ØªØ´ØºÙŠÙ„ÙŠØ© ÙˆØ§Ø¶Ø­Ø© ÙÙŠ Ø§Ù„Ù…Ø­ØªÙˆÙ‰ Ø§Ù„Ø­Ø§Ù„ÙŠØŒ ÙˆÙŠÙ…ÙƒÙ†Ùƒ Ø§Ù„ØªØ±ÙƒÙŠØ² Ø¹Ù„Ù‰ Ø¥Ø¶Ø§ÙØ© Ù…Ø­ØªÙˆÙ‰ Ø¬Ø¯ÙŠØ¯ Ø£Ùˆ Ù…Ø±Ø§Ø¬Ø¹Ø© ØªØ¬Ø±Ø¨Ø© Ø§Ù„Ø·Ø§Ù„Ø¨.
                            </p>
                        )}
                    </div>
                </div>
            </div>

            {user.role === Role.ADMIN && (
                <div className="rounded-2xl border border-indigo-100 bg-white shadow-sm overflow-hidden">
                    <div className="flex flex-col gap-4 border-b border-indigo-50 bg-indigo-50/50 p-6 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                            <h3 className="text-xl font-black text-gray-900">Ù…Ø±ÙƒØ² Ø§Ù„ØªÙ‚Ø§Ø±ÙŠØ± ÙˆØ§Ù„Ø¥Ø´Ø±Ø§Ù Ø§Ù„Ù…Ø¯Ø±Ø³ÙŠ</h3>
                            <p className="mt-1 text-sm text-gray-500">
                                Ù…ØªØ§Ø¨Ø¹Ø© Ø¬Ø§Ù‡Ø²ÙŠØ© Ø§Ù„Ù…Ø¯Ø§Ø±Ø³ ÙˆØ§Ù„ÙØµÙˆÙ„ ÙˆØ§Ù„Ø·Ù„Ø§Ø¨ Ù‚Ø¨Ù„ Ø§Ù„ØªØ¹Ø§Ù‚Ø¯ Ø£Ùˆ Ø§Ù„ØªØ´ØºÙŠÙ„ Ø§Ù„ÙØ¹Ù„ÙŠ.
                            </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <button onClick={() => setActiveAdminTab('schools')} className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-black text-white hover:bg-indigo-700">
                                ØªØ´ØºÙŠÙ„ Ø§Ù„Ù…Ø¯Ø§Ø±Ø³
                            </button>
                            <a href="/reports" className="rounded-xl bg-white px-4 py-2 text-xs font-black text-indigo-700 ring-1 ring-indigo-100 hover:bg-indigo-50">
                                Ø§Ù„ØªÙ‚Ø§Ø±ÙŠØ±
                            </a>
                            <button onClick={() => setActiveAdminTab('quizzes')} className="rounded-xl bg-white px-4 py-2 text-xs font-black text-emerald-700 ring-1 ring-emerald-100 hover:bg-emerald-50">
                                ØªÙˆØ¬ÙŠÙ‡ Ø§Ø®ØªØ¨Ø§Ø±
                            </button>
                            <button onClick={() => setActiveAdminTab('announcement-ads')} className="rounded-xl bg-white px-4 py-2 text-xs font-black text-amber-700 ring-1 ring-amber-100 hover:bg-amber-50">
                                Ø±Ø³Ø§Ù„Ø© Ø£Ùˆ Ø¥Ø¹Ù„Ø§Ù†
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 p-6 lg:grid-cols-6">
                        {[
                            { label: 'Ù…Ø¯Ø§Ø±Ø³', value: schoolCommandCenter.schoolCount, tone: 'indigo' },
                            { label: 'ÙØµÙˆÙ„', value: schoolCommandCenter.classCount, tone: 'blue' },
                            { label: 'Ø·Ù„Ø§Ø¨ Ù…Ø¯Ø§Ø±Ø³', value: schoolCommandCenter.schoolStudentCount, tone: 'emerald' },
                            { label: 'Ø¨Ù„Ø§ ÙØµÙ„', value: schoolCommandCenter.studentsWithoutClass, tone: 'amber' },
                            { label: 'Ø¨Ù„Ø§ ÙˆÙ„ÙŠ Ø£Ù…Ø±', value: schoolCommandCenter.studentsWithoutParent, tone: 'rose' },
                            { label: 'Ø£ÙƒÙˆØ§Ø¯ Ù†Ø´Ø·Ø©', value: schoolCommandCenter.activeCodes, tone: 'purple' },
                        ].map((item) => (
                            <div key={item.label} className={`rounded-2xl border p-4 ${
                                item.tone === 'indigo' ? 'border-indigo-100 bg-indigo-50 text-indigo-700' :
                                item.tone === 'blue' ? 'border-blue-100 bg-blue-50 text-blue-700' :
                                item.tone === 'emerald' ? 'border-emerald-100 bg-emerald-50 text-emerald-700' :
                                item.tone === 'amber' ? 'border-amber-100 bg-amber-50 text-amber-700' :
                                item.tone === 'rose' ? 'border-rose-100 bg-rose-50 text-rose-700' :
                                'border-purple-100 bg-purple-50 text-purple-700'
                            }`}>
                                <div className="text-xs font-black">{item.label}</div>
                                <div className="mt-2 text-2xl font-black">{item.value.toLocaleString('ar-EG')}</div>
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-1 gap-5 px-6 pb-6 lg:grid-cols-2">
                        <div className="rounded-2xl border border-gray-100 bg-gray-50/70 p-4">
                            <div className="mb-3 flex items-center justify-between">
                                <h4 className="text-sm font-black text-gray-900">Ù…Ø¯Ø§Ø±Ø³ ØªØ­ØªØ§Ø¬ Ø¶Ø¨Ø·</h4>
                                <button onClick={() => setActiveAdminTab('schools')} className="text-xs font-black text-indigo-600 hover:text-indigo-700">
                                    Ø¥Ø¯Ø§Ø±Ø© Ø§Ù„Ù…Ø¯Ø§Ø±Ø³
                                </button>
                            </div>
                            <div className="space-y-3">
                                {schoolCommandCenter.needsSetup.length ? schoolCommandCenter.needsSetup.map((school) => (
                                    <div key={school.id} className="rounded-xl bg-white p-3 shadow-sm">
                                        <div className="flex items-center justify-between gap-3">
                                            <div className="min-w-0">
                                                <div className="truncate text-sm font-black text-gray-900">{school.name}</div>
                                                <div className="mt-1 text-xs text-gray-500">
                                                    {school.studentCount} Ø·Ø§Ù„Ø¨ - {school.classCount} ÙØµÙ„ - {school.supervisorCount} Ù…Ø´Ø±Ù
                                                </div>
                                            </div>
                                            <span className="rounded-lg bg-amber-50 px-2.5 py-1 text-xs font-black text-amber-700">
                                                {school.issueCount} ØªÙ†Ø¨ÙŠÙ‡
                                            </span>
                                        </div>
                                        <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] text-gray-500">
                                            <span>Ø¨Ù„Ø§ ÙØµÙ„: <b className="text-gray-900">{school.studentsWithoutClass}</b></span>
                                            <span>Ø¨Ù„Ø§ ÙˆÙ„ÙŠ Ø£Ù…Ø±: <b className="text-gray-900">{school.studentsWithoutParent}</b></span>
                                            <span>Ø¨Ø§Ù‚Ø§Øª: <b className="text-gray-900">{school.packageCount}</b></span>
                                            <span>Ø£ÙƒÙˆØ§Ø¯: <b className="text-gray-900">{school.activeCodeCount}</b></span>
                                        </div>
                                    </div>
                                )) : (
                                    <div className="rounded-xl border border-dashed border-emerald-200 bg-white p-4 text-sm font-bold text-emerald-700">
                                        Ø§Ù„Ù…Ø¯Ø§Ø±Ø³ Ø§Ù„Ø­Ø§Ù„ÙŠØ© Ø¬Ø§Ù‡Ø²Ø© Ù…Ø¨Ø¯Ø¦ÙŠÙ‹Ø§ ÙˆÙ„Ø§ ØªÙˆØ¬Ø¯ Ù†ÙˆØ§Ù‚Øµ Ø¸Ø§Ù‡Ø±Ø©.
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="rounded-2xl border border-gray-100 bg-gray-50/70 p-4">
                            <div className="mb-3 flex items-center justify-between">
                                <h4 className="text-sm font-black text-gray-900">Ø£Ø¯Ø§Ø¡ Ø§Ù„Ù…Ø¯Ø§Ø±Ø³</h4>
                                <a href="/reports" className="text-xs font-black text-indigo-600 hover:text-indigo-700">ØªÙ‚Ø±ÙŠØ± Ù…ÙØµÙ„</a>
                            </div>
                            <div className="space-y-3">
                                {schoolCommandCenter.performanceWatch.length ? schoolCommandCenter.performanceWatch.map((school) => (
                                    <div key={school.id} className="rounded-xl bg-white p-3 shadow-sm">
                                        <div className="flex items-center justify-between gap-3">
                                            <div className="min-w-0">
                                                <div className="truncate text-sm font-black text-gray-900">{school.name}</div>
                                                <div className="mt-1 text-xs text-gray-500">{school.quizAttempts} Ù†ØªÙŠØ¬Ø© Ù…Ø³Ø¬Ù„Ø©</div>
                                            </div>
                                            <span className={`rounded-lg px-2.5 py-1 text-xs font-black ${
                                                school.average < 60 ? 'bg-rose-50 text-rose-700' :
                                                school.average < 75 ? 'bg-amber-50 text-amber-700' :
                                                'bg-emerald-50 text-emerald-700'
                                            }`}>
                                                {school.average}%
                                            </span>
                                        </div>
                                    </div>
                                )) : (
                                    <div className="rounded-xl border border-dashed border-gray-200 bg-white p-4 text-sm text-gray-500">
                                        Ø³ÙŠØ¸Ù‡Ø± Ø£Ø¯Ø§Ø¡ Ø§Ù„Ù…Ø¯Ø§Ø±Ø³ Ø¨Ø¹Ø¯ ØªÙˆÙØ± Ù†ØªØ§Ø¦Ø¬ Ø§Ø®ØªØ¨Ø§Ø±Ø§Øª Ù…ÙˆØ¬Ù‡Ø© Ù„Ù„Ø·Ù„Ø§Ø¨.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-96">
                    <div className="flex items-center justify-between mb-5">
                        <div>
                            <h3 className="text-lg font-bold text-gray-900">Ù…Ø¤Ø´Ø±Ø§Øª Ø§Ù„Ø§Ø¹ØªÙ…Ø§Ø¯ ÙˆØ§Ù„ØªØ´ØºÙŠÙ„</h3>
                            <p className="text-sm text-gray-500 mt-1">ØªÙˆØ²ÙŠØ¹ Ø§Ù„Ø¹Ù†Ø§ØµØ± Ø§Ù„ØªÙŠ ØªÙ†ØªØ¸Ø± Ø§Ø¹ØªÙ…Ø§Ø¯Ùƒ Ø§Ù„Ø¢Ù† Ø­Ø³Ø¨ Ù†ÙˆØ¹ Ø§Ù„Ù…Ø­ØªÙˆÙ‰.</p>
                        </div>
                        <div className="text-sm text-amber-600 font-bold">
                            {overviewStats.pendingReview.toLocaleString('ar-EG')} Ø¹Ù†ØµØ±
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {[
                            { label: 'Ø§Ù„Ø¯ÙˆØ±Ø§Øª', value: overviewStats.pendingBreakdown.courses, color: 'bg-blue-500' },
                            { label: 'Ø§Ù„Ø¯Ø±ÙˆØ³', value: overviewStats.pendingBreakdown.lessons, color: 'bg-emerald-500' },
                            { label: 'Ø§Ù„Ø£Ø³Ø¦Ù„Ø©', value: overviewStats.pendingBreakdown.questions, color: 'bg-purple-500' },
                            { label: 'Ø§Ù„Ø§Ø®ØªØ¨Ø§Ø±Ø§Øª', value: overviewStats.pendingBreakdown.quizzes, color: 'bg-amber-500' },
                            { label: 'Ù…Ù„ÙØ§Øª Ø§Ù„Ù…ÙƒØªØ¨Ø©', value: overviewStats.pendingBreakdown.library, color: 'bg-pink-500' },
                        ].map((item) => {
                            const percentage = overviewStats.pendingReview
                                ? Math.round((item.value / overviewStats.pendingReview) * 100)
                                : 0;

                            return (
                                <div key={item.label} className="border border-gray-100 rounded-xl p-4 bg-gray-50/60">
                                    <div className="flex items-center justify-between mb-3">
                                        <span className="font-bold text-gray-900">{item.label}</span>
                                        <span className="text-sm text-gray-500">{item.value}</span>
                                    </div>
                                    <div className="w-full h-2.5 bg-gray-200 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full ${item.color}`}
                                            style={{ width: `${Math.max(percentage, item.value ? 8 : 0)}%` }}
                                        />
                                    </div>
                                    <p className="text-xs text-gray-500 mt-2">ÙŠÙ…Ø«Ù„ {percentage}% Ù…Ù† Ø·Ø§Ø¨ÙˆØ± Ø§Ù„Ù…Ø±Ø§Ø¬Ø¹Ø© Ø§Ù„Ø­Ø§Ù„ÙŠ.</p>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-96 flex flex-col">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Ø£Ø­Ø¯Ø« Ù…Ø§ ÙŠÙ†ØªØ¸Ø± Ø§Ù„Ø§Ø¹ØªÙ…Ø§Ø¯</h3>
                    <div className="flex-1 overflow-y-auto space-y-4">
                        {reviewQueue.length === 0 ? (
                            <div className="flex-1 flex flex-col items-center justify-center text-center text-gray-400">
                                <Activity size={42} className="mb-3 text-gray-200" />
                                <p className="font-medium">Ù„Ø§ ÙŠÙˆØ¬Ø¯ Ù…Ø­ØªÙˆÙ‰ Ù…Ø¹Ù„Ù‚ Ø§Ù„Ø¢Ù†</p>
                                <p className="text-xs mt-1">ÙƒÙ„ Ù…Ø§ Ø£Ø¶ÙŠÙÙ‡ Ø§Ù„Ù…Ø¹Ù„Ù…ÙˆÙ† ØªÙ…Øª Ù…Ø±Ø§Ø¬Ø¹ØªÙ‡ Ø£Ùˆ Ù„Ø§ ÙŠØ²Ø§Ù„ ÙÙŠ Ø§Ù„Ù…Ø³ÙˆØ¯Ø©.</p>
                            </div>
                        ) : (
                            reviewQueue.map((item) => (
                                <div key={item.id} className="flex items-start gap-3 pb-4 border-b border-gray-50 last:border-0">
                                    <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                                        <User size={14} className="text-amber-600" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm text-gray-800 font-bold truncate">{item.title}</p>
                                        <p className="text-xs text-gray-500 mt-1">
                                            {item.type} â€¢ Ø§Ù„Ù…ØµØ¯Ø±: {item.ownerType === 'teacher' ? 'Ù…Ø¹Ù„Ù…' : item.ownerType === 'school' ? 'Ù…Ø¯Ø±Ø³Ø©' : 'Ø§Ù„Ù…Ù†ØµØ©'}
                                        </p>
                                        {user.role === Role.ADMIN && (
                                            <div className="mt-3 flex flex-wrap gap-2">
                                                <button
                                                    onClick={() => reviewContentItem(item, 'approved')}
                                                    className="rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-black text-emerald-700 hover:bg-emerald-100"
                                                >
                                                    Ø§Ø¹ØªÙ…Ø§Ø¯ ÙˆÙ†Ø´Ø±
                                                </button>
                                                <button
                                                    onClick={() => reviewContentItem(item, 'rejected')}
                                                    className="rounded-lg bg-rose-50 px-3 py-1.5 text-xs font-black text-rose-700 hover:bg-rose-100"
                                                >
                                                    Ø±ÙØ¶
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
            </>
            )}

            {(user.role === Role.ADMIN || user.role === Role.TEACHER || user.role === Role.SUPERVISOR) && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {user.role === Role.ADMIN && (
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                            <div className="flex items-center justify-between mb-5">
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900">Ù†Ø´Ø§Ø· Ø§Ù„Ù…Ø¹Ù„Ù…ÙŠÙ† ÙˆØ§Ø¹ØªÙ…Ø§Ø¯ Ø§Ù„Ù…Ø­ØªÙˆÙ‰</h3>
                                    <p className="text-sm text-gray-500 mt-1">Ø§Ù„Ù…Ø¹Ù„Ù…ÙˆÙ† Ø§Ù„Ø£ÙƒØ«Ø± Ø¥Ø¶Ø§ÙØ© Ù„Ù„Ù…Ø­ØªÙˆÙ‰ ÙˆØ§Ù„Ù†Ø·Ø§Ù‚Ø§Øª Ø§Ù„Ù…Ø³Ù†Ø¯Ø© Ù„Ù‡Ù… Ø§Ù„Ø¢Ù†.</p>
                                </div>
                                <div className="text-sm text-emerald-600 font-bold">
                                    {teacherContributionStats.length.toLocaleString('ar-EG')} Ù…Ø¹Ù„Ù…
                                </div>
                            </div>

                            <div className="space-y-3">
                                {teacherContributionStats.length > 0 ? teacherContributionStats.map((teacher) => (
                                    <div key={teacher.id} className="border border-gray-100 rounded-xl p-4 bg-gray-50/70">
                                        <div className="flex items-center justify-between gap-3 mb-2">
                                            <div className="font-bold text-gray-900">{teacher.name}</div>
                                            <div className="text-sm font-black text-amber-600">{teacher.pendingItems}</div>
                                        </div>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-gray-600">
                                            <div>Ø§Ù„Ø¥Ø¬Ù…Ø§Ù„ÙŠ: <span className="font-bold text-gray-900">{teacher.totalItems}</span></div>
                                            <div>Ù…Ø¹ØªÙ…Ø¯: <span className="font-bold text-emerald-700">{teacher.approvedItems}</span></div>
                                            <div>Ù…Ù†Ø´ÙˆØ±: <span className="font-bold text-indigo-700">{teacher.publishedItems}</span></div>
                                            <div>Ø¨Ø§Ù†ØªØ¸Ø§Ø±Ùƒ: <span className="font-bold text-amber-700">{teacher.pendingItems}</span></div>
                                        </div>
                                        <div className="mt-2 text-xs text-gray-500">
                                            Ø§Ù„Ù…Ø³Ø§Ø±Ø§Øª Ø§Ù„Ù…Ø³Ù†Ø¯Ø©: <span className="font-bold">{teacher.managedPaths}</span>
                                            {' â€¢ '}
                                            Ø§Ù„Ù…ÙˆØ§Ø¯ Ø§Ù„Ù…Ø³Ù†Ø¯Ø©: <span className="font-bold">{teacher.managedSubjects}</span>
                                        </div>
                                    </div>
                                )) : (
                                    <div className="border border-dashed border-gray-200 rounded-xl p-4 text-sm text-gray-500">
                                        Ù„Ø§ ØªÙˆØ¬Ø¯ Ù…Ø³Ø§Ù‡Ù…Ø§Øª Ù…Ø¹Ù„Ù…ÙŠÙ† Ø¸Ø§Ù‡Ø±Ø© Ø¨Ø¹Ø¯ Ø¯Ø§Ø®Ù„ Ø§Ù„Ù…Ù†ØµØ©.
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {user.role === Role.TEACHER && (
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                            <div className="flex items-center justify-between mb-5">
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900">Ù†Ø·Ø§Ù‚ Ø¹Ù…Ù„ÙŠ Ø§Ù„Ø­Ø§Ù„ÙŠ</h3>
                                    <p className="text-sm text-gray-500 mt-1">Ø£ÙŠ Ø¥Ø¶Ø§ÙØ© Ø¬Ø¯ÙŠØ¯Ø© Ù…Ù†Ùƒ Ø³ØªØ¸Ù‡Ø± Ø£ÙˆÙ„Ù‹Ø§ ÙÙŠ Ø·Ø§Ø¨ÙˆØ± Ø§Ù„Ù…Ø±Ø§Ø¬Ø¹Ø© Ø­ØªÙ‰ Ø§Ø¹ØªÙ…Ø§Ø¯Ù‡Ø§ Ù…Ù† Ø§Ù„Ø¥Ø¯Ø§Ø±Ø©.</p>
                                </div>
                                <div className="text-sm text-indigo-600 font-bold">Ù…Ø¹Ù„Ù… Ù…Ø§Ø¯Ø©</div>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="rounded-xl bg-indigo-50 p-4">
                                    <div className="text-xs text-indigo-600 mb-1">Ø§Ù„Ù…Ø³Ø§Ø±Ø§Øª Ø§Ù„Ù…Ø³Ù†Ø¯Ø©</div>
                                    <div className="text-2xl font-black text-indigo-700">{user.managedPathIds?.length || 0}</div>
                                </div>
                                <div className="rounded-xl bg-emerald-50 p-4">
                                    <div className="text-xs text-emerald-600 mb-1">Ø§Ù„Ù…ÙˆØ§Ø¯ Ø§Ù„Ù…Ø³Ù†Ø¯Ø©</div>
                                    <div className="text-2xl font-black text-emerald-700">{user.managedSubjectIds?.length || 0}</div>
                                </div>
                                <div className="rounded-xl bg-amber-50 p-4">
                                    <div className="text-xs text-amber-600 mb-1">Ø¨Ø§Ù†ØªØ¸Ø§Ø± Ø§Ù„Ø§Ø¹ØªÙ…Ø§Ø¯</div>
                                    <div className="text-2xl font-black text-amber-700">{currentTeacherContribution?.pendingItems || 0}</div>
                                </div>
                                <div className="rounded-xl bg-purple-50 p-4">
                                    <div className="text-xs text-purple-600 mb-1">Ù…Ø­ØªÙˆÙ‰ Ù…Ù†Ø´ÙˆØ±</div>
                                    <div className="text-2xl font-black text-purple-700">{currentTeacherContribution?.publishedItems || 0}</div>
                                </div>
                            </div>
                        </div>
                    )}


                </div>
            )}
        </div>
    );

    const renderLibraryCenter = () => {
        const selectedOption = librarySubjectOptions.find((item) => item.subject.id === selectedLibrarySubjectId);
        const selectedSubject = selectedOption?.subject;
        const selectedPathName = selectedOption?.path?.name || 'Ù…Ø³Ø§Ø± ØºÙŠØ± Ù…Ø­Ø¯Ø¯';
        const visibleFiles = libraryItems.filter((item) => item.showOnPlatform !== false).length;
        const readySupportFiles = libraryItems.filter(
            (item) =>
                item.showOnPlatform !== false &&
                item.approvalStatus === 'approved' &&
                Boolean(item.url?.trim()) &&
                Boolean(item.sectionId) &&
                Boolean((item.skillIds || []).length),
        ).length;
        const needsAttentionFiles = libraryItems.filter(
            (item) =>
                item.showOnPlatform === false ||
                item.approvalStatus !== 'approved' ||
                !item.url?.trim() ||
                !item.sectionId ||
                !(item.skillIds || []).length,
        ).length;

        return (
            <div className="space-y-6 animate-fade-in">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Ù…Ø±ÙƒØ² Ø§Ù„Ù…ÙƒØªØ¨Ø© ÙˆÙ…Ù„ÙØ§Øª Ø§Ù„Ø¯Ø¹Ù…</h1>
                        <p className="mt-1 text-sm text-gray-500">
                            Ù…ÙƒØ§Ù† ÙˆØ§Ø­Ø¯ Ù„Ø¥Ø¯Ø§Ø±Ø© Ø§Ù„Ù…Ù„ÙØ§Øª ÙˆØ§Ù„ØªÙ„Ø®ÙŠØµØ§Øª Ø§Ù„ØªÙŠ ØªØ¸Ù‡Ø± ÙÙŠ Ù…ÙƒØªØ¨Ø© Ø§Ù„Ù…Ø§Ø¯Ø© ÙˆØ¯Ø§Ø®Ù„ Ù…ÙˆØ¶ÙˆØ¹Ø§Øª Ø§Ù„ØªØ£Ø³ÙŠØ³.
                        </p>
                    </div>
                    <div className="w-full lg:w-80">
                        <label className="mb-2 block text-xs font-black text-gray-500">Ø§Ø®ØªØ± Ø§Ù„Ù…Ø§Ø¯Ø©</label>
                        <select
                            value={selectedLibrarySubjectId}
                            onChange={(event) => setSelectedLibrarySubjectId(event.target.value)}
                            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-bold text-gray-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                        >
                            {librarySubjectOptions.map((item) => (
                                <option key={item.subject.id} value={item.subject.id}>
                                    {(item.path?.name || 'Ù…Ø³Ø§Ø± ØºÙŠØ± Ù…Ø­Ø¯Ø¯')} / {item.subject.name} ({item.fileCount})
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                    {[
                        { label: 'ÙƒÙ„ Ø§Ù„Ù…Ù„ÙØ§Øª', value: libraryItems.length, className: 'bg-slate-50 text-slate-700 border-slate-100' },
                        { label: 'Ø¸Ø§Ù‡Ø± Ù„Ù„Ø·Ù„Ø§Ø¨', value: visibleFiles, className: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
                        { label: 'Ø¬Ø§Ù‡Ø² ÙƒÙ…Ù„Ù Ø¯Ø¹Ù…', value: readySupportFiles, className: 'bg-indigo-50 text-indigo-700 border-indigo-100' },
                        { label: 'ÙŠØ­ØªØ§Ø¬ Ù…Ø±Ø§Ø¬Ø¹Ø©', value: needsAttentionFiles, className: 'bg-amber-50 text-amber-700 border-amber-100' },
                    ].map((item) => (
                        <div key={item.label} className={`rounded-2xl border p-5 ${item.className}`}>
                            <div className="text-xs font-black">{item.label}</div>
                            <div className="mt-2 text-3xl font-black">{item.value.toLocaleString('ar-EG')}</div>
                        </div>
                    ))}
                </div>

                {selectedSubject ? (
                    <>
                        <div className="rounded-2xl border border-indigo-100 bg-indigo-50/70 p-5">
                            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                <div>
                                    <div className="text-xs font-black text-indigo-600">Ø§Ù„Ù…Ø§Ø¯Ø© Ø§Ù„Ø­Ø§Ù„ÙŠØ©</div>
                                    <h2 className="mt-1 text-xl font-black text-gray-900">{selectedSubject.name}</h2>
                                    <p className="mt-1 text-sm text-gray-500">{selectedPathName}</p>
                                </div>
                                <div className="grid grid-cols-2 gap-3 text-center md:grid-cols-3">
                                    <div className="rounded-xl bg-white px-4 py-3">
                                        <div className="text-xs font-bold text-gray-500">Ù…Ù„ÙØ§Øª Ø§Ù„Ù…Ø§Ø¯Ø©</div>
                                        <div className="mt-1 text-lg font-black text-gray-900">{selectedOption?.fileCount || 0}</div>
                                    </div>
                                    <div className="rounded-xl bg-white px-4 py-3">
                                        <div className="text-xs font-bold text-gray-500">Ø¬Ø§Ù‡Ø² Ù„Ù„Ø¯Ø¹Ù…</div>
                                        <div className="mt-1 text-lg font-black text-emerald-700">{selectedOption?.readyCount || 0}</div>
                                    </div>
                                    <div className="rounded-xl bg-white px-4 py-3">
                                        <div className="text-xs font-bold text-gray-500">Ø§Ù„Ù…Ø³Ø§Ø±</div>
                                        <div className="mt-1 text-sm font-black text-gray-900">{selectedPathName}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <LibraryManager subjectId={selectedSubject.id} />
                    </>
                ) : (
                    <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-10 text-center">
                        <BookOpen className="mx-auto mb-4 text-gray-300" size={44} />
                        <h2 className="text-xl font-black text-gray-900">Ù„Ø§ ØªÙˆØ¬Ø¯ Ù…ÙˆØ§Ø¯ Ù„Ø¥Ø¯Ø§Ø±Ø© Ø§Ù„Ù…ÙƒØªØ¨Ø©</h2>
                        <p className="mt-2 text-sm text-gray-500">Ø£Ø¶Ù Ù…Ø³Ø§Ø±Ø§ ÙˆÙ…Ø§Ø¯Ø© Ø£ÙˆÙ„Ø§ØŒ Ø«Ù… Ø§Ø±Ø¬Ø¹ Ù„Ø¥Ø¯Ø§Ø±Ø© Ù…Ù„ÙØ§Øª Ø§Ù„Ø¯Ø¹Ù… ÙˆØ§Ù„ØªÙ„Ø®ÙŠØµØ§Øª Ù…Ù† Ù‡Ù†Ø§.</p>
                    </div>
                )}
            </div>
        );
    };

    const renderSystemOperations = () => (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">
                        {activeTab === 'settings' ? 'Ø§Ù„Ø¥Ø¹Ø¯Ø§Ø¯Ø§Øª Ø§Ù„ØªØ´ØºÙŠÙ„ÙŠØ©' : 'Ù…Ø±Ø§Ù‚Ø¨Ø© Ø§Ù„Ù†Ø¸Ø§Ù…'}
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Ù…ØªØ§Ø¨Ø¹Ø© Ø­Ø§Ù„Ø© Ø§Ù„Ø®Ø¯Ù…Ø§Øª Ø§Ù„Ù…Ù‡Ù…Ø© Ø¨Ø¯ÙˆÙ† ØªØºÙŠÙŠØ± ØªØ¬Ø±Ø¨Ø© Ø§Ù„Ø·Ø§Ù„Ø¨ Ø£Ùˆ ØªØ¹Ø·ÙŠÙ„ Ø£ÙŠ Ø¬Ø²Ø¡ ÙŠØ¹Ù…Ù„ Ø¨Ø§Ù„ÙØ¹Ù„.
                    </p>
                </div>
                <button
                    onClick={loadAiStatus}
                    disabled={aiStatusLoading}
                    className="rounded-xl bg-gray-900 px-5 py-3 text-sm font-black text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    {aiStatusLoading ? 'Ø¬Ø§Ø±ÙŠ Ø§Ù„ØªØ­Ø¯ÙŠØ«...' : 'ØªØ­Ø¯ÙŠØ« Ø§Ù„Ø­Ø§Ù„Ø©'}
                </button>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                        <h2 className="text-xl font-black text-gray-900">Ø­Ø§Ù„Ø© Ø§Ù„ØªØ´ØºÙŠÙ„ Ø§Ù„Ø­ÙŠØ©</h2>
                        <p className="mt-1 text-sm leading-6 text-gray-500">
                            ÙØ­Øµ Ù…Ø¨Ø§Ø´Ø± Ù…Ù† Ø§Ù„Ø®Ø§Ø¯Ù… Ù„Ù‚Ø§Ø¹Ø¯Ø© Ø§Ù„Ø¨ÙŠØ§Ù†Ø§ØªØŒ Ø§Ù„Ù…Ø­ØªÙˆÙ‰ Ø§Ù„Ù…Ø±Ø¦ÙŠ Ù„Ù„Ø·Ø§Ù„Ø¨ØŒ ÙˆØ±ÙˆØ§Ø¨Ø· Ø§Ù„ØªØ¹Ù„Ù… Ø§Ù„Ø£Ø³Ø§Ø³ÙŠØ©.
                        </p>
                    </div>
                    <div className={`rounded-2xl px-5 py-3 text-center ${
                        (operationalStatus?.learningReadiness.score || 0) >= 85
                            ? 'bg-emerald-50 text-emerald-700'
                            : (operationalStatus?.learningReadiness.score || 0) >= 60
                                ? 'bg-amber-50 text-amber-700'
                                : 'bg-rose-50 text-rose-700'
                    }`}>
                        <div className="text-xs font-bold">Ø¬Ø§Ù‡Ø²ÙŠØ© Ø§Ù„ØªØ¹Ù„Ù…</div>
                        <div className="mt-1 text-2xl font-black">
                            {operationalStatus ? `${operationalStatus.learningReadiness.score}%` : '...'}
                        </div>
                    </div>
                </div>

                {operationalStatusError ? (
                    <div className="mt-5 rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">
                        {operationalStatusError}
                    </div>
                ) : null}

                <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                    {[
                        {
                            title: 'Ù‚Ø§Ø¹Ø¯Ø© Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª',
                            value: operationalStatus?.database.status === 'connected' ? 'Ù…ØªØµÙ„Ø©' : 'ØºÙŠØ± Ù…ØªØµÙ„Ø©',
                            hint: operationalStatus?.database.name || 'ØºÙŠØ± Ù…Ø­Ø¯Ø¯',
                            ok: operationalStatus?.database.status === 'connected',
                        },
                        {
                            title: 'Ù…Ø³Ø§Ø­Ø§Øª Ø¸Ø§Ù‡Ø±Ø©',
                            value: `${operationalStatus?.learningReadiness.usableSpaces || 0}`,
                            hint: `ÙØ§Ø±ØºØ©: ${operationalStatus?.learningReadiness.emptySpaces || 0}`,
                            ok: (operationalStatus?.learningReadiness.usableSpaces || 0) > 0 && (operationalStatus?.learningReadiness.emptySpaces || 0) === 0,
                        },
                        {
                            title: 'Ø±ÙˆØ§Ø¨Ø· Ø§Ù„Ø¯Ø±ÙˆØ³',
                            value: `${operationalStatus?.issues.missingLessonRefs || 0}`,
                            hint: `Ø¯Ø±ÙˆØ³ ØºÙŠØ± Ù‚Ø§Ø¨Ù„Ø© Ù„Ù„ØªØ´ØºÙŠÙ„: ${operationalStatus?.issues.unplayableLinkedLessons || 0}`,
                            ok: (operationalStatus?.issues.missingLessonRefs || 0) === 0 && (operationalStatus?.issues.unplayableLinkedLessons || 0) === 0,
                        },
                        {
                            title: 'Ø§Ù„Ù†Ø´Ø±',
                            value: operationalStatus?.deployment.api || 'Render',
                            hint: `${operationalStatus?.deployment.frontend || 'Vercel'} + ${operationalStatus?.deployment.database || 'Atlas'}`,
                            ok: true,
                        },
                    ].map((item) => (
                        <div key={item.title} className="rounded-2xl border border-gray-100 bg-gray-50/70 p-4">
                            <div className="flex items-center justify-between gap-3">
                                <span className={`rounded-full px-2.5 py-1 text-xs font-black ${
                                    item.ok ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                                }`}>
                                    {item.ok ? 'Ø³Ù„ÙŠÙ…' : 'ÙŠØ­ØªØ§Ø¬ Ù…Ø±Ø§Ø¬Ø¹Ø©'}
                                </span>
                                <div className="text-sm font-bold text-gray-500">{item.title}</div>
                            </div>
                            <div className="mt-3 text-2xl font-black text-gray-900">{item.value}</div>
                            <div className="mt-2 text-xs leading-5 text-gray-500">{item.hint}</div>
                        </div>
                    ))}
                </div>

                {operationalStatus?.learningReadiness.spaces?.length ? (
                    <div className="mt-5 overflow-hidden rounded-2xl border border-gray-100">
                        <div className="grid grid-cols-6 bg-gray-50 px-4 py-3 text-xs font-black text-gray-500">
                            <div className="col-span-2 text-right">Ø§Ù„Ù…Ø§Ø¯Ø©</div>
                            <div className="text-center">Ù…ÙˆØ¶ÙˆØ¹Ø§Øª</div>
                            <div className="text-center">Ø¯Ø±ÙˆØ³</div>
                            <div className="text-center">Ø§Ø®ØªØ¨Ø§Ø±Ø§Øª</div>
                            <div className="text-center">Ù…Ù„ÙØ§Øª</div>
                        </div>
                        {operationalStatus.learningReadiness.spaces.map((space) => (
                            <div key={`${space.pathId}-${space.subjectId}`} className="grid grid-cols-6 border-t border-gray-100 px-4 py-3 text-sm">
                                <div className="col-span-2 text-right font-bold text-gray-800">{space.subjectName}</div>
                                <div className="text-center text-gray-600">{space.topics}</div>
                                <div className="text-center text-gray-600">{space.lessons}</div>
                                <div className="text-center text-gray-600">{space.quizzes}</div>
                                <div className="text-center text-gray-600">{space.library}</div>
                            </div>
                        ))}
                    </div>
                ) : null}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <div className="xl:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-5">
                        <div>
                            <div className="flex items-center gap-3 mb-3">
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                                    aiProviderMeta.color === 'emerald'
                                        ? 'bg-emerald-100 text-emerald-700'
                                        : aiProviderMeta.color === 'blue'
                                            ? 'bg-blue-100 text-blue-700'
                                            : 'bg-slate-100 text-slate-700'
                                }`}>
                                    <Activity size={22} />
                                </div>
                                <div>
                                    <h2 className="text-xl font-black text-gray-900">Ø­Ø§Ù„Ø© Ø§Ù„Ø°ÙƒØ§Ø¡ Ø§Ù„Ø§ØµØ·Ù†Ø§Ø¹ÙŠ</h2>
                                    <p className="text-sm text-gray-500">Ù…ØµØ¯Ø± Ø§Ù„ØªØ­Ù„ÙŠÙ„ ÙˆØ§Ù„ØªÙˆØµÙŠØ§Øª Ø§Ù„Ø°ÙƒÙŠØ© Ø¯Ø§Ø®Ù„ Ø§Ù„Ù…Ù†ØµØ©</p>
                                </div>
                            </div>
                            <p className="text-sm leading-7 text-gray-600 max-w-2xl">{aiProviderMeta.description}</p>
                        </div>
                        <div className={`rounded-2xl px-5 py-4 text-center ${
                            aiProviderMeta.color === 'emerald'
                                ? 'bg-emerald-50 text-emerald-700'
                                : aiProviderMeta.color === 'blue'
                                    ? 'bg-blue-50 text-blue-700'
                                    : 'bg-slate-50 text-slate-700'
                        }`}>
                            <div className="text-xs font-bold opacity-80">Ø§Ù„Ù…Ø²ÙˆØ¯ Ø§Ù„Ø­Ø§Ù„ÙŠ</div>
                            <div className="text-lg font-black mt-1">{aiProviderMeta.label}</div>
                            <div className="text-xs font-bold mt-2">{aiProviderMeta.badge}</div>
                        </div>
                    </div>

                    {aiStatusError && (
                        <div className="mt-5 rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">
                            {aiStatusError}
                        </div>
                    )}

                    <div className="mt-6 grid grid-cols-1 md:grid-cols-5 gap-4">
                        <div className="rounded-2xl bg-gray-50 border border-gray-100 p-4">
                            <div className="text-xs text-gray-500 mb-2">Ø§Ù„Ù†Ù…ÙˆØ°Ø¬</div>
                            <div className="font-black text-gray-900 break-words">{aiStatus?.model || 'ØºÙŠØ± Ù…Ø­Ø¯Ø¯'}</div>
                        </div>
                        <div className="rounded-2xl bg-gray-50 border border-gray-100 p-4">
                            <div className="text-xs text-gray-500 mb-2">Ù…Ù‡Ù„Ø© Ø§Ù„Ø·Ù„Ø¨</div>
                            <div className="font-black text-gray-900">
                                {aiStatus?.timeoutMs ? `${aiStatus.timeoutMs.toLocaleString('ar-EG')} ms` : 'ØºÙŠØ± Ù…Ø­Ø¯Ø¯'}
                            </div>
                        </div>
                        <div className="rounded-2xl bg-gray-50 border border-gray-100 p-4">
                            <div className="text-xs text-gray-500 mb-2">Ollama / Gemma</div>
                            <div className={`font-black ${aiStatus?.ollamaConfigured ? 'text-emerald-700' : 'text-gray-500'}`}>
                                {aiStatus?.ollamaConfigured ? 'Ù…ÙØ¹Ù„' : 'ØºÙŠØ± Ù…ÙØ¹Ù„'}
                            </div>
                        </div>
                        <div className="rounded-2xl bg-gray-50 border border-gray-100 p-4">
                            <div className="text-xs text-gray-500 mb-2">LM Studio</div>
                            <div className={`font-black ${aiStatus?.lmStudioConfigured ? 'text-emerald-700' : 'text-gray-500'}`}>
                                {aiStatus?.lmStudioConfigured ? 'Ù…ÙØ¹Ù„' : 'ØºÙŠØ± Ù…ÙØ¹Ù„'}
                            </div>
                        </div>
                        <div className="rounded-2xl bg-gray-50 border border-gray-100 p-4">
                            <div className="text-xs text-gray-500 mb-2">Gemini</div>
                            <div className={`font-black ${aiStatus?.geminiConfigured ? 'text-emerald-700' : 'text-gray-500'}`}>
                                {aiStatus?.geminiConfigured ? 'Ù…ÙØ¹Ù„' : 'ØºÙŠØ± Ù…ÙØ¹Ù„'}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                    <h3 className="text-lg font-black text-gray-900 mb-4">Ù‚Ø±Ø§Ø± Ø§Ù„ØªØ´ØºÙŠÙ„ Ø§Ù„Ø§Ø­ØªØ±Ø§ÙÙŠ</h3>
                    <div className="space-y-3 text-sm leading-7 text-gray-600">
                        <p className="rounded-2xl bg-emerald-50 border border-emerald-100 p-4 text-emerald-800">
                            Ø§Ù„Ø£ÙˆÙ„ÙˆÙŠØ© Ø§Ù„Ù…Ø³ØªÙ‚Ø¨Ù„ÙŠØ©: ØªØ´ØºÙŠÙ„ Ollama/Gemma Ø£Ùˆ LM Studio Ø¹Ù„Ù‰ Ø³ÙŠØ±ÙØ± Ù…Ø³ØªÙ‚Ù„ Ø£Ùˆ Ø¬Ù‡Ø§Ø² Ø¯Ø§Ø¦Ù… Ù„ØªÙ‚Ù„ÙŠÙ„ ØªÙƒÙ„ÙØ© Ø§Ù„Ø°ÙƒØ§Ø¡ Ø§Ù„Ø§ØµØ·Ù†Ø§Ø¹ÙŠ.
                        </p>
                        <p className="rounded-2xl bg-blue-50 border border-blue-100 p-4 text-blue-800">
                            ÙÙŠ Ø§Ù„Ø¥Ù†ØªØ§Ø¬: ÙƒÙ„ Ø·Ù„Ø¨Ø§Øª Ø§Ù„Ø°ÙƒØ§Ø¡ ØªÙ…Ø± Ù…Ù† Ø§Ù„Ø®Ø§Ø¯Ù…ØŒ Ù„Ø°Ù„Ùƒ Ù…ÙØ§ØªÙŠØ­ API Ù„Ø§ ØªØ¸Ù‡Ø± Ù„Ù„Ø·Ø§Ù„Ø¨ ÙˆÙ„Ø§ Ù„Ù„Ù…ØªØµÙØ­.
                        </p>
                        <p className="rounded-2xl bg-amber-50 border border-amber-100 p-4 text-amber-800">
                            Ù„Ùˆ ØªØ¹Ø·Ù„ Ù…Ø²ÙˆØ¯ Ø§Ù„Ø°ÙƒØ§Ø¡ØŒ Ø§Ù„Ù…Ù†ØµØ© Ù„Ø§ ØªØªÙˆÙ‚Ù ÙˆØªØ¹Ø±Ø¶ Ù…Ù‚ØªØ±Ø­Ø§Øª Ø§Ø­ØªÙŠØ§Ø·ÙŠØ© Ù…Ù†Ø§Ø³Ø¨Ø© Ø­ØªÙ‰ Ù†Ø¹ÙŠØ¯ Ø¶Ø¨Ø· Ø§Ù„Ù…Ø²ÙˆØ¯.
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                    {
                        title: 'Ù…ØµØ¯Ø± Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª',
                        value: 'MongoDB Atlas',
                        hint: 'Ø§Ù„Ù…Ø³Ø§Ø±Ø§ØªØŒ Ø§Ù„Ù…Ù‡Ø§Ø±Ø§ØªØŒ Ø§Ù„Ø§Ø®ØªØ¨Ø§Ø±Ø§ØªØŒ Ø§Ù„Ù†ØªØ§Ø¦Ø¬ØŒ ÙˆØ§Ù„ØªÙ‚Ø§Ø±ÙŠØ± Ù…Ø±ØªØ¨Ø·Ø© Ø¨Ù…ØµØ¯Ø± Ø¨ÙŠØ§Ù†Ø§Øª Ø­Ù‚ÙŠÙ‚ÙŠ.',
                    },
                    {
                        title: 'Ø§Ù„Ù†Ø´Ø± Ø§Ù„Ø­Ø§Ù„ÙŠ',
                        value: 'Vercel + Render',
                        hint: 'Ø§Ù„ÙˆØ§Ø¬Ù‡Ø© ÙˆØ§Ù„Ø®Ø§Ø¯Ù… Ù…Ù†ÙØµÙ„Ø§Ù† ÙˆØ¬Ø§Ù‡Ø²Ø§Ù† Ù„Ù„ØªØ·ÙˆÙŠØ± Ø§Ù„Ù…Ø³ØªÙ…Ø± Ø¨Ø¯ÙˆÙ† Ø§Ù„Ø§Ø¹ØªÙ…Ø§Ø¯ Ø¹Ù„Ù‰ Ø¬Ù‡Ø§Ø²Ùƒ.',
                    },
                    {
                        title: 'Ø§Ù„Ø³Ù„Ø§Ù…Ø©',
                        value: 'JWT + Server AI',
                        hint: 'ØªØ³Ø¬ÙŠÙ„ Ø§Ù„Ø¯Ø®ÙˆÙ„ Ø§Ù„Ø­Ù‚ÙŠÙ‚ÙŠ ÙˆØ­Ù…Ø§ÙŠØ© Ù…ÙØ§ØªÙŠØ­ Ø§Ù„Ø°ÙƒØ§Ø¡ Ø¯Ø§Ø®Ù„ Ø§Ù„Ø®Ø§Ø¯Ù… Ø¨Ø¯Ù„ Ø§Ù„Ù…ØªØµÙØ­.',
                    },
                ].map((item) => (
                    <div key={item.title} className="rounded-2xl bg-white border border-gray-100 p-5 shadow-sm">
                        <div className="text-sm text-gray-500">{item.title}</div>
                        <div className="mt-2 text-xl font-black text-gray-900">{item.value}</div>
                        <p className="mt-3 text-xs leading-6 text-gray-500">{item.hint}</p>
                    </div>
                ))}
            </div>
        </div>
    );

    const renderContent = () => {
        switch (activeTab) {
            case 'overview':
                return renderOverview();
            case 'paths':
                return <PathsManager />;
            case 'lessons':
                return <LessonsManager />;
            case 'library':
                return renderLibraryCenter();
            case 'quizzes':
                return <QuizzesManager key={`quizzes-${tabRequestVersion}`} />;
            case 'mock-exams':
                return <MockExamManager />;
            case 'barcode-tests':
                return <PublicBarcodeTestsManager />;
            case 'questions':
                return <QuestionBankManager />;
            case 'skills':
                return <SkillsTreeManager />;
            case 'users':
                return <UsersManager />;
            case 'schools':
            case 'groups':
                return <SchoolsManager />;
            case 'school-portal':
                return <SchoolPortalManager key={`school-portal-${tabRequestVersion}`} onOpenSchoolOperations={() => setActiveAdminTab('schools')} />;
            case 'memberships':
                return <MembershipsManager />;
            case 'financial':
                return <FinancialManager />;
            case 'notifications':
                return <NotificationsManager />;
            case 'homepage':
                return <HomepageManager />;
            case 'announcement-ads':
                return <AnnouncementAdsManager />;
            case 'platform-fonts':
                return <PlatformFontsManager />;
            case 'platform-integrations':
                return <PlatformIntegrationsManager />;
            case 'live-sessions':
                return <LiveSessionsManager />;
            case 'backups':
                return <BackupManager />;
            case 'monitoring':
                return <OperationsCommandCenter />;
            case 'ai-assistant':
                return <AiAssistantManager />;
            case 'settings':
                return renderSystemOperations();
            default:
                return renderOverview();
        }
    };

    return (
        <DashboardLayout sidebar={renderSidebar()}>
            <React.Suspense fallback={<AdminTabLoading />}>
                {renderContent()}
            </React.Suspense>
        </DashboardLayout>
    );
};
