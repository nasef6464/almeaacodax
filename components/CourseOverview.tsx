
import React, { useEffect, useMemo, useState } from 'react';
import { Course } from '../types';
import { 
    PlayCircle, BookOpen, Clock, Star, User, 
    ChevronRight, Share2, Heart, BarChart, 
    CheckCircle, List, Info, FileText, Download,
    Eye, MessageSquare, Send, HelpCircle, Lock,
    Award, CheckCircle2, Video
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { SimulatedTestExperience } from './SimulatedTestExperience';
import { PaymentModal } from './PaymentModal';
import { useStore } from '../store/useStore';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { openExternalUrl } from '../utils/openExternalUrl';
import { isMockQuiz } from '../utils/quizPlacement';
import { buildQuizRouteWithContext } from '../utils/quizLinks';
import { api } from '../services/api';
import { shareTextSummary } from '../utils/shareText';
import { getCourseAudienceCount, getCourseContentStats, getCourseRating } from '../utils/courseStats';

interface CourseOverviewProps {
    course: Course;
    onContinue: (lessonId?: string) => void;
    initialTab?: TabType;
    onTabChange?: (tab: TabType) => void;
}

type TabType = 'description' | 'syllabus' | 'tests' | 'qa' | 'files';

type CourseDisplayTest = {
    id: string;
    title: string;
    duration: string;
    questions: number;
    type: string;
    level: string;
    isLocked: boolean;
    courseLessonId?: string;
    isUnavailable?: boolean;
    unavailableLabel?: string;
};

const resolveCourseIconColor = (value: string | undefined, fallback: string) => {
    const trimmed = String(value || '').trim();
    return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(trimmed) ? trimmed : fallback;
};

const formatLessonDuration = (lesson: { duration?: string | number; type?: string }) => {
    const raw = String(lesson.duration || '').trim();
    if (raw && raw !== '0' && raw !== '0 دقيقة' && raw !== '0:00') {
        return raw;
    }
    if (lesson.type === 'quiz') return 'اختبار محاكي';
    if (lesson.type === 'file') return 'ملف مرفق';
    return 'درس مرئي';
};

export const CourseOverview: React.FC<CourseOverviewProps> = ({ course, onContinue, initialTab = 'syllabus', onTabChange }) => {
    const [activeTab, setActiveTab] = useState<TabType>(initialTab);
    const [newQuestion, setNewQuestion] = useState('');
    const [discussionThreads, setDiscussionThreads] = useState<any[]>([]);
    const [discussionLoading, setDiscussionLoading] = useState(false);
    const [discussionPosting, setDiscussionPosting] = useState(false);
    const [discussionError, setDiscussionError] = useState('');
    const [expandedThreadId, setExpandedThreadId] = useState<string | null>(null);
    const [repliesByThread, setRepliesByThread] = useState<Record<string, any[]>>({});
    const [replyDraftByThread, setReplyDraftByThread] = useState<Record<string, string>>({});
    const [replyingThreadId, setReplyingThreadId] = useState<string | null>(null);
    const [resolvingThreadId, setResolvingThreadId] = useState<string | null>(null);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [isFavorite, setIsFavorite] = useState(false);
    const [isSharing, setIsSharing] = useState(false);
    const [coursePurchaseNotice, setCoursePurchaseNotice] = useState('');
    const { user, enrolledCourses, enrolledPaths, enrollCourse, completedLessons, quizzes, hasScopedPackageAccess } = useStore();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const favoriteStorageKey = `course-overview-favorites:${String(user?.id || 'guest')}`;
    const isGuestUser = !user?.email || user.id === 'guest';
    const isStaffViewer = !isGuestUser && ['admin', 'teacher', 'supervisor'].includes(user.role);
    const canShowQuizInCourse = (quiz: (typeof quizzes)[number]) =>
        isStaffViewer || (quiz.isPublished !== false && quiz.showOnPlatform !== false && (!quiz.approvalStatus || quiz.approvalStatus === 'approved'));
    const hasReadyQuizQuestions = (quiz: (typeof quizzes)[number]) => (quiz.questionIds?.length || 0) > 0;

    const isEnrolled =
        enrolledCourses.includes(course.id) ||
        (user.subscription?.purchasedCourses || []).includes(course.id) ||
        hasScopedPackageAccess('courses', course.pathId || course.category, course.subjectId || course.subject);
    const coursePrice = Number(course.price || 0);
    const courseOriginalPrice = Number(course.originalPrice || 0);
    const hasCourseDiscount = courseOriginalPrice > coursePrice && coursePrice > 0;
    const courseAudienceCount = getCourseAudienceCount(course);
    const courseContentStats = getCourseContentStats(course);
    const courseRating = getCourseRating(course) || 4.9;
    const canUsePaidCourseFiles = isStaffViewer || isEnrolled;
    const visibleCourseFiles = (course.files || []).filter((file) => file.access !== 'enrolled_paid' || canUsePaidCourseFiles);
    const lockedCourseFiles = (course.files || []).filter((file) => file.access === 'enrolled_paid' && !canUsePaidCourseFiles);
    const requiredPathId = String(course.pathId || '').trim();
    const needsPathEnrollmentBeforePurchase = Boolean(requiredPathId && !isStaffViewer && !isGuestUser && !(enrolledPaths || []).includes(requiredPathId));
    const pathRegistrationUrl = '/dashboard?tab=paths';
    const sendStudentToPathRegistration = () => {
        setCoursePurchaseNotice('سجل في المسار أولًا من صفحة مساراتي، ثم ارجع لشراء الدورة أو الباقة المناسبة.');
        window.setTimeout(() => navigate(pathRegistrationUrl), 1600);
    };

    useEffect(() => {
        setActiveTab(initialTab);
    }, [initialTab]);

    useEffect(() => {
        onTabChange?.(activeTab);
    }, [activeTab, onTabChange]);

    useEffect(() => {
        let mounted = true;
        const loadThreads = async () => {
            if (isGuestUser) {
                setDiscussionThreads([]);
                setDiscussionLoading(false);
                setDiscussionError('');
                return;
            }
            setDiscussionLoading(true);
            setDiscussionError('');
            try {
                const payload = await api.getDiscussions('course', course.id);
                if (!mounted) return;
                setDiscussionThreads(Array.isArray(payload?.threads) ? payload.threads : []);
            } catch (error) {
                if (!mounted) return;
                console.warn('Failed to load course discussions', error);
                setDiscussionError('تعذر تحميل النقاشات الآن.');
            } finally {
                if (mounted) {
                    setDiscussionLoading(false);
                }
            }
        };
        void loadThreads();
        return () => {
            mounted = false;
        };
    }, [course.id, isGuestUser]);
    
    // Calculate real progress
    const totalLessons = course.modules?.reduce((acc, mod) => acc + mod.lessons.length, 0) || 1;
    const completedCount = course.modules?.reduce((acc, mod) => 
        acc + mod.lessons.filter(l => completedLessons.includes(l.id)).length, 0) || 0;
    const progress = Math.round((completedCount / totalLessons) * 100);

    const resolveEmbeddedQuizId = (lesson: { id?: string; quizId?: string; type?: string }) => {
        const directId = String(lesson.quizId || '').trim();
        if (directId) return directId;
        const rawId = String(lesson.id || '').trim();
        const prefixedMatch = rawId.match(/^course_quiz_(.+)_\d+$/);
        if (prefixedMatch?.[1]) return prefixedMatch[1];
        return '';
    };

    const relatedTests = useMemo(() => {
        const courseSkillIds = new Set(course.skills || []);

        return quizzes
            .filter((quiz) => {
                if (!canShowQuizInCourse(quiz) || !isMockQuiz(quiz) || !hasReadyQuizQuestions(quiz)) {
                    return false;
                }

                const sameSubject = quiz.subjectId && course.subjectId && quiz.subjectId === course.subjectId;
                const samePath = quiz.pathId && course.pathId && quiz.pathId === course.pathId;
                const hasSharedSkill = (quiz.skillIds || []).some((skillId) => courseSkillIds.has(skillId));

                return Boolean((sameSubject && samePath) || hasSharedSkill);
            })
            .sort((a, b) => b.createdAt - a.createdAt)
            .slice(0, 6)
            .map((quiz) => ({
                id: quiz.id,
                title: quiz.title,
                duration: `${quiz.settings.timeLimit || 30} دقيقة`,
                questions: quiz.questionIds.length,
                type: quiz.mode === 'central' ? 'comprehensive' : quiz.mode === 'saher' ? 'simulated' : 'trial',
                level: quiz.mode === 'central' ? 'مركزي' : quiz.mode === 'saher' ? 'ساهر' : 'تدريبي',
                isLocked: !isEnrolled,
            }));
    }, [canShowQuizInCourse, course.pathId, course.skills, course.subjectId, isEnrolled, quizzes]);
    const explicitCourseTests = useMemo(() => {
        const assessments = Array.isArray(course.assessments) ? course.assessments : [];
        if (assessments.length === 0) return [];

        const quizById = new Map(quizzes.map((quiz) => [String(quiz.id), quiz]));
        const phaseLabel: Record<string, string> = {
            pre_course: 'اختبار قبل الدورة',
            during_course: 'اختبار أثناء الدورة',
            final_course: 'اختبار نهاية الدورة',
        };

        return assessments
            .filter((assessment) => assessment.showOnPlatform !== false)
            .sort((a, b) => (a.order || 0) - (b.order || 0))
            .map((assessment) => {
                const quiz = quizById.get(String(assessment.quizId));
                const isUnavailable = !quiz || !canShowQuizInCourse(quiz) || !hasReadyQuizQuestions(quiz);

                const isLocked = isUnavailable || (assessment.access === 'enrolled_paid' && !isEnrolled);
                return {
                    id: String(assessment.quizId),
                    title: `${phaseLabel[assessment.phase] || 'اختبار الدورة'} - ${assessment.title || quiz?.title || 'اختبار بدون مصدر'}`,
                    duration: `${quiz?.settings.timeLimit || 30} دقيقة`,
                    questions: quiz?.questionIds.length || 0,
                    type: assessment.phase === 'final_course' ? 'comprehensive' : 'trial',
                    level: isUnavailable ? 'يحتاج مراجعة من الإدارة' : assessment.access === 'free_preview' ? 'مجاني' : 'مدفوع',
                    isLocked,
                    isUnavailable,
                    unavailableLabel: 'رابط الاختبار يحتاج مراجعة',
                };
            })
            .filter(Boolean) as CourseDisplayTest[];
    }, [canShowQuizInCourse, course.assessments, isEnrolled, quizzes]);
    const courseCurriculumQuizTests = useMemo(() => {
        const modules = Array.isArray(course.modules) ? course.modules : [];
        if (modules.length === 0) return [];

        const assessmentQuizIds = new Set(
            (Array.isArray(course.assessments) ? course.assessments : [])
                .map((assessment) => String(assessment.quizId || '').trim())
                .filter(Boolean),
        );
        const quizById = new Map(quizzes.map((quiz) => [String(quiz.id), quiz]));
        const seenQuizIds = new Set<string>();

        return modules
            .flatMap((module) => module.lessons || [])
            .map((lesson) => {
                if (lesson.type !== 'quiz') return null;
                const linkedQuizId = resolveEmbeddedQuizId(lesson);
                if (!linkedQuizId || assessmentQuizIds.has(linkedQuizId) || seenQuizIds.has(linkedQuizId)) return null;

                const quiz = quizById.get(linkedQuizId);
                const isUnavailable = !quiz || !canShowQuizInCourse(quiz) || !hasReadyQuizQuestions(quiz);

                seenQuizIds.add(linkedQuizId);
                const isPreview = lesson.accessControl === 'public';
                return {
                    id: linkedQuizId,
                    title: lesson.title || quiz?.title || 'اختبار الدورة',
                    duration: lesson.duration || `${quiz?.settings.timeLimit || 30} دقيقة`,
                    questions: quiz?.questionIds.length || 0,
                    type: 'trial',
                    level: isUnavailable ? 'يحتاج مراجعة من الإدارة' : isPreview ? 'معاينة مجانية' : 'ضمن منهج الدورة',
                    isLocked: isUnavailable || (!isPreview && !isEnrolled),
                    courseLessonId: String(lesson.id || ''),
                    isUnavailable,
                    unavailableLabel: 'رابط الاختبار يحتاج مراجعة',
                };
            })
            .filter(Boolean) as CourseDisplayTest[];
    }, [canShowQuizInCourse, course.assessments, course.modules, isEnrolled, quizzes]);
    const courseTabTests = useMemo(
        () => [...explicitCourseTests, ...courseCurriculumQuizTests],
        [courseCurriculumQuizTests, explicitCourseTests],
    );
    const fallbackTests = useMemo(() => {
        const relatedIds = new Set(relatedTests.map((test) => test.id));

        return quizzes
            .filter((quiz) => {
                if (!canShowQuizInCourse(quiz) || !isMockQuiz(quiz) || !hasReadyQuizQuestions(quiz) || relatedIds.has(quiz.id)) {
                    return false;
                }

                const sameSubject = quiz.subjectId && course.subjectId && quiz.subjectId === course.subjectId;
                const samePath = quiz.pathId && course.pathId && quiz.pathId === course.pathId;

                return Boolean(sameSubject && samePath);
            })
            .sort((a, b) => b.createdAt - a.createdAt)
            .slice(0, 3)
            .map((quiz) => ({
                id: quiz.id,
                title: quiz.title,
                duration: `${quiz.settings.timeLimit || 30} دقيقة`,
                questions: quiz.questionIds.length,
                type: quiz.mode === 'central' ? 'comprehensive' : quiz.mode === 'saher' ? 'simulated' : 'trial',
                level: quiz.mode === 'central' ? 'مركزي' : quiz.mode === 'saher' ? 'ساهر' : 'تدريبي',
                isLocked: !isEnrolled,
            }));
    }, [canShowQuizInCourse, course.pathId, course.subjectId, isEnrolled, quizzes, relatedTests]);
    useEffect(() => {
        const raw = localStorage.getItem(favoriteStorageKey);
        if (!raw) {
            setIsFavorite(false);
            return;
        }
        try {
            const ids = JSON.parse(raw) as string[];
            setIsFavorite(Array.isArray(ids) && ids.includes(course.id));
        } catch {
            setIsFavorite(false);
        }
    }, [course.id, favoriteStorageKey]);

    const handleEnroll = () => {
        if (isGuestUser) {
            navigate('/?auth=login');
            return;
        }
        if (!isEnrolled && coursePrice > 0) {
            if (needsPathEnrollmentBeforePurchase) {
                sendStudentToPathRegistration();
                return;
            }
            setShowPaymentModal(true);
            return;
        }
        enrollCourse(course.id);
    };

    const handleLockedCourseTestClick = () => {
        if (isGuestUser) {
            navigate('/?auth=login');
            return;
        }
        if (coursePrice <= 0) {
            enrollCourse(course.id);
            return;
        }
        if (needsPathEnrollmentBeforePurchase) {
            sendStudentToPathRegistration();
            return;
        }
        setShowPaymentModal(true);
    };

    const handleLockedCourseFileClick = () => {
        if (isGuestUser) {
            navigate('/?auth=login');
            return;
        }
        if (coursePrice <= 0) {
            enrollCourse(course.id);
            return;
        }
        if (needsPathEnrollmentBeforePurchase) {
            sendStudentToPathRegistration();
            return;
        }
        setShowPaymentModal(true);
    };

    useEffect(() => {
        if (searchParams.get('buy') !== '1' || isEnrolled) return;

        const nextParams = new URLSearchParams(searchParams);
        nextParams.delete('buy');
        setSearchParams(nextParams, { replace: true });

        if (isGuestUser) {
            navigate('/?auth=login');
            return;
        }

        if (coursePrice > 0) {
            if (needsPathEnrollmentBeforePurchase) {
                sendStudentToPathRegistration();
                return;
            }
            setShowPaymentModal(true);
            return;
        }

        enrollCourse(course.id);
    }, [course.id, coursePrice, enrollCourse, isEnrolled, isGuestUser, navigate, searchParams, setSearchParams]);

    const getFileTypeLabel = (type?: string) => {
        const normalized = String(type || '').toLowerCase();
        if (!normalized) return 'FILE';
        if (normalized === 'pdf') return 'PDF';
        if (normalized === 'doc' || normalized === 'docx') return 'DOC';
        if (normalized === 'image' || normalized === 'jpg' || normalized === 'jpeg' || normalized === 'png' || normalized === 'webp') return 'IMAGE';
        return normalized.toUpperCase();
    };

    const triggerFileDownload = (url: string, fileName?: string) => {
        if (!url) return;
        const anchor = document.createElement('a');
        anchor.href = url;
        if (fileName) {
            anchor.download = fileName;
        }
        anchor.target = '_blank';
        anchor.rel = 'noopener noreferrer';
        anchor.click();
    };

    const handleToggleFavorite = () => {
        const raw = localStorage.getItem(favoriteStorageKey);
        let ids: string[] = [];
        try {
            ids = raw ? JSON.parse(raw) : [];
        } catch {
            ids = [];
        }
        const nextIds = isFavorite ? ids.filter((id) => id !== course.id) : Array.from(new Set([...ids, course.id]));
        localStorage.setItem(favoriteStorageKey, JSON.stringify(nextIds));
        setIsFavorite(!isFavorite);
    };

    const handleShareCourse = async () => {
        if (isSharing) return;
        setIsSharing(true);
        try {
            const shareBody = `دورة: ${course.title}\n${window.location.href}`;
            await shareTextSummary(`مشاركة دورة ${course.title}`, shareBody);
        } finally {
            setIsSharing(false);
        }
    };

    const handleLessonClick = (lesson: { id?: string; type: string; quizId?: string; isLocked?: boolean }) => {
        if (lesson.isLocked) {
            if (isGuestUser) {
                navigate('/?auth=login');
                return;
            }
            if (coursePrice <= 0) {
                enrollCourse(course.id);
                return;
            }
            if (needsPathEnrollmentBeforePurchase) {
                sendStudentToPathRegistration();
                return;
            }
            setShowPaymentModal(true);
            return;
        }
        const linkedQuizId = resolveEmbeddedQuizId(lesson);
        if (lesson.type === 'quiz' && linkedQuizId) {
            navigate(
                buildQuizRouteWithContext(linkedQuizId, {
                    returnTo: `/course/${course.id}`,
                    source: 'course',
                    courseId: course.id,
                    courseLessonId: String(lesson.id || ''),
                }),
            );
            return;
        }
        onContinue(String(lesson.id || ''));
    };

    const renderCourseLessonEdgeIcon = (position: 'start' | 'end') => {
        const icon = String(position === 'start' ? course.lessonStartIcon || '' : course.lessonEndIcon || '').trim();
        if (!icon) return null;

        const color = resolveCourseIconColor(
            position === 'start' ? course.lessonStartIconColor : course.lessonEndIconColor,
            position === 'start' ? '#4f46e5' : '#f59e0b',
        );

        return (
            <span className="inline-flex shrink-0 items-center justify-center text-sm font-black" style={{ color }}>
                {icon}
            </span>
        );
    };

    const handleCreateDiscussion = async () => {
        const trimmed = newQuestion.trim();
        if (!trimmed || discussionPosting) return;
        setDiscussionPosting(true);
        setDiscussionError('');
        try {
            const created = await api.createDiscussion('course', course.id, {
                title: trimmed.length > 80 ? `${trimmed.slice(0, 77)}...` : trimmed,
                body: trimmed,
            });
            setDiscussionThreads((prev) => [created, ...prev]);
            setNewQuestion('');
        } catch (error) {
            console.warn('Failed to create course discussion', error);
            setDiscussionError('تعذر إرسال السؤال الآن.');
        } finally {
            setDiscussionPosting(false);
        }
    };

    const handleToggleThreadReplies = async (threadId: string) => {
        if (expandedThreadId === threadId) {
            setExpandedThreadId(null);
            return;
        }
        setExpandedThreadId(threadId);
        if (repliesByThread[threadId]) return;
        try {
            const payload = await api.getDiscussionReplies(threadId);
            setRepliesByThread((prev) => ({ ...prev, [threadId]: Array.isArray(payload?.replies) ? payload.replies : [] }));
        } catch (error) {
            console.warn('Failed to load thread replies', error);
            setDiscussionError('تعذر تحميل الردود الآن.');
        }
    };

    const handleSendReply = async (threadId: string) => {
        const body = (replyDraftByThread[threadId] || '').trim();
        if (!body || replyingThreadId) return;
        setReplyingThreadId(threadId);
        setDiscussionError('');
        try {
            const created = await api.createDiscussionReply(threadId, { body });
            setRepliesByThread((prev) => ({
                ...prev,
                [threadId]: [...(prev[threadId] || []), created],
            }));
            setReplyDraftByThread((prev) => ({ ...prev, [threadId]: '' }));
            setDiscussionThreads((prev) => prev.map((thread) => {
                if (String(thread.id) !== String(threadId)) return thread;
                return {
                    ...thread,
                    repliesCount: Number(thread.repliesCount || 0) + 1,
                    latestReplyBody: String(created?.body || thread.latestReplyBody || ''),
                };
            }));
        } catch (error) {
            console.warn('Failed to create reply', error);
            setDiscussionError('تعذر إرسال الرد الآن.');
        } finally {
            setReplyingThreadId(null);
        }
    };

    const handleResolveThread = async (threadId: string) => {
        if (resolvingThreadId) return;
        setResolvingThreadId(threadId);
        setDiscussionError('');
        try {
            const updated = await api.resolveDiscussionThread(threadId);
            setDiscussionThreads((prev) => prev.map((thread) => String(thread.id) === String(threadId) ? { ...thread, ...updated } : thread));
        } catch (error) {
            console.warn('Failed to resolve thread', error);
            setDiscussionError('تعذر تعليم النقاش كمحلول الآن.');
        } finally {
            setResolvingThreadId(null);
        }
    };

    const renderTabContent = () => {
        switch (activeTab) {
            case 'description':
                return (
                    <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-6"
                    >
                        <h3 className="text-lg sm:text-xl font-black text-gray-900">حول هذه الدورة</h3>
                        <p className="text-gray-600 leading-relaxed">
                            {course.description}
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                            {course.features.map((feature, i) => (
                                <div key={i} className="flex items-center gap-3 text-sm text-gray-700">
                                    <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                                    {feature}
                                </div>
                            ))}
                        </div>
                    </motion.div>
                );
            case 'syllabus':
                return (
                    <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-6"
                    >
                        {course.modules?.map((module, mIdx) => {
                            const lessonCount = module.lessons?.length || 0;
                            const lessonCountText = lessonCount === 1 ? 'درس واحد' : lessonCount === 2 ? 'درسان' : lessonCount <= 10 ? `${lessonCount} دروس` : `${lessonCount} درس`;

                            return (
                                <div key={module.id} className="space-y-3">
                                    <div className="flex items-center justify-between gap-3 p-3.5 sm:p-4 rounded-2xl bg-slate-100/90 border border-slate-200/90 shadow-xs">
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                                                <BookOpen size={16} />
                                            </div>
                                            <span className="text-sm font-black text-slate-900 truncate">{module.title}</span>
                                            {lessonCount > 0 && (
                                                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-white text-slate-600 border border-slate-200 shadow-xs">
                                                    {lessonCountText}
                                                </span>
                                            )}
                                        </div>
                                        <span className="text-xs font-bold text-slate-500">الفصل {mIdx + 1}</span>
                                    </div>
                                    <div className="space-y-2">
                                        {module.lessons.map((lesson, lIdx) => {
                                            const isCompleted = completedLessons.includes(lesson.id);
                                            const isLocked = Boolean(lesson.isLocked);
                                            const isQuiz = lesson.type === 'quiz';
                                            const isFile = lesson.type === 'file';
                                            return (
                                            <div 
                                                key={lesson.id} 
                                                className={`flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between p-4 rounded-2xl transition-all border group cursor-pointer ${
                                                  isLocked
                                                    ? 'bg-amber-50/50 border-amber-200/60 hover:bg-amber-50'
                                                    : isCompleted
                                                      ? 'bg-emerald-50/30 border-emerald-200/60 hover:bg-emerald-50/60'
                                                      : isQuiz
                                                        ? 'bg-purple-50/20 border-purple-100 hover:bg-purple-50/50'
                                                        : 'bg-white border-slate-200/80 hover:border-indigo-300 hover:bg-indigo-50/20'
                                                }`}
                                                onClick={() => handleLessonClick(lesson)}
                                            >
                                                <div className="flex items-center gap-3.5 min-w-0">
                                                    <span className="text-xs font-black text-slate-400 w-5 shrink-0 text-center">{lIdx + 1}</span>
                                                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-xs transition-colors ${
                                                        isCompleted
                                                          ? 'bg-emerald-500 text-white'
                                                          : isQuiz
                                                            ? 'bg-purple-100 text-purple-700 border border-purple-200'
                                                            : isFile
                                                              ? 'bg-amber-100 text-amber-700 border border-amber-200'
                                                              : 'bg-blue-50 text-blue-600 border border-blue-200'
                                                    }`}>
                                                        {isCompleted ? <CheckCircle2 size={18} /> : isQuiz ? <Award size={18} /> : isFile ? <FileText size={18} /> : <PlayCircle size={18} />}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                          <p className="text-sm font-black text-slate-800 inline-flex items-center gap-1 truncate">
                                                              {renderCourseLessonEdgeIcon('start')}
                                                              <span>{lesson.title}</span>
                                                              {renderCourseLessonEdgeIcon('end')}
                                                          </p>
                                                          {isCompleted ? (
                                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-200">
                                                              مكتمل ✓
                                                            </span>
                                                          ) : isLocked ? (
                                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 border border-amber-200">
                                                              يحتاج اشتراك
                                                            </span>
                                                          ) : (
                                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                                                              isQuiz ? 'bg-purple-100 text-purple-700 border border-purple-200' : 'bg-blue-100 text-blue-700 border border-blue-200'
                                                            }`}>
                                                              {isQuiz ? 'اختبار محاكي' : 'مفتوح الآن'}
                                                            </span>
                                                          )}
                                                        </div>
                                                        <p className="text-xs text-slate-500 font-medium mt-0.5">{formatLessonDuration(lesson)}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3 shrink-0">
                                                    {isLocked ? (
                                                        <Lock size={16} className="text-amber-500" />
                                                    ) : isCompleted ? (
                                                        <CheckCircle2 size={18} className="text-emerald-500" />
                                                    ) : (
                                                        <span className="text-xs font-bold text-indigo-600 hover:text-indigo-700">ابدأ الآن ←</span>
                                                    )}
                                                </div>
                                            </div>
                                        )})}
                                    </div>
                                </div>
                            );
                        })}
                    </motion.div>
                );
            case 'tests':
                return (
                    <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-6"
                    >
                        {courseTabTests.length > 0 ? (
                            <SimulatedTestExperience
                                tests={courseTabTests}
                                title="اختبارات الدورة والمنهج"
                                lockedCountLabel="ضمن شراء الدورة"
                                onLockedClick={handleLockedCourseTestClick}
                                onStartTest={(test) => navigate(buildQuizRouteWithContext(String(test.id), { returnTo: `/course/${course.id}`, source: 'course', courseId: course.id, courseLessonId: test.courseLessonId }))}
                            />
                        ) : relatedTests.length > 0 ? (
                            <div className="space-y-4">
                                <div className="rounded-2xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-sm leading-7 text-indigo-800">
                                    لم يتم ربط اختبارات رسمية بهذه الدورة بعد، لذلك نعرض اختبارات مناسبة من نفس المادة كاقتراحات تدريبية.
                                </div>
                                <SimulatedTestExperience
                                    tests={relatedTests}
                                    title="اختبارات المادة المقترحة"
                                    onLockedClick={handleLockedCourseTestClick}
                                    onStartTest={(test) => navigate(buildQuizRouteWithContext(String(test.id), { returnTo: `/course/${course.id}`, source: 'course', courseId: course.id }))}
                                />
                            </div>
                        ) : (
                            <div className="bg-gray-50 rounded-3xl border border-dashed border-gray-200 overflow-hidden">
                                <div className="text-center py-10 px-4 border-b border-gray-100 bg-white">
                                    <BarChart size={48} className="mx-auto text-gray-200 mb-4" />
                                    <p className="text-gray-700 font-bold mb-2">لا توجد اختبارات مربوطة مباشرة بهذه الدورة بعد</p>
                                    <p className="text-sm text-gray-500 max-w-md mx-auto">
                                        لكن يوجد اختبارات من نفس المادة يمكنك البدء بها الآن حتى تكتمل رحلة التدريب.
                                    </p>
                                </div>

                                <div className="p-4 sm:p-6">
                                    {fallbackTests.length > 0 ? (
                                        <SimulatedTestExperience
                                            tests={fallbackTests}
                                            title="اختبارات المادة المقترحة"
                                            onLockedClick={handleLockedCourseTestClick}
                                            onStartTest={(test) => navigate(buildQuizRouteWithContext(String(test.id), { returnTo: `/course/${course.id}`, source: 'course', courseId: course.id }))}
                                        />
                                    ) : (
                                        <div className="text-center py-8 text-sm text-gray-500">
                                            لا توجد اختبارات بديلة من نفس المادة حاليًا.
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </motion.div>
                );
            case 'qa':
                return (
                    <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-6"
                    >
                        <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-4 text-sm leading-7 text-indigo-800">
                            هذه المساحة مخصصة للاستفسار عن محتوى الدورة ومتابعة الردود التعليمية. حجز الحصص الخاصة يتم من صفحة الحصص، وليس من سؤال وجواب الدورة.
                        </div>
                        <div className="flex flex-col sm:flex-row gap-4 mb-8">
                            <input 
                                type="text" 
                                placeholder="اسأل سؤالاً..." 
                                className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                value={newQuestion}
                                onChange={(e) => setNewQuestion(e.target.value)}
                            />
                            <button
                                onClick={() => void handleCreateDiscussion()}
                                disabled={discussionPosting || newQuestion.trim().length === 0}
                                className="bg-indigo-600 text-white p-3 rounded-xl hover:bg-indigo-700 transition-colors w-full sm:w-auto flex items-center justify-center disabled:opacity-60"
                            >
                                <Send size={20} />
                            </button>
                        </div>
                        {discussionError ? (
                            <div className="mb-4 rounded-xl border border-rose-100 bg-rose-50 p-3 text-xs font-bold text-rose-700">
                                {discussionError}
                            </div>
                        ) : null}

                        <div className="space-y-6">
                            {discussionThreads.map((item) => (
                                <div key={item.id} className="bg-gray-50 p-5 rounded-2xl border border-gray-100">
                                    <div className="flex items-start gap-4">
                                        <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                                            <HelpCircle size={20} />
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex flex-col gap-1 sm:flex-row sm:justify-between sm:items-center mb-2">
                                                <span className="font-bold text-gray-900 text-sm">{item.authorName || 'طالب'}</span>
                                                <span className="text-[10px] text-gray-400">
                                                    {item.createdAt ? new Date(item.createdAt).toLocaleDateString('ar-SA') : 'الآن'}
                                                </span>
                                            </div>
                                            <p className="text-sm text-gray-700 font-bold mb-4">{item.body || item.title}</p>
                                            <div className="flex flex-wrap gap-2 mb-3">
                                                <button
                                                    onClick={() => void handleToggleThreadReplies(String(item.id))}
                                                    className="text-xs px-3 py-1 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-100 hover:bg-indigo-100"
                                                >
                                                    {expandedThreadId === String(item.id) ? 'إخفاء الردود' : `عرض الردود (${Number(item.repliesCount || 0)})`}
                                                </button>
                                                {!item.isResolved && ['admin', 'teacher', 'supervisor'].includes(String(user.role || '')) ? (
                                                    <button
                                                        onClick={() => void handleResolveThread(String(item.id))}
                                                        disabled={resolvingThreadId === String(item.id)}
                                                        className="text-xs px-3 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-100 hover:bg-emerald-100 disabled:opacity-60"
                                                    >
                                                        {resolvingThreadId === String(item.id) ? 'جاري...' : 'تعليم كمحلول'}
                                                    </button>
                                                ) : null}
                                                {item.isResolved ? (
                                                    <span className="text-xs px-3 py-1 rounded-lg bg-emerald-100 text-emerald-700 border border-emerald-200">تم الحل</span>
                                                ) : null}
                                            </div>
                                            
                                            {item.latestReplyBody && (
                                                <div className="bg-white p-4 rounded-xl border border-gray-100 flex gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                                                        <MessageSquare size={16} />
                                                    </div>
                                                    <div>
                                                        <p className="text-xs text-gray-400 mb-1">رد المدرس</p>
                                                        <p className="text-xs text-gray-600 leading-relaxed">{item.latestReplyBody}</p>
                                                    </div>
                                                </div>
                                            )}

                                            {expandedThreadId === String(item.id) ? (
                                                <div className="mt-3 space-y-3">
                                                    {(repliesByThread[String(item.id)] || []).map((reply) => (
                                                        <div key={String(reply.id || reply._id)} className="bg-white p-3 rounded-xl border border-gray-100">
                                                            <div className="flex items-center justify-between mb-1">
                                                                <span className="text-xs font-bold text-gray-700">{reply.authorName || 'مستخدم'}</span>
                                                                <span className="text-[10px] text-gray-400">
                                                                    {reply.createdAt ? new Date(reply.createdAt).toLocaleDateString('ar-SA') : 'الآن'}
                                                                </span>
                                                            </div>
                                                            <p className="text-xs text-gray-700 leading-relaxed">{reply.body}</p>
                                                        </div>
                                                    ))}
                                                    <div className="flex flex-col sm:flex-row gap-2">
                                                        <input
                                                            type="text"
                                                            value={replyDraftByThread[String(item.id)] || ''}
                                                            onChange={(e) => setReplyDraftByThread((prev) => ({ ...prev, [String(item.id)]: e.target.value }))}
                                                            placeholder="اكتب ردك..."
                                                            className="flex-1 bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                                        />
                                                        <button
                                                            onClick={() => void handleSendReply(String(item.id))}
                                                            disabled={replyingThreadId === String(item.id) || !(replyDraftByThread[String(item.id)] || '').trim()}
                                                            className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-indigo-700 disabled:opacity-60"
                                                        >
                                                            {replyingThreadId === String(item.id) ? 'إرسال...' : 'إرسال الرد'}
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : null}
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {!discussionLoading && discussionThreads.length === 0 && (
                                <div className="text-center py-12">
                                    <MessageSquare size={48} className="mx-auto text-gray-200 mb-4" />
                                    <p className="text-gray-400">لا توجد أسئلة بعد. كن أول من يسأل!</p>
                                </div>
                            )}
                        </div>
                    </motion.div>
                );
            case 'files':
                return (
                    <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="grid grid-cols-1 md:grid-cols-2 gap-4"
                    >
                        {visibleCourseFiles.map((file) => (
                            <div key={file.id} className="bg-gray-50 p-4 rounded-2xl border border-gray-100 flex items-center justify-between group hover:bg-indigo-50 transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center text-rose-500 shadow-sm">
                                        <FileText size={24} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-gray-800 group-hover:text-indigo-600 transition-colors">{file.title}</p>
                                        <p className="text-[10px] text-gray-400">{file.size} - {getFileTypeLabel(file.type)}</p>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => file.url && openExternalUrl(file.url)}
                                        disabled={!file.url}
                                        className="p-2 text-gray-400 hover:text-indigo-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                    >
                                        <Eye size={18} />
                                    </button>
                                    <button
                                        onClick={() => file.url && triggerFileDownload(file.url, file.title)}
                                        disabled={!file.url}
                                        className="p-2 text-gray-400 hover:text-indigo-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                    >
                                        <Download size={18} />
                                    </button>
                                </div>
                            </div>
                        ))}
                        {lockedCourseFiles.map((file) => (
                            <button
                                key={file.id}
                                type="button"
                                onClick={handleLockedCourseFileClick}
                                className="bg-amber-50 p-4 rounded-2xl border border-amber-100 flex items-center justify-between gap-3 text-right hover:bg-amber-100 transition-colors"
                            >
                                <div className="flex items-center gap-4 min-w-0">
                                    <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center text-amber-600 shadow-sm">
                                        <Lock size={22} />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm font-bold text-gray-800 truncate">{file.title}</p>
                                        <p className="text-[10px] text-amber-700">{file.size} - ضمن شراء الدورة</p>
                                    </div>
                                </div>
                                <ChevronRight size={18} className="text-amber-600 shrink-0" />
                            </button>
                        ))}
                        {visibleCourseFiles.length === 0 && lockedCourseFiles.length === 0 && (
                            <div className="col-span-2 bg-gray-50 rounded-3xl border border-dashed border-gray-200 overflow-hidden">
                                <div className="text-center py-10 px-4 bg-white">
                                    <FileText size={48} className="mx-auto text-gray-200 mb-4" />
                                    <p className="text-gray-700 font-bold mb-2">لا توجد ملفات مرفوعة مباشرة لهذه الدورة حاليًا</p>
                                    <p className="text-sm text-gray-500 max-w-md mx-auto">
                                        لن تظهر ملفات بديلة من مواد أخرى حتى يتم رفع ملفات الدورة نفسها.
                                    </p>
                                </div>
                            </div>
                        )}
                    </motion.div>
                );
            default:
return null;
        }
    };

    return (
        <div className="bg-slate-50 min-h-screen pb-20 relative" dir="rtl">
            {/* Top Atmospheric Ambient Glow */}
            <div className="absolute top-0 left-0 right-0 h-[480px] bg-gradient-to-b from-[#0a0f1d] via-[#0f172a] to-transparent pointer-events-none z-0" />

            {/* Main Layout Grid */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 pt-6 sm:pt-8 md:pt-10">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 md:gap-12 items-start">
                    
                    {/* Main Content Column: Hero Showcase Card + Notices + Tabs */}
                    <div className="lg:col-span-2 space-y-8">
                        
                        {/* Hero Showcase Card - Premium Dark Navy Self-Contained Card */}
                        <div className="rounded-3xl bg-gradient-to-br from-[#0a0f1d] via-[#0f172a] to-[#1e293b] p-6 sm:p-8 md:p-10 text-white shadow-2xl border border-slate-800 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-600/15 blur-3xl rounded-full -mr-20 -mt-20 pointer-events-none" />
                            <div className="absolute bottom-0 left-0 w-72 h-72 bg-blue-600/10 blur-3xl rounded-full -ml-10 -mb-10 pointer-events-none" />

                            <div className="relative z-10 space-y-6">
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-black px-3 py-1 rounded-full flex items-center gap-1.5 shadow-sm">
                                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span> جديد ومحدّث
                                    </span>
                                    {course.category ? (
                                        <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-black px-3 py-1 rounded-full">
                                            {course.category}
                                        </span>
                                    ) : null}
                                    {course.certificateEnabled ? (
                                        <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-black px-3 py-1 rounded-full flex items-center gap-1">
                                            <Award size={14} /> شهادة إتمام معتمدة
                                        </span>
                                    ) : null}
                                </div>

                                <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black leading-tight tracking-tight text-white drop-shadow-sm break-words">
                                    {course.title}
                                </h1>

                                {course.description ? (
                                    <p className="text-slate-300 text-sm sm:text-base leading-relaxed line-clamp-3">
                                        {course.description}
                                    </p>
                                ) : null}

                                {/* 4 Professional Metadata Cards (عالية التباين ومحمية من الخلفية الفاتحة) */}
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 pt-2">
                                    {/* Instructor */}
                                    <div className="rounded-2xl border border-slate-700/80 bg-slate-800/80 p-3.5 shadow-sm backdrop-blur-sm">
                                        <div className="flex items-center gap-3">
                                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-indigo-500/30 bg-indigo-500/20 text-indigo-400 font-black">
                                                <User size={20} />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-[11px] font-bold text-slate-400">مدرس</p>
                                                <p className="truncate text-sm font-black text-white">{course.instructor || 'فريق المنصة'}</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Rating */}
                                    <div className="rounded-2xl border border-slate-700/80 bg-slate-800/80 p-3.5 shadow-sm backdrop-blur-sm">
                                        <div className="flex items-center gap-3">
                                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-amber-500/30 bg-amber-500/20 text-amber-400 font-black">
                                                <Star size={20} className="fill-amber-400 text-amber-400" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-[11px] font-bold text-slate-400">التقييم</p>
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-sm font-black text-white">{courseRating.toFixed(1)}</span>
                                                    <span className="text-[10px] font-bold text-amber-400">★ ★ ★ ★ ★</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Enrolled Students */}
                                    <div className="rounded-2xl border border-slate-700/80 bg-slate-800/80 p-3.5 shadow-sm backdrop-blur-sm">
                                        <div className="flex items-center gap-3">
                                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/20 text-emerald-400 font-black">
                                                <BarChart size={20} />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-[11px] font-bold text-slate-400">طلاب مسجل</p>
                                                <p className="truncate text-sm font-black text-emerald-400">+{courseAudienceCount || 55} طالب</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Content / Lessons */}
                                    <div className="rounded-2xl border border-slate-700/80 bg-slate-800/80 p-3.5 shadow-sm backdrop-blur-sm">
                                        <div className="flex items-center gap-3">
                                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-blue-500/30 bg-blue-500/20 text-blue-400 font-black">
                                                <BookOpen size={20} />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-[11px] font-bold text-slate-400">المنهج والمدة</p>
                                                <p className="truncate text-sm font-black text-white">
                                                    {courseContentStats.totalLessons} درس {courseContentStats.testsCount > 0 ? `• ${courseContentStats.testsCount} اختبار` : ''}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Purchase / Path Registration Notice */}
                        {coursePurchaseNotice ? (
                            <div
                                role="alert"
                                data-testid="course-path-registration-notice"
                                className="flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold leading-7 text-amber-800 sm:flex-row sm:items-center sm:justify-between"
                            >
                                <span>{coursePurchaseNotice}</span>
                                <button
                                    type="button"
                                    data-testid="course-path-registration-link"
                                    onClick={() => navigate(pathRegistrationUrl)}
                                    className="inline-flex shrink-0 items-center justify-center rounded-xl bg-amber-500 px-4 py-2 text-xs font-black text-white transition hover:bg-amber-600"
                                >
                                    اذهب لمساراتي
                                </button>
                            </div>
                        ) : null}

                        {/* Content Tabs */}
                        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                            <div className="flex overflow-x-auto border-b border-gray-100">
                                <button 
                                    onClick={() => setActiveTab('description')}
                                    className={`shrink-0 px-6 md:px-8 py-4 font-bold text-xs md:text-sm transition-all ${activeTab === 'description' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500 hover:text-indigo-600'}`}
                                >
                                    وصف
                                </button>
                                <button 
                                    onClick={() => setActiveTab('syllabus')}
                                    className={`shrink-0 px-6 md:px-8 py-4 font-bold text-xs md:text-sm transition-all ${activeTab === 'syllabus' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500 hover:text-indigo-600'}`}
                                >
                                    المحتوى
                                </button>
                                <button 
                                    onClick={() => setActiveTab('tests')}
                                    className={`shrink-0 px-6 md:px-8 py-4 font-bold text-xs md:text-sm transition-all ${activeTab === 'tests' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500 hover:text-indigo-600'}`}
                                >
                                    الاختبارات
                                </button>
                                <button 
                                    onClick={() => setActiveTab('qa')}
                                    className={`shrink-0 px-6 md:px-8 py-4 font-bold text-xs md:text-sm transition-all ${activeTab === 'qa' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500 hover:text-indigo-600'}`}
                                >
                                    سؤال وجواب
                                </button>
                                <button 
                                    onClick={() => setActiveTab('files')}
                                    className={`shrink-0 px-6 md:px-8 py-4 font-bold text-xs md:text-sm transition-all ${activeTab === 'files' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500 hover:text-indigo-600'}`}
                                >
                                    ملفات الدورة
                                </button>
                            </div>

                            <div className="p-4 sm:p-6 md:p-8">
                                <AnimatePresence mode="wait">
                                    {renderTabContent()}
                                </AnimatePresence>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Progress / Purchase Card (Sticky alongside Hero & Tabs) */}
                    <div className="lg:sticky lg:top-24 z-30">
                        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden text-gray-900 border border-gray-100">
                            <div className="relative aspect-video">
                                <img src={course.thumbnail} alt={course.title} className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black/20"></div>
                            </div>
                            <div className="p-5 sm:p-6">
                                {!isEnrolled ? (
                                    <div className="mb-5 rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-right">
                                        <div className="text-xs font-bold text-gray-500">السعر</div>
                                        <div className="mt-1 flex flex-wrap items-baseline justify-end gap-2">
                                            {hasCourseDiscount ? (
                                                <span className="text-sm font-bold text-gray-400 line-through">{courseOriginalPrice} {course.currency}</span>
                                            ) : null}
                                            <span className="text-2xl font-black text-amber-600">{coursePrice} {course.currency}</span>
                                        </div>
                                    </div>
                                ) : null}
                                <div className="mb-6">
                                    <div className="flex justify-between text-xs font-bold text-gray-500 mb-2">
                                        <span>الدرجة: {progress}%</span>
                                    </div>
                                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                        <div 
                                            className="h-full bg-indigo-600 transition-all duration-1000" 
                                            style={{ width: `${progress}%` }}
                                        ></div>
                                    </div>
                                </div>
                                
                                {isEnrolled ? (
                                    <button 
                                        onClick={() => onContinue()}
                                        className="w-full bg-[#1e293b] text-white py-4 rounded-2xl font-black text-lg hover:bg-slate-800 transition-all shadow-lg mb-4 flex items-center justify-center gap-2"
                                    >
                                        استمر
                                    </button>
                                ) : (
                                    <button 
                                        onClick={handleEnroll}
                                        className="w-full bg-amber-500 text-white py-4 rounded-2xl font-black text-lg hover:bg-amber-600 transition-all shadow-lg mb-4 flex items-center justify-center gap-2"
                                    >
                                        {coursePrice > 0 ? 'شراء الدورة' : 'ابدأ مجاناً'}
                                    </button>
                                )}

                                <div className="flex flex-col sm:flex-row gap-4">
                                    <button
                                        onClick={handleToggleFavorite}
                                        className={`flex-1 flex items-center justify-center gap-2 py-2 border rounded-xl text-[10px] font-bold transition-colors ${isFavorite ? 'border-rose-200 bg-rose-50 text-rose-600' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                                    >
                                        <Heart size={14} fill={isFavorite ? 'currentColor' : 'none'} /> {isFavorite ? 'في المفضلة' : 'المفضلة'}
                                    </button>
                                    <button
                                        onClick={handleShareCourse}
                                        disabled={isSharing}
                                        className="flex items-center justify-center gap-2 py-2 px-4 border border-gray-200 rounded-xl text-[10px] font-bold text-gray-600 hover:bg-gray-50 transition-colors w-full sm:w-auto disabled:opacity-60"
                                    >
                                        <Share2 size={14} /> {isSharing ? 'جارٍ المشاركة...' : 'مشاركة'}
                                    </button>
                                </div>
                            </div>

                            <div className="p-5 sm:p-6 border-t border-gray-50 bg-gray-50/50">
                                <h4 className="font-bold text-gray-800 mb-4 text-sm">تفاصيل الدورة</h4>
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between text-xs">
                                        <div className="flex items-center gap-2 text-gray-500">
                                            <Clock size={14} />
                                            <span>المدة</span>
                                        </div>
                                        <span className="font-bold text-gray-700">{courseContentStats.durationLabel}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-xs">
                                        <div className="flex items-center gap-2 text-gray-500">
                                            <PlayCircle size={14} />
                                            <span>دروس فيديو</span>
                                        </div>
                                        <span className="font-bold text-gray-700">{courseContentStats.videoLessons}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-xs">
                                        <div className="flex items-center gap-2 text-gray-500">
                                            <BarChart size={14} />
                                            <span>اختبارات</span>
                                        </div>
                                        <span className="font-bold text-gray-700">{courseContentStats.testsCount}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-xs">
                                        <div className="flex items-center gap-2 text-gray-500">
                                            <BookOpen size={14} />
                                            <span>إجمالي الدروس</span>
                                        </div>
                                        <span className="font-bold text-gray-700">{courseContentStats.totalLessons}</span>
                                    </div>
                                    {course.certificateEnabled ? (
                                        <div className="flex items-center justify-between text-xs">
                                            <div className="flex items-center gap-2 text-gray-500">
                                                <Award size={14} />
                                                <span>الشهادة</span>
                                            </div>
                                            <span className="font-bold text-emerald-600">معتمدة</span>
                                        </div>
                                    ) : null}
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
            <PaymentModal
                isOpen={showPaymentModal}
                onClose={() => setShowPaymentModal(false)}
                item={{ ...course, purchaseType: 'course' }}
                type="course"
            />
        </div>
    );
};



