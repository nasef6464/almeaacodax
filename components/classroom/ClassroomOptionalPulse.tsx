import React, { useMemo, useState } from 'react';

type PulseQuestion = { questionId: string; index: number; responseCount: number; correctCount: number; skillIds?: string[] };
type PulseBatch = { batchId: string; label: string; endedAt?: string | null; questionIds: string[] };

/** Optional, teacher-only view of closed batches. Uses the console's existing aggregate. */
export function ClassroomOptionalPulse({ sessionId, questions, batches, skillNames, canPrepareSupport = false, onPrepareSupport }: {
  sessionId: string; questions: PulseQuestion[]; batches: PulseBatch[]; skillNames: Record<string, string>;
  canPrepareSupport?: boolean; onPrepareSupport: (skillId: string) => void;
}) {
  const [openSession, setOpenSession] = useState<string | null>(null);
  const open = openSession === sessionId;
  const pulse = useMemo(() => {
    const batch = batches.filter(item => item.endedAt).at(-1);
    if (!batch) return null;
    const measured = questions.filter(q => batch.questionIds.includes(q.questionId) && q.responseCount > 0);
    const answered = measured.reduce((sum, q) => sum + q.responseCount, 0);
    const correct = measured.reduce((sum, q) => sum + q.correctCount, 0);
    const hardest = [...measured].sort((a, b) => a.correctCount / a.responseCount - b.correctCount / b.responseCount)[0];
    const skills = new Map<string, { answered: number; correct: number }>();
    for (const q of measured) for (const id of q.skillIds || []) {
      const value = skills.get(id) || { answered: 0, correct: 0 };
      value.answered += q.responseCount; value.correct += q.correctCount; skills.set(id, value);
    }
    const weakest = [...skills].map(([skillId, value]) => ({ skillId, ...value, accuracy: Math.round(value.correct / value.answered * 100) })).sort((a, b) => a.accuracy - b.accuracy)[0];
    return { batch, answered, accuracy: answered ? Math.round(correct / answered * 100) : null, hardest, weakest };
  }, [questions, batches]);
  return <section className="mt-4 rounded-2xl border border-indigo-100 bg-white p-4 dark:bg-slate-900" aria-label="نبض الفصل">
    <button type="button" aria-expanded={open} aria-controls="classroom-optional-pulse" onClick={() => setOpenSession(open ? null : sessionId)} className="text-sm font-black text-indigo-700 dark:text-indigo-300">{open ? 'إخفاء نبض الفصل' : 'عرض نبض الفصل (اختياري)'}</button>
    {open && <div id="classroom-optional-pulse" className="mt-3 space-y-3 text-sm">
      <p className="text-xs text-slate-500">قراءة آخر دفعة مكتملة؛ لا تُعرض إجابات الدفعة الجارية هنا.</p>
      {!pulse ? <p>سيظهر الملخص بعد إنهاء أول دفعة.</p> : <>
        <p className="font-bold">{pulse.batch.label} • {pulse.answered} إجابة • دقة {pulse.accuracy === null ? 'لم تُقَس بعد' : `${pulse.accuracy}%`}</p>
        {pulse.hardest && <p>السؤال الأكثر احتياجًا للمراجعة: {pulse.hardest.index + 1} • {pulse.hardest.responseCount - pulse.hardest.correctCount} إجابة خاطئة من {pulse.hardest.responseCount}</p>}
        {pulse.weakest && <div className="flex flex-wrap items-center gap-3"><p>أقل المهارات تمكنًا: {skillNames[pulse.weakest.skillId] || 'مهارة تحتاج مراجعة'} • {pulse.weakest.accuracy}% من {pulse.weakest.answered} إجابة</p>{canPrepareSupport && pulse.weakest.accuracy < 70 && <button type="button" onClick={() => onPrepareSupport(pulse.weakest!.skillId)} className="rounded-xl bg-indigo-50 px-3 py-2 font-bold text-indigo-700">تجهيز دفعة دعم لهذه المهارة</button>}</div>}
        <p className="text-xs text-slate-500">إجمالي الإجابات يختلف عن عدد الطلاب. اختر أسئلة الدعم وراجعها قبل إرسالها للفصل.</p>
      </>}
    </div>}
  </section>;
}
