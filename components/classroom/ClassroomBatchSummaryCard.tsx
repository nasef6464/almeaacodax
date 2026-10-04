import React from 'react';

export type BatchMiniReport = {
  batchId: string;
  label: string;
  questionCount: number;
  answered: number;
  correct: number;
  wrong: number;
  accuracy: number | null;
  skills: Array<{ skillId: string; answered: number; correct: number; accuracy: number | null }>;
};

interface ClassroomBatchSummaryCardProps {
  report: BatchMiniReport;
  hasActiveBatch: boolean;
  canSendNextPreset: boolean;
  onSendNextPreset: () => void;
  onDismiss: () => void;
}

export const ClassroomBatchSummaryCard: React.FC<ClassroomBatchSummaryCardProps> = ({
  report,
  hasActiveBatch,
  canSendNextPreset,
  onSendNextPreset,
  onDismiss,
}) => {
  return (
    <section className="mt-4 rounded-3xl border border-emerald-200 bg-emerald-50/90 p-5 shadow-sm dark:border-emerald-900/60 dark:bg-emerald-950/20">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-600 text-white text-xs font-black">✓</span>
            <h2 className="text-base font-black text-emerald-950 dark:text-emerald-200">ملخص {report.label} الفوري</h2>
          </div>
          <p className="mt-1 text-xs text-emerald-800 dark:text-emerald-300">تم إغلاق الدفعة بنجاح وتثبيت استجابات الطلاب.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onSendNextPreset}
            disabled={hasActiveBatch || !canSendNextPreset}
            className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-black text-white hover:bg-indigo-700 shadow-xs"
          >
            + إرسال 5 أسئلة التالية 🚀
          </button>
          <button
            type="button"
            onClick={onDismiss}
            className="rounded-xl border border-emerald-300 bg-white px-3 py-2 text-xs font-bold text-emerald-800 hover:bg-emerald-100/60 dark:bg-slate-900 dark:border-emerald-800 dark:text-emerald-200"
          >
            إخفاء
          </button>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <div className="rounded-2xl bg-white p-3.5 text-center shadow-2xs dark:bg-slate-900">
          <div className="text-xl font-black">{report.answered}</div>
          <div className="text-xs font-bold text-slate-500">إجمالي الإجابات</div>
        </div>
        <div className="rounded-2xl bg-white p-3.5 text-center shadow-2xs dark:bg-slate-900">
          <div className="text-xl font-black text-emerald-600">{report.correct}</div>
          <div className="text-xs font-bold text-slate-500">إجابات صحيحة</div>
        </div>
        <div className="rounded-2xl bg-white p-3.5 text-center shadow-2xs dark:bg-slate-900">
          <div className="text-xl font-black text-rose-600">{report.wrong}</div>
          <div className="text-xs font-bold text-slate-500">إجابات خاطئة</div>
        </div>
        <div className="rounded-2xl bg-white p-3.5 text-center shadow-2xs dark:bg-slate-900">
          <div className="text-xl font-black text-indigo-600">{report.accuracy ?? '—'}{report.accuracy !== null ? '%' : ''}</div>
          <div className="text-xs font-bold text-slate-500">متوسط دقة الفصل</div>
        </div>
      </div>
      {report.skills && report.skills.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2 pt-2 border-t border-emerald-200/60 dark:border-emerald-900/40 text-xs">
          <span className="font-black text-emerald-900 dark:text-emerald-300">المهارات المشمولة:</span>
          {report.skills.map((s) => (
            <span key={s.skillId} className="rounded-lg bg-emerald-100/80 px-2 py-0.5 font-bold text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200">
              {s.skillId} (دقة {s.accuracy ?? '—'}%)
            </span>
          ))}
        </div>
      )}
    </section>
  );
};
