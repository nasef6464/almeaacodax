import React from 'react';
import { studentLearningContextLabels, type StudentLearningContext } from '../utils/studentLearningContext';
import type { useStudentResultHistory } from '../hooks/useStudentResultHistory';

export const StudentResultHistoryControls = ({ context, onContextChange, history }: {
  context: StudentLearningContext;
  onContextChange: (context: StudentLearningContext) => void;
  history: ReturnType<typeof useStudentResultHistory>;
}) => (
  <section data-testid="student-result-history-context" className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
    <div className="flex flex-wrap gap-2" aria-label="مصدر نتائج الاختبارات">
      {Object.entries(studentLearningContextLabels).map(([value, label]) => (
        <button key={value} type="button" aria-pressed={context === value}
          onClick={() => onContextChange(value as StudentLearningContext)}
          className={`rounded-xl px-3 py-2 text-sm font-bold ${context === value ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700'}`}>{label}</button>
      ))}
    </div>
    <p className="text-xs leading-6 text-slate-600">اختر نتائج اختبارات المنصة أو اختبارات المدرسة. افتح النتيجة للاطلاع على التفاصيل.</p>
    {history.loading ? <p role="status" className="text-sm">جارٍ تحميل السجل…</p> : null}
    {history.error ? <div role="alert" className="text-sm text-rose-700">{history.error} <button type="button" onClick={() => void history.retry()} className="font-bold underline">إعادة المحاولة</button></div> : null}
    {!history.loading && !history.error ? <p className="text-xs text-slate-500">عرض {history.results.length} من {history.total} محاولة. ملخص الدرجات للمحاولات المحملة.</p> : null}
    {history.hasNext ? <button type="button" disabled={history.loading} onClick={() => void history.loadMore()}
      className="rounded-xl bg-indigo-50 px-4 py-2 text-sm font-bold text-indigo-700 disabled:opacity-50">تحميل محاولات أقدم</button> : null}
  </section>
);
