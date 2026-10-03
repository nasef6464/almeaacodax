import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { AlertCircle, CheckCircle2, Lightbulb, Loader2, Presentation, Sparkles } from 'lucide-react';
import { api } from '../services/api';
import { useClassroomRealtime } from '../hooks/useClassroomRealtime';
import { useAuth } from '../contexts/AuthContext';
import { SmartClassroomExamRunner, type ClassroomExamQuestion } from '../components/classroom/SmartClassroomExamRunner';

const WAITING_TIPS = [
  '💡 اقرأ رأس السؤال والمطلوب بعناية قبل البدء في الحسابات.',
  '⚡ في مسائل الجبر، التجريب الذكي للخيارات يختصر نصف الوقت.',
  '🎯 ركز على الدقة أولاً ثم السرعة؛ الإجابة الصحيحة هي الأهم دائماً.',
  '📐 في مسائل الهندسة، استعن بالرسم التخطيطي لتصور الشكل والأبعاد بدقة.',
];

type ChallengeState = {
  activeBatchId?: string;
  challengeQuestionIds?: string[];
  competitionEnabled?: boolean;
  challengeDurationSeconds?: number | null;
  timerStartedAt?: string | null;
  timerEndsAt?: string | null;
  expired?: boolean;
};

export const ClassroomStudentLive: React.FC = () => {
  const { sessionId = '' } = useParams();
  const { user, loading: authLoading } = useAuth();
  const [pin, setPin] = useState(() => sessionStorage.getItem('classroom_pin') || '');
  const [tipIndex, setTipIndex] = useState(0);
  const [questions, setQuestions] = useState<ClassroomExamQuestion[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [message, setMessage] = useState('');
  const [joined, setJoined] = useState(() => Boolean(sessionStorage.getItem('classroom_joined') === 'true' && sessionStorage.getItem('classroom_session_id') === sessionId));
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [joiningInstant, setJoiningInstant] = useState(false);
  const [sessionEnded, setSessionEnded] = useState(false);
  const [challengeState, setChallengeState] = useState<ChallengeState | null>(null);
  const publishedSignatureRef = useRef('');

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const cycleTips = () => {
      timer = setTimeout(() => {
        setTipIndex((prev) => (prev + 1) % WAITING_TIPS.length);
        cycleTips();
      }, 4500);
    };
    cycleTips();
    return () => clearTimeout(timer);
  }, []);

  const clearLocalClassroomState = useCallback(() => {
    sessionStorage.removeItem('classroom_joined');
    sessionStorage.removeItem('classroom_session_id');
    sessionStorage.removeItem('classroom_pin');
    setJoined(false);
    setQuestions([]);
    setAnswers({});
    setSubmitted(false);
    setActiveIndex(0);
    setChallengeState(null);
    publishedSignatureRef.current = '';
  }, []);

  const handleSessionEnded = useCallback(() => {
    clearLocalClassroomState();
    setSessionEnded(true);
    setMessage('انتهت الحصة وتم حفظ مشاركتك.');
  }, [clearLocalClassroomState]);

  const loadCurrent = useCallback(async () => {
    if (sessionEnded || !sessionId) return;
    try {
      const [current, challenge] = await Promise.all([
        api.getClassroomCurrentQuestion(sessionId),
        api.get<ChallengeState>(`/classroom/sessions/${encodeURIComponent(sessionId)}/challenge-state`).catch(() => null),
      ]);
      const nextQuestions: ClassroomExamQuestion[] = Array.isArray(current?.questions) && current.questions.length > 0
        ? current.questions
        : current?.question ? [current.question] : [];
      const signature = String(current?.submissionKey || nextQuestions.map((question) => question.questionId).join('|'));
      const serverSubmitted = Boolean(current?.submitted);
      if (signature !== publishedSignatureRef.current) {
        publishedSignatureRef.current = signature;
        setAnswers({});
        setMessage(serverSubmitted ? 'تم التسليم النهائي لهذه الدفعة.' : nextQuestions.length ? 'دفعة جديدة متاحة.' : 'بانتظار المعلم لنشر الأسئلة…');
      }
      setQuestions(nextQuestions);
      setSubmitted(serverSubmitted);
      setActiveIndex(typeof current?.currentIndex === 'number' ? current.currentIndex : 0);
      setChallengeState(challenge);
    } catch {
      setQuestions([]);
      setChallengeState(null);
    }
  }, [sessionId, sessionEnded]);

  useClassroomRealtime(joined && !sessionEnded ? sessionId : '', loadCurrent, handleSessionEnded);

  useEffect(() => {
    if (!joined || sessionEnded || !sessionId) return;
    void loadCurrent();
  }, [joined, sessionEnded, sessionId, loadCurrent]);

  useEffect(() => {
    if (joined || sessionEnded || !sessionId || !user || user.role !== 'student') return;
    let mounted = true;
    const attemptInstant = async () => {
      try {
        const res = await api.instantJoinClassroomSession(sessionId);
        if (mounted && res.joined) {
          setJoined(true);
          sessionStorage.setItem('classroom_session_id', sessionId);
          sessionStorage.setItem('classroom_joined', 'true');
          await loadCurrent();
        }
      } catch {
        // Keep the explicit PIN fallback available for an authorized student.
      }
    };
    void attemptInstant();
    return () => { mounted = false; };
  }, [sessionId, user, joined, loadCurrent, sessionEnded]);

  const instantJoin = async () => {
    setJoiningInstant(true);
    setMessage('جارٍ الانضمام للحصة…');
    try {
      const res = await api.instantJoinClassroomSession(sessionId);
      if (!res?.joined) throw new Error('تعذر الانضمام للحصة.');
      setSessionEnded(false);
      setJoined(true);
      setAnswers({});
      setSubmitted(false);
      publishedSignatureRef.current = '';
      sessionStorage.setItem('classroom_session_id', sessionId);
      sessionStorage.setItem('classroom_joined', 'true');
      await loadCurrent();
      setMessage('تم الانضمام بنجاح.');
    } catch (err: any) {
      sessionStorage.removeItem('classroom_joined');
      setMessage(err?.message || 'تعذر الانضمام الفوري. تأكد أنك مسجل بهذا الفصل.');
    } finally {
      setJoiningInstant(false);
    }
  };

  const joinByPin = async () => {
    try {
      const res = await api.joinClassroomSession(sessionId, pin);
      if (!res?.joined) throw new Error('تعذر الانضمام.');
      setSessionEnded(false);
      setJoined(true);
      setAnswers({});
      setSubmitted(false);
      publishedSignatureRef.current = '';
      sessionStorage.setItem('classroom_session_id', sessionId);
      sessionStorage.setItem('classroom_pin', pin);
      sessionStorage.setItem('classroom_joined', 'true');
      await loadCurrent();
      setMessage('تم الانضمام للحصة.');
    } catch {
      sessionStorage.removeItem('classroom_joined');
      setMessage('تعذر الانضمام. تأكد من الرمز وأنك ضمن الفصل.');
    }
  };

  const selectAnswer = (questionIndex: number, optionIndex: number) => {
    if (submitted || submitting || challengeState?.expired) return;
    setAnswers((current) => ({ ...current, [questionIndex]: optionIndex }));
  };

  const submitAnswers = async () => {
    if (submitted || submitting || !sessionId || challengeState?.expired) return;
    const finalAnswers = Object.entries(answers).flatMap(([indexText, selectedOptionIndex]) => {
      const question = questions[Number(indexText)];
      return question ? [{ questionId: question.questionId, selectedOptionIndex }] : [];
    });
    if (finalAnswers.length === 0) {
      setMessage('اختر إجابة واحدة على الأقل قبل التسليم النهائي.');
      return;
    }
    setSubmitting(true);
    setMessage('جارٍ تثبيت التسليم النهائي…');
    try {
      await api.post(`/classroom/sessions/${encodeURIComponent(sessionId)}/submit`, { answers: finalAnswers });
      setSubmitted(true);
      setMessage('تم التسليم النهائي لهذه الدفعة بنجاح.');
    } catch (err: any) {
      setMessage(err?.message || 'تعذر تثبيت التسليم النهائي. حاول مرة أخرى.');
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading) {
    return <main className="min-h-screen flex items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-indigo-600" /></main>;
  }
  if (!user) return <Navigate to="/?auth=login" replace />;
  if (user.role !== 'student') return <Navigate to={user.role === 'teacher' ? '/school-teacher-dashboard?tab=smart-classroom' : '/'} replace />;

  if (sessionEnded) {
    return (
      <main className="mx-auto flex min-h-screen max-w-lg items-center p-6 text-center" dir="rtl">
        <div className="w-full rounded-3xl border border-emerald-200 bg-white p-8 shadow-lg">
          <CheckCircle2 size={52} className="mx-auto text-emerald-600" />
          <h1 className="mt-4 text-2xl font-black text-slate-900">انتهت الحصة الذكية</h1>
          <p className="mt-2 text-sm font-bold text-slate-600">تم حفظ مشاركتك وإجاباتك في تقرير الحصة.</p>
          <a href="/dashboard" className="mt-6 inline-flex rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-black text-white">العودة لمساحة الطالب</a>
        </div>
      </main>
    );
  }

  if (!joined) {
    return (
      <main className="mx-auto mt-10 max-w-md p-6 text-center" dir="rtl">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-indigo-50 text-indigo-600 shadow-inner"><Presentation size={36} /></div>
        <h1 className="mt-4 text-2xl sm:text-3xl font-black text-slate-900">انضم للفصل الذكي</h1>
        <p className="mt-2 text-sm text-slate-500">مرحباً بك في الحصة التفاعلية المباشرة</p>
        <div className="mt-6 rounded-3xl border border-indigo-100 bg-indigo-50/60 p-5">
          <p className="text-xs font-bold text-indigo-700">طالب في هذا الفصل؟</p>
          <button type="button" onClick={() => void instantJoin()} disabled={joiningInstant} className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 p-4 font-black text-white shadow-lg hover:bg-indigo-700 disabled:opacity-50">
            {joiningInstant ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />} انضمام فوري بدون رمز
          </button>
        </div>
        <div className="mt-6 relative"><div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200" /></div><div className="relative flex justify-center text-xs"><span className="bg-white px-3 text-slate-400">أو عبر رمز الحصة</span></div></div>
        <input inputMode="numeric" value={pin} onChange={(event) => setPin(event.target.value.replace(/\D/g, '').slice(0, 6))} className="mt-4 w-full rounded-2xl border border-slate-200 p-4 text-center text-3xl font-black tracking-[0.4em] text-indigo-700" placeholder="000000" />
        <button type="button" onClick={() => void joinByPin()} disabled={pin.length !== 6} className="mt-3 w-full rounded-xl bg-slate-800 p-3.5 font-black text-white disabled:opacity-40">انضمام بالرمز</button>
        {message && (
          <div
            role="status"
            aria-live="polite"
            className={`mt-3 flex items-center justify-center gap-2 rounded-xl p-3 text-xs sm:text-sm font-bold transition-all ${
              message.includes('تعذر') || message.includes('فشل') || message.includes('خطأ')
                ? 'border border-rose-200 bg-rose-50 text-rose-800'
                : 'border border-indigo-200 bg-indigo-50 text-indigo-800'
            }`}
          >
            {message.includes('تعذر') || message.includes('فشل') || message.includes('خطأ') ? (
              <AlertCircle size={16} className="shrink-0 text-rose-600" />
            ) : (
              <CheckCircle2 size={16} className="shrink-0 text-emerald-600" />
            )}
            <span>{message}</span>
          </div>
        )}
      </main>
    );
  }

  if (questions.length === 0) {
    return (
      <main className="mx-auto mt-10 max-w-xl p-4 sm:p-6 text-center" dir="rtl">
        <div className="relative overflow-hidden rounded-3xl border border-indigo-100 bg-white p-6 sm:p-8 shadow-xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3.5 py-1.5 text-xs font-black text-emerald-700 border border-emerald-200">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span>متصل مباشرة بالفصل الذكي</span>
          </div>

          <div className="mt-6 flex justify-center">
            <div className="relative flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white shadow-lg shadow-indigo-200">
              <Sparkles size={36} className="animate-pulse" />
              <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-white border-2 border-white text-[10px] font-black">
                ✓
              </div>
            </div>
          </div>

          <h1 className="mt-5 text-2xl sm:text-3xl font-black text-slate-900">
            أنت الآن داخل الحصة الذكية!
          </h1>
          <p className="mt-2 text-sm font-bold text-slate-600">
            بانتظار المعلم لنشر الدفعة التالية من الأسئلة التفاعلية…
          </p>

          <div className="mt-6 grid grid-cols-2 gap-3 text-right">
            <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-3.5">
              <span className="text-[11px] font-bold text-slate-400 block">اسم الطالب</span>
              <span className="text-sm font-black text-slate-800 truncate block mt-0.5">
                {user.displayName || (user as any)?.name || 'طالب متميز'}
              </span>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-3.5">
              <span className="text-[11px] font-bold text-slate-400 block">حالة الاتصال</span>
              <span className="text-sm font-black text-emerald-600 flex items-center gap-1 mt-0.5">
                جاهز ومستعد ⚡
              </span>
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-amber-100 bg-amber-50/60 p-4 text-right transition-all">
            <div className="flex items-center gap-2 text-amber-800 text-xs font-black">
              <Lightbulb size={16} className="text-amber-600 shrink-0" />
              <span>إضاءة سريعة أثناء الانتظار:</span>
            </div>
            <p className="mt-1.5 text-xs sm:text-sm font-bold text-amber-900 leading-relaxed min-h-[2.5rem] flex items-center">
              {WAITING_TIPS[tipIndex]}
            </p>
          </div>

          {message && (
            <p className="mt-4 text-xs font-bold text-indigo-600 bg-indigo-50/60 rounded-xl py-2 px-3">
              {message}
            </p>
          )}
        </div>
      </main>
    );
  }

  const activeQuestion = questions[activeIndex] || questions[0];
  const challengeQuestionIds = challengeState?.challengeQuestionIds || [];
  const isChallenge = Boolean(challengeQuestionIds.includes(activeQuestion?.questionId));

  return (
    <SmartClassroomExamRunner
      questions={questions}
      initialIndex={activeIndex}
      durationMinutes={10}
      deadlineAt={isChallenge && challengeState?.competitionEnabled ? challengeState.timerEndsAt || null : null}
      isChallenge={isChallenge}
      answers={answers}
      onSelectAnswer={selectAnswer}
      onSubmit={() => void submitAnswers()}
      submitted={submitted}
      submitting={submitting}
      message={challengeState?.expired && isChallenge ? 'انتهى وقت التحدي على الخادم.' : message}
    />
  );
};
