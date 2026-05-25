import React, { useEffect, useMemo, useState } from 'react';
import { Course, Lesson } from '../types';
import {
  PlayCircle,
  CheckCircle,
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

const CustomVideoPlayer = React.lazy(() =>
  import('./CustomVideoPlayer').then((module) => ({ default: module.CustomVideoPlayer })),
);

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
  const { completedLessons, markLessonComplete, questions, user } = useStore();
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
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
  const totalLessons = flattenedLessons.length || 1;
  const completedCount = flattenedLessons.filter((lesson) => completedLessons.includes(lesson.id)).length;
  const progress = Math.round((completedCount / totalLessons) * 100);
  const activeLessonIndex = useMemo(
    () => flattenedLessons.findIndex((lesson) => lesson.id === activeLesson?.id),
    [activeLesson?.id, flattenedLessons],
  );
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
  }, [activeLesson?.fileUrl, activeLesson?.id, activeLesson?.title, course.files, course.id]);
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
      flattenedLessons.find((lesson) => !lesson.isLocked) ||
      flattenedLessons[0] ||
      null;
    const firstModuleWithLessons = course.modules?.find((module) =>
      module.lessons.some((lesson) => lesson.id === initialLesson?.id),
    ) || course.modules?.find((module) => module.lessons.length > 0);

    setActiveLesson(initialLesson);
    setExpandedModules(firstModuleWithLessons ? [firstModuleWithLessons.id] : []);
  }, [course, flattenedLessons, initialLessonId]);

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
    if (activeLesson) {
      markLessonComplete(activeLesson.id, course.id, activeLesson.title);
    }
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
    navigate(buildQuizRouteWithContext(resolvedQuizId, { returnTo: `/course/${course.id}`, source: 'course' }));
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
    <div className={`min-h-screen flex flex-col ${isDarkMode ? 'bg-[#0f172a] text-white' : 'bg-gray-50 text-gray-900'} transition-colors duration-300`} dir="rtl">
      <header className={`h-16 flex items-center justify-between px-3 sm:px-4 md:px-6 border-b ${isDarkMode ? 'border-gray-800 bg-[#1e293b]' : 'border-gray-200 bg-white'} sticky top-0 z-50 shadow-sm`}>
        <div className="flex items-center gap-2 sm:gap-4 min-w-0">
          <button onClick={handleBack} className={`p-2 rounded-lg hover:bg-gray-100 ${isDarkMode ? 'hover:bg-gray-800' : ''} transition-colors`}>
            <ArrowRight size={20} />
          </button>
          <div className="hidden md:block min-w-0">
            <h1 className="font-black text-lg truncate max-w-[300px]">{course.title}</h1>
            <p className="text-[10px] text-gray-500 font-bold">تقدمك: {progress}%</p>
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-4">
          <button onClick={toggleDarkMode} className={`p-2.5 rounded-xl ${isDarkMode ? 'bg-amber-500/10 text-amber-500' : 'bg-indigo-50 text-indigo-600'} transition-all`}>
            {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          <button
            onClick={handleShareCourse}
            disabled={isSharing}
            className={`p-2.5 rounded-xl ${isDarkMode ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-600'} hidden sm:block disabled:opacity-60`}
          >
            <Share2 size={20} />
          </button>
          <button onClick={toggleSidebar} className={`lg:hidden p-2.5 rounded-xl ${isDarkMode ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-600'}`}>
            {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden relative">
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
                <div className={`aspect-video rounded-3xl overflow-hidden shadow-2xl relative group ${isDarkMode ? 'bg-black' : 'bg-gray-900'}`}>
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
                      />
                    </React.Suspense>
                  ) : activeLesson.type === 'quiz' ? (
                    <div className="w-full h-full flex flex-col items-center justify-center p-5 sm:p-8 text-center bg-gradient-to-br from-indigo-600 to-purple-700 text-white">
                      <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white/20 rounded-3xl flex items-center justify-center mb-6">
                        <BarChart size={48} />
                      </div>
                      <h2 className="text-2xl sm:text-3xl font-black mb-4 leading-tight">{activeLesson.title}</h2>
                      <p className="text-indigo-100 mb-8 max-w-md">هذا الاختبار سيساعدك على قياس فهمك للمحتوى المرتبط بهذه الدورة قبل متابعة الدروس التالية.</p>
                      <button
                        onClick={handleOpenLessonQuiz}
                        disabled={!resolveEmbeddedQuizId(activeLesson)}
                        className="bg-white text-indigo-600 px-6 sm:px-10 py-4 rounded-2xl font-black text-base sm:text-lg hover:bg-indigo-50 transition-all shadow-xl disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
                      >
                        ابدأ الاختبار الآن
                      </button>
                    </div>
                  ) : activeLesson.type === 'file' ? (
                    <div className="w-full h-full flex flex-col items-center justify-center p-5 sm:p-8 text-center bg-gray-50 text-gray-900">
                      <div className="w-16 h-16 sm:w-20 sm:h-20 bg-rose-100 text-rose-600 rounded-3xl flex items-center justify-center mb-6">
                        <FileText size={48} />
                      </div>
                      <h2 className="text-2xl sm:text-3xl font-black mb-4 leading-tight">{activeLesson.title}</h2>
                      <p className="text-gray-500 mb-8 max-w-md">يمكنك استعراض هذا الملف أو تحميله للمذاكرة لاحقًا من داخل نفس الدرس.</p>
                      <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
                        <button
                          onClick={() => handleOpenLessonFile('download')}
                          disabled={!activeLesson.fileUrl}
                          className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black text-base sm:text-lg hover:bg-indigo-700 transition-all shadow-xl flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
                        >
                          <Download size={20} /> تحميل الملف
                        </button>
                        <button
                          onClick={() => handleOpenLessonFile('preview')}
                          disabled={!activeLesson.fileUrl}
                          className="bg-white border border-gray-200 text-gray-700 px-8 py-4 rounded-2xl font-black text-base sm:text-lg hover:bg-gray-50 transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
                        >
                          <Eye size={20} /> استعراض
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center p-5 sm:p-8 text-center bg-gray-100 text-gray-600">
                      <FileText size={64} className="mb-4 opacity-20" />
                      <h2 className="text-xl sm:text-2xl font-bold mb-2">محتوى غير متاح</h2>
                    </div>
                  )}
                </div>

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${isDarkMode ? 'bg-indigo-500/20 text-indigo-400' : 'bg-indigo-100 text-indigo-600'}`}>
                        {lessonTypeLabel}
                      </span>
                      <span className="text-xs text-gray-500 font-bold">{activeLesson.duration}</span>
                    </div>
                    <h2 className="text-xl sm:text-2xl md:text-3xl font-black leading-tight break-words inline-flex items-center gap-2">
                      {renderLessonEdgeIcon('start')}
                      <span>{activeLesson.title}</span>
                      {renderLessonEdgeIcon('end')}
                    </h2>
                  </div>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
                    <button
                      onClick={handleMarkComplete}
                      className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-2xl font-bold transition-all w-full sm:w-auto ${completedLessons.includes(activeLesson.id) ? 'bg-emerald-100 text-emerald-600' : 'bg-white border border-gray-200 hover:bg-gray-50 shadow-sm'}`}
                    >
                      <CheckCircle size={18} /> {completedLessons.includes(activeLesson.id) ? 'مكتمل' : 'تحديد كمكتمل'}
                    </button>
                    <button
                      onClick={() => handleNavigateBetweenLessons('prev')}
                      disabled={activeLessonIndex <= 0}
                      className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-2xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto ${isDarkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-white border border-gray-200 hover:bg-gray-50 shadow-sm'}`}
                    >
                      <SkipBack size={18} /> السابق
                    </button>
                    <button
                      onClick={() => handleNavigateBetweenLessons('next')}
                      disabled={activeLessonIndex === -1 || activeLessonIndex >= flattenedLessons.length - 1}
                      className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
                    >
                      التالي <SkipForward size={18} />
                    </button>
                  </div>
                </div>

                <div className="pt-8">
                  {actionFeedback ? (
                    <div className={`mb-4 rounded-xl border px-3 py-2 text-xs font-bold ${isDarkMode ? 'border-emerald-700/40 bg-emerald-900/30 text-emerald-200' : 'border-emerald-100 bg-emerald-50 text-emerald-700'}`}>
                      {actionFeedback}
                    </div>
                  ) : null}
                  <div className={`flex overflow-x-auto border-b ${isDarkMode ? 'border-gray-800' : 'border-gray-200'} mb-8`}>
                    <button
                      onClick={() => setActiveTab('description')}
                      className={`shrink-0 px-6 py-4 font-bold text-sm ${activeTab === 'description' ? 'text-indigo-600 border-b-2 border-indigo-600 font-black' : isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}
                    >
                      الوصف
                    </button>
                    <button
                      onClick={() => setActiveTab('resources')}
                      className={`shrink-0 px-6 py-4 font-bold text-sm ${activeTab === 'resources' ? 'text-indigo-600 border-b-2 border-indigo-600 font-black' : isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}
                    >
                      المصادر
                    </button>
                    <button
                      onClick={() => setActiveTab('discussions')}
                      className={`shrink-0 px-6 py-4 font-bold text-sm ${activeTab === 'discussions' ? 'text-indigo-600 border-b-2 border-indigo-600 font-black' : isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}
                    >
                      المناقشات
                    </button>
                  </div>
                  {activeTab === 'description' && (
                    <div className={`leading-relaxed ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      <p className="mb-4">{lessonDescription}</p>
                      <ul className="list-disc list-inside space-y-2 mr-4">
                        <li>يمكنك الانتقال بين دروس الدورة من الشريط الجانبي أو أزرار التالي والسابق.</li>
                        <li>سيتم حفظ إتمام الدرس في تقدمك داخل الدورة.</li>
                        <li>ترتبط الاختبارات والملفات هنا مباشرة بالدرس الحالي عندما تكون متوفرة.</li>
                      </ul>
                    </div>
                  )}
                  {activeTab === 'resources' && (
                    <div className="space-y-3">
                      {lessonResources.length > 0 ? lessonResources.map((resource) => (
                        <div key={resource.id} className={`rounded-2xl border p-4 flex items-center justify-between gap-3 ${isDarkMode ? 'border-gray-700 bg-gray-900/40' : 'border-gray-200 bg-white'}`}>
                          <div className="min-w-0">
                            <p className="font-bold text-sm truncate">{resource.title}</p>
                            <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{resource.source}</p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              onClick={() => openExternalUrl(resource.url)}
                              className={`p-2 rounded-lg ${isDarkMode ? 'bg-gray-800 text-gray-200' : 'bg-gray-100 text-gray-700'}`}
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
                              className={`p-2 rounded-lg ${isDarkMode ? 'bg-gray-800 text-gray-200' : 'bg-gray-100 text-gray-700'}`}
                            >
                              <Download size={16} />
                            </button>
                          </div>
                        </div>
                      )) : (
                        <p className={isDarkMode ? 'text-gray-400 text-sm' : 'text-gray-500 text-sm'}>لا توجد مصادر متاحة لهذا الدرس حالياً.</p>
                      )}
                    </div>
                  )}
                  {activeTab === 'discussions' && (
                    <div className="space-y-4">
                      <div className={`rounded-2xl border p-4 ${isDarkMode ? 'border-gray-700 bg-gray-900/40' : 'border-gray-200 bg-white'}`}>
                        <textarea
                          value={discussionDraft}
                          onChange={(event) => setDiscussionDraft(event.target.value)}
                          placeholder="اكتب سؤالك أو مناقشتك حول هذا الدرس..."
                          className={`w-full min-h-[96px] rounded-xl border p-3 text-sm resize-y ${isDarkMode ? 'bg-gray-900 border-gray-700 text-gray-100 placeholder:text-gray-500' : 'bg-white border-gray-200 text-gray-800 placeholder:text-gray-400'}`}
                        />
                        <div className="mt-3 flex justify-end">
                          <button
                            onClick={handleCreateDiscussion}
                            disabled={!discussionDraft.trim() || discussionPosting}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-bold disabled:opacity-50"
                          >
                            <Send size={14} /> إرسال
                          </button>
                        </div>
                        {discussionError ? <p className="mt-2 text-xs text-rose-500">{discussionError}</p> : null}
                      </div>
                      {discussionLoading ? (
                        <p className={isDarkMode ? 'text-gray-400 text-sm' : 'text-gray-500 text-sm'}>جارٍ تحميل المناقشات...</p>
                      ) : discussionThreads.length === 0 ? (
                        <p className={isDarkMode ? 'text-gray-400 text-sm' : 'text-gray-500 text-sm'}>لا توجد مناقشات بعد لهذا الدرس.</p>
                      ) : (
                        discussionThreads.map((thread) => (
                          <div key={thread.id} className={`rounded-2xl border p-4 ${isDarkMode ? 'border-gray-700 bg-gray-900/40' : 'border-gray-200 bg-white'}`}>
                            <p className="font-bold text-sm">{thread.title || 'مناقشة'}</p>
                            <p className={`mt-2 text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{thread.body || ''}</p>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            ) : flattenedLessons.length === 0 ? (
              <div className="h-[60vh] flex flex-col items-center justify-center text-center">
                <BookOpen className="w-14 h-14 text-indigo-200 mb-4" />
                <h2 className="text-2xl font-black text-gray-900">لا توجد دروس منشورة في هذه الدورة بعد</h2>
                <p className="mt-3 max-w-md text-sm leading-7 text-gray-500">
                  الدورة موجودة، لكن محتواها لم يجهز للعرض للطالب بعد. يمكنك الرجوع لصفحة الدورة أو مراجعة الإدارة لإضافة الدروس.
                </p>
                <button
                  onClick={handleBack}
                  className="mt-6 rounded-2xl bg-indigo-600 px-6 py-3 text-sm font-black text-white hover:bg-indigo-700"
                >
                  الرجوع للدورة
                </button>
              </div>
            ) : (
              <div className="h-[60vh] flex flex-col items-center justify-center text-center">
                <Loader2 className="w-12 h-12 animate-spin text-indigo-600 mb-4" />
                <p className="text-gray-500 font-bold">جاري تحميل محتوى الدرس...</p>
              </div>
            )}
          </div>
        </main>

        <aside className={`fixed lg:absolute top-16 lg:top-0 right-0 bottom-0 w-80 ${isDarkMode ? 'bg-[#1e293b] border-r border-gray-800' : 'bg-white border-r border-gray-200'} z-40 transition-transform duration-300 shadow-xl lg:shadow-none ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full'}`}>
          <div className="h-full flex flex-col">
            <div className="p-4 sm:p-6 border-b border-gray-100 dark:border-gray-800">
              <h3 className="font-black text-lg mb-4">محتوى الدورة</h3>
              <div className="space-y-2">
                <div className="flex justify-between gap-4 text-xs font-bold text-gray-500">
                  <span>إتمام الدورة</span>
                  <span>{progress}%</span>
                </div>
                <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-600 transition-all duration-1000" style={{ width: `${progress}%` }} />
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {course.modules?.map((module) => (
                <div key={module.id} className="border-b border-gray-50 dark:border-gray-800/50">
                  <button
                    onClick={() => toggleModule(module.id)}
                    className={`w-full flex items-center justify-between gap-3 p-4 text-right transition-colors ${expandedModules.includes(module.id) ? (isDarkMode ? 'bg-indigo-500/5' : 'bg-indigo-50/50') : ''}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${expandedModules.includes(module.id) ? 'bg-indigo-600 text-white' : (isDarkMode ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-500')}`}>
                        <BookOpen size={16} />
                      </div>
                      <span className="font-bold text-sm leading-snug">{module.title}</span>
                    </div>
                    {expandedModules.includes(module.id) ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>

                  <AnimatePresence>
                    {expandedModules.includes(module.id) && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className={`overflow-hidden py-1 ${isDarkMode ? 'bg-[#0f172a]/50' : 'bg-gray-50/30'}`}
                      >
                        {module.lessons.map((lesson) => {
                          const isCompleted = completedLessons.includes(lesson.id);
                          return (
                            <button
                              key={lesson.id}
                              onClick={() => handleLessonClick(lesson)}
                              className={`w-full p-4 flex items-center justify-between gap-3 group transition-all border-r-4 ${activeLesson?.id === lesson.id ? 'border-indigo-600 bg-indigo-600/5' : 'border-transparent hover:bg-gray-100 dark:hover:bg-gray-800/50'}`}
                            >
                              <div className="flex items-center gap-3">
                                <div className={`transition-colors ${isCompleted ? 'text-emerald-500' : (activeLesson?.id === lesson.id ? 'text-indigo-600' : 'text-gray-400')}`}>
                                  {isCompleted ? <CheckCircle size={18} /> : lesson.type === 'video' ? <PlayCircle size={18} /> : <HelpCircle size={18} />}
                                </div>
                                <div className="text-right">
                                  <p className={`text-xs font-bold leading-snug inline-flex items-center gap-1 ${activeLesson?.id === lesson.id ? 'text-indigo-600' : (isDarkMode ? 'text-gray-300' : 'text-gray-700')}`}>
                                    {renderLessonEdgeIcon('start')}
                                    <span>{lesson.title}</span>
                                    {renderLessonEdgeIcon('end')}
                                  </p>
                                  <p className="text-[10px] text-gray-400 mt-0.5">{lesson.duration}</p>
                                </div>
                              </div>
                              {lesson.isLocked && <Lock size={14} className="text-gray-300" />}
                            </button>
                          );
                        })}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>

            <div className={`p-4 border-t ${isDarkMode ? 'border-gray-800 bg-[#1e293b]' : 'border-gray-200 bg-white'}`}>
              <div className="mb-3 flex items-center gap-2">
                <button
                  onClick={handleToggleFavorite}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold ${isFavorite ? 'bg-rose-100 text-rose-600' : isDarkMode ? 'bg-gray-800 text-gray-300' : 'bg-gray-100 text-gray-600'}`}
                >
                  <Heart size={15} fill={isFavorite ? 'currentColor' : 'none'} /> {isFavorite ? 'في المفضلة' : 'إضافة للمفضلة'}
                </button>
                <button
                  onClick={handleShareCourse}
                  disabled={isSharing}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold ${isDarkMode ? 'bg-gray-800 text-gray-300' : 'bg-gray-100 text-gray-600'} disabled:opacity-60`}
                >
                  <Share2 size={15} /> مشاركة
                </button>
              </div>
              <button
                onClick={() => navigate('/book-session')}
                className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold text-sm hover:bg-indigo-700 transition-all shadow-lg flex items-center justify-center gap-2"
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
