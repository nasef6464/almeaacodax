import React, { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle2, Loader2, Presentation, Send, Sparkles, Zap } from 'lucide-react';
import { api } from '../services/api';
import { useClassroomRealtime } from '../hooks/useClassroomRealtime';
import { useAuth } from '../contexts/AuthContext';
import { QuestionContentRenderer } from '../components/classroom/QuestionContentRenderer';

const OPTION_LETTERS = ['أ', 'ب', 'ج', 'د', 'هـ'];

export const ClassroomStudentLive: React.FC = () => {
  const { sessionId = '' } = useParams();
  const { user } = useAuth();
  const [pin, setPin] = useState(() => sessionStorage.getItem('classroom_pin') || '');
  const [question, setQuestion] = useState<any>(null);
  const [message, setMessage] = useState('');
  const [selected, setSelected] = useState<number | null>(null);
  const [joined, setJoined] = useState(() => Boolean(sessionStorage.getItem('classroom_joined') === 'true' && sessionStorage.getItem('classroom_session_id') === sessionId));
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [joiningInstant, setJoiningInstant] = useState(false);

  const loadCurrent = useCallback(() => {
    return api.getClassroomCurrentQuestion(sessionId).then((current) => {
      setQuestion(current.question);
      setSelected(null);
      setSubmitted(false);
      setMessage('سؤال جديد متاح.');
    }).catch(() => {
      setQuestion(null);
    });
  }, [sessionId]);

  useClassroomRealtime(joined ? sessionId : '', loadCurrent);

  // Auto-attempt instant join on mount if student is logged in and not joined yet
  useEffect(() => {
    if (joined || !sessionId || !user || user.role !== 'student') return;
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
        // Fallback to manual join screen
      }
    };
    void attemptInstant();
    return () => { mounted = false; };
  }, [sessionId, user, joined, loadCurrent]);

  const instantJoin = async () => {
    setJoiningInstant(true);
    setMessage('جارٍ الانضمام للحصة…');
    try {
      const res = await api.instantJoinClassroomSession(sessionId);
      if (!res?.joined) throw new Error('تعذر الانضمام للحصة.');
      setJoined(true);
      sessionStorage.setItem('classroom_session_id', sessionId);
      sessionStorage.setItem('classroom_joined', 'true');
      await loadCurrent();
      setMessage('تم الانضمام بنجاح! 🚀');
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
      setJoined(true);
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


  const answer = async () => {
    if (!question || selected === null || submitting || submitted) return;
    setSubmitting(true);
    try {
      await api.answerClassroomQuestion(sessionId, question.questionId, selected);
      setSubmitted(true);
      setMessage('تم إرسال إجابتك.');
    } catch {
      setMessage('تعذر إرسال الإجابة.');
    } finally {
      setSubmitting(false);
    }
  };

  const isChallenge = question?.type === 'challenge' || question?.text?.includes('تحدي');

  // Not Joined Screen
  if (!joined) {
    return (
      <main className="mx-auto mt-10 max-w-md p-6 text-center" dir="rtl">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400 shadow-inner">
          <Presentation size={36} />
        </div>
        <h1 className="mt-4 text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">انضم للفصل الذكي</h1>
        <p className="mt-2 text-sm text-slate-500">مرحباً بك في الحصة التفاعلية المباشرة</p>

        {user?.role === 'student' && (
          <div className="mt-6 rounded-3xl border border-indigo-100 bg-indigo-50/60 p-5 dark:border-indigo-900/40 dark:bg-indigo-950/20">
            <p className="text-xs font-bold text-indigo-700 dark:text-indigo-300">طالب في هذا الفصل؟</p>
            <button
              type="button"
              onClick={() => void instantJoin()}
              disabled={joiningInstant}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 p-4 font-black text-white shadow-lg hover:bg-indigo-700 disabled:opacity-50 transition-all active:scale-95"
            >
              {joiningInstant ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
              انضمام فوري بدون رمز 🚀
            </button>
          </div>
        )}

        <div className="mt-6 relative">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200 dark:border-slate-800" /></div>
          <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-3 text-slate-400 dark:bg-slate-900">أو عبر رمز الحصة</span></div>
        </div>

        <input
          inputMode="numeric"
          value={pin}
          onChange={(event) => setPin(event.target.value.replace(/\D/g, '').slice(0, 6))}
          className="mt-4 w-full rounded-2xl border border-slate-200 p-4 text-center text-3xl font-black tracking-[0.4em] text-indigo-700 shadow-inner focus:border-indigo-600 focus:outline-hidden dark:border-slate-800 dark:bg-slate-800 dark:text-indigo-400"
          placeholder="000000"
        />
        <button
          type="button"
          onClick={() => void joinByPin()}
          disabled={pin.length !== 6}
          className="mt-3 w-full rounded-xl bg-slate-800 p-3.5 font-black text-white shadow-md hover:bg-slate-700 disabled:opacity-40 transition-all active:scale-95"
        >
          انضمام بالرمز
        </button>
        {message && <p className="mt-3 text-sm font-bold text-slate-600 dark:text-slate-300">{message}</p>}
      </main>
    );
  }

  // Joined, Waiting for Teacher to Publish Question
  if (!question) {
    return (
      <main className="mx-auto mt-16 max-w-md p-6 text-center" dir="rtl">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
          <Loader2 size={32} className="animate-spin" />
        </div>
        <h1 className="mt-4 text-2xl font-black text-slate-900">أنت داخل الحصة</h1>
        <p className="mt-3 font-bold text-slate-600">بانتظار المعلم لنشر السؤال التالي…</p>
        <p className="mt-1 text-xs text-slate-400">ستظهر الأسئلة هنا على جهازك فور إطلاقها من المعلم.</p>
        <p className="mt-4 text-sm text-slate-500">{message}</p>
      </main>
    );
  }

  // Active Question Surface
  return (
    <main className="mx-auto min-h-screen max-w-2xl bg-slate-50 p-4 sm:p-6" dir="rtl">
      <div className={`overflow-hidden rounded-3xl border bg-white p-5 shadow-sm sm:p-8 ${
        isChallenge ? 'border-amber-400 shadow-amber-500/10' : 'border-slate-100'
      }`}>
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-xs font-black text-indigo-600">
            <Presentation size={15} /> سؤال الحصة
          </span>
          {isChallenge && (
            <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-black text-amber-800">
              <Zap size={13} /> سؤال تحدي ذكي
            </span>
          )}
        </div>

        <div className="mt-4">
          <QuestionContentRenderer
            content={question.text}
            asHeading
            className="text-lg sm:text-2xl font-black leading-relaxed text-slate-900"
          />
        </div>

        <div className="mt-6 space-y-3">
          {question.options.map((option: string, index: number) => {
            const isSelected = selected === index;
            return (
              <button
                key={index}
                type="button"
                disabled={submitted || submitting}
                onClick={() => setSelected(index)}
                className={`flex w-full items-center gap-3 rounded-2xl border p-4 text-right font-bold transition-all ${
                  isSelected
                    ? 'border-indigo-600 bg-indigo-50/80 text-indigo-950 shadow-xs'
                    : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-800'
                }`}
              >
                <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-xl text-xs font-black ${
                  isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700'
                }`}>
                  {OPTION_LETTERS[index] || index + 1}
                </span>
                <span className="text-sm">{option}</span>
              </button>
            );
          })}
        </div>

        {!submitted ? (
          <button
            type="button"
            disabled={selected === null || submitting}
            onClick={() => void answer()}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 p-4 font-black text-white shadow-md hover:bg-indigo-700 disabled:opacity-50"
          >
            {submitting ? <Loader2 size={18} className="animate-spin" /> : <Send size={16} />}
            إرسال الإجابة
          </button>
        ) : (
          <div className="mt-6 rounded-2xl bg-emerald-50 p-4 text-center">
            <CheckCircle2 size={24} className="mx-auto text-emerald-600" />
            <p className="mt-1 font-black text-emerald-800">تم إرسال إجابتك بنجاح!</p>
            <p className="mt-1 text-xs text-emerald-600">بانتظار المعلم لنشر السؤال التالي…</p>
          </div>
        )}

        <p className="mt-4 text-center text-sm font-bold text-slate-600">{message}</p>
      </div>
    </main>
  );
};
