import React from 'react';

/** Limits rendered rows only; existing server history pagination remains independent. */
export const StudentListPager = ({ shown, total, onMore, onLess }: {
  shown: number; total: number; onMore: () => void; onLess: () => void;
}) => total > 4 ? (
  <div className="flex flex-wrap items-center justify-center gap-3 py-3" data-testid="student-list-pager">
    <span className="text-xs text-slate-500">عرض {Math.min(shown, total)} من {total}</span>
    {shown < total ? <button type="button" onClick={onMore} className="rounded-xl bg-indigo-50 px-4 py-2 text-sm font-bold text-indigo-700">عرض المزيد</button> : null}
    {shown > 4 ? <button type="button" onClick={onLess} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-600">عرض أقل</button> : null}
  </div>
) : null;
