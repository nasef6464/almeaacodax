import React, { useEffect, useState } from 'react';
import { flushSync } from 'react-dom';
/** Limits screen rows only, preserving the full data and print/export source. */
export function useDisplayLimit(initial: number, scope: string) {
 const [limit, setLimit] = useState(initial);
 const [printing, setPrinting] = useState(false);
 useEffect(() => {
  const before = () => flushSync(() => setPrinting(true));
  const after = () => setPrinting(false);
  window.addEventListener('beforeprint', before); window.addEventListener('afterprint', after);
  return () => { window.removeEventListener('beforeprint', before); window.removeEventListener('afterprint', after); };
 }, []);
 useEffect(() => setLimit(initial), [initial, scope]);
 return { limit: printing ? Number.MAX_SAFE_INTEGER : limit, onMore: () => setLimit(value => value + initial), onLess: () => setLimit(initial), initial };
}
export const DisplayListControls = ({ total, limit, initial, onMore, onLess, label }: { total: number; limit: number; initial: number; onMore: () => void; onLess: () => void; label: string }) => total > initial ? <div className="print:hidden flex flex-wrap items-center justify-center gap-3 py-3" role="group" aria-label={label}><span className="text-xs text-slate-500">عرض {Math.min(limit, total)} من {total}</span>{limit < total ? <button type="button" onClick={onMore} className="rounded-xl bg-indigo-50 px-4 py-2 text-sm font-bold text-indigo-700">عرض المزيد</button> : null}{limit > initial ? <button type="button" onClick={onLess} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-600">عرض أقل</button> : null}</div> : null;
