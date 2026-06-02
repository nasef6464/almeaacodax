
import React, { useEffect, useMemo, useState } from 'react';
import { Course } from '../types';
import { 
    PlayCircle, BookOpen, Clock, Star, User, 
    ChevronRight, Share2, Heart, BarChart, 
    CheckCircle, List, Info, FileText, Download,
    Eye, MessageSquare, Send, HelpCircle, Lock
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
import { getCourseAudienceCount } from '../utils/courseStats';

interface CourseOverviewProps {
    course: Course;
    onContinue: (lessonId?: string) => void;
    initialTab?: TabType;
    onTabChange?: (tab: TabType) => void;
}

type TabType = 'description' | 'syllabus' | 'tests' | 'qa' | 'files';

const resolveCourseIconColor = (value: string | undefined, fallback: string) => {
    const trimmed = String(value || '').trim();
    return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(trimmed) ? trimmed : fallback;
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
    const { user, enrolledCourses, enrollCourse, completedLessons, quizzes, hasScopedPackageAccess, getMatchingPackage } = useStore();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const favoriteStorageKey = `course-overview-favorites:${String(user?.id || 'guest')}`;
    const matchedCoursePackage = getMatchingPackage('courses', course.pathId || course.category, course.subjectId || course.subject);
    const isStaffViewer = ['admin', 'teacher', 'supervisor'].includes(user.role);
    const canShowQuizInCourse = (quiz: (typeof quizzes)[number]) =>
        isStaffViewer || (quiz.isPublished !== false && quiz.showOnPlatform !== false && (!quiz.approvalStatus || quiz.approvalStatus === 'approved'));
    const hasReadyQuizQuestions = (quiz: (typeof quizzes)[number]) => (quiz.questionIds?.length || 0) > 0;

    const isEnrolled =
        enrolledCourses.includes(course.id) ||
        (user.subscription?.purchasedCourses || []).includes(course.id) ||
        hasScopedPackageAccess('courses', course.pathId || course.category, course.subjectId || course.subject);
    const isGuestUser = !user?.email || user.id === 'guest';
    const coursePrice = Number(course.price || 0);
    const courseOriginalPrice = Number(course.originalPrice || 0);
    const hasCourseDiscount = courseOriginalPrice > coursePrice && coursePrice > 0;
    const courseAudienceCount = getCourseAudienceCount(course);

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
                if (!quiz || !canShowQuizInCourse(quiz) || !hasReadyQuizQuestions(quiz)) return null;

                const isLocked = assessment.access === 'enrolled_paid' && !isEnrolled;
                return {
                    id: quiz.id,
                    title: `${phaseLabel[assessment.phase] || 'اختبار الدورة'} - ${assessment.title || quiz.title}`,
                    duration: `${quiz.settings.timeLimit || 30} دقيقة`,
                    questions: quiz.questionIds.length,
                    type: assessment.phase === 'final_course' ? 'comprehensive' : 'trial',
                    level: assessment.access === 'free_preview' ? 'مجاني' : 'مدفوع',
                    isLocked,
                };
            })
            .filter(Boolean) as Array<{
                id: string;
                title: string;
                duration: string;
                questions: number;
                type: string;
                level: string;
                isLocked: boolean;
            }>;
    }, [canShowQuizInCourse, course.assessments, isEnrolled, quizzes]);
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
        if (!isEnrolled && coursePrice > 0) {
            if (isGuestUser) {
                navigate('/?auth=login');
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
        setShowPaymentModal(true);
    };

    useEffect(() => {
        if (searchParams.get('buy') !== '1' || isEnrolled) return;

        const nextParams = new URLSearchParams(searchParams);
        nextParams.delete('buy');
        setSearchParams(nextParams, { replace: true });

        if (coursePrice > 0) {
            if (isGuestUser) {
                navigate('/?auth=login');
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

    const resolveEmbeddedQuizId = (lesson: { id?: string; quizId?: string; type?: string }) => {
        const directId = String(lesson.quizId || '').trim();
        if (directId) return directId;
        const rawId = String(lesson.id || '').trim();
        const prefixedMatch = rawId.match(/^course_quiz_(.+)_\d+$/);
        if (prefixedMatch?.[1]) return prefixedMatch[1];
        return '';
    };

    const handleLessonClick = (lesson: { id?: string; type: string; quizId?: string; isLocked?: boolean }) => {
        if (lesson.isLocked) {
            if (isGuestUser) {
                navigate('/?auth=login');
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
                        {course.modules?.map((module, mIdx) => (
                            <div key={module.id} className="space-y-3">
                                <div className="flex items-center gap-2 text-gray-800 font-black">
                                    <ChevronRight size={18} className="text-gray-400" />
                                    <span>{module.title}</span>
                                </div>
                                <div className="space-y-2">
                                    {module.lessons.map((lesson, lIdx) => {
                                        const isCompleted = completedLessons.includes(lesson.id);
                                        const isLocked = Boolean(lesson.isLocked);
                                        return (
                                        <div 
                                            key={lesson.id} 
                                            className={`flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between p-4 rounded-xl transition-colors group cursor-pointer ${isLocked ? 'bg-amber-50/60 hover:bg-amber-50' : 'bg-gray-50 hover:bg-gray-100'}`}
                                            onClick={() => handleLessonClick(lesson)}
                                        >
                                            <div className="flex items-center gap-4">
                                                <span className="text-xs font-bold text-gray-400 w-4">{lIdx + 1}</span>
                                                <div className={`w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm ${lesson.type === 'quiz' ? 'text-rose-500' : 'text-amber-500'}`}>
                                                    {lesson.type === 'quiz' ? <BarChart size={16} /> : <PlayCircle size={16} />}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-gray-700 inline-flex items-center gap-1">
                                                        {renderCourseLessonEdgeIcon('start')}
                                                        <span>{lesson.title}</span>
                                                        {renderCourseLessonEdgeIcon('end')}
                                                    </p>
                                                    <p className="text-[10px] text-gray-400">{isLocked ? 'يحتاج اشتراك' : lesson.type === 'quiz' ? 'اختبار محاكي' : 'مفتوح الآن'}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="text-[10px] text-gray-400">{lesson.duration}</span>
                                                {isLocked ? (
                                                    <Lock size={16} className="text-amber-500" />
                                                ) : isCompleted ? (
                                                    <CheckCircle size={16} className="text-emerald-500" />
                                                ) : (
                                                    <div className="w-4 h-4 rounded-full border-2 border-gray-200"></div>
                                                )}
                                            </div>
                                        </div>
                                    )})}
                                </div>
                            </div>
                        ))}
                    </motion.div>
                );
            case 'tests':
                return (
                    <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-6"
                    >
                        {explicitCourseTests.length > 0 ? (
                            <SimulatedTestExperience
                                tests={explicitCourseTests}
                                title="اختبارات الدورة الرسمية"
                                lockedCountLabel="ضمن شراء الدورة"
                                onLockedClick={handleLockedCourseTestClick}
                                onStartTest={(test) => navigate(buildQuizRouteWithContext(String(test.id), { returnTo: `/course/${course.id}`, source: 'course' }))}
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
                                    onStartTest={(test) => navigate(buildQuizRouteWithContext(String(test.id), { returnTo: `/course/${course.id}`, source: 'course' }))}
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
                                            onStartTest={(test) => navigate(buildQuizRouteWithContext(String(test.id), { returnTo: `/course/${course.id}`, source: 'course' }))}
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
                        {course.files?.map((file) => (
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
                        {(!course.files || course.files.length === 0) && (
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
        <div className="bg-gray-50 min-h-screen pb-20" dir="rtl">
            {/* Hero Background Strip */}
            <div className="absolute top-0 left-0 right-0 h-[300px] md:h-[380px] bg-[#0f172a] z-0 overflow-hidden">
                <div className="absolute top-0 right-0 w-1/3 h-full bg-indigo-600/10 blur-3xl rounded-full -mr-20 -mt-20"></div>
                <div className="absolute bottom-0 left-0 w-1/4 h-1/2 bg-blue-600/5 blur-3xl rounded-full -ml-10 -mb-10"></div>
            </div>

            {/* Main Layout Grid */}
            <div className="max-w-7xl mx-auto px-4 relative z-10 pt-8 md:pt-16">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 md:gap-12 items-start">
                    
                    {/* Left Column: Info & Content */}
                    <div className="lg:col-span-2 space-y-8 md:space-y-12">
                        {/* Hero Info */}
                        <div className="text-white">
                            <div className="flex flex-wrap gap-2 mb-4">
                                <span className="bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">جديد</span>
                            </div>
                            <h1 className="text-2xl sm:text-3xl md:text-5xl font-black mb-6 leading-tight text-right break-words">
                                {course.title}
                            </h1>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 text-sm">
                                <div className="flex items-center gap-2">
                                    <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center">
                                        <User size={20} className="text-indigo-400" />
                                    </div>
                                    <div>
                                        <p className="text-gray-400 text-[10px]">مدرس</p>
                                        <p className="font-bold">{course.instructor}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 sm:border-r sm:border-white/10 sm:pr-6">
                                    <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                                        <BookOpen size={20} className="text-amber-400" />
                                    </div>
                                    <div>
                                        <p className="text-gray-400 text-[10px]">فئة</p>
                                        <p className="font-bold">{course.category}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 sm:border-r sm:border-white/10 sm:pr-6">
                                    <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                                        <BarChart size={20} className="text-emerald-400" />
                                    </div>
                                    <div>
                                        <p className="text-gray-400 text-[10px]">طلاب مسجل</p>
                                        <p className="font-bold">{courseAudienceCount}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

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

                    {/* Right Column: Progress Card */}
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
                                        <span className="font-bold text-gray-800">{course.weeksCount || 6} اشهر</span>
                                    </div>
                                    <div className="flex items-center justify-between text-xs">
                                        <div className="flex items-center gap-2 text-gray-500">
                                            <BarChart size={14} />
                                            <span>محاضرات</span>
                                        </div>
                                        <span className="font-bold text-gray-800">{course.modules?.reduce((acc, m) => acc + m.lessons.length, 0) || 42}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-xs">
                                        <div className="flex items-center gap-2 text-gray-500">
                                            <PlayCircle size={14} />
                                            <span>فيديو</span>
                                        </div>
                                        <span className="font-bold text-gray-800">{course.duration} ساعات</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <PaymentModal
                isOpen={showPaymentModal}
                onClose={() => setShowPaymentModal(false)}
                item={
                    matchedCoursePackage
                        ? {
                            id: matchedCoursePackage.id,
                            packageId: matchedCoursePackage.id,
                            purchaseType: 'package',
                            title: matchedCoursePackage.name,
                            description: `هذه الباقة تفتح الدورات والاختبارات المرتبطة بـ ${course.subject || course.category}.`,
                            contentTypes: matchedCoursePackage.contentTypes,
                            pathIds: matchedCoursePackage.pathIds,
                            subjectIds: matchedCoursePackage.subjectIds,
                            includedCourseIds: matchedCoursePackage.courseIds,
                            courseIds: matchedCoursePackage.courseIds,
                            price: course.price,
                            currency: course.currency,
                        }
                        : course
                }
                type={matchedCoursePackage ? 'package' : 'course'}
            />
        </div>
    );
};



