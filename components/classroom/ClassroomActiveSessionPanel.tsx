import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Clock, Copy, Crown, ExternalLink, Flame, PlusCircle, Presentation, SkipForward, Trophy, Zap } from 'lucide-react';
import { ClassroomTeacherLiveRadar } from './ClassroomTeacherLiveRadar';
import { ClassroomQuestionReviewPanel } from './ClassroomQuestionReviewPanel';
import { ClassroomPushQuestionsModal } from './ClassroomPushQuestionsModal';
import { QuestionContentRenderer } from './QuestionContentRenderer';
import { api } from '../../services/api';
import { useStore } from '../../store/useStore';
import { useClassroomRealtime } from '../../hooks/useClassroomRealtime';

const OPTION_LETTERS = ['أ', 'ب', 'ج', 'د', 'هـ'];

type ChallengeState = {
  challengeQuestionIds?: string[];
  competitionEnabled?: boolean;
  timerEndsAt?: string | null;
  expired?: boolean;
  ended?: boolean;
};

type CompetitionResult = {
  ended?: boolean;
  leaderboard?: Array<{ rank: number; studentId: string; name: string; answered: number; correct: number; accuracy: number; score: number }>;
  podium?: Array<{ rank: number; studentId: string; name: string; answered: number; correct: number; accuracy: number; score: number }>;
};

type PushMode = 'normal' | 'challenge';

type BatchMiniReport = {
  batchId: string;
  label: string;
  questionCount: number;
  answered: number;
  correct: number;
  wrong: number;
  accuracy: number | null;
  skills: Array<{ skillId: string; answered: number; correct: number; accuracy: number | null }>;
};

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

