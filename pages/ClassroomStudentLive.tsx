import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../services/api';
import { useClassroomRealtime } from '../hooks/useClassroomRealtime';

export const ClassroomStudentLive: React.FC = () => {
  const { sessionId = '' } = useParams(); const [pin, setPin] = useState(''); const [question, setQuestion] = useState<any>(null); const [message, setMessage] = useState(''); const [selected, setSelected] = useState<number | null>(null); const [joined, setJoined] = useState(false);
  const loadCurrent = () => api.getClassroomCurrentQuestion(sessionId).then((current) => { setQuestion(current.question); setMessage('سؤال جديد متاح.'); }).catch(() => null);
  useClassroomRealtime(joined ? sessionId : '', loadCurrent);
  const join = async () => { try { await api.joinClassroomSession(sessionId, pin); setJoined(true); await loadCurrent(); setMessage('تم الانضمام للحصة.'); } catch { setMessage('تعذر الانضمام. تأكد من الرمز وأنك ضمن الفصل.'); } };
  const answer = async () => { if (!question || selected === null) return; try { await api.answerClassroomQuestion(sessionId, question.questionId, selected); setMessage('تم إرسال إجابتك.'); } catch { setMessage('تعذر إرسال الإجابة.'); } };
  if (!question) return <main className="mx-auto mt-12 max-w-sm p-5 text-center"><h1 className="text-2xl font-black">انضم للفصل الذكي</h1><p className="mt-2 text-sm text-slate-500">أدخل رمز الحصة الظاهر على الشاشة.</p><input inputMode="numeric" value={pin} onChange={(event) => setPin(event.target.value.replace(/\D/g, '').slice(0, 6))} className="mt-6 w-full rounded-xl border p-4 text-center text-2xl tracking-[0.5em]" placeholder="000000" /><button type="button" onClick={() => void join()} className="mt-3 w-full rounded-xl bg-indigo-600 p-4 font-black text-white">انضم الآن</button><p className="mt-3 text-sm text-slate-600">{message}</p></main>;
  return <main className="mx-auto min-h-screen max-w-lg bg-slate-50 p-4"><p className="text-sm font-bold text-indigo-600">سؤال الحصة</p><h1 className="mt-3 text-xl font-black leading-8">{question.text}</h1><div className="mt-6 space-y-3">{question.options.map((option: string, index: number) => <button key={index} type="button" onClick={() => setSelected(index)} className={`w-full rounded-2xl border p-4 text-right font-bold ${selected === index ? 'border-indigo-600 bg-indigo-50' : 'bg-white'}`}>{option}</button>)}</div><button type="button" disabled={selected === null} onClick={() => void answer()} className="mt-6 w-full rounded-xl bg-indigo-600 p-4 font-black text-white disabled:opacity-50">إرسال الإجابة</button><p className="mt-3 text-center text-sm text-slate-600">{message}</p></main>;
};
