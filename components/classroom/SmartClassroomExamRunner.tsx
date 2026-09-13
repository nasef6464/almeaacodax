import React, { useEffect, useState } from 'react';
import { AlertTriangle, ArrowLeft, ArrowRight, Check, CheckCircle2, Clock, Flag, Lock, Send, Sparkles, Zap } from 'lucide-react';
import { QuestionContentRenderer } from './QuestionContentRenderer';

const OPTION_LETTERS = ['أ', 'ب', 'ج', 'د', 'هـ'];

export interface ClassroomExamQuestion {
  questionId: string;
  text: string;
  imageUrl?: string;
  options: string[];
  type: string;
}

interface SmartClassroomExamRunnerProps {
  questions: ClassroomExamQuestion[];
  initialIndex?: number;
  durationMinutes?: number;
  deadlineAt?: string | null;
  isChallenge?: boolean;
  answers: Record<number, number>;
  onSelectAnswer: (questionIndex: number, optionIndex: number) => void;
  onSubmit: () => void;
  submitted: boolean;
  submitting: boolean;
  message?: string;
  onClose?: () => void;
}

const secondsUntil = (deadlineAt?: string | null) => {
  if (!deadlineAt) return null;
  const deadlineMs = new Date(deadlineAt).getTime();
  if (!Number.isFinite(deadlineMs)) return null;
  return Math.max(0, Math.ceil((deadlineMs - Date.now()) / 1000));
};

