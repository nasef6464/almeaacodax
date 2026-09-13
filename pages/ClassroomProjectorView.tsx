import React, { useCallback, useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Clock,
  Flame,
  Maximize,
  Minimize,
  Presentation,
  Send,
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
  const challengeQuestionIds = challengeState?.challengeQuestionIds || [];
  const isChallengeQuestion = Boolean(currentQ && challengeQuestionIds.includes(String(currentQ.questionId)));
  const challengeEnded = Boolean(challengeState?.ended || challengeState?.expired || challengeSeconds === 0);

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
      await load();
    } finally {
      setPublishing(false);
    }
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
                <p className="text-[11px] text-slate-400">عرض آمن للطلاب: السؤال فقط بدون الإجابة أو نسب الاختيارات أو النتائج</p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto py-1">
            {questions.map((question: any, index: number) => {
              const isSelected = index === selectedQuestionIdx;
              const isLive = question.index === activeQuestionIndex;
              return (
                <button key={question.questionId || index} type="button" onClick={() => setSelectedQuestionIdx(index)} className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-black transition-all ${isSelected ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}>
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
              <Users size={16} className="text-indigo-400" /><span>تم الاستلام:</span><span className="font-mono text-base font-black text-emerald-400">{totalResponses}</span>
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
              <span className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-[11px] font-bold text-slate-400">النتائج والإجابة الصحيحة متاحة في لوحة المعلم فقط</span>
            </div>

            <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-8 sm:p-12 shadow-2xl backdrop-blur-md">
              <div className="text-2xl sm:text-4xl font-black leading-relaxed sm:leading-loose text-white tracking-wide"><QuestionContentRenderer content={currentQ.text} asHeading className="text-2xl sm:text-4xl font-black leading-relaxed sm:leading-loose text-white tracking-wide" /></div>
              {currentQ.imageUrl && <div className="mt-6 overflow-hidden rounded-2xl border border-slate-800 max-h-80 flex items-center justify-center bg-black/40"><img src={currentQ.imageUrl} alt="توضيح السؤال" className="max-h-80 object-contain" /></div>}
              <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-4">
                {(currentQ.options || []).map((option: string, index: number) => (
                  <div key={index} className="rounded-2xl border border-slate-800 bg-slate-850/70 p-5">
                    <div className="flex items-center gap-3.5">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-700 bg-slate-800 text-base font-black text-slate-200">{OPTION_LETTERS[index] || index + 1}</span>
                      <span className="text-lg sm:text-xl font-bold text-white leading-normal">{option}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <footer className="mt-8 pt-4 border-t border-slate-800/80 flex items-center justify-between">
          <button type="button" disabled={selectedQuestionIdx <= 0} onClick={() => setSelectedQuestionIdx((position) => Math.max(0, position - 1))} className="flex items-center gap-2 rounded-2xl border border-slate-800 bg-slate-900 px-5 py-3 text-sm font-black text-slate-300 hover:bg-slate-800 disabled:opacity-30 transition-all active:scale-95"><ChevronRight size={18} /> السؤال السابق</button>
          <span className="text-xs text-slate-500 font-bold">السبورة لا تعرض صحة الاختيارات أو نسبها أو ترتيب الطلاب.</span>
          <button type="button" disabled={selectedQuestionIdx >= questions.length - 1} onClick={() => setSelectedQuestionIdx((position) => Math.min(questions.length - 1, position + 1))} className="flex items-center gap-2 rounded-2xl border border-slate-800 bg-slate-900 px-5 py-3 text-sm font-black text-slate-300 hover:bg-slate-800 disabled:opacity-30 transition-all active:scale-95">السؤال التالي <ChevronLeft size={18} /></button>
        </footer>
      </main>
    </div>
  );
};
