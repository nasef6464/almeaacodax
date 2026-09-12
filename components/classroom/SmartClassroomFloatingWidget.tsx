import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Presentation, X } from 'lucide-react';
import { api } from '../../services/api';
import { useClassroomRealtime } from '../../hooks/useClassroomRealtime';
import { useAuth } from '../../contexts/AuthContext';
import { SmartClassroomExamRunner, ClassroomExamQuestion } from './SmartClassroomExamRunner';

const playChime = () => {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.4);
  } catch {
    // audio fallback
  }
};

export const SmartClassroomFloatingWidget: React.FC = () => {
  const { user } = useAuth();
  const [sessionId, setSessionId] = useState(() => sessionStorage.getItem('classroom_session_id') || '');
  const [pin, setPin] = useState(() => sessionStorage.getItem('classroom_pin') || '');
  const [joined, setJoined] = useState(() => Boolean(sessionStorage.getItem('classroom_joined') === 'true' && sessionStorage.getItem('classroom_session_id')));
  
  const [isOpen, setIsOpen] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  
  const [questionsList, setQuestionsList] = useState<ClassroomExamQuestion[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  
  const lastQuestionIdRef = useRef<string>('');

  const loadCurrentQuestion = useCallback(async () => {
    if (!sessionId || !joined) return;
    try {
      const result = await api.getClassroomCurrentQuestion(sessionId);
      if (result?.questions && Array.isArray(result.questions) && result.questions.length > 0) {
        setQuestionsList(result.questions);
        const active = typeof result.currentIndex === 'number' ? result.currentIndex : 0;
        setActiveIdx(active);
        const curQ = result.questions[active] || result.questions[0];
        if (curQ && curQ.questionId !== lastQuestionIdRef.current) {
          lastQuestionIdRef.current = curQ.questionId;
          setIsOpen(true);
          playChime();
        }
      } else if (result?.question) {
        setQuestionsList([result.question]);
        setActiveIdx(0);
        if (result.question.questionId !== lastQuestionIdRef.current) {
          lastQuestionIdRef.current = result.question.questionId;
          setIsOpen(true);
          playChime();
        }
      } else {
        setQuestionsList([]);
      }
    } catch {
      setQuestionsList([]);
    }
  }, [sessionId, joined]);

  useClassroomRealtime(joined ? sessionId : '', loadCurrentQuestion);

  // Fallback Polling every 4 seconds when joined
  useEffect(() => {
    if (!joined || !sessionId) return;
    void loadCurrentQuestion();
    const interval = setInterval(() => { void loadCurrentQuestion(); }, 4000);
    return () => clearInterval(interval);
  }, [joined, sessionId, loadCurrentQuestion]);

  const handleJoin = async () => {
    if (!sessionId.trim() || pin.length !== 6) {
      setMessage('يرجى إدخال معرّف الحصة ورمز الـ 6 أرقام كاملاً.');
      return;
    }
    setMessage('جارٍ التحقق والانضمام…');
    try {
      await api.joinClassroomSession(sessionId.trim(), pin.trim());
      sessionStorage.setItem('classroom_session_id', sessionId.trim());
      sessionStorage.setItem('classroom_pin', pin.trim());
      sessionStorage.setItem('classroom_joined', 'true');
      setJoined(true);
      setShowJoinModal(false);
      setIsOpen(true);
      setMessage('تم الانضمام بنجاح! بانتظار نشر الأسئلة.');
      await loadCurrentQuestion();
    } catch {
      setMessage('تعذر الانضمام للحصة. تأكد من الرمز وأنك مسجل في الفصل.');
    }
  };

  const handleSelectAnswer = async (qIndex: number, optIndex: number) => {
    setAnswers((prev) => ({ ...prev, [qIndex]: optIndex }));
    const targetQ = questionsList[qIndex];
    if (targetQ && sessionId) {
      try {
        await api.answerClassroomQuestion(sessionId, targetQ.questionId, optIndex);
      } catch {
        // silently handled
      }
    }
  };

  const handleSubmitAll = async () => {
    setSubmitting(true);
    try {
      for (const [idxStr, optIdx] of Object.entries(answers)) {
        const q = questionsList[Number(idxStr)];
        if (q && sessionId) {
          try {
            await api.answerClassroomQuestion(sessionId, q.questionId, optIdx);
          } catch {
            // continue
          }
        }
      }
      setSubmitted(true);
      setMessage('✅ تم تسليم إجاباتك بنجاح للمعلم!');
    } catch {
      setMessage('تعذر تسليم الإجابة، يرجى المحاولة مرة أخرى.');
    } finally {
      setSubmitting(false);
    }
  };

  const currentActiveQ = questionsList[activeIdx] || questionsList[0];
  const isChallenge = Boolean(
    currentActiveQ?.type === 'challenge' ||
    currentActiveQ?.text?.includes('[تحدي]') ||
    currentActiveQ?.text?.includes('تحدي')
  );

  // If not logged in, don't show
  if (!user) return null;

  return (
    <>
      {/* Floating Dock Button (Bottom-Left) */}
      <div className="fixed bottom-6 left-6 z-40 flex flex-col items-start gap-2" dir="rtl">
        {!isOpen && (
          <button
            type="button"
            onClick={() => {
              if (joined) {
                setIsOpen(true);
              } else {
                setShowJoinModal(true);
              }
            }}
            className={`group flex items-center gap-2.5 rounded-full px-4 py-3 font-black text-white shadow-xl transition-all duration-300 hover:scale-105 active:scale-95 ${
              joined && questionsList.length > 0 && !submitted
                ? 'animate-bounce bg-gradient-to-r from-amber-500 to-rose-600 shadow-amber-500/40'
                : joined
                ? 'bg-gradient-to-r from-indigo-600 to-slate-900 shadow-indigo-600/30'
                : 'border border-indigo-200 bg-white text-indigo-700 shadow-lg hover:bg-indigo-50 dark:border-slate-700 dark:bg-slate-900 dark:text-indigo-400'
            }`}
          >
            <Presentation size={20} className={joined && questionsList.length > 0 && !submitted ? 'animate-spin' : ''} />
            <span className="text-xs sm:text-sm">
              {joined
                ? questionsList.length > 0 && !submitted
                  ? `⚡ ${questionsList.length > 1 ? `${questionsList.length} أسئلة نشطة` : 'سؤال تفاعلي نشط'} الآن!`
                  : 'الحصة الذكية جارية 🟢'
                : 'انضم للفصل الذكي 🎓'}
            </span>
          </button>
        )}
      </div>

      {/* Quick Join Dialog Modal */}
      {showJoinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs" dir="rtl">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <h3 className="flex items-center gap-2 font-black text-slate-900 dark:text-white">
                <Presentation className="text-indigo-600" size={20} /> انضم لحصة معلمك المباشرة
              </h3>
              <button type="button" onClick={() => setShowJoinModal(false)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100">
                <X size={18} />
              </button>
            </div>

            <p className="mt-3 text-xs leading-relaxed text-slate-500">
              أدخل معرّف الحصة أو الرابط ورمز الـ 6 أرقام (PIN) الظاهر على السبورة التفاعلية.
            </p>

            <div className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-600">معرّف الحصة (Session ID)</label>
                <input
                  value={sessionId}
                  onChange={(e) => setSessionId(e.target.value.trim())}
                  placeholder="مثال: 66f... أو الصق رابط الحصة"
                  className="mt-1 w-full rounded-xl border border-slate-200 p-3 text-xs dark:border-slate-700 dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600">رمز الانضمام (6 أرقام)</label>
                <input
                  inputMode="numeric"
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  className="mt-1 w-full rounded-xl border border-slate-200 p-3 text-center text-xl font-black tracking-widest text-indigo-700 dark:border-slate-700 dark:bg-slate-800 dark:text-indigo-400"
                />
              </div>

              <button
                type="button"
                onClick={() => void handleJoin()}
                disabled={!sessionId.trim() || pin.length !== 6}
                className="w-full rounded-xl bg-indigo-600 p-3 text-sm font-black text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                انضم الآن للحصة
              </button>

              {message && <p className="text-center text-xs font-bold text-indigo-700 dark:text-indigo-400">{message}</p>}
            </div>
          </div>
        </div>
      )}

      {/* Full-Screen Focus Mode: Multi-Question Tablet Exam Runner */}
      {isOpen && joined && (
        <SmartClassroomExamRunner
          questions={questionsList}
          initialIndex={activeIdx}
          durationMinutes={10}
          isChallenge={isChallenge}
          answers={answers}
          onSelectAnswer={handleSelectAnswer}
          onSubmit={() => void handleSubmitAll()}
          submitted={submitted}
          submitting={submitting}
          message={message}
          onClose={() => setIsOpen(false)}
        />
      )}
    </>
  );
};