export const ClassroomActiveSessionPanel: React.FC<ClassroomActiveSessionPanelProps> = ({ sessionId, data, storedPin, challengeIds, onToggleChallenge, onPublish, onEnd, onReload, message, isTeacher }) => {
  const { subjects, sections, skills } = useStore();
  const [copied, setCopied] = useState(false);
  const [challengeState, setChallengeState] = useState<ChallengeState | null>(null);
  const [timerSeconds, setTimerSeconds] = useState<number | null>(null);
  const [competitionResult, setCompetitionResult] = useState<CompetitionResult | null>(null);
  const [endingChallenge, setEndingChallenge] = useState(false);
  const [endingBatch, setEndingBatch] = useState(false);
  const [batchMiniReport, setBatchMiniReport] = useState<BatchMiniReport | null>(null);
  const [showPushModal, setShowPushModal] = useState(false);
  const [pushMode, setPushMode] = useState<PushMode>('normal');
  const [pushChallengeSeconds, setPushChallengeSeconds] = useState(45);
  const [pushingQuestions, setPushingQuestions] = useState(false);
  const [pushFilterSubject, setPushFilterSubject] = useState('');
  const [pushFilterSection, setPushFilterSection] = useState('');
  const [pushFilterSkill, setPushFilterSkill] = useState('');
  const [selectedForPush, setSelectedForPush] = useState<string[]>([]);
  const [showInlineExplanation, setShowInlineExplanation] = useState(false);
  const [bankQuestions, setBankQuestions] = useState<any[]>([]);
  const [loadingBank, setLoadingBank] = useState(false);
  const [bankError, setBankError] = useState('');
  const [sessionStorageMeta, setSessionStorageMeta] = useState<{ day?: string; period?: string; className?: string; subject?: string } | null>(null);

  const schoolId = data?.schoolId || data?.meta?.schoolId || '';

  useEffect(() => {
    if (!schoolId) { setBankQuestions([]); setBankError(''); return; }
    let active = true;
    setLoadingBank(true);
    setBankQuestions([]);
    setBankError('');
    api.getClassroomQuestions(schoolId)
      .then((res) => { if (active) setBankQuestions(Array.isArray(res?.questions) ? res.questions : []); })
      .catch(() => { if (active) { setBankQuestions([]); setBankError('تعذر تحميل بنك الأسئلة المصرح لهذه المدرسة. لن يتم عرض أسئلة من مصدر محلي بديل.'); } })
      .finally(() => { if (active) setLoadingBank(false); });
    return () => { active = false; };
  }, [schoolId]);

  const loadChallengeState = useCallback(async () => {
    if (!sessionId || data?.status === 'ended') { setChallengeState(null); return; }
    try {
      setChallengeState(await api.get<ChallengeState>(`/classroom/sessions/${encodeURIComponent(sessionId)}/challenge-state`));
    } catch { setChallengeState(null); }
  }, [data?.status, sessionId]);

  useEffect(() => { void loadChallengeState(); }, [loadChallengeState, data?.activeBatchId]);
  useClassroomRealtime(sessionId, loadChallengeState, undefined, (event, payload: any) => {
    if (event === 'response:updated') return true;
    if (event === 'competition:updated') {
      setChallengeState(payload as ChallengeState);
      return true;
    }
    if (event === 'question:published' || event === 'batch:ended') {
      void loadChallengeState();
      return true;
    }
    return false;
  });

  useEffect(() => {
    const syncTimer = () => {
      if (!challengeState?.competitionEnabled || !challengeState.timerEndsAt) { setTimerSeconds(null); return; }
      const endMs = new Date(challengeState.timerEndsAt).getTime();
      setTimerSeconds(Number.isFinite(endMs) ? Math.max(0, Math.ceil((endMs - Date.now()) / 1000)) : null);
    };
    syncTimer();
    const interval = setInterval(syncTimer, 1000);
    return () => clearInterval(interval);
  }, [challengeState?.competitionEnabled, challengeState?.timerEndsAt]);

  useEffect(() => { setCompetitionResult(null); }, [data?.activeBatchId]);

  useEffect(() => {
    if (!sessionId || !challengeState?.competitionEnabled || !(challengeState.expired || challengeState.ended || timerSeconds === 0) || competitionResult) return;
    let active = true;
    api.get<CompetitionResult>(`/classroom/sessions/${encodeURIComponent(sessionId)}/competition`)
      .then((result) => { if (active) setCompetitionResult(result); })
      .catch(() => {});
    return () => { active = false; };
  }, [sessionId, challengeState?.competitionEnabled, challengeState?.expired, challengeState?.ended, timerSeconds, competitionResult]);

  useEffect(() => {
    try { const raw = sessionStorage.getItem(`classroom_meta_${sessionId}`); if (raw) setSessionStorageMeta(JSON.parse(raw)); } catch {}
  }, [sessionId]);

  const meta = useMemo(() => {
    if (data?.meta && (data.meta.className || data.meta.day || data.meta.period || data.meta.subjectName)) {
      return { day: data.meta.day, period: data.meta.period ? String(data.meta.period) : undefined, className: data.meta.className, subject: data.meta.subjectName };
    }
    return sessionStorageMeta;
  }, [data?.meta, sessionStorageMeta]);

  const copyPin = (pin: string) => { navigator.clipboard.writeText(pin); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  const currentQIndex = data?.activeQuestionIndex;
  const currentQuestion = (data?.questions || []).find((question: any) => question.index === currentQIndex);
  const canonicalChallengeIds = challengeState?.challengeQuestionIds || [];
  const isCurrentChallenge = currentQuestion && (canonicalChallengeIds.includes(currentQuestion.questionId) || challengeIds.includes(currentQuestion.questionId));
  const distribution: Record<string, number> = data?.distribution || {};
  const totalResponses = data?.responseCount || 0;

  const currentQAnalytics = useMemo(() => {
    if (!currentQuestion?.options) return { percentages: {}, maxWrongOption: null };
    const percentages: Record<number, number> = {};
    let maxWrongCount = 0;
    let maxWrongIndex: number | null = null;
    const correctIdx = typeof currentQuestion.correctOptionIndex === 'number' ? currentQuestion.correctOptionIndex : null;
    currentQuestion.options.forEach((_: any, idx: number) => {
      const count = distribution[String(idx)] || 0;
      percentages[idx] = totalResponses > 0 ? Math.round((count / totalResponses) * 100) : 0;
      if (correctIdx !== null && idx !== correctIdx && count > maxWrongCount) { maxWrongCount = count; maxWrongIndex = idx; }
    });
    const maxWrongPercent = maxWrongIndex !== null ? percentages[maxWrongIndex] : 0;
    return { percentages, maxWrongOption: maxWrongIndex !== null && maxWrongPercent >= 20 ? { index: maxWrongIndex, letter: OPTION_LETTERS[maxWrongIndex] || `${maxWrongIndex + 1}`, percent: maxWrongPercent, count: maxWrongCount } : null };
  }, [currentQuestion, distribution, totalResponses]);

  const availablePushQuestions = useMemo(() => {
    const existingIds = new Set((data?.questions || []).map((question: any) => String(question.questionId)));
    return bankQuestions.filter((question: any) => {
      const qId = String(question.questionId || question.id);
      if (existingIds.has(qId)) return false;
      const qSubject = question.subject || question.subjectId;
      if (pushFilterSubject && qSubject !== pushFilterSubject) return false;
      if (pushFilterSection && question.sectionId !== pushFilterSection) return false;
      if (pushFilterSkill && !(question.skillIds || []).includes(pushFilterSkill)) return false;
      return true;
    });
  }, [bankQuestions, data?.questions, pushFilterSubject, pushFilterSection, pushFilterSkill]);

  const openPushModal = (mode: PushMode) => { setPushMode(mode); setSelectedForPush([]); setShowPushModal(true); };

  const handlePushQuestionsSubmit = async () => {
    if (selectedForPush.length === 0 || pushingQuestions) return;
    setPushingQuestions(true);
    try {
      const result = await api.post<any>(`/classroom/sessions/${encodeURIComponent(sessionId)}/append-questions`, { questionIds: selectedForPush, autoPublishFirst: true, ...(pushMode === 'challenge' ? { challengeDurationSeconds: pushChallengeSeconds } : {}) });
      if (pushMode === 'challenge' && result?.challenge) {
        setCompetitionResult(null);
        setChallengeState({ challengeQuestionIds: selectedForPush, competitionEnabled: true, timerEndsAt: result.challenge.timerEndsAt || null, expired: false, ended: false });
      }
      setShowPushModal(false);
      setSelectedForPush([]);
      onReload?.();
    } finally { setPushingQuestions(false); }
  };

  const handleEndBatch = async () => {
    const batchId = String(data?.activeBatchId || '');
    if (!batchId || endingBatch) return;
    setEndingBatch(true);
    try {
      const result = await api.endClassroomBatch(sessionId, batchId);
      setBatchMiniReport(result.miniReport);
      setShowPushModal(false);
      onReload?.();
    } finally { setEndingBatch(false); }
  };

  const handleEndChallenge = async () => {
    if (endingChallenge) return;
    setEndingChallenge(true);
    try {
      const endedState = await api.post<ChallengeState>(`/classroom/sessions/${encodeURIComponent(sessionId)}/competition/end`, {});
      setChallengeState(endedState);
      const result = await api.get<CompetitionResult>(`/classroom/sessions/${encodeURIComponent(sessionId)}/competition`);
      setCompetitionResult(result);
      onReload?.();
    } finally { setEndingChallenge(false); }
  };

  const handleQuickSelectBatch = () => {
    const count = pushMode === 'challenge' ? 3 : 5;
    setSelectedForPush(availablePushQuestions.slice(0, count).map((question) => String(question.questionId || question.id)));
  };

  const podium = competitionResult?.podium || competitionResult?.leaderboard?.slice(0, 3) || [];
  const challengeEnded = Boolean(challengeState?.expired || challengeState?.ended || timerSeconds === 0);
  const hasActiveBatch = Boolean(data?.activeBatchId);

  return (
    <main className="mx-auto max-w-5xl p-4 sm:p-6" dir="rtl">
      <div className="flex flex-col gap-4 rounded-3xl bg-slate-900 p-6 text-white sm:flex-row sm:items-center sm:justify-between shadow-xl">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md bg-emerald-500/20 px-2.5 py-1 text-xs font-black text-emerald-400">{data?.status === 'ended' ? 'حصة منتهية ومؤرشفة' : 'حصة ذكية تفاعلية مباشرة 🟢'}</span>
            {meta?.day && <span className="rounded-md bg-white/10 px-2.5 py-1 text-xs font-bold text-slate-300">{meta.day}</span>}
            {meta?.period && <span className="rounded-md bg-amber-400/20 px-2.5 py-1 text-xs font-bold text-amber-300">الحصة {meta.period}</span>}
            {meta?.className && <span className="rounded-md bg-indigo-500/20 px-2.5 py-1 text-xs font-bold text-indigo-300">{meta.className}</span>}
          </div>
          <h1 className="mt-2 text-3xl font-black">لوحة تحكم المعلم للحصة الذكية</h1>
          <p className="mt-1 text-xs text-slate-400">رابط انضمام الطلاب: /classroom/{sessionId} · كود الدخول التفاعلي</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {storedPin && <div className="flex items-center gap-2 rounded-2xl bg-white/10 px-4 py-2 text-white"><span className="text-xs text-slate-300">رمز الانضمام:</span><span className="font-mono text-xl font-black tracking-wider text-amber-400">{storedPin}</span><button type="button" onClick={() => copyPin(storedPin)} className="rounded-lg p-1 hover:bg-white/20 text-xs transition-colors">{copied ? 'تم النسخ!' : <Copy size={16} />}</button></div>}
          <Link to={`/classroom/${sessionId}/projector`} target="_blank" className="flex items-center gap-1.5 rounded-2xl bg-indigo-600 px-4 py-2.5 text-xs font-black text-white hover:bg-indigo-700 shadow-md transition-all active:scale-95"><Presentation size={16} /> شاشة السبورة التفاعلية <ExternalLink size={14} /></Link>
        </div>
      </div>

      {challengeState?.competitionEnabled && timerSeconds !== null && (
        <div className={`mt-4 flex flex-col gap-3 rounded-2xl p-4 text-white shadow-lg sm:flex-row sm:items-center sm:justify-between ${challengeEnded ? 'bg-slate-800' : 'bg-gradient-to-r from-amber-500 to-orange-600'}`}>
          <div className="flex items-center gap-3"><Flame size={28} className={challengeEnded ? 'text-slate-300' : 'text-amber-200'} /><div><p className="text-sm font-black">{challengeEnded ? 'انتهى التحدي وتم قفل الإجابات' : 'تحدي السرعة المتزامن جارٍ الآن'}</p><p className="text-xs text-white/80">{challengeEnded ? 'يمكنك عرض نتيجة المنصة أو بدء دفعة جديدة.' : 'الوقت مثبت على الخادم ويظهر بنفس النهاية للمعلم والطلاب.'}</p></div></div>
          <div className="flex items-center gap-2"><Clock size={18} /><span className="font-mono text-2xl font-black">{timerSeconds}s</span>{!challengeEnded ? <button type="button" onClick={() => void handleEndChallenge()} disabled={endingChallenge} className="mr-2 rounded-xl bg-slate-950/25 px-3 py-2 text-xs font-black hover:bg-slate-950/40 disabled:opacity-50">{endingChallenge ? 'جارٍ الإنهاء…' : 'إنهاء التحدي وعرض النتائج'}</button> : <button type="button" onClick={() => void api.get<CompetitionResult>(`/classroom/sessions/${encodeURIComponent(sessionId)}/competition`).then(setCompetitionResult)} className="mr-2 rounded-xl bg-white/10 px-3 py-2 text-xs font-black hover:bg-white/20">عرض النتائج</button>}</div>
        </div>
      )}

      {podium.length > 0 && <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/60 dark:bg-amber-950/20"><div className="flex items-center gap-2"><Trophy size={20} className="text-amber-600" /><h3 className="text-sm font-black text-amber-950 dark:text-amber-200">نتيجة التحدي — أفضل 3</h3></div><div className="mt-3 grid gap-2 sm:grid-cols-3">{podium.map((entry) => <div key={entry.studentId} className="rounded-xl border border-amber-200 bg-white p-3 dark:border-amber-900/50 dark:bg-slate-900"><div className="flex items-center justify-between gap-2"><span className="text-xs font-black text-slate-900 dark:text-white">{entry.name}</span><span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-black text-amber-800"><Crown size={11} /> #{entry.rank}</span></div><div className="mt-2 text-[11px] text-slate-500">{entry.score} نقطة · {entry.correct} صحيحة · دقة {entry.accuracy}%</div></div>)}</div></div>}

      {batchMiniReport && <section className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900/60 dark:bg-emerald-950/20"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-sm font-black text-emerald-950 dark:text-emerald-200">ملخص {batchMiniReport.label}</h2><p className="mt-1 text-xs text-emerald-800 dark:text-emerald-300">تم إغلاق الدفعة. يمكنك الآن إرسال دفعة جديدة دون فقد سجل هذه الدفعة.</p></div><button type="button" onClick={() => setBatchMiniReport(null)} className="rounded-lg border border-emerald-300 px-3 py-1.5 text-xs font-bold text-emerald-800 dark:border-emerald-800 dark:text-emerald-200">إخفاء</button></div><div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4"><div className="rounded-xl bg-white p-3 text-center dark:bg-slate-900"><div className="text-lg font-black">{batchMiniReport.answered}</div><div className="text-[11px] text-slate-500">إجابات</div></div><div className="rounded-xl bg-white p-3 text-center dark:bg-slate-900"><div className="text-lg font-black text-emerald-600">{batchMiniReport.correct}</div><div className="text-[11px] text-slate-500">صحيحة</div></div><div className="rounded-xl bg-white p-3 text-center dark:bg-slate-900"><div className="text-lg font-black text-rose-600">{batchMiniReport.wrong}</div><div className="text-[11px] text-slate-500">خاطئة</div></div><div className="rounded-xl bg-white p-3 text-center dark:bg-slate-900"><div className="text-lg font-black text-indigo-600">{batchMiniReport.accuracy ?? '—'}{batchMiniReport.accuracy !== null ? '%' : ''}</div><div className="text-[11px] text-slate-500">الدقة</div></div></div></section>}

      <div className="mt-6"><ClassroomTeacherLiveRadar responseCount={data?.responseCount ?? 0} distribution={distribution} activeQuestion={currentQuestion ? { ...currentQuestion, isChallenge: isCurrentChallenge } : null} onToggleChallenge={currentQuestion ? () => onToggleChallenge(currentQuestion.questionId) : undefined} /></div>
      {currentQuestion && <ClassroomQuestionReviewPanel sessionId={sessionId} currentQuestion={currentQuestion} currentQAnalytics={currentQAnalytics} distribution={distribution} showInlineExplanation={showInlineExplanation} onToggleExplanation={() => setShowInlineExplanation((value) => !value)} />}

      <section className="mt-6 rounded-2xl border border-slate-100 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"><div><h2 className="text-xl font-black text-slate-900 dark:text-white">أسئلة الحصة التفاعلية</h2><p className="text-xs text-slate-500">الترتيب: أرسل دفعة، تابع التسليم، أنهِ الدفعة واعرض ملخصها، ثم ابدأ التالية.</p>{bankError && <p className="mt-2 text-xs font-bold text-rose-600">{bankError}</p>}{loadingBank && <p className="mt-2 text-xs font-bold text-indigo-600">جارٍ تحديث بنك الأسئلة المصرح من الخادم…</p>}</div><div className="flex flex-wrap items-center gap-2">{hasActiveBatch && <button type="button" onClick={() => void handleEndBatch()} disabled={data?.status === 'ended' || endingBatch} className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-black text-white disabled:opacity-50">{endingBatch ? 'جارٍ إنهاء الدفعة…' : 'إنهاء الدفعة وعرض ملخصها'}</button>}<button type="button" onClick={() => openPushModal('normal')} disabled={data?.status === 'ended' || hasActiveBatch || loadingBank || Boolean(bankError)} className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-3.5 py-2 text-xs font-black text-white disabled:opacity-50"><PlusCircle size={14} /> إرسال تدريب / حزمة مهارة</button><select value={pushChallengeSeconds} onChange={(event) => setPushChallengeSeconds(Number(event.target.value))} disabled={data?.status === 'ended' || hasActiveBatch} className="rounded-xl border border-amber-200 bg-amber-50 px-2.5 py-2 text-xs font-black text-amber-800"><option value={30}>30 ث</option><option value={45}>45 ث</option><option value={60}>60 ث</option><option value={90}>90 ث</option></select><button type="button" onClick={() => openPushModal('challenge')} disabled={data?.status === 'ended' || hasActiveBatch || loadingBank || Boolean(bankError)} className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-3.5 py-2 text-xs font-black text-white disabled:opacity-50"><Zap size={14} /> إنشاء دفعة تحدي مستقلة</button>{currentQIndex !== undefined && currentQIndex < (data?.questions || []).length - 1 && <button type="button" onClick={() => onPublish(currentQIndex + 1)} disabled={data?.status === 'ended'} className="flex items-center gap-1.5 rounded-xl bg-indigo-50 px-3.5 py-2 text-xs font-black text-indigo-700"><SkipForward size={14} /> الانتقال للسؤال التالي</button>}</div></div>
        {showPushModal && pushMode === 'challenge' && <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-bold text-amber-900">وضع التحدي مفعل: الأسئلة التي ستحددها ستصبح دفعة جديدة مستقلة لمدة {pushChallengeSeconds} ثانية، ويبدأ المؤقت والترتيب فور الإرسال.</div>}
        <div className="mt-4 space-y-3">{(data?.questions || []).map((question: any) => { const isActive = data?.activeQuestionIndex === question.index; const isChallenge = canonicalChallengeIds.includes(question.questionId) || challengeIds.includes(question.questionId); return <div key={question.questionId} className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl border p-4 ${isActive ? 'border-indigo-600 bg-indigo-50/70' : 'border-slate-200 bg-white'}`}><div className="flex items-start sm:items-center gap-3"><span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-black ${isActive ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700'}`}>{question.index + 1}</span><div className="min-w-0 flex-1"><div className="font-bold text-slate-900 text-sm"><span className="text-indigo-600 ml-1 font-black">سؤال {question.index + 1}:</span><QuestionContentRenderer content={question.text} className="inline-block align-middle max-h-24 overflow-hidden" /></div><div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-slate-500"><span>{question.options?.length || 4} خيارات</span>{isChallenge && <span className="inline-flex items-center gap-0.5 rounded-md bg-amber-100 px-1.5 py-0.5 font-black text-amber-800">⚡ تحدي سريع</span>}{isActive && <span className="font-black text-emerald-600">● معروض على أجهزة الطلاب</span>}</div></div></div><div className="flex items-center gap-2 self-end sm:self-center"><button type="button" onClick={() => onPublish(question.index)} disabled={data?.status === 'ended'} className={`rounded-xl px-3.5 py-2 text-xs font-bold disabled:opacity-50 ${isActive ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700'}`}>{isActive ? 'منشور حالياً ✓' : 'نشر اعتيادي'}</button></div></div>; })}</div>
      </section>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3"><button type="button" onClick={onEnd} disabled={data?.status === 'ended'} className="rounded-2xl bg-rose-600 px-6 py-3 font-black text-white disabled:opacity-50">{data?.status === 'ended' ? 'الجلسة منتهية ومحفوظة بالأرشيف' : 'إنهاء الجلسة وحفظ التقرير بالأرشيف'}</button>{isTeacher && <Link to="/school-teacher-dashboard?tab=smart-classroom" className="text-xs font-bold text-slate-500">العودة للوحة معلم المدرسة →</Link>}</div>
      {message && <p className="mt-4 text-sm font-bold text-slate-600">{message}</p>}

      <ClassroomPushQuestionsModal isOpen={showPushModal} pushingQuestions={pushingQuestions} pushFilterSubject={pushFilterSubject} pushFilterSection={pushFilterSection} pushFilterSkill={pushFilterSkill} subjects={subjects} sections={sections} skills={skills} availableQuestions={availablePushQuestions} selectedIds={selectedForPush} onClose={() => setShowPushModal(false)} onSubjectChange={(value) => { setPushFilterSubject(value); setPushFilterSection(''); setPushFilterSkill(''); }} onSectionChange={(value) => { setPushFilterSection(value); setPushFilterSkill(''); }} onSkillChange={setPushFilterSkill} onQuickSelectBatch={handleQuickSelectBatch} onClearSelection={() => setSelectedForPush([])} onToggleQuestion={(id) => setSelectedForPush((prev) => prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id])} onSubmit={() => void handlePushQuestionsSubmit()} />
    </main>
  );
};
