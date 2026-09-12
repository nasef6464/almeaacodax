import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  Award,
  BookOpen,
  CheckCircle2,
  Clock,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  Flame,
  HelpCircle,
  Layers,
  PlusCircle,
  Presentation,
  Search,
  SkipForward,
  Sparkles,
  Users,
  X,
  Zap,
} from 'lucide-react';
import { ClassroomTeacherLiveRadar } from './ClassroomTeacherLiveRadar';
import { api } from '../../services/api';
import { useStore } from '../../store/useStore';

const OPTION_LETTERS = ['أ', 'ب', 'ج', 'د', 'هـ'];

interface ClassroomActiveSessionPanelProps {
  sessionId: string;
  data: any;
  storedPin: string;
  challengeIds: string[];
  onToggleChallenge: (questionId: string) => void;
  onPublish: (index: number) => void;
  onEnd: () => void;
  onReload?: () => void;
  message: string;
  isTeacher: boolean;
}

export const ClassroomActiveSessionPanel: React.FC<ClassroomActiveSessionPanelProps> = ({
  sessionId,
  data,
  storedPin,
  challengeIds,
  onToggleChallenge,
  onPublish,
  onEnd,
  onReload,
  message,
  isTeacher,
}) => {
  const { questions: storeQuestions, subjects, sections, skills } = useStore();
  const [copied, setCopied] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState<number | null>(null);
  const [timerActive, setTimerActive] = useState<boolean>(false);

  // In-session push modal states
  const [showPushModal, setShowPushModal] = useState(false);
  const [pushingQuestions, setPushingQuestions] = useState(false);
  const [pushFilterSubject, setPushFilterSubject] = useState('');
  const [pushFilterSection, setPushFilterSection] = useState('');
  const [pushFilterSkill, setPushFilterSkill] = useState('');
  const [pushSearch, setPushSearch] = useState('');
  const [selectedForPush, setSelectedForPush] = useState<string[]>([]);

  // Inline Smart Board explanation mode
  const [showInlineExplanation, setShowInlineExplanation] = useState(false);

  // Read metadata if saved during scheduling
  const [meta, setMeta] = useState<{ day?: string; period?: string; className?: string; subject?: string } | null>(null);
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(`classroom_meta_${sessionId}`);
      if (raw) setMeta(JSON.parse(raw));
    } catch {
      // ignore
    }
  }, [sessionId]);

  const copyPin = (pin: string) => {
    navigator.clipboard.writeText(pin);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const currentQIndex = data?.activeQuestionIndex;
  const currentQuestion = (data?.questions || []).find((q: any) => q.index === currentQIndex);
  const isCurrentChallenge = currentQuestion && challengeIds.includes(currentQuestion.questionId);

  // Analytics for the active question (distribution & common mistake)
  const distribution: Record<string, number> = data?.distribution || {};
  const totalResponses = data?.responseCount || 0;

  const currentQAnalytics = useMemo(() => {
    if (!currentQuestion || !currentQuestion.options) return { percentages: {}, maxWrongOption: null };

    const percentages: Record<number, number> = {};
    let maxWrongCount = 0;
    let maxWrongIndex: number | null = null;
    const correctIdx = typeof currentQuestion.correctOptionIndex === 'number' ? currentQuestion.correctOptionIndex : null;

    currentQuestion.options.forEach((_: any, idx: number) => {
      const count = distribution[String(idx)] || 0;
      percentages[idx] = totalResponses > 0 ? Math.round((count / totalResponses) * 100) : 0;

      if (correctIdx !== null && idx !== correctIdx && count > maxWrongCount) {
        maxWrongCount = count;
        maxWrongIndex = idx;
      }
    });

    const maxWrongPercent = maxWrongIndex !== null ? percentages[maxWrongIndex] : 0;
    return {
      percentages,
      maxWrongOption:
        maxWrongIndex !== null && maxWrongPercent >= 20
          ? {
              index: maxWrongIndex,
              letter: OPTION_LETTERS[maxWrongIndex] || `${maxWrongIndex + 1}`,
              percent: maxWrongPercent,
              count: maxWrongCount,
            }
          : null,
    };
  }, [currentQuestion, distribution, totalResponses]);

  // Available questions for in-session push filtered by platform taxonomy
  const availablePushQuestions = useMemo(() => {
    const existingIds = new Set((data?.questions || []).map((q: any) => q.questionId));
    return storeQuestions.filter((q: any) => {
      if (existingIds.has(q.id)) return false;
      if (pushFilterSubject && q.subjectId !== pushFilterSubject) return false;
      if (pushFilterSection && q.sectionId !== pushFilterSection) return false;
      if (pushFilterSkill && !(q.skillIds || []).includes(pushFilterSkill)) return false;
      if (pushSearch && !q.text?.toLowerCase().includes(pushSearch.toLowerCase())) return false;
      return true;
    });
  }, [storeQuestions, data?.questions, pushFilterSubject, pushFilterSection, pushFilterSkill, pushSearch]);

  const handlePushQuestionsSubmit = async () => {
    if (selectedForPush.length === 0 || pushingQuestions) return;
    setPushingQuestions(true);
    try {
      await api.appendClassroomQuestions(sessionId, selectedForPush, true);
      setShowPushModal(false);
      setSelectedForPush([]);
      onReload?.();
    } catch {
      // error handled
    } finally {
      setPushingQuestions(false);
    }
  };

  // Quick Select Batch (first 5 questions matching skill)
  const handleQuickSelectBatch = () => {
    const batch = availablePushQuestions.slice(0, 5).map((q) => q.id);
    setSelectedForPush(batch);
  };

  // Countdown timer effect
  useEffect(() => {
    let interval: any = null;
    if (timerActive && timerSeconds !== null && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => (prev !== null && prev > 1 ? prev - 1 : 0));
      }, 1000);
    } else if (timerSeconds === 0) {
      setTimerActive(false);
    }
    return () => clearInterval(interval);
  }, [timerActive, timerSeconds]);

  const handleInstantChallenge = (question: any, durationSec = 45) => {
    if (!challengeIds.includes(question.questionId)) {
      onToggleChallenge(question.questionId);
    }
    onPublish(question.index);
    setTimerSeconds(durationSec);
    setTimerActive(true);
  };

  return (
    <main className="mx-auto max-w-5xl p-4 sm:p-6" dir="rtl">
      {/* Header Banner */}
      <div className="flex flex-col gap-4 rounded-3xl bg-slate-900 p-6 text-white sm:flex-row sm:items-center sm:justify-between shadow-xl">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md bg-emerald-500/20 px-2.5 py-1 text-xs font-black text-emerald-400">
              {data?.status === 'ended' ? 'حصة منتهية ومؤرشفة' : 'حصة ذكية تفاعلية مباشرة 🟢'}
            </span>
            {meta?.day && (
              <span className="rounded-md bg-white/10 px-2.5 py-1 text-xs font-bold text-slate-300">
                {meta.day}
              </span>
            )}
            {meta?.period && (
              <span className="rounded-md bg-amber-400/20 px-2.5 py-1 text-xs font-bold text-amber-300">
                الحصة {meta.period}
              </span>
            )}
            {meta?.className && (
              <span className="rounded-md bg-indigo-500/20 px-2.5 py-1 text-xs font-bold text-indigo-300">
                {meta.className}
              </span>
            )}
          </div>
          <h1 className="mt-2 text-3xl font-black">لوحة تحكم المعلم للحصة الذكية</h1>
          <p className="mt-1 text-xs text-slate-400">
            رابط انضمام الطلاب: /classroom/{sessionId} · كود الدخول التفاعلي
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {storedPin && (
            <div className="flex items-center gap-2 rounded-2xl bg-white/10 px-4 py-2 text-white">
              <span className="text-xs text-slate-300">رمز الانضمام:</span>
              <span className="font-mono text-xl font-black tracking-wider text-amber-400">{storedPin}</span>
              <button
                type="button"
                onClick={() => copyPin(storedPin)}
                className="rounded-lg p-1 hover:bg-white/20 text-xs transition-colors"
              >
                {copied ? 'تم النسخ!' : <Copy size={16} />}
              </button>
            </div>
          )}
          <Link
            to={`/classroom/${sessionId}/projector`}
            target="_blank"
            className="flex items-center gap-1.5 rounded-2xl bg-indigo-600 px-4 py-2.5 text-xs font-black text-white hover:bg-indigo-700 shadow-md transition-all active:scale-95"
          >
            <Presentation size={16} /> شاشة السبورة التفاعلية <ExternalLink size={14} />
          </Link>
        </div>
      </div>

      {/* Speed Challenge Banner during active countdown */}
      {timerActive && timerSeconds !== null && (
        <div className="mt-4 flex items-center justify-between rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 p-4 text-white shadow-lg animate-pulse">
          <div className="flex items-center gap-3">
            <Flame size={28} className="text-amber-200" />
            <div>
              <p className="text-sm font-black">تحدي السرعة اللحظي جارٍ الآن! ⚡</p>
              <p className="text-xs text-amber-100">
                نقاط مضاعفة للطلاب المسرعين في الإجابة الصحيحة.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Clock size={18} />
            <span className="font-mono text-2xl font-black">{timerSeconds}s</span>
          </div>
        </div>
      )}

      {/* Live Radar Analysis Component */}
      <div className="mt-6">
        <ClassroomTeacherLiveRadar
          responseCount={data?.responseCount ?? 0}
          distribution={data?.distribution || {}}
          activeQuestion={
            currentQuestion
              ? {
                  ...currentQuestion,
                  isChallenge: isCurrentChallenge,
                }
              : null
          }
          onToggleChallenge={currentQuestion ? () => onToggleChallenge(currentQuestion.questionId) : undefined}
        />
      </div>

      {/* Smart Board Question Review & Common Mistake Diagnostics */}
      {currentQuestion && (
        <div className="mt-6 rounded-3xl border border-indigo-100 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600/10 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400">
                <Presentation size={18} />
              </span>
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  وضع استعراض وشرح السؤال للسبورة الذكية (السؤال {currentQuestion.index + 1})
                </h3>
                <p className="text-xs text-slate-500">
                  تحليل استجابات الطلاب، كشف الخيارات المضللة، وعرض الشرح النموذجي للمناقشة
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowInlineExplanation(!showInlineExplanation)}
                className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-black transition-all shadow-xs active:scale-95 ${
                  showInlineExplanation
                    ? 'bg-amber-500 text-slate-950 font-black'
                    : 'border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200'
                }`}
              >
                {showInlineExplanation ? <EyeOff size={14} /> : <Eye size={14} />}
                {showInlineExplanation ? 'إخفاء الشرح والحل' : 'عرض الحل النموذجي والمهارة 💡'}
              </button>

              <Link
                to={`/classroom/${sessionId}/projector`}
                target="_blank"
                className="flex items-center gap-1 rounded-xl bg-indigo-50 px-3 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-300 transition-colors"
              >
                <ExternalLink size={13} /> فتح البروجكتور
              </Link>
            </div>
          </div>

          <div className="mt-4">
            <p className="text-base sm:text-lg font-black leading-relaxed text-slate-900 dark:text-white">
              {currentQuestion.text}
            </p>

            {/* Options with Live Response % */}
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {(currentQuestion.options || []).map((opt: string, idx: number) => {
                const percent = currentQAnalytics.percentages[idx] || 0;
                const count = distribution[String(idx)] || 0;
                const isCorrect = showInlineExplanation && currentQuestion.correctOptionIndex === idx;
                const isCommonWrong = showInlineExplanation && currentQAnalytics.maxWrongOption?.index === idx;

                return (
                  <div
                    key={idx}
                    className={`relative overflow-hidden rounded-xl border p-3 transition-all ${
                      isCorrect
                        ? 'border-emerald-500 bg-emerald-50/70 text-emerald-950 dark:bg-emerald-950/30 dark:text-emerald-200'
                        : isCommonWrong
                        ? 'border-rose-400 bg-rose-50/70 text-rose-950 dark:bg-rose-950/30 dark:text-rose-200'
                        : 'border-slate-200 bg-slate-50/60 dark:border-slate-800 dark:bg-slate-850'
                    }`}
                  >
                    <div
                      className={`absolute inset-y-0 right-0 opacity-15 transition-all duration-500 ${
                        isCorrect ? 'bg-emerald-500' : isCommonWrong ? 'bg-rose-500' : 'bg-indigo-500'
                      }`}
                      style={{ width: `${percent}%` }}
                    />
                    <div className="relative z-10 flex items-center justify-between text-xs sm:text-sm font-bold">
                      <div className="flex items-center gap-2">
                        <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-xs font-black ${
                          isCorrect ? 'bg-emerald-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200'
                        }`}>
                          {OPTION_LETTERS[idx] || idx + 1}
                        </span>
                        <span>{opt}</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {isCorrect && <CheckCircle2 size={13} className="text-emerald-600" />}
                        <span className="font-mono font-black">{percent}%</span>
                        <span className="text-[11px] text-slate-400">({count})</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Common Mistake Alert */}
            {currentQAnalytics.maxWrongOption && (
              <div className="mt-3 flex items-start gap-2.5 rounded-2xl border border-rose-200 bg-rose-50/70 p-3.5 text-xs text-rose-800 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-300">
                <AlertTriangle size={17} className="text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-black">تنبيه المعلم لخطأ شائع:</strong> نسبة{' '}
                  <strong className="font-black">{currentQAnalytics.maxWrongOption.percent}%</strong> من الطلاب اختاروا البديل ({currentQAnalytics.maxWrongOption.letter})، وهو أكثر خيار خاطئ تم تسليمه. يرجى توضيح هذا المفهوم على السبورة.
                </div>
              </div>
            )}

            {/* Model Solution & Skill Reveal */}
            {showInlineExplanation && (
              <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50/60 p-4 text-xs dark:border-amber-900/40 dark:bg-amber-950/20">
                <div className="flex items-center justify-between border-b border-amber-200/60 pb-2 dark:border-amber-800/40">
                  <span className="flex items-center gap-1.5 font-black text-amber-900 dark:text-amber-300">
                    <Sparkles size={14} /> الشرح والحل النموذجي للمناقشة
                  </span>
                  {currentQuestion.skillIds && currentQuestion.skillIds.length > 0 && (
                    <span className="rounded-md bg-amber-200/50 px-2 py-0.5 font-bold text-amber-900 dark:bg-amber-900/40 dark:text-amber-200">
                      مهارة: {currentQuestion.skillIds.join(' • ')}
                    </span>
                  )}
                </div>
                <div className="mt-2.5 text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
                  {currentQuestion.explanation || 'لا يوجد شرح مسبق مسجل لهذا السؤال في بنك الأسئلة.'}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Questions List & In-session Instant Challenge Controls */}
      <section className="mt-6 rounded-2xl border border-slate-100 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white">أسئلة الحصة التفاعلية</h2>
            <p className="text-xs text-slate-500">
              يمكنك نشر أي سؤال متتابع، أو بثه فوراً كـ "سؤال تحدي سريع ⚡" في أي لحظة أثناء الشرح
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setSelectedForPush([]);
                setShowPushModal(true);
              }}
              disabled={data?.status === 'ended'}
              className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-3.5 py-2 text-xs font-black text-white hover:from-emerald-700 hover:to-teal-700 shadow-xs transition-all active:scale-95 disabled:opacity-50"
            >
              <PlusCircle size={14} /> إرسال أسئلة / حزمة مهارة الآن 🚀
            </button>

            {currentQIndex !== undefined && currentQIndex < (data?.questions || []).length - 1 && (
              <button
                type="button"
                onClick={() => onPublish(currentQIndex + 1)}
                disabled={data?.status === 'ended'}
                className="flex items-center gap-1.5 rounded-xl bg-indigo-50 px-3.5 py-2 text-xs font-black text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-300 transition-colors"
              >
                <SkipForward size={14} /> الانتقال للسؤال التالي
              </button>
            )}
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {(data?.questions || []).map((question: any) => {
            const isActive = data?.activeQuestionIndex === question.index;
            const isChallenge = challengeIds.includes(question.questionId);
            return (
              <div
                key={question.questionId}
                className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl border p-4 transition-all ${
                  isActive
                    ? 'border-indigo-600 bg-indigo-50/70 shadow-xs dark:bg-indigo-950/30 dark:border-indigo-500'
                    : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-850'
                }`}
              >
                <div className="flex items-start sm:items-center gap-3">
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-black ${
                      isActive ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200'
                    }`}
                  >
                    {question.index + 1}
                  </span>
                  <div>
                    <span className="font-bold text-slate-900 dark:text-white text-sm">
                      سؤال {question.index + 1}: {question.text}
                    </span>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                      <span>{question.options?.length || 4} خيارات</span>
                      {isChallenge && (
                        <span className="inline-flex items-center gap-0.5 rounded-md bg-amber-100 px-1.5 py-0.5 font-black text-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
                          ⚡ تحدي سريع
                        </span>
                      )}
                      {isActive && (
                        <span className="font-black text-emerald-600 dark:text-emerald-400">
                          ● معروض على أجهزة الطلاب
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions for this question */}
                <div className="flex items-center gap-2 self-end sm:self-center">
                  <button
                    type="button"
                    onClick={() => onPublish(question.index)}
                    disabled={data?.status === 'ended'}
                    className={`rounded-xl px-3.5 py-2 text-xs font-bold transition-all disabled:opacity-50 ${
                      isActive
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200'
                    }`}
                  >
                    {isActive ? 'منشور حالياً ✓' : 'نشر اعتيادي'}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleInstantChallenge(question, 45)}
                    disabled={data?.status === 'ended'}
                    className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-3.5 py-2 text-xs font-black text-white hover:from-amber-600 hover:to-orange-600 shadow-xs transition-all active:scale-95 disabled:opacity-50"
                  >
                    <Zap size={14} /> بث كتحدٍ سريع ⚡
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Control Actions & End Session */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={onEnd}
          disabled={data?.status === 'ended'}
          className="rounded-2xl bg-rose-600 px-6 py-3 font-black text-white hover:bg-rose-700 disabled:opacity-50 shadow-md transition-all active:scale-95 text-sm"
        >
          {data?.status === 'ended' ? 'الجلسة منتهية ومحفوظة بالأرشيف' : 'إنهاء الجلسة وحفظ التقرير بالأرشيف'}
        </button>

        {isTeacher && (
          <Link
            to="/school-teacher-dashboard?tab=smart-classroom"
            className="text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
          >
            العودة للوحة معلم المدرسة →
          </Link>
        )}
      </div>

      {message && <p className="mt-4 text-sm font-bold text-slate-600">{message}</p>}

      {/* In-Session Push Questions Modal */}
      {showPushModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs" dir="rtl">
          <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-3xl bg-white shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 p-5 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
                  <PlusCircle size={20} />
                </span>
                <div>
                  <h3 className="font-black text-slate-900 dark:text-white text-base">
                    إرسال أسئلة أو حزمة مهارة جديدة للطلاب أثناء الحصة
                  </h3>
                  <p className="text-xs text-slate-500">
                    اختر سؤالاً فردياً أو حزمة 5-6 أسئلة على مهارة شرحتها تواً على السبورة
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPushModal(false)}
                className="rounded-xl p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Filters */}
            <div className="border-b border-slate-100 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-850/50 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <select
                  value={pushFilterSubject}
                  onChange={(e) => {
                    setPushFilterSubject(e.target.value);
                    setPushFilterSection('');
                    setPushFilterSkill('');
                  }}
                  className="rounded-xl border border-slate-200 bg-white p-2 text-xs font-bold text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                >
                  <option value="">كافة المواد</option>
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>

                <select
                  value={pushFilterSection}
                  onChange={(e) => {
                    setPushFilterSection(e.target.value);
                    setPushFilterSkill('');
                  }}
                  className="rounded-xl border border-slate-200 bg-white p-2 text-xs font-bold text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                >
                  <option value="">كافة المهارات الرئيسية</option>
                  {(pushFilterSubject ? sections.filter((sec) => sec.subjectId === pushFilterSubject) : sections).map((sec) => (
                    <option key={sec.id} value={sec.id}>{sec.name}</option>
                  ))}
                </select>

                <select
                  value={pushFilterSkill}
                  onChange={(e) => setPushFilterSkill(e.target.value)}
                  className="rounded-xl border border-slate-200 bg-white p-2 text-xs font-bold text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                >
                  <option value="">كافة المهارات الفرعية</option>
                  {(pushFilterSection ? skills.filter((sk) => sk.sectionId === pushFilterSection) : skills).map((sk) => (
                    <option key={sk.id} value={sk.id}>{sk.name}</option>
                  ))}
                </select>
              </div>

              {/* Quick Preset Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleQuickSelectBatch}
                    disabled={availablePushQuestions.length === 0}
                    className="flex items-center gap-1 rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-black text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-300 disabled:opacity-40"
                  >
                    <BookOpen size={13} /> تحديد حزمة تدريب (5 أسئلة)
                  </button>

                  {selectedForPush.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedForPush([])}
                      className="text-xs font-bold text-rose-600 hover:underline"
                    >
                      إلغاء التحديد ({selectedForPush.length})
                    </button>
                  )}
                </div>

                <div className="text-xs font-bold text-slate-500">
                  {availablePushQuestions.length} سؤال متوفر
                </div>
              </div>
            </div>

            {/* Questions Selection List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {availablePushQuestions.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400 font-bold">
                  لا توجد أسئلة مطابقة للفلتر أو تم إضافتها جميعاً لهذه الحصة.
                </div>
              ) : (
                availablePushQuestions.map((q) => {
                  const isChecked = selectedForPush.includes(q.id);
                  return (
                    <label
                      key={q.id}
                      className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-3 text-xs transition-all ${
                        isChecked
                          ? 'border-emerald-500 bg-emerald-50/50 dark:border-emerald-500 dark:bg-emerald-950/30'
                          : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-850'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() =>
                          setSelectedForPush((prev) =>
                            prev.includes(q.id) ? prev.filter((id) => id !== q.id) : [...prev, q.id]
                          )
                        }
                        className="mt-1 text-emerald-600 focus:ring-emerald-500"
                      />
                      <div className="flex-1">
                        <p className="font-bold text-slate-900 dark:text-white leading-relaxed">{q.text}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] text-slate-500">
                          <span>{q.options?.length || 4} خيارات</span>
                          <span>•</span>
                          <span>مستوى: {q.difficulty || 'متوسط'}</span>
                          {q.skillIds && q.skillIds.length > 0 && (
                            <>
                              <span>•</span>
                              <span className="text-indigo-600 dark:text-indigo-400 font-bold">
                                {q.skillIds.join(', ')}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </label>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between border-t border-slate-100 p-4 dark:border-slate-800 bg-slate-50 dark:bg-slate-850">
              <span className="text-xs font-black text-slate-700 dark:text-slate-300">
                المحدد للإرسال: <strong className="text-emerald-600 text-sm font-black">{selectedForPush.length}</strong> أسئلة
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowPushModal(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={() => void handlePushQuestionsSubmit()}
                  disabled={selectedForPush.length === 0 || pushingQuestions}
                  className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-2 text-xs font-black text-white hover:from-emerald-700 hover:to-teal-700 shadow-md disabled:opacity-50 transition-all active:scale-95"
                >
                  <PlusCircle size={14} />
                  {pushingQuestions ? 'جارٍ الإرسال…' : `إرسال فوراً لتابلت الطلاب (${selectedForPush.length}) 🚀`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
};
