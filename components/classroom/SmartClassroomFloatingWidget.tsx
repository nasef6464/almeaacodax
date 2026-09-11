import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Award, CheckCircle2, ChevronDown, ChevronUp, Loader2, Minimize2, Presentation, Send, Volume2, X, Zap } from 'lucide-react';
import { api } from '../../services/api';
import { useClassroomRealtime } from '../../hooks/useClassroomRealtime';
import { useAuth } from '../../contexts/AuthContext';

const OPTION_LETTERS = ['أ', 'ب', 'ج', 'د', 'هـ'];

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
  const [isMinimized, setIsMinimized] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  
  const [question, setQuestion] = useState<any>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  
  const lastQuestionIdRef = useRef<string>('');

  const loadCurrentQuestion = useCallback(async () => {
    if (!sessionId || !joined) return;
    try {
      const result = await api.getClassroomCurrentQuestion(sessionId);
      if (result?.question) {
        setQuestion(result.question);
        // Automatic Pop-Up if this is a new question
        if (result.question.questionId !== lastQuestionIdRef.current) {
          lastQuestionIdRef.current = result.question.questionId;
          setSelected(null);
          setSubmitted(false);
          setIsOpen(true);
          setIsMinimized(false);
          playChime();
        }
      } else {
        setQuestion(null);
      }
    } catch {
      setQuestion(null);
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

  const handleAnswer = async () => {
    if (!question || selected === null || submitting || submitted) return;
    setSubmitting(true);
    try {
      await api.answerClassroomQuestion(sessionId, question.questionId, selected);
      setSubmitted(true);
      setMessage('✅ تم إرسال إجابتك مباشرة إلى المعلم!');
    } catch {
      setMessage('تعذر إرسال الإجابة، يرجى المحاولة مرة أخرى.');
    } finally {
      setSubmitting(false);
    }
  };

  const isChallenge = question?.type === 'challenge' || question?.text?.includes('[تحدي]') || question?.text?.includes('تحدي');

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
                setIsMinimized(false);
              } else {
                setShowJoinModal(true);
              }
            }}
            className={`group flex items-center gap-2.5 rounded-full px-4 py-3 font-black text-white shadow-xl transition-all duration-300 hover:scale-105 active:scale-95 ${
              joined && question && !submitted
                ? 'animate-bounce bg-gradient-to-r from-amber-500 to-rose-600 shadow-amber-500/40'
                : joined
                ? 'bg-gradient-to-r from-indigo-600 to-slate-900 shadow-indigo-600/30'
                : 'border border-indigo-200 bg-white text-indigo-700 shadow-lg hover:bg-indigo-50 dark:border-slate-700 dark:bg-slate-900 dark:text-indigo-400'
            }`}
          >
            <Presentation size={20} className={joined && question && !submitted ? 'animate-spin' : ''} />
            <span className="text-xs sm:text-sm">
              {joined
                ? question && !submitted
                  ? '⚡ سؤال تفاعلي نشط الآن!'
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

      {/* Auto Pop-Up Floating Question Card (Toggles Open Automatically on Question Publish) */}
      {isOpen && joined && (
        <div
          className={`fixed bottom-6 left-6 z-50 w-full transition-all duration-300 ${
            isMinimized ? 'max-w-xs' : 'max-w-md'
          }`}
          dir="rtl"
        >
          <div className={`overflow-hidden rounded-3xl border shadow-2xl transition-all ${
            isChallenge
              ? 'border-amber-400 bg-gradient-to-b from-amber-50 via-white to-amber-50/20 dark:from-slate-900 dark:to-amber-950/30'
              : 'border-indigo-200 bg-white dark:border-slate-800 dark:bg-slate-900'
          }`}>
            {/* Header */}
            <div className={`flex items-center justify-between px-4 py-3 ${
              isChallenge ? 'bg-gradient-to-r from-amber-500 to-purple-600 text-white' : 'bg-slate-900 text-white'
            }`}>
              <div className="flex items-center gap-2">
                {isChallenge ? <Zap size={18} className="animate-bounce" /> : <Presentation size={18} />}
                <span className="text-xs font-black">
                  {isChallenge ? '⚡ سؤال تحدي ذكي من المعلم!' : 'سؤال تفاعلي مباشر 🔴'}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setIsMinimized(!isMinimized)}
                  className="rounded-lg p-1 hover:bg-white/20"
                  title={isMinimized ? 'تكبير' : 'تصغير'}
                >
                  {isMinimized ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="rounded-lg p-1 hover:bg-white/20"
                  title="إغلاق النافذة"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Minimized View */}
            {isMinimized ? (
              <div className="p-3 text-center text-xs font-bold text-slate-700 dark:text-slate-300">
                {question ? (submitted ? '✅ تم التسليم بنجاح' : 'لديك سؤال بانتظار إجابتك!') : 'بانتظار المعلم لنشر السؤال…'}
              </div>
            ) : (
              /* Expanded Question & Options */
              <div className="p-5">
                {!question ? (
                  <div className="py-6 text-center text-slate-500">
                    <Loader2 size={28} className="mx-auto animate-spin text-indigo-600" />
                    <p className="mt-3 text-xs font-bold">بانتظار المعلم لنشر السؤال التالي…</p>
                    <p className="mt-1 text-[11px] text-slate-400">ستظهر الأسئلة هنا تلقائياً دون الحاجة لتحديث الصفحة.</p>
                  </div>
                ) : (
                  <div>
                    <h4 className="text-sm font-black leading-relaxed text-slate-900 dark:text-white">
                      {question.text}
                    </h4>

                    {/* Options List */}
                    <div className="mt-4 space-y-2">
                      {question.options.map((opt: string, idx: number) => (
                        <button
                          key={idx}
                          type="button"
                          disabled={submitted || submitting}
                          onClick={() => setSelected(idx)}
                          className={`flex w-full items-center gap-2.5 rounded-2xl border p-3 text-right text-xs font-bold transition-all ${
                            selected === idx
                              ? 'border-indigo-600 bg-indigo-50 text-indigo-900 shadow-sm dark:bg-indigo-950/40 dark:text-indigo-200'
                              : 'border-slate-100 bg-slate-50/60 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-200'
                          }`}
                        >
                          <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-xs font-black ${
                            selected === idx ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                          }`}>
                            {OPTION_LETTERS[idx] || idx + 1}
                          </span>
                          <span>{opt}</span>
                        </button>
                      ))}
                    </div>

                    {/* Submit Button */}
                    {!submitted ? (
                      <button
                        type="button"
                        disabled={selected === null || submitting}
                        onClick={() => void handleAnswer()}
                        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 text-xs font-black text-white shadow-md hover:bg-indigo-700 disabled:opacity-40"
                      >
                        {submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={15} />}
                        إرسال الإجابة فوراً
                      </button>
                    ) : (
                      <div className="mt-4 rounded-xl bg-emerald-50 p-3 text-center text-xs font-black text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                        <CheckCircle2 size={18} className="mx-auto text-emerald-600 mb-1" />
                        تم إرسال إجابتك بنجاح! بانتظار السؤال التالي من المعلم.
                      </div>
                    )}
                  </div>
                )}
                {message && !submitted && <p className="mt-2 text-center text-[11px] font-bold text-slate-500">{message}</p>}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};
