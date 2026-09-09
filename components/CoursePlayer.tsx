import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Course, InteractiveVideoProgress, Lesson } from '../types';
import {
  PlayCircle,
  CheckCircle,
  CheckCircle2,
  Award,
  Video,
  Heart,
  Lock,
  ChevronDown,
  ChevronUp,
  Menu,
  X,
  Sun,
  Moon,
  MessageSquare,
  Share2,
  FileText,
  HelpCircle,
  ArrowRight,
  SkipForward,
  SkipBack,
  Loader2,
  BookOpen,
  BarChart,
  Download,
  Eye,
  Send,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useStore } from '../store/useStore';
import { openExternalUrl } from '../utils/openExternalUrl';
import { buildQuizRouteWithContext } from '../utils/quizLinks';
import { api } from '../services/api';
import { shareTextSummary } from '../utils/shareText';
import { mergeInteractiveVideoProgress, normalizeInteractiveVideoProgress } from '../utils/interactiveVideoProgress';

const CustomVideoPlayer = React.lazy(() =>
  import('./CustomVideoPlayer').then((module) => ({ default: module.CustomVideoPlayer })),
);

const formatLessonDuration = (lesson: { duration?: any; type?: string }) => {
  const d = lesson.duration;
  if (!d || d === 0 || d === '0' || d === '0:00' || d === '00:00' || d === '0 min' || d === '0 دقيقة') {
    return lesson.type === 'quiz' ? 'اختبار تقييمي' : 'درس مرئي';
  }
  const str = String(d).trim();
  if (/^\d+$/.test(str)) {
    return `${str} دقيقة`;
  }
  return str;
};

const resolveIconColor = (value: string | undefined, fallback: string) => {
  const trimmed = String(value || '').trim();
  return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(trimmed) ? trimmed : fallback;
};

interface CoursePlayerProps {
  course: Course;
  onBack?: () => void;
  initialLessonId?: string;
  onLessonChange?: (lessonId: string) => void;
}

