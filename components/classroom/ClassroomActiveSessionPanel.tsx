import { ClassroomOptionalPulse } from './ClassroomOptionalPulse';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, Clock, Copy, Crown, ExternalLink, Flame, Presentation, Trophy } from 'lucide-react';
import { ClassroomTeacherLiveRadar } from './ClassroomTeacherLiveRadar';
import { ClassroomQuestionReviewPanel } from './ClassroomQuestionReviewPanel';
import { ClassroomPushQuestionsModal } from './ClassroomPushQuestionsModal';
import { ClassroomTeacherMobileRemote } from './ClassroomTeacherMobileRemote';
import { ClassroomBatchSummaryCard, type BatchMiniReport } from './ClassroomBatchSummaryCard';
import { ClassroomEndSessionModal } from './ClassroomEndSessionModal';
import { ClassroomStudentReportTable } from './ClassroomStudentReportTable';
import { ClassroomSessionQuestionsList } from './ClassroomSessionQuestionsList';
import { ClassroomSavedBatchesPanel } from './ClassroomSavedBatchesPanel';
import { api } from '../../services/api';
import { useStore } from '../../store/useStore';
import { useClassroomRealtime } from '../../hooks/useClassroomRealtime';
import { useClassroomQuestionBank } from '../../hooks/useClassroomQuestionBank';

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

interface ClassroomActiveSessionPanelProps {
  sessionId: string;
  data: any;
  storedPin: string;
  challengeIds: string[];
  onToggleChallenge: (questionId: string) => void;
  onPublish: (index: number) => void;
  onEnd: () => void;
  onReload?: () => void | Promise<void>;
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
  const [sessionStorageMeta, setSessionStorageMeta] = useState<{ day?: string; period?: string; className?: string; subject?: string } | null>(null);
  const [showEndConfirmModal, setShowEndConfirmModal] = useState(false);

  const schoolId = data?.schoolId || data?.meta?.schoolId || '';

  const { bankQuestions, loadingBank, bankError, bankReady, ensureBankQuestions } = useClassroomQuestionBank(schoolId, showPushModal, data?.status === 'ended');

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

  const filterPushQuestions = useCallback((bank: any[]) => {
    const existingIds = new Set((data?.questions || []).map((question: any) => String(question.questionId)));
    return bank.filter((question: any) => {
      const qId = String(question.questionId || question.id);
      if (existingIds.has(qId)) return false;
      if (!question.text || !String(question.text).trim()) return false;
      const qSubject = question.subject || question.subjectId;
      if (pushFilterSubject && qSubject !== pushFilterSubject) return false;
      if (pushFilterSection && question.sectionId !== pushFilterSection) return false;
      if (pushFilterSkill && !(question.skillIds || []).includes(pushFilterSkill)) return false;
      return true;
    });
  }, [data?.questions, pushFilterSubject, pushFilterSection, pushFilterSkill]);
  const availablePushQuestions = useMemo(() => filterPushQuestions(bankQuestions), [bankQuestions, filterPushQuestions]);

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

  const handleQuickSelectBatch = (count?: number) => {
    const targetCount = typeof count === 'number' ? count : (pushMode === 'challenge' ? 3 : 5);
    setSelectedForPush(availablePushQuestions.slice(0, targetCount).map((question) => String(question.questionId || question.id)));
  };

  const handleDirectSendPreset = async (count: number) => {
    if (pushingQuestions || data?.status === 'ended') return;
    setPushingQuestions(true);
    try {
      const questions = bankReady ? availablePushQuestions : filterPushQuestions(await ensureBankQuestions());
      const questionsToSend = questions.slice(0, count).map((q) => String(q.questionId || q.id));
      if (questionsToSend.length < count) { openPushModal('normal'); return; }
      await api.post<any>(`/classroom/sessions/${encodeURIComponent(sessionId)}/append-questions`, { questionIds: questionsToSend, autoPublishFirst: true });
      onReload?.();
    } catch { openPushModal('normal'); }
    finally { setPushingQuestions(false); }
  };

  const podium = competitionResult?.podium || competitionResult?.leaderboard?.slice(0, 3) || [];
  const challengeEnded = Boolean(challengeState?.expired || challengeState?.ended || timerSeconds === 0);
  const hasActiveBatch = Boolean(data?.activeBatchId);

