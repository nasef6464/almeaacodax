import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Eye,
  EyeOff,
  Flame,
  Maximize,
  Minimize,
  Presentation,
  Send,
  Sparkles,
  Users,
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useClassroomRealtime } from '../hooks/useClassroomRealtime';
import { QuestionContentRenderer } from '../components/classroom/QuestionContentRenderer';

const OPTION_LETTERS = ['أ', 'ب', 'ج', 'د', 'هـ'];

type ChallengeState = {
  competitionEnabled?: boolean;
  challengeQuestionIds?: string[];
  timerEndsAt?: string | null;
  expired?: boolean;
  ended?: boolean;
};

type RevealMode = 'submissions' | 'responses' | 'solution';

type SubmittedStudent = {
  studentId: string;
  name: string;
  submittedAt?: string | null;
  onTime?: boolean | null;
};

const secondsUntil = (deadline?: string | null) => {
  if (!deadline) return null;
  const endMs = new Date(deadline).getTime();
  if (!Number.isFinite(endMs)) return null;
  return Math.max(0, Math.ceil((endMs - Date.now()) / 1000));
};

export const ClassroomProjectorView: React.FC = () => {
  const { sessionId = '' } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [data, setData] = useState<any>(null);
  const [challengeState, setChallengeState] = useState<ChallengeState | null>(null);
  const [challengeSeconds, setChallengeSeconds] = useState<number | null>(null);
  const [selectedQuestionIdx, setSelectedQuestionIdx] = useState(0);
  const [revealMode, setRevealMode] = useState<RevealMode>('submissions');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    const isPresenter = user?.role && ['teacher', 'school_admin', 'supervisor', 'admin'].includes(user.role);
    if (user && !isPresenter) navigate(`/classroom/${sessionId}`, { replace: true });
  }, [user, sessionId, navigate]);

  const load = useCallback(async () => {
    try {
      const aggregate = await api.getClassroomAggregate(sessionId);
      setData(aggregate);
      if (Array.isArray(aggregate?.questions) && typeof aggregate?.activeQuestionIndex === 'number') {
        const position = aggregate.questions.findIndex((question: any) => question.index === aggregate.activeQuestionIndex);
        if (position >= 0) setSelectedQuestionIdx(position);
      }
      const challenge = await api.get<ChallengeState>(`/classroom/sessions/${encodeURIComponent(sessionId)}/challenge-state`).catch(() => null);
      setChallengeState(challenge);
    } catch {
      setData(null);
      setChallengeState(null);
    }
  }, [sessionId]);

  useEffect(() => { void load(); }, [load]);
  useClassroomRealtime(sessionId, load);

  useEffect(() => {
    const syncTimer = () => setChallengeSeconds(secondsUntil(challengeState?.timerEndsAt));
    syncTimer();
    const interval = setInterval(syncTimer, 1000);
    return () => clearInterval(interval);
  }, [challengeState?.timerEndsAt]);

  const questions = data?.questions || [];
  const activeQuestionIndex = data?.activeQuestionIndex ?? 0;
  const currentQ = questions[selectedQuestionIdx]
    || questions.find((question: any) => question.index === activeQuestionIndex)
    || questions[0];
  const isCurrentActive = currentQ && currentQ.index === activeQuestionIndex;
  const totalResponses = currentQ?.responseCount ?? (isCurrentActive ? (data?.responseCount || 0) : 0);
  const distribution: Record<string, number> = currentQ?.distribution || (isCurrentActive ? (data?.distribution || {}) : {});
  const challengeQuestionIds = challengeState?.challengeQuestionIds || [];
  const isChallengeQuestion = Boolean(currentQ && challengeQuestionIds.includes(String(currentQ.questionId)));
  const challengeEnded = Boolean(challengeState?.ended || challengeState?.expired || challengeSeconds === 0);
  const submittedStudents: SubmittedStudent[] = data?.submissionSummary?.submitted || [];
  const joinedCount = Number(data?.submissionSummary?.joinedCount || 0);
  const submittedCount = Number(data?.submissionSummary?.submittedCount || 0);

  const percentages = useMemo(() => {
    const result: Record<number, number> = {};
    if (!currentQ?.options) return result;
    currentQ.options.forEach((_: string, index: number) => {
      const count = Number(distribution[String(index)] || 0);
      result[index] = totalResponses > 0 ? Math.round((count / totalResponses) * 100) : 0;
    });
    return result;
  }, [currentQ, distribution, totalResponses]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  const handlePublishCurrent = async () => {
    if (!currentQ || publishing) return;
    setPublishing(true);
    try {
      await api.publishClassroomQuestion(sessionId, currentQ.index);
      setRevealMode('submissions');
      await load();
    } finally {
      setPublishing(false);
    }
  };

  const selectQuestion = (index: number) => {
    setSelectedQuestionIdx(index);
    setRevealMode('submissions');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none" dir="rtl">
      <header className="border-b border-slate-800 bg-slate-900/80 px-6 py-4 backdrop-blur-md sticky top-0 z-30">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link to={`/classroom/${sessionId}/teacher`} className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2 text-xs font-black text-slate-300 hover:bg-slate-700 hover:text-white transition-all active:scale-95">
              <ArrowLeft size={16} /> العودة للوحة المعلم
            </Link>
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600/30 text-indigo-400"><Presentation size={20} /></span>
              <div>
                <h1 className="text-base font-black text-white">السبورة الذكية التفاعلية</h1>
                <p className="text-[11px] text-slate-400">الوضع الافتراضي يعرض من سلّم فقط، ولا يكشف الإجابات إلا بأمر المعلم.</p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto py-1">
            {questions.map((question: any, index: number) => {
              const isSelected = index === selectedQuestionIdx;
              const isLive = question.index === activeQuestionIndex;
              return (
                <button key={question.questionId || index} type="button" onClick={() => selectQuestion(index)} className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-black transition-all ${isSelected ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}>
                  <span>س {index + 1}</span>{isLive && <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-3">
            {challengeState?.competitionEnabled && challengeSeconds !== null && (
              <div className={`flex items-center gap-2 rounded-xl border px-3.5 py-1.5 text-xs font-black ${challengeEnded ? 'border-slate-600 bg-slate-800 text-slate-300' : 'border-amber-500/40 bg-amber-950/40 text-amber-300'}`}>
                <Clock size={16} /><span className="font-mono text-base">{challengeSeconds}s</span><span>{challengeEnded ? 'انتهى التحدي' : 'تحدي مباشر'}</span>
              </div>
            )}
            <div className="flex items-center gap-2 rounded-xl bg-slate-800/80 px-3.5 py-1.5 text-xs font-bold text-slate-300 border border-slate-700">
              <Users size={16} className="text-indigo-400" /><span>سلّم:</span><span className="font-mono text-base font-black text-emerald-400">{submittedCount}</span><span className="text-slate-500">/ {joinedCount}</span>
            </div>
            <button type="button" onClick={toggleFullscreen} className="rounded-xl border border-slate-700 bg-slate-800 p-2 text-slate-300 hover:bg-slate-700 hover:text-white" title="ملء الشاشة">{isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}</button>
          </div>
        </div>
      </header>

      <main className="flex-1 p-6 sm:p-10 max-w-7xl mx-auto w-full flex flex-col justify-between">
        {!currentQ ? (
          <div className="my-auto text-center p-12">
            <Presentation size={64} className="mx-auto text-slate-700 mb-4 animate-pulse" />
            <h2 className="text-3xl font-black text-white">بانتظار إطلاق الأسئلة</h2>
            <p className="mt-2 text-slate-400">لم يتم اختيار أو إرسال أسئلة في هذه الحصة بعد</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="rounded-xl bg-indigo-500/20 px-3 py-1.5 text-xs font-black text-indigo-400 border border-indigo-500/30">السؤال {currentQ.index + 1} من {questions.length}</span>
                {isCurrentActive ? (
                  <span className="flex items-center gap-1.5 rounded-xl bg-emerald-500/20 px-3 py-1.5 text-xs font-black text-emerald-300 border border-emerald-500/30 animate-pulse"><span className="h-2 w-2 rounded-full bg-emerald-400" /> معروض حالياً على أجهزة الطلاب</span>
                ) : (
                  <button type="button" onClick={() => void handlePublishCurrent()} disabled={publishing} className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-1.5 text-xs font-black text-white hover:bg-indigo-500 shadow-md transition-all active:scale-95 disabled:opacity-50"><Send size={13} /> إرسال هذا السؤال الآن</button>
                )}
                {isChallengeQuestion && <span className="flex items-center gap-1 rounded-xl bg-amber-500/20 px-3 py-1.5 text-xs font-black text-amber-300 border border-amber-500/30"><Flame size={14} /> تحدي</span>}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button type="button" onClick={() => setRevealMode('submissions')} className={`rounded-xl px-3.5 py-2 text-xs font-black transition-all ${revealMode === 'submissions' ? 'bg-emerald-600 text-white' : 'border border-slate-700 bg-slate-900 text-slate-300'}`}><EyeOff size={14} className="inline ml-1" />إخفاء النتائج</button>
                <button type="button" onClick={() => setRevealMode('responses')} className={`rounded-xl px-3.5 py-2 text-xs font-black transition-all ${revealMode === 'responses' ? 'bg-indigo-600 text-white' : 'border border-slate-700 bg-slate-900 text-slate-300'}`}><Eye size={14} className="inline ml-1" />عرض الاستجابات</button>
                <button type="button" onClick={() => setRevealMode('solution')} className={`rounded-xl px-3.5 py-2 text-xs font-black transition-all ${revealMode === 'solution' ? 'bg-amber-500 text-slate-950' : 'border border-amber-500/40 bg-slate-900 text-amber-300'}`}><Sparkles size={14} className="inline ml-1" />عرض الإجابة والحل</button>
              </div>
            </div>

            {revealMode === 'submissions' && (
              <section className="rounded-3xl border border-emerald-500/30 bg-emerald-950/15 p-5 sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div><h2 className="text-lg font-black text-emerald-300">الطلاب الذين سلّموا</h2><p className="mt-1 text-xs text-slate-400">لا تظهر هنا أي إجابة أو نتيجة. فقط حالة التسليم للدفعة الحالية.</p></div>
                  <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-black text-emerald-300">{submittedCount} من {joinedCount}</span>
                </div>
                {submittedStudents.length === 0 ? (
                  <p className="mt-5 rounded-2xl border border-slate-800 bg-slate-900/70 p-5 text-center text-sm font-bold text-slate-400">بانتظار أول تسليم.</p>
                ) : (
                  <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {submittedStudents.map((student) => (
                      <div key={student.studentId} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-900/80 px-4 py-3">
                        <div className="min-w-0"><p className="truncate font-black text-white">{student.name}</p><p className="text-[11px] text-slate-500">تم التسليم</p></div>
                        {student.onTime === true ? <span className="rounded-full bg-emerald-500/20 px-2.5 py-1 text-[11px] font-black text-emerald-300">في الوقت ✓</span> : student.onTime === false ? <span className="rounded-full bg-rose-500/20 px-2.5 py-1 text-[11px] font-black text-rose-300">بعد الوقت</span> : <CheckCircle2 size={18} className="text-emerald-400" />}
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}

            <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-8 sm:p-12 shadow-2xl backdrop-blur-md">
              <div className="text-2xl sm:text-4xl font-black leading-relaxed sm:leading-loose text-white tracking-wide"><QuestionContentRenderer content={currentQ.text} asHeading className="text-2xl sm:text-4xl font-black leading-relaxed sm:leading-loose text-white tracking-wide" /></div>
              {currentQ.imageUrl && <div className="mt-6 overflow-hidden rounded-2xl border border-slate-800 max-h-80 flex items-center justify-center bg-black/40"><img src={currentQ.imageUrl} alt="توضيح السؤال" className="max-h-80 object-contain" /></div>}
              <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-4">
                {(currentQ.options || []).map((option: string, index: number) => {
                  const showResponses = revealMode === 'responses' || revealMode === 'solution';
                  const isCorrect = revealMode === 'solution' && currentQ.correctOptionIndex === index;
                  const percent = percentages[index] || 0;
                  const count = Number(distribution[String(index)] || 0);
                  return (
                    <div key={index} className={`relative overflow-hidden rounded-2xl border p-5 transition-all ${isCorrect ? 'border-emerald-500 bg-emerald-950/40' : 'border-slate-800 bg-slate-850/70'}`}>
                      {showResponses && <div className={`absolute inset-y-0 right-0 opacity-15 ${isCorrect ? 'bg-emerald-500' : 'bg-indigo-500'}`} style={{ width: `${percent}%` }} />}
                      <div className="relative z-10 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3.5"><span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border text-base font-black ${isCorrect ? 'border-emerald-400 bg-emerald-500 text-slate-950' : 'border-slate-700 bg-slate-800 text-slate-200'}`}>{OPTION_LETTERS[index] || index + 1}</span><span className="text-lg sm:text-xl font-bold text-white leading-normal">{option}</span></div>
                        {showResponses && <div className="shrink-0 text-left"><span className="font-mono text-lg font-black text-slate-200">{percent}%</span><span className="mr-2 text-xs text-slate-500">({count})</span>{isCorrect && <span className="mr-2 rounded-lg bg-emerald-500/20 px-2 py-1 text-xs font-black text-emerald-300">الإجابة الصحيحة</span>}</div>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {revealMode === 'responses' && (
              <p className="rounded-2xl border border-indigo-500/30 bg-indigo-950/20 px-4 py-3 text-center text-sm font-bold text-indigo-200">تم عرض توزيع الاستجابات فقط، بدون كشف الإجابة الصحيحة.</p>
            )}

            {revealMode === 'solution' && (
              <section className="rounded-3xl border border-amber-500/40 bg-slate-900 p-6 sm:p-8 shadow-2xl">
                <div className="flex items-center gap-2 text-amber-400 font-black text-base"><Sparkles size={20} /><span>الإجابة والشرح النموذجي</span></div>
                <div className="mt-5 text-base sm:text-lg text-slate-200 leading-relaxed">{currentQ.explanation ? <div className="whitespace-pre-line font-medium">{currentQ.explanation}</div> : <p className="text-slate-400 italic">لا يوجد شرح مسجل لهذا السؤال.</p>}</div>
              </section>
            )}
          </div>
        )}

        <footer className="mt-8 pt-4 border-t border-slate-800/80 flex items-center justify-between">
          <button type="button" disabled={selectedQuestionIdx <= 0} onClick={() => selectQuestion(Math.max(0, selectedQuestionIdx - 1))} className="flex items-center gap-2 rounded-2xl border border-slate-800 bg-slate-900 px-5 py-3 text-sm font-black text-slate-300 hover:bg-slate-800 disabled:opacity-30 transition-all active:scale-95"><ChevronRight size={18} /> السؤال السابق</button>
          <span className="text-xs text-slate-500 font-bold">السبورة تبدأ دائمًا بوضع التسليم فقط، والمعلم يختار متى يكشف الاستجابات أو الحل.</span>
          <button type="button" disabled={selectedQuestionIdx >= questions.length - 1} onClick={() => selectQuestion(Math.min(questions.length - 1, selectedQuestionIdx + 1))} className="flex items-center gap-2 rounded-2xl border border-slate-800 bg-slate-900 px-5 py-3 text-sm font-black text-slate-300 hover:bg-slate-800 disabled:opacity-30 transition-all active:scale-95">السؤال التالي <ChevronLeft size={18} /></button>
        </footer>
      </main>
    </div>
  );
};
