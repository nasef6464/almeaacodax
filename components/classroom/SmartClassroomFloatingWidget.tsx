import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Presentation, X } from 'lucide-react';
import { api } from '../../services/api';
import { useClassroomDiscoveryRealtime, useClassroomRealtime } from '../../hooks/useClassroomRealtime';
import { useAuth } from '../../contexts/AuthContext';
import { SmartClassroomExamRunner, ClassroomExamQuestion } from './SmartClassroomExamRunner';

const playChime = () => {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.4);
  } catch {
    // audio is best-effort
  }
};

export const SmartClassroomFloatingWidget: React.FC = () => {
  const { user } = useAuth();
  const [sessionId, setSessionId] = useState(() => sessionStorage.getItem('classroom_session_id') || '');
  const [pin, setPin] = useState(() => sessionStorage.getItem('classroom_pin') || '');
  const [joined, setJoined] = useState(() => Boolean(sessionStorage.getItem('classroom_joined') === 'true' && sessionStorage.getItem('classroom_session_id')));
  const [isOpen, setIsOpen] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [activeSessionAlert, setActiveSessionAlert] = useState<{ sessionId: string; className: string; teacherName: string; status: string } | null>(null);
  const [questionsList, setQuestionsList] = useState<ClassroomExamQuestion[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  const lastQuestionIdRef = useRef('');
  const publishedSignatureRef = useRef('');

  const clearJoinedSession = useCallback((endedMessage?: string) => {
    sessionStorage.removeItem('classroom_session_id');
    sessionStorage.removeItem('classroom_joined');
    sessionStorage.removeItem('classroom_pin');
    setSessionId('');
    setPin('');
    setJoined(false);
    setIsOpen(false);
    setQuestionsList([]);
    setAnswers({});
    setSubmitted(false);
    setSubmitting(false);
    setActiveIdx(0);
    lastQuestionIdRef.current = '';
    publishedSignatureRef.current = '';
    if (endedMessage) setMessage(endedMessage);
  }, []);

  const checkActiveSession = useCallback(async () => {
    if (!user || user.role !== 'student') return;
    try {
      const result = await api.getStudentActiveClassroomSession();
      if (result.hasActiveSession && result.session) {
        if (result.session.sessionId !== sessionId || !joined) setActiveSessionAlert(result.session);
        else setActiveSessionAlert(null);
      } else {
        setActiveSessionAlert(null);
        if (joined && sessionId) clearJoinedSession('انتهت الحصة الذكية وتم حفظ مشاركتك.');
      }
    } catch {
      setActiveSessionAlert(null);
    }
  }, [clearJoinedSession, joined, sessionId, user]);

  useEffect(() => {
    if (!user || user.role !== 'student') return;
    void checkActiveSession();
  }, [checkActiveSession, user]);

  useClassroomDiscoveryRealtime(
    user?.role === 'student' && Array.isArray(user.groupIds) ? user.groupIds : [],
    () => { void checkActiveSession(); },
  );

  const loadCurrentQuestion = useCallback(async () => {
    if (!sessionId || !joined) return;
    try {
      const result = await api.getClassroomCurrentQuestion(sessionId);
      const nextQuestions: ClassroomExamQuestion[] = Array.isArray(result?.questions) && result.questions.length > 0
        ? result.questions
        : result?.question ? [result.question] : [];
      if (nextQuestions.length === 0) {
        setQuestionsList([]);
        return;
      }
      const signature = nextQuestions.map((question) => question.questionId).join('|');
      const serverSubmitted = Boolean(result?.submitted);
      if (signature !== publishedSignatureRef.current) {
        publishedSignatureRef.current = signature;
        setAnswers({});
        setMessage(serverSubmitted ? 'تم التسليم النهائي لهذه الدفعة.' : '');
      }
      setSubmitted(serverSubmitted);
      setQuestionsList(nextQuestions);
      const active = typeof result.currentIndex === 'number' ? result.currentIndex : 0;
      setActiveIdx(active);
      const currentQuestion = nextQuestions[active] || nextQuestions[0];
      if (currentQuestion && currentQuestion.questionId !== lastQuestionIdRef.current) {
        lastQuestionIdRef.current = currentQuestion.questionId;
        setIsOpen(true);
        playChime();
      }
    } catch {
      setQuestionsList([]);
    }
  }, [sessionId, joined]);

  const handleRealtimeSessionEnd = useCallback(() => {
    clearJoinedSession('انتهت الحصة الذكية وتم حفظ مشاركتك.');
  }, [clearJoinedSession]);

  useClassroomRealtime(joined ? sessionId : '', loadCurrentQuestion, handleRealtimeSessionEnd);

  useEffect(() => {
    if (!joined || !sessionId) return;
    void loadCurrentQuestion();
  }, [joined, sessionId, loadCurrentQuestion]);

  const handleInstantJoin = async () => {
    if (!activeSessionAlert) return;
    const targetSessionId = activeSessionAlert.sessionId;
    try {
      const result = await api.instantJoinClassroomSession(targetSessionId);
      if (!result?.joined) throw new Error('تعذر الانضمام للحصة، يرجى المحاولة مرة أخرى.');
      sessionStorage.setItem('classroom_session_id', targetSessionId);
      sessionStorage.setItem('classroom_joined', 'true');
      setSessionId(targetSessionId);
      setJoined(true);
      setActiveSessionAlert(null);
      setQuestionsList([]);
      setAnswers({});
      setSubmitted(false);
      lastQuestionIdRef.current = '';
      publishedSignatureRef.current = '';
      setIsOpen(true);
      setMessage('');
      playChime();
    } catch (error: any) {
      sessionStorage.removeItem('classroom_joined');
      setMessage(error?.message || 'تعذر الانضمام للحصة. قد تكون الحصة مخصصة لفصل آخر أو انتهت.');
    }
  };

  const handleJoinByPin = async (enteredPin: string) => {
    if (enteredPin.length !== 6) return;
    setMessage('جارٍ التحقق والانضمام…');
    try {
      const result = await api.joinClassroomSessionByPin(enteredPin);
      if (!result.joined || !result.sessionId) throw new Error('تعذر الانضمام للحصة.');
      sessionStorage.setItem('classroom_session_id', result.sessionId);
      sessionStorage.setItem('classroom_pin', enteredPin);
      sessionStorage.setItem('classroom_joined', 'true');
      setSessionId(result.sessionId);
      setPin(enteredPin);
      setJoined(true);
      setShowJoinModal(false);
      setIsOpen(true);
      setAnswers({});
      setSubmitted(false);
      lastQuestionIdRef.current = '';
      publishedSignatureRef.current = '';
      playChime();
      setMessage('تم الانضمام بنجاح.');
    } catch (error: any) {
      setMessage(error?.message || 'رمز الحصة غير صحيح أو منتهي.');
    }
  };

  const handleSelectAnswer = (questionIndex: number, optionIndex: number) => {
    if (submitted || submitting) return;
    setAnswers((current) => ({ ...current, [questionIndex]: optionIndex }));
  };

  const handleSubmitAll = async () => {
    if (submitting || submitted || !sessionId) return;
    const entries = Object.entries(answers);
    if (entries.length === 0) {
      setMessage('اختر إجابة واحدة على الأقل قبل التسليم.');
      return;
    }
    const finalAnswers = entries.flatMap(([indexText, optionIndex]) => {
      const question = questionsList[Number(indexText)];
      return question ? [{ questionId: question.questionId, selectedOptionIndex: optionIndex }] : [];
    });
    if (finalAnswers.length === 0) {
      setMessage('تعذر تحديد الأسئلة المطلوب تسليمها.');
      return;
    }
    setSubmitting(true);
    setMessage('جارٍ تثبيت التسليم النهائي…');
    try {
      await api.post(`/classroom/sessions/${encodeURIComponent(sessionId)}/submit`, { answers: finalAnswers });
      setSubmitted(true);
      setMessage('تم التسليم النهائي لهذه الدفعة بنجاح.');
    } catch (error: any) {
      setSubmitted(false);
      setMessage(error?.message || 'تعذر تثبيت التسليم النهائي. راجع الاتصال وحاول مرة أخرى.');
    } finally {
      setSubmitting(false);
    }
  };

  const currentActiveQ = questionsList[activeIdx] || questionsList[0];
  const isChallenge = Boolean(currentActiveQ?.type === 'challenge' || currentActiveQ?.text?.includes('[تحدي]') || currentActiveQ?.text?.includes('تحدي'));
  if (!user || user.role !== 'student') return null;

  return (
    <>
      {activeSessionAlert && !isOpen && !joined && (
        <div className="fixed bottom-6 right-6 z-50 max-w-sm rounded-3xl border-2 border-indigo-500 bg-slate-900 p-4 text-white shadow-2xl" dir="rtl">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2.5"><span className="flex h-10 w-10 shrink-0 animate-pulse items-center justify-center rounded-2xl bg-indigo-600 text-white"><Presentation size={20} /></span><div><span className="inline-block rounded-md bg-emerald-500/20 px-2 py-0.5 text-[10px] font-black text-emerald-300">حصة ذكية نشطة الآن</span><h4 className="mt-0.5 text-xs font-black text-white">أ. {activeSessionAlert.teacherName} ({activeSessionAlert.className})</h4></div></div>
            <button type="button" onClick={() => setActiveSessionAlert(null)} className="rounded-lg p-1 text-slate-400 hover:text-white"><X size={15} /></button>
          </div>
          <div className="mt-3 flex items-center gap-2"><button type="button" onClick={() => void handleInstantJoin()} className="flex-1 rounded-xl bg-indigo-600 py-2.5 text-xs font-black text-white">انضمام فوري للحصة</button><button type="button" onClick={() => { setActiveSessionAlert(null); setShowJoinModal(true); }} className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-2.5 text-xs font-bold text-slate-300">بالرمز</button></div>
        </div>
      )}

      <div className="fixed bottom-6 left-6 z-40 flex flex-col items-start gap-2" dir="rtl">
        {!isOpen && (
          <button type="button" onClick={() => joined ? setIsOpen(true) : setShowJoinModal(true)} className={`group flex items-center gap-2.5 rounded-full px-4 py-3 font-black shadow-xl ${joined && questionsList.length > 0 && !submitted ? 'bg-gradient-to-r from-amber-500 to-rose-600 text-white' : joined ? 'bg-gradient-to-r from-indigo-600 to-slate-900 text-white' : 'border border-indigo-200 bg-white text-indigo-700'}`}>
            <Presentation size={20} /><span className="text-xs sm:text-sm">{joined ? questionsList.length > 0 && !submitted ? `${questionsList.length > 1 ? `${questionsList.length} أسئلة نشطة` : 'سؤال تفاعلي نشط'} الآن` : submitted ? 'تم تسليم الدفعة' : 'الحصة الذكية جارية' : 'انضم للفصل الذكي'}</span>
          </button>
        )}
        {!joined && message.includes('انتهت الحصة') && <div className="max-w-xs rounded-2xl border border-emerald-200 bg-white px-4 py-3 text-xs font-bold text-emerald-700 shadow-lg">{message}</div>}
      </div>

      {showJoinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs" dir="rtl">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3"><h3 className="flex items-center gap-2 font-black text-slate-900"><Presentation className="text-indigo-600" size={20} /> انضمام لحصة الفصل</h3><button type="button" onClick={() => setShowJoinModal(false)} className="rounded-lg p-1 text-slate-400"><X size={18} /></button></div>
            <p className="mt-3 text-xs leading-relaxed text-slate-500">أدخل رمز الحصة الرقمي (6 أرقام) الظاهر على سبورة الفصل:</p>
            <div className="mt-4 space-y-4"><input inputMode="numeric" value={pin} onChange={(event) => setPin(event.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="000000" className="w-full rounded-2xl border border-slate-200 p-4 text-center text-3xl font-black tracking-widest text-indigo-700" /><button type="button" onClick={() => void handleJoinByPin(pin)} disabled={pin.length !== 6} className="w-full rounded-xl bg-indigo-600 p-3.5 text-sm font-black text-white disabled:opacity-50">انضم الآن للحصة</button>{message && <p className="text-center text-xs font-bold text-rose-600">{message}</p>}</div>
          </div>
        </div>
      )}

      {isOpen && joined && (
        <SmartClassroomExamRunner questions={questionsList} initialIndex={activeIdx} durationMinutes={10} isChallenge={isChallenge} answers={answers} onSelectAnswer={handleSelectAnswer} onSubmit={() => void handleSubmitAll()} submitted={submitted} submitting={submitting} message={message} onClose={() => setIsOpen(false)} />
      )}
    </>
  );
};