  return (
    <main className="mx-auto max-w-5xl p-4 sm:p-6 pb-24 sm:pb-6" dir="rtl">
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

      {data?.status === 'live' && !data?.activeBatchId && <p role="status" className="mt-4 rounded-xl bg-indigo-50 p-4 font-bold text-indigo-800">الحصة مفتوحة والطلاب في الانتظار. تابع شرحك على السبورة، ثم أرسل دفعة لتقويم المهارة.</p>}
      {data?.status === 'live' && <ClassroomSavedBatchesPanel sessionId={sessionId} schoolId={schoolId} questions={data?.questions || []} activeBatch={Boolean(data?.activeBatchId)} busy={pushingQuestions || endingBatch} onBusyChange={setPushingQuestions} onReload={onReload} />}

      {challengeState?.competitionEnabled && timerSeconds !== null && (
        <div className={`mt-4 flex flex-col gap-3 rounded-2xl p-4 text-white shadow-lg sm:flex-row sm:items-center sm:justify-between ${challengeEnded ? 'bg-slate-800' : 'bg-gradient-to-r from-amber-500 to-orange-600'}`}>
          <div className="flex items-center gap-3"><Flame size={28} className={challengeEnded ? 'text-slate-300' : 'text-amber-200'} /><div><p className="text-sm font-black">{challengeEnded ? 'انتهى التحدي وتم قفل الإجابات' : 'تحدي السرعة المتزامن جارٍ الآن'}</p><p className="text-xs text-white/80">{challengeEnded ? 'يمكنك عرض نتيجة المنصة أو بدء دفعة جديدة.' : 'الوقت مثبت على الخادم ويظهر بنفس النهاية للمعلم والطلاب.'}</p></div></div>
          <div className="flex items-center gap-2"><Clock size={18} /><span className="font-mono text-2xl font-black">{timerSeconds}s</span>{!challengeEnded ? <button type="button" onClick={() => void handleEndChallenge()} disabled={endingChallenge} className="mr-2 rounded-xl bg-slate-950/25 px-3 py-2 text-xs font-black hover:bg-slate-950/40 disabled:opacity-50">{endingChallenge ? 'جارٍ الإنهاء…' : 'إنهاء التحدي وعرض النتائج'}</button> : <button type="button" onClick={() => void api.get<CompetitionResult>(`/classroom/sessions/${encodeURIComponent(sessionId)}/competition`).then(setCompetitionResult)} className="mr-2 rounded-xl bg-white/10 px-3 py-2 text-xs font-black hover:bg-white/20">عرض النتائج</button>}</div>
        </div>
      )}

      {podium.length > 0 && <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/60 dark:bg-amber-950/20"><div className="flex items-center gap-2"><Trophy size={20} className="text-amber-600" /><h3 className="text-sm font-black text-amber-950 dark:text-amber-200">نتيجة التحدي — أفضل 3</h3></div><div className="mt-3 grid gap-2 sm:grid-cols-3">{podium.map((entry) => <div key={entry.studentId} className="rounded-xl border border-amber-200 bg-white p-3 dark:border-amber-900/50 dark:bg-slate-900"><div className="flex items-center justify-between gap-2"><span className="text-xs font-black text-slate-900 dark:text-white">{entry.name}</span><span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-black text-amber-800"><Crown size={11} /> #{entry.rank}</span></div><div className="mt-2 text-[11px] text-slate-500">{entry.score} نقطة · {entry.correct} صحيحة · دقة {entry.accuracy}%</div></div>)}</div></div>}

      {isTeacher && <ClassroomOptionalPulse canPrepareSupport={data?.status === 'live'} sessionId={sessionId} questions={data?.questions || []} batches={data?.batches || []} skillNames={Object.fromEntries(skills.map(skill => [skill.id, skill.name]))} onPrepareSupport={skillId => { setPushFilterSkill(skillId); const skill = skills.find(item => item.id === skillId); setPushFilterSubject(skill?.subjectId || ''); setPushFilterSection(skill?.sectionId || ''); openPushModal('normal'); }} />}
      {batchMiniReport && (
        <ClassroomBatchSummaryCard
          report={batchMiniReport}
          hasActiveBatch={hasActiveBatch}
          canSendNextPreset={availablePushQuestions.length >= 5}
          onSendNextPreset={() => void handleDirectSendPreset(5)}
          onDismiss={() => setBatchMiniReport(null)}
        />
      )}

      <div className="mt-6">
        <ClassroomTeacherLiveRadar
          responseCount={data?.responseCount ?? 0}
          expectedCount={data?.submissionSummary?.joinedCount || data?.joinedCount || 0}
          distribution={distribution}
          activeQuestion={currentQuestion ? { ...currentQuestion, isChallenge: isCurrentChallenge } : null}
          onToggleChallenge={currentQuestion ? () => onToggleChallenge(currentQuestion.questionId) : undefined}
          submissionSummary={data?.submissionSummary}
          solutionRevealed={showInlineExplanation}
          onToggleReveal={() => setShowInlineExplanation((prev) => !prev)}
        />
      </div>
      {currentQuestion && <ClassroomQuestionReviewPanel sessionId={sessionId} currentQuestion={currentQuestion} currentQAnalytics={currentQAnalytics} distribution={distribution} showInlineExplanation={showInlineExplanation} onToggleExplanation={() => setShowInlineExplanation((value) => !value)} />}

      <ClassroomSessionQuestionsList
        data={data}
        hasActiveBatch={hasActiveBatch}
        endingBatch={endingBatch}
        onEndBatch={() => void handleEndBatch()}
        availablePushQuestionsCount={availablePushQuestions.length}
        bankReady={bankReady}
        onDirectSendPreset={(count) => void handleDirectSendPreset(count)}
        pushingQuestions={pushingQuestions}
        loadingBank={loadingBank}
        bankError={bankError}
        openPushModal={openPushModal}
        pushChallengeSeconds={pushChallengeSeconds}
        onChangePushChallengeSeconds={setPushChallengeSeconds}
        currentQIndex={currentQIndex}
        onPublish={onPublish}
        canonicalChallengeIds={canonicalChallengeIds}
        challengeIds={challengeIds}
        showPushModal={showPushModal}
        pushMode={pushMode}
      />

      {data?.status === 'live' && data?.activeBatchId && data?.submissionSummary && <section className="mt-4 rounded-2xl border border-indigo-200 p-4 dark:border-indigo-900" aria-live="polite">
        <p className="text-sm font-black">تسليم أسئلة النشاط: {data.submissionSummary.submittedCount}/{data.submissionSummary.joinedCount} طالب</p>
        <p className="mt-1 text-xs text-slate-500">بانتظار تسليم {Math.max(0, data.submissionSummary.joinedCount - data.submissionSummary.submittedCount)} طالب دخل الحصة.</p>
        <details className="mt-2 text-xs"><summary className="cursor-pointer font-bold">من سلّم النشاط؟</summary><p className="mt-2">{data.submissionSummary.submitted?.map((student: any) => student.name).join('، ') || 'لم يصل تسليم بعد.'}</p></details>
      </section>}
      {data?.status === 'ended' && data?.report && <ClassroomStudentReportTable students={data.report.students} complete={data.report.studentEvidenceComplete} />}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setShowEndConfirmModal(true)}
          disabled={data?.status === 'ended'}
          className="rounded-2xl bg-rose-600 px-6 py-3 font-black text-white shadow-md hover:bg-rose-700 active:scale-95 transition-all disabled:opacity-50"
        >
          {data?.status === 'ended' ? 'الجلسة منتهية ومحفوظة بالأرشيف' : 'إنهاء الجلسة وحفظ التقرير بالأرشيف'}
        </button>
        {isTeacher && <Link to="/school-teacher-dashboard?tab=smart-classroom" className="text-xs font-bold text-slate-500 hover:text-slate-700">العودة للوحة معلم المدرسة →</Link>}
      </div>
      {message && (
        <div
          role="status"
          aria-live="polite"
          className={`mt-4 flex items-center gap-2.5 rounded-xl border p-3.5 text-xs sm:text-sm font-bold transition-all ${
            message.includes('تعذر') || message.includes('فشل') || message.includes('خطأ')
              ? 'border-rose-200 bg-rose-50 text-rose-800'
              : message.includes('تم') || message.includes('جاهز')
                ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                : 'border-indigo-200 bg-indigo-50 text-indigo-800'
          }`}
        >
          {message.includes('تعذر') || message.includes('فشل') || message.includes('خطأ') ? (
            <AlertTriangle size={18} className="shrink-0 text-rose-600" />
          ) : (
            <CheckCircle2 size={18} className="shrink-0 text-emerald-600" />
          )}
          <span>{message}</span>
        </div>
      )}

      <ClassroomEndSessionModal
        isOpen={showEndConfirmModal}
        onConfirm={() => { setShowEndConfirmModal(false); onEnd(); }}
        onCancel={() => setShowEndConfirmModal(false)}
      />

      <ClassroomPushQuestionsModal
        isOpen={showPushModal}
        pushingQuestions={pushingQuestions}
        pushFilterSubject={pushFilterSubject}
        pushFilterSection={pushFilterSection}
        pushFilterSkill={pushFilterSkill}
        subjects={subjects}
        sections={sections}
        skills={skills}
        availableQuestions={availablePushQuestions}
        selectedIds={selectedForPush}
        onClose={() => setShowPushModal(false)}
        onSubjectChange={(value) => { setPushFilterSubject(value); setPushFilterSection(''); setPushFilterSkill(''); }}
        onSectionChange={(value) => { setPushFilterSection(value); setPushFilterSkill(''); }}
        onSkillChange={setPushFilterSkill}
        onQuickSelectBatch={handleQuickSelectBatch}
        onSelectCount={(count) => handleQuickSelectBatch(count)}
        onClearSelection={() => setSelectedForPush([])}
        onToggleQuestion={(id) => setSelectedForPush((prev) => prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id])}
        onSubmit={() => void handlePushQuestionsSubmit()}
      />

      <ClassroomTeacherMobileRemote
        currentQIndex={currentQIndex}
        totalQuestions={(data?.questions || []).length}
        responseCount={data?.responseCount ?? 0}
        expectedCount={data?.submissionSummary?.joinedCount || data?.joinedCount || 0}
        showInlineExplanation={showInlineExplanation}
        onToggleExplanation={() => setShowInlineExplanation((prev) => !prev)}
        onPublishNext={currentQIndex !== undefined && currentQIndex < (data?.questions || []).length - 1 ? () => onPublish(currentQIndex + 1) : undefined}
        hasActiveBatch={hasActiveBatch}
        endingBatch={endingBatch}
        onEndBatch={() => void handleEndBatch()}
        onOpenPushModal={() => openPushModal('normal')}
        isEnded={data?.status === 'ended'}
      />
    </main>
  );
};
