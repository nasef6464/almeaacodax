import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Clock, Copy, ExternalLink, Flame, PlusCircle, Presentation, SkipForward, Zap } from 'lucide-react';
import { ClassroomTeacherLiveRadar } from './ClassroomTeacherLiveRadar';
import { ClassroomQuestionReviewPanel } from './ClassroomQuestionReviewPanel';
import { ClassroomPushQuestionsModal } from './ClassroomPushQuestionsModal';
import { QuestionContentRenderer } from './QuestionContentRenderer';
import { api } from '../../services/api';
import { useStore } from '../../store/useStore';

const OPTION_LETTERS = ['أ', 'ب', 'ج', 'د', 'هـ'];

type ChallengeState = {
  challengeQuestionIds?: string[];
  competitionEnabled?: boolean;
  timerEndsAt?: string | null;
  expired?: boolean;
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
  const { subjects, sections, skills } = useStore();
  const [copied, setCopied] = useState(false);
  const [challengeState, setChallengeState] = useState<ChallengeState | null>(null);
  const [timerSeconds, setTimerSeconds] = useState<number | null>(null);
  const [showPushModal, setShowPushModal] = useState(false);
  const [pushingQuestions, setPushingQuestions] = useState(false);
  const [pushFilterSubject, setPushFilterSubject] = useState('');
  const [pushFilterSection, setPushFilterSection] = useState('');
  const [pushFilterSkill, setPushFilterSkill] = useState('');
  const [selectedForPush, setSelectedForPush] = useState<string[]>([]);
  const [showInlineExplanation, setShowInlineExplanation] = useState(false);
  const [bankQuestions, setBankQuestions] = useState<any[]>([]);
  const [loadingBank, setLoadingBank] = useState(false);
  const [bankError, setBankError] = useState('');
  const [sessionStorageMeta, setSessionStorageMeta] = useState<{
    day?: string;
    period?: string;
    className?: string;
    subject?: string;
  } | null>(null);

  const schoolId = data?.schoolId || data?.meta?.schoolId || '';

  useEffect(() => {
    if (!schoolId) {
      setBankQuestions([]);
      setBankError('');
      return;
    }
    let active = true;
    setLoadingBank(true);
    setBankQuestions([]);
    setBankError('');
    api.getClassroomQuestions(schoolId)
      .then((res) => {
        if (!active) return;
        setBankQuestions(Array.isArray(res?.questions) ? res.questions : []);
      })
      .catch(() => {
        if (!active) return;
        setBankQuestions([]);
        setBankError('تعذر تحميل بنك الأسئلة المصرح لهذه المدرسة. لن يتم عرض أسئلة من مصدر محلي بديل.');
      })
      .finally(() => { if (active) setLoadingBank(false); });
    return () => { active = false; };
  }, [schoolId]);

  useEffect(() => {
    if (!sessionId || data?.status === 'ended') {
      setChallengeState(null);
      return;
    }
    let active = true;
    const loadChallengeState = async () => {
      try {
        const state = await api.get<ChallengeState>(`/classroom/sessions/${encodeURIComponent(sessionId)}/challenge-state`);
        if (active) setChallengeState(state);
      } catch {
        if (active) setChallengeState(null);
      }
    };
    void loadChallengeState();
    const interval = setInterval(() => void loadChallengeState(), 4000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [sessionId, data?.status, data?.activeBatchId]);

  useEffect(() => {
    const syncTimer = () => {
      if (!challengeState?.competitionEnabled || !challengeState.timerEndsAt) {
        setTimerSeconds(null);
        return;
      }
      const endMs = new Date(challengeState.timerEndsAt).getTime();
      setTimerSeconds(Number.isFinite(endMs) ? Math.max(0, Math.ceil((endMs - Date.now()) / 1000)) : null);
    };
    syncTimer();
    const interval = setInterval(syncTimer, 1000);
    return () => clearInterval(interval);
  }, [challengeState?.competitionEnabled, challengeState?.timerEndsAt]);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(`classroom_meta_${sessionId}`);
      if (raw) setSessionStorageMeta(JSON.parse(raw));
    } catch {
      // Ignore malformed local session metadata; canonical data still comes from the API.
    }
  }, [sessionId]);

  const meta = useMemo(() => {
    if (data?.meta && (data.meta.className || data.meta.day || data.meta.period || data.meta.subjectName)) {
      return {
        day: data.meta.day,
        period: data.meta.period ? String(data.meta.period) : undefined,
        className: data.meta.className,
        subject: data.meta.subjectName,
      };
    }
    return sessionStorageMeta;
  }, [data?.meta, sessionStorageMeta]);

  const copyPin = (pin: string) => {
    navigator.clipboard.writeText(pin);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

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
      if (correctIdx !== null && idx !== correctIdx && count > maxWrongCount) {
        maxWrongCount = count;
        maxWrongIndex = idx;
      }
    });

    const maxWrongPercent = maxWrongIndex !== null ? percentages[maxWrongIndex] : 0;
    return {
      percentages,
      maxWrongOption: maxWrongIndex !== null && maxWrongPercent >= 20
        ? { index: maxWrongIndex, letter: OPTION_LETTERS[maxWrongIndex] || `${maxWrongIndex + 1}`, percent: maxWrongPercent, count: maxWrongCount }
        : null,
    };
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

  const handlePushQuestionsSubmit = async () => {
    if (selectedForPush.length === 0 || pushingQuestions) return;
    setPushingQuestions(true);
    try {
      await api.appendClassroomQuestions(sessionId, selectedForPush, true);
      setShowPushModal(false);
      setSelectedForPush([]);
      onReload?.();
    } finally {
      setPushingQuestions(false);
    }
  };

  const handleQuickSelectBatch = () => {
    setSelectedForPush(availablePushQuestions.slice(0, 5).map((question) => String(question.questionId || question.id)));
  };

  const handleInstantChallenge = async (question: any, durationSec = 45) => {
    if (!challengeIds.includes(question.questionId)) onToggleChallenge(question.questionId);
    await api.publishClassroomQuestion(sessionId, question.index);
    const state = await api.post<ChallengeState>(`/classroom/sessions/${encodeURIComponent(sessionId)}/competition/configure`, {
      challengeQuestionIds: [question.questionId],
      durationSeconds: durationSec,
      competitionEnabled: true,
    });
    setChallengeState(state);
    onReload?.();
  };

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
          {storedPin && (
            <div className="flex items-center gap-2 rounded-2xl bg-white/10 px-4 py-2 text-white">
              <span className="text-xs text-slate-300">رمز الانضمام:</span><span className="font-mono text-xl font-black tracking-wider text-amber-400">{storedPin}</span>
              <button type="button" onClick={() => copyPin(storedPin)} className="rounded-lg p-1 hover:bg-white/20 text-xs transition-colors">{copied ? 'تم النسخ!' : <Copy size={16} />}</button>
            </div>
          )}
          <Link to={`/classroom/${sessionId}/projector`} target="_blank" className="flex items-center gap-1.5 rounded-2xl bg-indigo-600 px-4 py-2.5 text-xs font-black text-white hover:bg-indigo-700 shadow-md transition-all active:scale-95"><Presentation size={16} /> شاشة السبورة التفاعلية <ExternalLink size={14} /></Link>
        </div>
      </div>

      {challengeState?.competitionEnabled && timerSeconds !== null && (
        <div className="mt-4 flex items-center justify-between rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 p-4 text-white shadow-lg">
          <div className="flex items-center gap-3"><Flame size={28} className="text-amber-200" /><div><p className="text-sm font-black">تحدي السرعة المتزامن جارٍ الآن</p><p className="text-xs text-amber-100">الوقت مثبت على الخادم ويظهر بنفس النهاية للمعلم والطلاب.</p></div></div>
          <div className="flex items-center gap-2"><Clock size={18} /><span className="font-mono text-2xl font-black">{timerSeconds}s</span></div>
        </div>
      )}

      <div className="mt-6">
        <ClassroomTeacherLiveRadar
          responseCount={data?.responseCount ?? 0}
          distribution={distribution}
          activeQuestion={currentQuestion ? { ...currentQuestion, isChallenge: isCurrentChallenge } : null}
          onToggleChallenge={currentQuestion ? () => onToggleChallenge(currentQuestion.questionId) : undefined}
        />
      </div>

      {currentQuestion && (
        <ClassroomQuestionReviewPanel sessionId={sessionId} currentQuestion={currentQuestion} currentQAnalytics={currentQAnalytics} distribution={distribution} showInlineExplanation={showInlineExplanation} onToggleExplanation={() => setShowInlineExplanation((value) => !value)} />
      )}

      <section className="mt-6 rounded-2xl border border-slate-100 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white">أسئلة الحصة التفاعلية</h2>
            <p className="text-xs text-slate-500">يمكنك نشر أي سؤال متتابع، أو بثه كتحدٍ سريع بمؤقت موحد على الخادم.</p>
            {bankError && <p className="mt-2 text-xs font-bold text-rose-600">{bankError}</p>}
            {loadingBank && <p className="mt-2 text-xs font-bold text-indigo-600">جارٍ تحديث بنك الأسئلة المصرح من الخادم…</p>}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => { setSelectedForPush([]); setShowPushModal(true); }} disabled={data?.status === 'ended' || loadingBank || Boolean(bankError)} className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-3.5 py-2 text-xs font-black text-white hover:from-emerald-700 hover:to-teal-700 shadow-xs transition-all active:scale-95 disabled:opacity-50"><PlusCircle size={14} /> إرسال أسئلة / حزمة مهارة الآن 🚀</button>
            {currentQIndex !== undefined && currentQIndex < (data?.questions || []).length - 1 && (
              <button type="button" onClick={() => onPublish(currentQIndex + 1)} disabled={data?.status === 'ended'} className="flex items-center gap-1.5 rounded-xl bg-indigo-50 px-3.5 py-2 text-xs font-black text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-300 transition-colors"><SkipForward size={14} /> الانتقال للسؤال التالي</button>
            )}
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {(data?.questions || []).map((question: any) => {
            const isActive = data?.activeQuestionIndex === question.index;
            const isChallenge = canonicalChallengeIds.includes(question.questionId) || challengeIds.includes(question.questionId);
            return (
              <div key={question.questionId} className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl border p-4 transition-all ${isActive ? 'border-indigo-600 bg-indigo-50/70 shadow-xs dark:bg-indigo-950/30 dark:border-indigo-500' : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-850'}`}>
                <div className="flex items-start sm:items-center gap-3">
                  <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-black ${isActive ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200'}`}>{question.index + 1}</span>
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-slate-900 dark:text-white text-sm"><span className="text-indigo-600 dark:text-indigo-400 ml-1 font-black">سؤال {question.index + 1}:</span><QuestionContentRenderer content={question.text} className="inline-block align-middle max-h-24 overflow-hidden" /></div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-slate-500"><span>{question.options?.length || 4} خيارات</span>{isChallenge && <span className="inline-flex items-center gap-0.5 rounded-md bg-amber-100 px-1.5 py-0.5 font-black text-amber-800 dark:bg-amber-950/50 dark:text-amber-300">⚡ تحدي سريع</span>}{isActive && <span className="font-black text-emerald-600 dark:text-emerald-400">● معروض على أجهزة الطلاب</span>}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 self-end sm:self-center">
                  <button type="button" onClick={() => onPublish(question.index)} disabled={data?.status === 'ended'} className={`rounded-xl px-3.5 py-2 text-xs font-bold transition-all disabled:opacity-50 ${isActive ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200'}`}>{isActive ? 'منشور حالياً ✓' : 'نشر اعتيادي'}</button>
                  <button type="button" onClick={() => void handleInstantChallenge(question, 45)} disabled={data?.status === 'ended'} className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-3.5 py-2 text-xs font-black text-white hover:from-amber-600 hover:to-orange-600 shadow-xs transition-all active:scale-95 disabled:opacity-50"><Zap size={14} /> بث كتحدٍ سريع ⚡</button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <button type="button" onClick={onEnd} disabled={data?.status === 'ended'} className="rounded-2xl bg-rose-600 px-6 py-3 font-black text-white hover:bg-rose-700 disabled:opacity-50 shadow-md transition-all active:scale-95 text-sm">{data?.status === 'ended' ? 'الجلسة منتهية ومحفوظة بالأرشيف' : 'إنهاء الجلسة وحفظ التقرير بالأرشيف'}</button>
        {isTeacher && <Link to="/school-teacher-dashboard?tab=smart-classroom" className="text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200">العودة للوحة معلم المدرسة →</Link>}
      </div>
      {message && <p className="mt-4 text-sm font-bold text-slate-600">{message}</p>}

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
        onClearSelection={() => setSelectedForPush([])}
        onToggleQuestion={(id) => setSelectedForPush((prev) => prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id])}
        onSubmit={() => void handlePushQuestionsSubmit()}
      />
    </main>
  );
};