export const SmartClassroomExamRunner: React.FC<SmartClassroomExamRunnerProps> = ({
  questions, initialIndex = 0, durationMinutes = 10, deadlineAt = null, isChallenge = false,
  answers, onSelectAnswer, onSubmit, submitted, submitting, message,
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [timeLeft, setTimeLeft] = useState(() => secondsUntil(deadlineAt) ?? durationMinutes * 60);

  useEffect(() => {
    if (initialIndex >= 0 && initialIndex < questions.length) {
      setCurrentIndex(initialIndex);
    }
  }, [initialIndex, questions.length]);

  useEffect(() => {
    const syncTime = () => setTimeLeft(secondsUntil(deadlineAt) ?? durationMinutes * 60);
    syncTime();
    if (submitted) return;
    const interval = setInterval(syncTime, 1000);
    return () => clearInterval(interval);
  }, [deadlineAt, durationMinutes, submitted]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const totalQuestions = questions.length;
  const currentQ = questions[currentIndex] || questions[0];
  const answeredCount = Object.keys(answers).length;
  const progressPercent = totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 0;
  const isTimeCritical = timeLeft < 120 && timeLeft > 0;
  const timerExpired = Boolean(deadlineAt && timeLeft <= 0);

  const handlePrev = () => {
    setCurrentIndex((prev) => Math.max(0, prev - 1));
  };

  const handleNext = () => {
    if (currentIndex < totalQuestions - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      onSubmit();
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col bg-slate-950/95 backdrop-blur-xl text-white select-none overflow-y-auto" dir="rtl">
      <header className="sticky top-0 z-20 border-b border-slate-800 bg-slate-900/90 px-4 sm:px-6 py-3.5 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${isChallenge ? 'bg-amber-500/20 text-amber-400' : 'bg-indigo-500/20 text-indigo-400'}`}>
              {isChallenge ? <Zap size={22} className="animate-bounce" /> : <Sparkles size={22} />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base lg:text-lg font-black text-white">الحصة الذكية · تدريب الفصل المباشر</h2>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-black ${isChallenge ? 'bg-amber-500 text-slate-950' : 'bg-indigo-500 text-white'}`}>
                  {totalQuestions > 1 ? `${totalQuestions} أسئلة تدريبية` : 'سؤال مباشر'}
                </span>
              </div>
              <p className="text-xs text-slate-400">وضع التركيز الكامل للتابلت · عارض أسئلة المنصة المعتمد</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-2 rounded-2xl border px-3.5 py-1.5 font-mono text-sm sm:text-base font-black transition-all ${timerExpired ? 'border-rose-500/60 bg-rose-500/25 text-rose-200' : isTimeCritical ? 'border-rose-500/50 bg-rose-500/20 text-rose-300 animate-pulse' : 'border-amber-500/30 bg-amber-500/10 text-amber-300'}`}>
              <Clock size={18} className={isTimeCritical ? 'animate-spin' : ''} />
              <span>{formatTime(timeLeft)}</span>
            </div>
            <div className="hidden sm:flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-950/40 px-3 py-1 text-xs font-bold text-emerald-400">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" /><span>بث حي</span>
            </div>
            <div className="hidden md:flex items-center gap-1.5 text-slate-400 bg-slate-800/80 px-3 py-1.5 rounded-xl text-xs font-bold">
              <Lock size={14} className="text-amber-400" /><span>شاشة مغلقة</span>
            </div>
          </div>
        </div>
      </header>

      {timerExpired && isChallenge && (
        <div className="mx-auto mt-4 w-full max-w-7xl px-4 sm:px-6">
          <div className="rounded-2xl border border-rose-500/50 bg-rose-950/60 p-3 text-center text-sm font-black text-rose-200">
            انتهى مؤقت التحدي على الخادم. انتظر توجيه المعلم أو الدفعة التالية.
          </div>
        </div>
      )}

      <div className="mx-auto flex max-w-7xl w-full flex-1 flex-col lg:flex-row gap-6 p-4 sm:p-6 lg:p-8">
        <aside className="order-2 lg:order-2 w-full lg:w-72 shrink-0 flex flex-col gap-4">
          <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl backdrop-blur-md">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-black text-white flex items-center gap-2"><Flag size={16} className="text-indigo-400" /> خريطة الأسئلة</h3>
              <span className="text-xs font-mono font-bold text-slate-400">{answeredCount} / {totalQuestions} محلول</span>
            </div>
            <div className="mt-3">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5"><span>نسبة الإنجاز</span><span className="font-bold text-indigo-300">{progressPercent}%</span></div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800"><div className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 transition-all duration-300" style={{ width: `${progressPercent}%` }} /></div>
            </div>
            <div className="mt-4 grid grid-cols-5 gap-2.5">
              {questions.map((_, idx) => {
                const isCurrent = currentIndex === idx;
                const isAnswered = answers[idx] !== undefined;
                return (
                  <button key={idx} type="button" onClick={() => setCurrentIndex(idx)} disabled={timerExpired} className={`relative flex h-11 w-full items-center justify-center rounded-xl text-sm font-black transition-all cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 ${isCurrent ? 'bg-indigo-600 text-white shadow-lg ring-4 ring-indigo-500/30 scale-105 z-10' : isAnswered ? 'border border-emerald-500/40 bg-emerald-950/60 text-emerald-300 hover:bg-emerald-900/60' : 'border border-slate-800 bg-slate-800/60 text-slate-300 hover:border-slate-700 hover:bg-slate-700'}`}>
                    {idx + 1}
                    {isAnswered && !isCurrent && <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-[10px] text-slate-950"><Check size={10} strokeWidth={3} /></span>}
                  </button>
                );
              })}
            </div>
            <div className="mt-5 space-y-1.5 border-t border-slate-800 pt-3 text-[11px] text-slate-400">
              <div className="flex items-center gap-2"><span className="h-3 w-3 rounded bg-indigo-600" /><span>السؤال الحالي المعروض</span></div>
              <div className="flex items-center gap-2"><span className="h-3 w-3 rounded bg-emerald-600" /><span>تم حل السؤال بنجاح</span></div>
              <div className="flex items-center gap-2"><span className="h-3 w-3 rounded bg-slate-800 border border-slate-700" /><span>سؤال بانتظار الإجابة</span></div>
            </div>
            <div className="mt-5 border-t border-slate-800 pt-4">
              <button type="button" disabled={submitting || submitted || timerExpired} onClick={onSubmit} className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 py-3 text-sm font-black text-white shadow-lg transition-all hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50">
                <Send size={16} />{submitted ? 'تم تسليم الاختبار' : timerExpired ? 'انتهى وقت التحدي' : 'تسليم وإنهاء الاختبار'}
              </button>
            </div>
          </div>
        </aside>

        <main className="order-1 lg:order-1 flex-1 flex flex-col justify-between">
          {submitted ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="w-full max-w-xl rounded-3xl border border-emerald-500/30 bg-slate-900/90 p-8 text-center shadow-2xl backdrop-blur-md">
                <CheckCircle2 size={56} className="mx-auto text-emerald-400 mb-4 animate-bounce" />
                <h3 className="text-2xl font-black text-white">تم تسليم جميع إجاباتك بنجاح للمعلم!</h3>
                <p className="mt-2 text-sm text-slate-300">تم تسجيل إجابة <span className="font-bold text-emerald-400">{answeredCount}</span> من أصل <span className="font-bold text-white">{totalQuestions}</span> أسئلة على رادار الحصة المباشر.</p>
                <div className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-emerald-950/60 border border-emerald-500/40 px-5 py-2.5 text-sm font-bold text-emerald-300"><span>انتظر المعلم لمناقشة النتائج على السبورة التفاعلية</span></div>
              </div>
            </div>
          ) : !currentQ ? (
            <div className="flex-1 flex items-center justify-center p-12 text-center"><div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-8"><AlertTriangle size={36} className="mx-auto text-amber-400 mb-2" /><p className="text-slate-300">بانتظار المعلم لنشر الأسئلة…</p></div></div>
          ) : (
            <div className="flex flex-col flex-1 justify-between rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 lg:p-10 shadow-2xl">
              <div>
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-5">
                  <div className="flex items-center gap-2.5">
                    <span className="inline-flex items-center gap-2 rounded-xl bg-indigo-50 px-3.5 py-1.5 text-xs font-black text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300"><span className="h-2 w-2 rounded-full bg-indigo-600 animate-pulse" />السؤال {currentIndex + 1} من {totalQuestions}</span>
                    {isChallenge && <span className="inline-flex items-center gap-1 rounded-xl bg-amber-100 px-3 py-1 text-xs font-black text-amber-800 dark:bg-amber-950/50 dark:text-amber-300">⚡ تحدي السرعة</span>}
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-black ${answers[currentIndex] !== undefined ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'}`}>{answers[currentIndex] !== undefined ? '✓ تمت الإجابة' : 'لم تجب بعد'}</span>
                </div>
                <div className="mt-6"><QuestionContentRenderer content={currentQ.text} asHeading className="text-xl sm:text-2xl lg:text-3xl font-black leading-relaxed" /></div>
                {currentQ.imageUrl && <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-2"><img src={currentQ.imageUrl} alt="توضيح السؤال" className="mx-auto max-h-56 object-contain" /></div>}
                <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5">
                  {currentQ.options.map((opt: string, optIdx: number) => {
                    const isSelected = answers[currentIndex] === optIdx;
                    return (
                      <button key={optIdx} type="button" disabled={timerExpired} onClick={() => onSelectAnswer(currentIndex, optIdx)} className={`group flex min-h-[76px] sm:min-h-[88px] items-center justify-between rounded-2xl border-2 p-4 sm:p-5 text-right transition-all cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 ${isSelected ? 'border-indigo-600 bg-indigo-50/90 text-indigo-950 shadow-md ring-2 ring-indigo-500/20 dark:bg-indigo-950/60 dark:text-indigo-100' : 'border-slate-200 bg-slate-50/70 hover:border-indigo-300 hover:bg-slate-100 text-slate-800 dark:border-slate-800 dark:bg-slate-800/40 dark:text-slate-200'}`}>
                        <div className="flex items-center gap-3.5 flex-1 min-w-0"><span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-base font-black transition-all ${isSelected ? 'bg-indigo-600 text-white shadow-sm scale-105' : 'bg-slate-200 text-slate-700 group-hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-300'}`}>{OPTION_LETTERS[optIdx] || optIdx + 1}</span><span className="text-base sm:text-lg font-bold leading-snug">{opt}</span></div>
                        <div className={`h-6 w-6 shrink-0 rounded-full border-2 flex items-center justify-center transition-all ${isSelected ? 'border-indigo-600 bg-indigo-600' : 'border-slate-300 dark:border-slate-600'}`}>{isSelected && <div className="h-2.5 w-2.5 rounded-full bg-white" />}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mt-10 pt-6 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4">
                <button type="button" disabled={currentIndex === 0 || timerExpired} onClick={handlePrev} className="flex items-center gap-2 rounded-2xl border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-5 sm:px-6 py-3.5 text-sm sm:text-base font-black text-slate-800 dark:text-slate-200 transition-all hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed"><ArrowRight size={20} />السابق</button>
                <div className="text-xs sm:text-sm font-bold text-slate-400">السؤال {currentIndex + 1} من {totalQuestions}</div>
                <button type="button" disabled={timerExpired} onClick={handleNext} className="flex items-center gap-2 rounded-2xl bg-indigo-600 px-6 sm:px-8 py-3.5 text-sm sm:text-base font-black text-white shadow-lg transition-all hover:bg-indigo-700 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed">{currentIndex === totalQuestions - 1 ? 'تسليم الاختبار' : 'التالي'}<ArrowLeft size={20} /></button>
              </div>
              {message && <p className="mt-3 text-center text-xs font-bold text-slate-500">{message}</p>}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
