import React, { useCallback, useEffect, useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { CheckCircle2, Loader2, Presentation, Send, Sparkles, Zap } from 'lucide-react';
import { api } from '../services/api';
import { useClassroomRealtime } from '../hooks/useClassroomRealtime';
import { useAuth } from '../contexts/AuthContext';
import { QuestionContentRenderer } from '../components/classroom/QuestionContentRenderer';

const OPTION_LETTERS = ['أ', 'ب', 'ج', 'د', 'هـ'];

export const ClassroomStudentLive: React.FC = () => {
  const { sessionId = '' } = useParams();
  const { user, loading: authLoading } = useAuth();
  const [pin, setPin] = useState(() => sessionStorage.getItem('classroom_pin') || '');
  const [question, setQuestion] = useState<any>(null);
  const [message, setMessage] = useState('');
  const [selected, setSelected] = useState<number | null>(null);
  const [joined, setJoined] = useState(() => Boolean(sessionStorage.getItem('classroom_joined') === 'true' && sessionStorage.getItem('classroom_session_id') === sessionId));
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [joiningInstant, setJoiningInstant] = useState(false);
  const [sessionEnded, setSessionEnded] = useState(false);

  const clearLocalClassroomState = useCallback(() => {
    sessionStorage.removeItem('classroom_joined');
    sessionStorage.removeItem('classroom_session_id');
    sessionStorage.removeItem('classroom_pin');
    setJoined(false);
    setQuestion(null);
    setSelected(null);
    setSubmitted(false);
  }, []);

  const handleSessionEnded = useCallback(() => {
    clearLocalClassroomState();
    setSessionEnded(true);
    setMessage('انتهت الحصة وتم حفظ مشاركتك.');
  }, [clearLocalClassroomState]);

  const loadCurrent = useCallback(() => {
    if (sessionEnded) return Promise.resolve();
    return api.getClassroomCurrentQuestion(sessionId).then((current) => {
      setQuestion(current.question);
      setSelected(null);
      setSubmitted(false);
      setMessage(current.question ? 'سؤال جديد متاح.' : 'بانتظار المعلم لنشر السؤال التالي…');
    }).catch(() => {
      setQuestion(null);
    });
  }, [sessionId, sessionEnded]);

  useClassroomRealtime(joined && !sessionEnded ? sessionId : '', loadCurrent, handleSessionEnded);

  useEffect(() => {
    if (joined || sessionEnded || !sessionId || !user || user.role !== 'student') return;
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
        // Keep the explicit PIN fallback available for an authorized student.
      }
    };
    void attemptInstant();
    return () => { mounted = false; };
  }, [sessionId, user, joined, loadCurrent, sessionEnded]);

  const instantJoin = async () => {
    setJoiningInstant(true);
    setMessage('جارٍ الانضمام للحصة…');
    try {
      const res = await api.instantJoinClassroomSession(sessionId);
      if (!res?.joined) throw new Error('تعذر الانضمام للحصة.');
      setSessionEnded(false);
      setJoined(true);
      sessionStorage.setItem('classroom_session_id', sessionId);
      sessionStorage.setItem('classroom_joined', 'true');
      await loadCurrent();
      setMessage('تم الانضمام بنجاح.');
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
      setSessionEnded(false);
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
    if (!question || selected === null || submitting || submitted || sessionEnded) return;
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

  if (authLoading) {
    return <main className="min-h-screen flex items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-indigo-600" /></main>;
  }
  if (!user) return <Navigate to="/?auth=login" replace />;
  if (user.role !== 'student') return <Navigate to={user.role === 'teacher' ? '/school-teacher-dashboard?tab=smart-classroom' : '/'} replace />;

  if (sessionEnded) {
    return (
      <main className="mx-auto flex min-h-screen max-w-lg items-center p-6 text-center" dir="rtl">
        <div className="w-full rounded-3xl border border-emerald-200 bg-white p-8 shadow-lg">
          <CheckCircle2 size={52} className="mx-auto text-emerald-600" />
          <h1 className="mt-4 text-2xl font-black text-slate-900">انتهت الحصة الذكية</h1>
          <p className="mt-2 text-sm font-bold text-slate-600">تم حفظ مشاركتك وإجاباتك في تقرير الحصة.</p>
          <a href="/dashboard" className="mt-6 inline-flex rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-black text-white">العودة لمساحة الطالب</a>
        </div>
      </main>
    );
  }

  const isChallenge = question?.type === 'challenge' || question?.text?.includes('تحدي');

  if (!joined) {
    return (
      <main className="mx-auto mt-10 max-w-md p-6 text-center" dir="rtl">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-indigo-50 text-indigo-600 shadow-inner">
          <Presentation size={36} />
        </div>
        <h1 className="mt-4 text-2xl sm:text-3xl font-black text-slate-900">انضم للفصل الذكي</h1>
        <p className="mt-2 text-sm text-slate-500">مرحباً بك في الحصة التفاعلية المباشرة</p>
        <div className="mt-6 rounded-3xl border border-indigo-100 bg-indigo-50/60 p-5">
          <p className="text-xs font-bold text-indigo-700">طالب في هذا الفصل؟</p>
          <button type="button" onClick={() => void instantJoin()} disabled={joiningInstant} className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 p-4 font-black text-white shadow-lg hover:bg-indigo-700 disabled:opacity-50">
            {joiningInstant ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
            انضمام فوري بدون رمز
          </button>
        </div>
        <div className="mt-6 relative"><div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200" /></div><div className="relative flex justify-center text-xs"><span className="bg-white px-3 text-slate-400">أو عبر رمز الحصة</span></div></div>
        <input inputMode="numeric" value={pin} onChange={(event) => setPin(event.target.value.replace(/\D/g, '').slice(0, 6))} className="mt-4 w-full rounded-2xl border border-slate-200 p-4 text-center text-3xl font-black tracking-[0.4em] text-indigo-700" placeholder="000000" />
        <button type="button" onClick={() => void joinByPin()} disabled={pin.length !== 6} className="mt-3 w-full rounded-xl bg-slate-800 p-3.5 font-black text-white disabled:opacity-40">انضمام بالرمز</button>
        {message && <p className="mt-3 text-sm font-bold text-slate-600">{message}</p>}
      </main>
    );
  }

  if (!question) {
    return (
      <main className="mx-auto mt-16 max-w-md p-6 text-center" dir="rtl">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600"><Loader2 size={32} className="animate-spin" /></div>
        <h1 className="mt-4 text-2xl font-black text-slate-900">أنت داخل الحصة</h1>
        <p className="mt-3 font-bold text-slate-600">بانتظار المعلم لنشر السؤال التالي…</p>
        <p className="mt-1 text-xs text-slate-400">ستظهر الأسئلة هنا على جهازك فور إطلاقها من المعلم.</p>
        <p className="mt-4 text-sm text-slate-500">{message}</p>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen max-w-2xl bg-slate-50 p-4 sm:p-6" dir="rtl">
      <div className={`overflow-hidden rounded-3xl border bg-white p-5 shadow-sm sm:p-8 ${isChallenge ? 'border-amber-400 shadow-amber-500/10' : 'border-slate-100'}`}>
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-xs font-black text-indigo-600"><Presentation size={15} /> سؤال الحصة</span>
          {isChallenge && <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-black text-amber-800"><Zap size={13} /> سؤال تحدي ذكي</span>}
        </div>
        <div className="mt-4"><QuestionContentRenderer content={question.text} asHeading className="text-lg sm:text-2xl font-black leading-relaxed text-slate-900" /></div>
        {question.imageUrl && <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-2"><img src={question.imageUrl} alt="توضيح السؤال" className="mx-auto max-h-64 w-auto object-contain" /></div>}
        <div className="mt-6 space-y-3">
          {question.options.map((option: string, index: number) => {
            const isSelected = selected === index;
            return (
              <button key={index} type="button" disabled={submitted || submitting} onClick={() => setSelected(index)} className={`flex w-full items-center gap-3 rounded-2xl border p-4 text-right font-bold transition-all ${isSelected ? 'border-indigo-600 bg-indigo-50/80 text-indigo-950' : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-800'}`}>
                <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-xl text-xs font-black ${isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700'}`}>{OPTION_LETTERS[index] || index + 1}</span>
                <span className="text-sm">{option}</span>
              </button>
            );
          })}
        </div>
        {!submitted ? (
          <button type="button" disabled={selected === null || submitting} onClick={() => void answer()} className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 p-4 font-black text-white shadow-md hover:bg-indigo-700 disabled:opacity-50">
            {submitting ? <Loader2 size={18} className="animate-spin" /> : <Send size={16} />} إرسال الإجابة
          </button>
        ) : (
          <div className="mt-6 rounded-2xl bg-emerald-50 p-4 text-center"><CheckCircle2 size={24} className="mx-auto text-emerald-600" /><p className="mt-1 font-black text-emerald-800">تم إرسال إجابتك بنجاح!</p><p className="mt-1 text-xs text-emerald-600">بانتظار المعلم لنشر السؤال التالي…</p></div>
        )}
        <p className="mt-4 text-center text-sm font-bold text-slate-600">{message}</p>
      </div>
    </main>
  );
};
