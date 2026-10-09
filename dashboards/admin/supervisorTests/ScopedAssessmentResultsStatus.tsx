import React from 'react';

export const ScopedAssessmentResultsStatus = ({ loading, error, hasMore, truncatedScope, reload, loadMore }: {
  loading: boolean; error: boolean; hasMore: boolean; truncatedScope: boolean; reload: () => void; loadMore: () => void;
}) => <div className="flex flex-wrap items-center gap-3 rounded-xl border border-indigo-100 bg-indigo-50 p-3 text-sm print:hidden">
  {loading ? <span role="status">جارٍ تحميل نتائج الطلاب…</span> : <button onClick={reload} className="font-bold text-indigo-700">تحديث النتائج</button>}
  {error && <span role="alert" className="text-rose-700">تعذر تحميل النتائج. اضغط تحديث النتائج لإعادة المحاولة.</span>}
  {(hasMore || truncatedScope) && <span>التحليل للبيانات المحملة حاليًا؛ لم تكتمل تغطية جميع النتائج.</span>}
  {hasMore && <button disabled={loading} onClick={loadMore} className="font-bold text-indigo-700">تحميل نتائج إضافية</button>}
</div>;