export const CoursePlayer: React.FC<CoursePlayerProps> = ({ course, onBack, initialLessonId, onLessonChange }) => {
  const navigate = useNavigate();
  const { completedLessons, markLessonComplete, questions, user, enrolledCourses, hasScopedPackageAccess } = useStore();
  const [interactiveVideoProgress, setInteractiveVideoProgress] = useState<InteractiveVideoProgress[]>(() => user.interactiveVideoProgress || []);
  const videoProgressSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const interactiveVideoProgressRef = useRef<InteractiveVideoProgress[]>(user.interactiveVideoProgress || []);
  const videoProgressPendingUserIdRef = useRef<string | null>(null);
  const currentVideoProgressUserIdRef = useRef(String(user.id || 'guest'));
  currentVideoProgressUserIdRef.current = String(user.id || 'guest');

  useEffect(() => {
    if (videoProgressSaveTimerRef.current) {
      clearTimeout(videoProgressSaveTimerRef.current);
      videoProgressSaveTimerRef.current = null;
    }
    videoProgressPendingUserIdRef.current = null;
    const nextProgress = user.interactiveVideoProgress || [];
    interactiveVideoProgressRef.current = nextProgress;
    setInteractiveVideoProgress(nextProgress);
  }, [user.id]);

  useEffect(() => () => {
    if (!videoProgressSaveTimerRef.current) return;
    clearTimeout(videoProgressSaveTimerRef.current);
    videoProgressSaveTimerRef.current = null;
    const pendingUserId = videoProgressPendingUserIdRef.current;
    videoProgressPendingUserIdRef.current = null;
    if (!pendingUserId || pendingUserId !== currentVideoProgressUserIdRef.current) return;
    void api.updateMyPreferences({ interactiveVideoProgress: interactiveVideoProgressRef.current }).catch(() => undefined);
  }, []);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('course_player_night_mode');
      if (saved !== null) return saved === 'true';
      return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('course_player_night_mode', String(isDarkMode));
    } catch {
      // ignore
    }
  }, [isDarkMode]);

  const [isSidebarOpen, setIsSidebarOpen] = useState(() =>
    typeof window === 'undefined' ? true : window.innerWidth >= 1024,
  );
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);
  const [expandedModules, setExpandedModules] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'description' | 'resources' | 'discussions'>('description');
  const [isFavorite, setIsFavorite] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [discussionThreads, setDiscussionThreads] = useState<any[]>([]);
  const [discussionLoading, setDiscussionLoading] = useState(false);
  const [discussionPosting, setDiscussionPosting] = useState(false);
  const [discussionError, setDiscussionError] = useState('');
  const [discussionDraft, setDiscussionDraft] = useState('');
  const [actionFeedback, setActionFeedback] = useState('');

  const flattenedLessons = useMemo(() => course.modules?.flatMap((module) => module.lessons) || [], [course.modules]);
  const unlockedLessons = useMemo(() => flattenedLessons.filter((lesson) => !lesson.isLocked), [flattenedLessons]);
  const totalLessons = flattenedLessons.length || 1;
  const completedCount = flattenedLessons.filter((lesson) => completedLessons.includes(lesson.id)).length;
  const progress = Math.round((completedCount / totalLessons) * 100);
  const isGuestUser = !user?.email || user.id === 'guest';
  const isStaffViewer = !isGuestUser && ['admin', 'teacher', 'supervisor'].includes(user.role);
  const canUsePaidCourseFiles =
    isStaffViewer ||
    enrolledCourses.includes(course.id) ||
    (user.subscription?.purchasedCourses || []).includes(course.id) ||
    hasScopedPackageAccess('courses', course.pathId || course.category, course.subjectId || course.subject);
  const activeLessonIndex = useMemo(
    () => flattenedLessons.findIndex((lesson) => lesson.id === activeLesson?.id),
    [activeLesson?.id, flattenedLessons],
  );
  const activeVideoProgress = useMemo(() => {
    if (!activeLesson || activeLesson.type !== 'video') return undefined;
    return interactiveVideoProgress.find((item) => item.courseId === course.id && item.lessonId === activeLesson.id);
  }, [activeLesson, course.id, interactiveVideoProgress]);
  const requiredVideoQuestionIds = useMemo(() => {
    if (!activeLesson || activeLesson.type !== 'video') return [];
    return (activeLesson.interactiveQuestions || [])
      .filter((question) => question.mustPass)
      .map((question) => question.id);
  }, [activeLesson]);
  const unansweredRequiredVideoQuestionIds = useMemo(() => {
    if (requiredVideoQuestionIds.length === 0) return [];
    const answeredQuestionIds = new Set(activeVideoProgress?.answeredQuestionIds || []);
    return requiredVideoQuestionIds.filter((questionId) => !answeredQuestionIds.has(questionId));
  }, [activeVideoProgress?.answeredQuestionIds, requiredVideoQuestionIds]);
  const saveInteractiveVideoProgress = useCallback((progressState: Pick<InteractiveVideoProgress, 'positionSeconds' | 'answeredQuestionIds'>) => {
    if (!activeLesson || activeLesson.type !== 'video') return;
    const next = normalizeInteractiveVideoProgress(course.id, activeLesson.id, progressState);
    const merged = mergeInteractiveVideoProgress(interactiveVideoProgressRef.current, next);
    interactiveVideoProgressRef.current = merged;
    setInteractiveVideoProgress(merged);

    try {
      localStorage.setItem(`interactive-video-progress:${String(user.id || 'guest')}:${course.id}:${activeLesson.id}`, JSON.stringify(next));
    } catch {
      // Browser storage is a resilience cache only; the authenticated API remains authoritative.
    }

    if (!user.email || !user.id || user.id === 'guest') return;
    if (videoProgressSaveTimerRef.current) clearTimeout(videoProgressSaveTimerRef.current);
    const scheduledUserId = String(user.id);
    videoProgressPendingUserIdRef.current = scheduledUserId;
    videoProgressSaveTimerRef.current = setTimeout(() => {
      videoProgressSaveTimerRef.current = null;
      if (
        videoProgressPendingUserIdRef.current !== scheduledUserId ||
        currentVideoProgressUserIdRef.current !== scheduledUserId
      ) return;
      videoProgressPendingUserIdRef.current = null;
      void api.updateMyPreferences({ interactiveVideoProgress: interactiveVideoProgressRef.current }).catch(() => undefined);
    }, 750);
  }, [activeLesson, course.id, user.email, user.id]);
  const previousLesson = activeLessonIndex >= 0 ? flattenedLessons[activeLessonIndex - 1] : undefined;
  const nextLesson = activeLessonIndex >= 0 ? flattenedLessons[activeLessonIndex + 1] : undefined;
  const favoriteStorageKey = `course-player-favorites:${String(user?.id || 'guest')}`;
  const lessonResources = useMemo(() => {
    const resources: Array<{ id: string; title: string; url: string; source: string }> = [];
    if (activeLesson?.fileUrl) {
      resources.push({
        id: `lesson-file-${activeLesson.id}`,
        title: activeLesson.title,
        url: activeLesson.fileUrl,
        source: 'ملف الدرس',
      });
    }
    (course.files || []).forEach((file, index) => {
      if (!file?.url) return;
      if (file.access === 'enrolled_paid' && !canUsePaidCourseFiles) return;
      resources.push({
        id: String(file.id || `${course.id}-file-${index}`),
        title: String(file.title || `ملف ${index + 1}`),
        url: file.url,
        source: 'ملف الدورة',
      });
    });
    const seen = new Set<string>();
    return resources.filter((item) => {
      if (seen.has(item.url)) return false;
      seen.add(item.url);
      return true;
    });
  }, [activeLesson?.fileUrl, activeLesson?.id, activeLesson?.title, canUsePaidCourseFiles, course.files, course.id]);
  const renderLessonEdgeIcon = (position: 'start' | 'end') => {
    const icon = String(position === 'start' ? course.lessonStartIcon || '' : course.lessonEndIcon || '').trim();
    if (!icon) return null;

    const color = resolveIconColor(
      position === 'start' ? course.lessonStartIconColor : course.lessonEndIconColor,
      position === 'start' ? '#4f46e5' : '#f59e0b',
    );

    return (
      <span className="inline-flex shrink-0 items-center justify-center text-sm font-black" style={{ color }}>
        {icon}
      </span>
    );
  };

  useEffect(() => {
    const initialLesson =
      (initialLessonId ? flattenedLessons.find((lesson) => lesson.id === initialLessonId && !lesson.isLocked) : null) ||
      unlockedLessons[0] ||
      null;
    const firstModuleWithLessons = course.modules?.find((module) =>
      module.lessons.some((lesson) => lesson.id === initialLesson?.id),
    ) || course.modules?.find((module) => module.lessons.length > 0);

    setActiveLesson(initialLesson);
    setExpandedModules(firstModuleWithLessons ? [firstModuleWithLessons.id] : []);
  }, [course, flattenedLessons, initialLessonId, unlockedLessons]);

  useEffect(() => {
    if (activeLesson?.id) {
      onLessonChange?.(activeLesson.id);
    }
  }, [activeLesson?.id, onLessonChange]);

  useEffect(() => {
    setActiveTab('description');
  }, [activeLesson?.id]);

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

  useEffect(() => {
    if (activeTab !== 'discussions' || !activeLesson?.id) return;
    let mounted = true;
    const loadDiscussions = async () => {
      setDiscussionLoading(true);
      setDiscussionError('');
      try {
        let payload: any;
        try {
          payload = await api.getDiscussions('lesson', activeLesson.id);
        } catch {
          payload = await api.getDiscussions('course', course.id);
        }
        if (!mounted) return;
        setDiscussionThreads(Array.isArray(payload?.threads) ? payload.threads : []);
      } catch {
        if (!mounted) return;
        setDiscussionError('تعذر تحميل المناقشات الآن.');
      } finally {
        if (mounted) setDiscussionLoading(false);
      }
    };
    void loadDiscussions();
    return () => {
      mounted = false;
    };
  }, [activeLesson?.id, activeTab, course.id]);

  const handleMarkComplete = () => {
    if (!activeLesson) return;
    if (activeLesson.type === 'video' && unansweredRequiredVideoQuestionIds.length > 0) return;
    markLessonComplete(activeLesson.id, course.id, activeLesson.title);
  };

  const toggleDarkMode = () => setIsDarkMode((current) => !current);
  const toggleSidebar = () => setIsSidebarOpen((current) => !current);

  const toggleModule = (id: string) => {
    setExpandedModules((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  };

  const handleLessonClick = (lesson: Lesson) => {
    if (lesson.isLocked) return;
    setActiveLesson(lesson);
    if (window.innerWidth < 1024) setIsSidebarOpen(false);
  };

  const handleNavigateBetweenLessons = (direction: 'next' | 'prev') => {
    if (activeLessonIndex === -1) return;
    const targetIndex = direction === 'next' ? activeLessonIndex + 1 : activeLessonIndex - 1;
    const targetLesson = flattenedLessons[targetIndex];
    if (!targetLesson || targetLesson.isLocked) return;
    setActiveLesson(targetLesson);
  };

  const resolveEmbeddedQuizId = (lesson: { id?: string; quizId?: string; type?: string }) => {
    const directId = String(lesson.quizId || '').trim();
    if (directId) return directId;
    const rawId = String(lesson.id || '').trim();
    const prefixedMatch = rawId.match(/^course_quiz_(.+)_\d+$/);
    if (prefixedMatch?.[1]) return prefixedMatch[1];
    return '';
  };

  const handleOpenLessonQuiz = () => {
    if (!activeLesson) return;
    const resolvedQuizId = resolveEmbeddedQuizId(activeLesson);
    if (!resolvedQuizId) return;
    navigate(buildQuizRouteWithContext(resolvedQuizId, {
      returnTo: `/course/${course.id}`,
      source: 'course',
      courseId: course.id,
      courseLessonId: activeLesson.id,
    }));
  };

  const handleOpenLessonFile = (mode: 'preview' | 'download') => {
    if (!activeLesson?.fileUrl) return;

    if (mode === 'download') {
      const anchor = document.createElement('a');
      anchor.href = activeLesson.fileUrl;
      anchor.download = activeLesson.title;
      anchor.target = '_blank';
      anchor.rel = 'noopener noreferrer';
      anchor.click();
      return;
    }

      openExternalUrl(activeLesson.fileUrl);
  };

  const handleBack = () => {
    if (onBack) {
      onBack();
      return;
    }
    navigate('/courses');
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
    setActionFeedback(isFavorite ? 'تمت إزالة الدورة من المفضلة.' : 'تمت إضافة الدورة إلى المفضلة.');
  };

  const handleShareCourse = async () => {
    if (isSharing) return;
    setIsSharing(true);
    try {
      const shareBody = `دورة: ${course.title}\nالدرس: ${activeLesson?.title || ''}\n${window.location.href}`;
      await shareTextSummary(`مشاركة دورة ${course.title}`, shareBody);
      setActionFeedback('تم تجهيز المشاركة.');
    } finally {
      setIsSharing(false);
    }
  };

  const handleCreateDiscussion = async () => {
    const body = discussionDraft.trim();
    if (!body || !activeLesson?.id || discussionPosting) return;
    setDiscussionPosting(true);
    setDiscussionError('');
    try {
      let created: any;
      try {
        created = await api.createDiscussion('lesson', activeLesson.id, {
          title: body.length > 80 ? `${body.slice(0, 77)}...` : body,
          body,
        });
      } catch {
        created = await api.createDiscussion('course', course.id, {
          title: body.length > 80 ? `${body.slice(0, 77)}...` : body,
          body,
        });
      }
      setDiscussionThreads((prev) => [created, ...prev]);
      setDiscussionDraft('');
    } catch {
      setDiscussionError('تعذر إرسال المناقشة الآن.');
    } finally {
      setDiscussionPosting(false);
    }
  };

  const lessonTypeLabel =
    activeLesson?.type === 'video'
      ? 'درس فيديو'
      : activeLesson?.type === 'quiz'
        ? 'اختبار تقييمي'
        : activeLesson?.type === 'file'
          ? 'ملف تعليمي'
          : 'محتوى تفاعلي';

  const lessonDescription =
    activeLesson?.type === 'video'
      ? 'هذا الدرس جزء من مسار التعلم الحالي، ويمكنك الرجوع إليه لاحقًا من نفس الدورة في أي وقت.'
      : activeLesson?.type === 'quiz'
        ? 'هذا الاختبار مرتبط مباشرة بمحتوى الدرس الحالي لمساعدتك على قياس الفهم قبل الانتقال للدرس التالي.'
        : activeLesson?.type === 'file'
          ? 'يمكنك فتح الملف أو تحميله للمراجعة، وسيظل مرتبطًا بنفس الدرس داخل الدورة.'
          : 'هذا المحتوى مرتبط بمسار تعلمك الحالي وسيظهر هنا عند توفره.';

  return (
    <div className={`min-h-screen flex flex-col ${isDarkMode ? 'dark bg-[#0f172a] text-slate-100' : 'bg-slate-50 text-slate-900'} transition-colors duration-300`} dir="rtl">
      <header className={`h-16 flex items-center justify-between px-3 sm:px-4 md:px-6 border-b ${isDarkMode ? 'border-slate-800 bg-[#1e293b]' : 'border-slate-200 bg-white'} sticky top-0 z-50 shadow-xs transition-colors`}>
        <div className="flex items-center gap-2 sm:gap-4 min-w-0">
          <button
            onClick={handleBack}
            className={`p-2 rounded-xl transition-colors ${
              isDarkMode ? 'text-slate-300 hover:text-white hover:bg-slate-800' : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
            }`}
            title="الرجوع"
          >
            <ArrowRight size={20} />
          </button>
          <div className="hidden md:block min-w-0">
            <h1 className={`font-black text-base lg:text-lg truncate max-w-[340px] lg:max-w-md ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{course.title}</h1>
            <p className={`text-[11px] font-bold mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>تقدمك: {progress}%</p>
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-3">
          <button
            onClick={toggleDarkMode}
            className={`p-2.5 rounded-xl transition-all ${
              isDarkMode ? 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'
            }`}
            title={isDarkMode ? 'تفعيل الوضع الفاتح' : 'تفعيل الوضع الليلي'}
          >
            {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          <button
            onClick={handleShareCourse}
            disabled={isSharing}
            className={`p-2.5 rounded-xl hidden sm:block disabled:opacity-60 transition-all ${
              isDarkMode ? 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700' : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200'
            }`}
            title="مشاركة الدورة"
          >
            <Share2 size={20} />
          </button>
          <button
            onClick={toggleSidebar}
            className={`lg:hidden p-2.5 rounded-xl transition-all ${
              isDarkMode ? 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700' : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200'
            }`}
            title="قائمة الدروس"
          >
            {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden relative">
        {/* Mobile Backdrop for Sidebar */}
        {isSidebarOpen && (
          <div
            className="fixed inset-0 top-16 z-30 bg-black/60 backdrop-blur-xs lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        <main className={`flex-1 overflow-y-auto transition-all duration-300 ${isSidebarOpen ? 'lg:mr-80' : 'mr-0'}`}>
          <div className="max-w-5xl mx-auto p-4 sm:p-6 md:p-8">
            {activeLesson ? (
              <motion.div
                key={activeLesson.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="space-y-6"
              >
                <div className={`aspect-video rounded-3xl overflow-hidden shadow-2xl relative group border ${isDarkMode ? 'bg-black border-slate-800 shadow-black/50' : 'bg-gray-900 border-slate-200 shadow-indigo-950/10'}`}>
                  {activeLesson.type === 'video' ? (
                    <React.Suspense
                      fallback={
                        <div className="flex h-full w-full items-center justify-center bg-black text-sm font-bold text-white">
                          جاري تجهيز المشغل...
                        </div>
                      }
                    >
                      <CustomVideoPlayer
                        key={activeLesson.id}
                        url={activeLesson.videoUrl || ''}
                        title={activeLesson.title}
                        interactiveQuestions={activeLesson.interactiveQuestions || []}
                        questionBank={questions}
                        initialProgress={activeVideoProgress}
                        onInteractiveProgress={saveInteractiveVideoProgress}
                      />
                    </React.Suspense>
                  ) : activeLesson.type === 'quiz' ? (
                    <div className="w-full h-full flex flex-col items-center justify-center p-5 sm:p-8 text-center bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-800 text-white">
                      <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white/15 rounded-3xl flex items-center justify-center mb-6 shadow-inner">
                        <BarChart size={44} />
                      </div>
                      <h2 className="text-2xl sm:text-3xl font-black mb-4 leading-tight">{activeLesson.title}</h2>
                      <p className="text-indigo-100 mb-8 max-w-md text-sm sm:text-base leading-relaxed">هذا الاختبار سيساعدك على قياس فهمك للمحتوى المرتبط بهذه الدورة قبل متابعة الدروس التالية.</p>
                      <button
                        onClick={handleOpenLessonQuiz}
                        disabled={!resolveEmbeddedQuizId(activeLesson)}
                        className="bg-white text-indigo-700 px-8 sm:px-10 py-3.5 rounded-2xl font-black text-base sm:text-lg hover:bg-indigo-50 transition-all shadow-xl disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
                      >
                        ابدأ الاختبار الآن
                      </button>
                    </div>
                  ) : activeLesson.type === 'file' ? (
                    <div className={`w-full h-full flex flex-col items-center justify-center p-5 sm:p-8 text-center ${isDarkMode ? 'bg-slate-900 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
                      <div className="w-16 h-16 sm:w-20 sm:h-20 bg-rose-500/10 text-rose-500 rounded-3xl flex items-center justify-center mb-6">
                        <FileText size={44} />
                      </div>
                      <h2 className={`text-2xl sm:text-3xl font-black mb-4 leading-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{activeLesson.title}</h2>
                      <p className={`mb-8 max-w-md text-sm sm:text-base ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>يمكنك استعراض هذا الملف أو تحميله للمذاكرة لاحقًا من داخل نفس الدرس.</p>
                      <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
                        <button
                          onClick={() => handleOpenLessonFile('download')}
                          disabled={!activeLesson.fileUrl}
                          className="bg-indigo-600 text-white px-8 py-3.5 rounded-2xl font-black text-base hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
                        >
                          <Download size={20} /> تحميل الملف
                        </button>
                        <button
                          onClick={() => handleOpenLessonFile('preview')}
                          disabled={!activeLesson.fileUrl}
                          className={`px-8 py-3.5 rounded-2xl font-black text-base transition-all shadow-xs flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto ${
                            isDarkMode ? 'bg-slate-800 border border-slate-700 text-slate-200 hover:bg-slate-700' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <Eye size={20} /> استعراض
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className={`w-full h-full flex flex-col items-center justify-center p-5 sm:p-8 text-center ${isDarkMode ? 'bg-slate-900 text-slate-200' : 'bg-slate-100 text-slate-600'}`}>
                      <FileText size={64} className="mb-4 opacity-20" />
                      <h2 className="text-xl sm:text-2xl font-bold mb-2">محتوى غير متاح</h2>
                    </div>
                  )}
                </div>

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                        isDarkMode ? 'bg-indigo-500/20 text-indigo-400' : 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                      }`}>
                        {lessonTypeLabel}
                      </span>
                      <span className={`text-xs font-bold ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{activeLesson.duration}</span>
                    </div>
                    <h2 className={`text-xl sm:text-2xl md:text-3xl font-black leading-tight break-words inline-flex items-center gap-2 ${
                      isDarkMode ? 'text-white' : 'text-slate-900'
                    }`}>
                      {renderLessonEdgeIcon('start')}
                      <span>{activeLesson.title}</span>
                      {renderLessonEdgeIcon('end')}
                    </h2>
                  </div>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
                    <button
                      onClick={handleMarkComplete}
                      disabled={!completedLessons.includes(activeLesson.id) && unansweredRequiredVideoQuestionIds.length > 0}
                      className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-2xl font-bold transition-all disabled:cursor-not-allowed disabled:opacity-50 w-full sm:w-auto ${
                        completedLessons.includes(activeLesson.id)
                          ? isDarkMode
                            ? 'bg-emerald-950/60 border border-emerald-500/40 text-emerald-400 shadow-xs'
                            : 'bg-emerald-50 border border-emerald-200 text-emerald-700 shadow-xs'
                          : isDarkMode
                            ? 'bg-slate-800 border border-slate-700 text-slate-200 hover:bg-slate-700'
                            : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-xs'
                      }`}
                    >
                      <CheckCircle size={18} /> {completedLessons.includes(activeLesson.id) ? 'مكتمل' : 'تحديد كمكتمل'}
                    </button>
                    <button
                      onClick={() => handleNavigateBetweenLessons('prev')}
                      disabled={activeLessonIndex <= 0 || Boolean(previousLesson?.isLocked)}
                      className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-2xl font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed w-full sm:w-auto ${
                        isDarkMode
                          ? 'bg-slate-800 border border-slate-700 text-slate-200 hover:bg-slate-700'
                          : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-xs'
                      }`}
                    >
                      <SkipBack size={18} /> السابق
                    </button>
                    <button
                      onClick={() => handleNavigateBetweenLessons('next')}
                      disabled={activeLessonIndex === -1 || activeLessonIndex >= flattenedLessons.length - 1 || Boolean(nextLesson?.isLocked)}
                      className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl font-black hover:bg-indigo-700 transition-all shadow-md shadow-indigo-600/20 disabled:opacity-40 disabled:cursor-not-allowed w-full sm:w-auto"
                    >
                      التالي <SkipForward size={18} />
                    </button>
                  </div>
                </div>
                {!completedLessons.includes(activeLesson.id) && unansweredRequiredVideoQuestionIds.length > 0 ? (
                  <p
                    data-testid="interactive-video-required-completion-block"
                    className={`text-xs font-bold p-3 rounded-2xl border ${
                      isDarkMode
                        ? 'border-amber-500/30 bg-amber-500/10 text-amber-300'
                        : 'border-amber-200 bg-amber-50 text-amber-800'
                    }`}
                  >
                    ⚠️ أجب عن جميع الأسئلة الإلزامية داخل الفيديو قبل تحديد الدرس كمكتمل.
                  </p>
                ) : null}

                <div className="pt-8">
                  {actionFeedback ? (
                    <div className={`mb-4 rounded-xl border px-3 py-2 text-xs font-bold ${
                      isDarkMode ? 'border-emerald-700/40 bg-emerald-900/30 text-emerald-200' : 'border-emerald-100 bg-emerald-50 text-emerald-700'
                    }`}>
                      {actionFeedback}
                    </div>
                  ) : null}
                  <div className={`flex overflow-x-auto border-b ${isDarkMode ? 'border-slate-800' : 'border-slate-200'} mb-8`}>
                    <button
                      onClick={() => setActiveTab('description')}
                      className={`shrink-0 px-6 py-4 font-bold text-sm transition-all ${
                        activeTab === 'description'
                          ? isDarkMode
                            ? 'text-indigo-400 border-b-2 border-indigo-400 font-black'
                            : 'text-indigo-600 border-b-2 border-indigo-600 font-black'
                          : isDarkMode
                            ? 'text-slate-400 hover:text-slate-200'
                            : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      الوصف
                    </button>
                    <button
                      onClick={() => setActiveTab('resources')}
                      className={`shrink-0 px-6 py-4 font-bold text-sm transition-all ${
                        activeTab === 'resources'
                          ? isDarkMode
                            ? 'text-indigo-400 border-b-2 border-indigo-400 font-black'
                            : 'text-indigo-600 border-b-2 border-indigo-600 font-black'
                          : isDarkMode
                            ? 'text-slate-400 hover:text-slate-200'
                            : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      المصادر
                    </button>
                    <button
                      onClick={() => setActiveTab('discussions')}
                      className={`shrink-0 px-6 py-4 font-bold text-sm transition-all ${
                        activeTab === 'discussions'
                          ? isDarkMode
                            ? 'text-indigo-400 border-b-2 border-indigo-400 font-black'
                            : 'text-indigo-600 border-b-2 border-indigo-600 font-black'
                          : isDarkMode
                            ? 'text-slate-400 hover:text-slate-200'
                            : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      المناقشات
                    </button>
                  </div>
                  {activeTab === 'description' && (
                    <div className={`leading-relaxed ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                      <p className="mb-4 text-sm md:text-base leading-relaxed">{lessonDescription}</p>
                      <ul className={`list-disc list-inside space-y-2.5 mr-2 text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                        <li>يمكنك الانتقال بين دروس الدورة من الشريط الجانبي أو أزرار التالي والسابق.</li>
                        <li>سيتم حفظ إتمام الدرس في تقدمك داخل الدورة.</li>
                        <li>ترتبط الاختبارات والملفات هنا مباشرة بالدرس الحالي عندما تكون متوفرة.</li>
                      </ul>
                    </div>
                  )}
                  {activeTab === 'resources' && (
                    <div className="space-y-3">
                      {lessonResources.length > 0 ? lessonResources.map((resource) => (
                        <div key={resource.id} className={`rounded-2xl border p-4 flex items-center justify-between gap-3 transition-all ${
                          isDarkMode ? 'border-slate-800 bg-slate-900/60 hover:border-slate-700' : 'border-slate-200 bg-white hover:border-slate-300 shadow-xs'
                        }`}>
                          <div className="min-w-0 flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                              isDarkMode ? 'bg-indigo-500/10 text-indigo-400' : 'bg-indigo-50 text-indigo-600'
                            }`}>
                              <FileText size={20} />
                            </div>
                            <div className="min-w-0">
                              <p className={`font-bold text-sm truncate ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>{resource.title}</p>
                              <p className={`text-xs mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{resource.source}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              onClick={() => openExternalUrl(resource.url)}
                              title="استعراض"
                              className={`p-2.5 rounded-xl transition-all ${
                                isDarkMode ? 'bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                              }`}
                            >
                              <Eye size={16} />
                            </button>
                            <button
                              onClick={() => {
                                const anchor = document.createElement('a');
                                anchor.href = resource.url;
                                anchor.target = '_blank';
                                anchor.rel = 'noopener noreferrer';
                                anchor.download = resource.title;
                                anchor.click();
                              }}
                              title="تحميل"
                              className={`p-2.5 rounded-xl transition-all ${
                                isDarkMode ? 'bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'
                              }`}
                            >
                              <Download size={16} />
                            </button>
                          </div>
                        </div>
                      )) : (
                        <p className={isDarkMode ? 'text-slate-400 text-sm' : 'text-slate-500 text-sm'}>لا توجد مصادر متاحة لهذا الدرس حالياً.</p>
                      )}
                    </div>
                  )}
                  {activeTab === 'discussions' && (
                    <div className="space-y-4">
                      <div className={`rounded-2xl border p-4 ${isDarkMode ? 'border-slate-800 bg-slate-900/60' : 'border-slate-200 bg-white shadow-xs'}`}>
                        <textarea
                          value={discussionDraft}
                          onChange={(event) => setDiscussionDraft(event.target.value)}
                          placeholder="اكتب سؤالك أو مناقشتك حول هذا الدرس..."
                          className={`w-full min-h-[96px] rounded-xl border p-3 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-indigo-500/30 ${
                            isDarkMode
                              ? 'bg-slate-950 border-slate-700 text-slate-100 placeholder:text-slate-500'
                              : 'bg-slate-50 border-slate-200 text-slate-800 placeholder:text-slate-400'
                          }`}
                        />
                        <div className="mt-3 flex justify-end">
                          <button
                            onClick={handleCreateDiscussion}
                            disabled={!discussionDraft.trim() || discussionPosting}
                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold shadow-md shadow-indigo-600/20 disabled:opacity-50"
                          >
                            <Send size={14} /> إرسال
                          </button>
                        </div>
                        {discussionError ? <p className="mt-2 text-xs text-rose-500 font-bold">{discussionError}</p> : null}
                      </div>
                      {discussionLoading ? (
                        <p className={isDarkMode ? 'text-slate-400 text-sm' : 'text-slate-500 text-sm'}>جارٍ تحميل المناقشات...</p>
                      ) : discussionThreads.length === 0 ? (
                        <p className={isDarkMode ? 'text-slate-400 text-sm' : 'text-slate-500 text-sm'}>لا توجد مناقشات بعد لهذا الدرس.</p>
                      ) : (
                        discussionThreads.map((thread) => (
                          <div key={thread.id} className={`rounded-2xl border p-4 space-y-1.5 ${
                            isDarkMode ? 'border-slate-800 bg-slate-900/60' : 'border-slate-200 bg-white shadow-xs'
                          }`}>
                            <p className={`font-bold text-sm ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>{thread.title || 'مناقشة'}</p>
                            <p className={`text-sm leading-relaxed ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>{thread.body || ''}</p>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            ) : flattenedLessons.length > 0 && unlockedLessons.length === 0 ? (
              <div className="h-[60vh] flex flex-col items-center justify-center text-center p-4">
                <div className={`w-20 h-20 rounded-3xl flex items-center justify-center mb-6 ${
                  isDarkMode ? 'bg-amber-500/10 text-amber-400' : 'bg-amber-50 text-amber-600'
                }`}>
                  <Lock className="w-10 h-10" />
                </div>
                <h2 className={`text-2xl font-black mb-3 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>محتوى الدورة يحتاج تفعيل</h2>
                <p className={`max-w-md text-sm leading-7 mb-6 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                  لا توجد دروس مجانية للمعاينة في هذه الدورة حالياً. يمكنك الرجوع لصفحة الدورة وطلب الشراء أو اختيار باقة مناسبة.
                </p>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <button
                    onClick={() => navigate(`/course/${course.id}?buy=1`)}
                    className="rounded-2xl bg-amber-500 px-6 py-3 text-sm font-black text-white hover:bg-amber-600 shadow-md shadow-amber-500/20"
                  >
                    شراء الدورة
                  </button>
                  <button
                    onClick={handleBack}
                    className={`rounded-2xl border px-6 py-3 text-sm font-black transition-all ${
                      isDarkMode ? 'border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    الرجوع للدورة
                  </button>
                </div>
              </div>
            ) : flattenedLessons.length === 0 ? (
              <div className="h-[60vh] flex flex-col items-center justify-center text-center p-4">
                <div className={`w-20 h-20 rounded-3xl flex items-center justify-center mb-6 ${
                  isDarkMode ? 'bg-indigo-500/10 text-indigo-400' : 'bg-indigo-50 text-indigo-600'
                }`}>
                  <BookOpen className="w-10 h-10" />
                </div>
                <h2 className={`text-2xl font-black mb-3 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>لا توجد دروس منشورة في هذه الدورة بعد</h2>
                <p className={`max-w-md text-sm leading-7 mb-6 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                  الدورة موجودة، لكن محتواها لم يجهز للعرض للطالب بعد. يمكنك الرجوع لصفحة الدورة أو مراجعة الإدارة لإضافة الدروس.
                </p>
                <button
                  onClick={handleBack}
                  className="rounded-2xl bg-indigo-600 px-6 py-3 text-sm font-black text-white hover:bg-indigo-700 shadow-md shadow-indigo-600/20"
                >
                  الرجوع للدورة
                </button>
              </div>
            ) : (
              <div className="h-[60vh] flex flex-col items-center justify-center text-center p-4">
                <Loader2 className="w-12 h-12 animate-spin text-indigo-600 mb-4" />
                <p className={`font-bold ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>جاري تحميل محتوى الدرس...</p>
              </div>
            )}
          </div>
        </main>

        <aside className={`fixed lg:absolute top-16 lg:top-0 right-0 bottom-0 w-80 ${
          isDarkMode ? 'bg-[#1e293b] border-l border-slate-800' : 'bg-white border-l border-slate-200'
        } z-40 transition-transform duration-300 shadow-xl lg:shadow-none ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full'}`}>
          <div className="h-full flex flex-col">
            <div className={`p-4 sm:p-5 border-b ${isDarkMode ? 'border-slate-800' : 'border-slate-100'}`}>
              <div className="flex items-center justify-between mb-3">
                <h3 className={`font-black text-base ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>محتوى ومنهج الدورة</h3>
                <span className={`text-xs font-black px-2.5 py-0.5 rounded-full ${
                  isDarkMode ? 'bg-indigo-500/20 text-indigo-300' : 'bg-indigo-50 text-indigo-700'
                }`}>{progress}%</span>
              </div>
              <div className="space-y-1.5">
                <div className={`h-2 rounded-full overflow-hidden ${isDarkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
                  <div className="h-full bg-gradient-to-l from-indigo-500 to-indigo-600 transition-all duration-700 rounded-full" style={{ width: `${progress}%` }} />
                </div>
                <div className={`flex justify-between text-[11px] font-bold ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  <span>تم إكمال {completedCount} من {totalLessons} درس</span>
                  <span>{Math.max(0, totalLessons - completedCount)} متبقي</span>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {course.modules?.map((module) => (
                <div key={module.id} className={`border-b ${isDarkMode ? 'border-slate-800/60' : 'border-slate-100'}`}>
                  <button
                    onClick={() => toggleModule(module.id)}
                    className={`w-full flex items-center justify-between gap-3 p-4 text-right transition-colors ${
                      expandedModules.includes(module.id)
                        ? isDarkMode
                          ? 'bg-indigo-500/10 text-white'
                          : 'bg-indigo-50/60 text-indigo-950'
                        : isDarkMode
                          ? 'text-slate-300 hover:bg-slate-800/40'
                          : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                        expandedModules.includes(module.id)
                          ? 'bg-indigo-600 text-white'
                          : isDarkMode
                            ? 'bg-slate-800 text-slate-400'
                            : 'bg-slate-100 text-slate-500'
                      }`}>
                        <BookOpen size={16} />
                      </div>
                      <span className="font-bold text-sm leading-snug truncate">{module.title}</span>
                    </div>
                    <span className={isDarkMode ? 'text-slate-400' : 'text-slate-400'}>
                      {expandedModules.includes(module.id) ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </span>
                  </button>

                  <AnimatePresence>
                    {expandedModules.includes(module.id) && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className={`overflow-hidden py-1 ${isDarkMode ? 'bg-[#0f172a]/50' : 'bg-slate-50/50'}`}
                      >
                        {module.lessons.map((lesson) => {
                          const isCompleted = completedLessons.includes(lesson.id);
                          const isActive = activeLesson?.id === lesson.id;
                          const isQuiz = lesson.type === 'quiz' || lesson.type === 'test' || Boolean(lesson.quizId);
                          const isFile = lesson.type === 'file' || lesson.type === 'pdf';
                          const formattedDuration = formatLessonDuration(lesson);
                          return (
                            <button
                              key={lesson.id}
                              onClick={() => handleLessonClick(lesson)}
                              className={`w-full p-3.5 sm:p-4 flex items-center justify-between gap-3 group transition-all border-r-4 ${
                                isActive
                                  ? isDarkMode
                                    ? 'border-indigo-500 bg-indigo-500/15 text-white'
                                    : 'border-indigo-600 bg-indigo-50/80 text-indigo-950 font-black'
                                  : isDarkMode
                                    ? 'border-transparent text-slate-300 hover:bg-slate-800/60 hover:text-white'
                                    : 'border-transparent text-slate-700 hover:bg-slate-100/80 hover:text-slate-900'
                              }`}
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-all shadow-xs ${
                                  isCompleted
                                    ? 'bg-emerald-500 text-white shadow-sm ring-2 ring-emerald-300/40'
                                    : isActive
                                      ? isQuiz
                                        ? 'bg-purple-600 text-white shadow-md shadow-purple-500/30 ring-2 ring-purple-400/50'
                                        : 'bg-indigo-600 text-white shadow-md shadow-indigo-500/30 ring-2 ring-indigo-400/50'
                                      : isQuiz
                                        ? isDarkMode
                                          ? 'bg-purple-950/50 text-purple-300 border border-purple-800/60'
                                          : 'bg-purple-50 text-purple-600 border border-purple-200'
                                        : isFile
                                          ? isDarkMode
                                            ? 'bg-amber-950/50 text-amber-300 border border-amber-800/60'
                                            : 'bg-amber-50 text-amber-600 border border-amber-200'
                                          : isDarkMode
                                            ? 'bg-blue-950/50 text-blue-300 border border-blue-800/60'
                                            : 'bg-blue-50 text-blue-600 border border-blue-200'
                                }`}>
                                  {isCompleted ? (
                                    <CheckCircle2 size={16} />
                                  ) : isQuiz ? (
                                    <Award size={16} />
                                  ) : isFile ? (
                                    <FileText size={16} />
                                  ) : (
                                    <PlayCircle size={16} />
                                  )}
                                </div>
                                <div className="text-right min-w-0">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <p className={`text-xs font-bold leading-snug truncate ${
                                      isActive
                                        ? isDarkMode ? 'text-indigo-300 font-black' : 'text-indigo-700 font-black'
                                        : isDarkMode ? 'text-slate-200' : 'text-slate-700'
                                    }`}>
                                      {renderLessonEdgeIcon('start')}
                                      <span>{lesson.title}</span>
                                      {renderLessonEdgeIcon('end')}
                                    </p>
                                    {isActive ? (
                                      <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${
                                        isQuiz
                                          ? isDarkMode ? 'bg-purple-900/60 text-purple-200 border border-purple-700' : 'bg-purple-100 text-purple-700 border border-purple-200'
                                          : isDarkMode ? 'bg-indigo-900/60 text-indigo-200 border border-indigo-700' : 'bg-indigo-100 text-indigo-700 border border-indigo-200'
                                      }`}>
                                        {isQuiz ? 'الاختبار الحالي' : 'الدرس الحالي'}
                                      </span>
                                    ) : isCompleted ? (
                                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 border border-emerald-200">
                                        مكتمل ✓
                                      </span>
                                    ) : null}
                                  </div>
                                  <p className={`text-[10px] mt-0.5 font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                    {formattedDuration}
                                  </p>
                                </div>
                              </div>
                              {lesson.isLocked && <Lock size={14} className={isDarkMode ? 'text-amber-400 shrink-0' : 'text-amber-500 shrink-0'} />}
                            </button>
                          );
                        })}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>

            <div className={`p-4 border-t ${isDarkMode ? 'border-slate-800 bg-[#1e293b]' : 'border-slate-200 bg-white'}`}>
              <div className="mb-3 flex items-center gap-2">
                <button
                  onClick={handleToggleFavorite}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition-all ${
                    isFavorite
                      ? 'bg-rose-50 text-rose-600 border border-rose-200'
                      : isDarkMode
                        ? 'bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700'
                        : 'bg-slate-100 border border-slate-200 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <Heart size={15} fill={isFavorite ? 'currentColor' : 'none'} /> {isFavorite ? 'في المفضلة' : 'إضافة للمفضلة'}
                </button>
                <button
                  onClick={handleShareCourse}
                  disabled={isSharing}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold disabled:opacity-60 transition-all ${
                    isDarkMode
                      ? 'bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700'
                      : 'bg-slate-100 border border-slate-200 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <Share2 size={15} /> مشاركة
                </button>
              </div>
              <button
                onClick={() => navigate('/book-session')}
                className="w-full bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white py-3 rounded-xl font-bold text-sm transition-all shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2"
              >
                <MessageSquare size={18} /> تواصل مع المدرس
              </button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};