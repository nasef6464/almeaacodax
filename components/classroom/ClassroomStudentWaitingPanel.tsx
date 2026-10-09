import React from 'react';

export function ClassroomStudentWaitingPanel({ name, message }: { name: string; message: string }) {
  return <main className="mx-auto mt-10 max-w-xl p-4 text-center sm:p-6" dir="rtl">
    <section className="rounded-3xl border border-indigo-100 bg-white p-6 shadow-lg sm:p-8" aria-live="polite">
      <span className="rounded-full bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-700">أنت منضم إلى الحصة</span>
      <h1 className="mt-6 text-2xl font-black text-slate-900">تابع الشرح مع المعلم</h1>
      <p className="mt-3 text-sm leading-7 text-slate-600">ستظهر دفعة الأسئلة هنا تلقائيًا عندما يرسلها المعلم. ابقَ في هذه الصفحة؛ لا تحتاج إلى الانضمام مرة أخرى.</p>
      <p className="mt-5 rounded-xl bg-slate-50 p-3 font-bold text-slate-800">{name}</p>
      {message && <p className="mt-3 text-xs text-indigo-700">{message}</p>}
      <details className="mt-5 text-right text-sm text-slate-500"><summary className="cursor-pointer">إرشادات الحل</summary><p className="mt-2 leading-7">اقرأ السؤال والمطلوب بعناية، وركز على الدقة قبل السرعة. بعد التسليم، تابع شرح المعلم وانتظر الدفعة التالية.</p></details>
    </section>
  </main>;
}
