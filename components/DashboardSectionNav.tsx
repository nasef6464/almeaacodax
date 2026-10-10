import React from 'react';
export type DashboardNavItem = { id: string; label: string; icon?: React.ReactNode; description?: string; badge?: React.ReactNode };
export type DashboardNavGroup = { label: string; ids: readonly string[] };
/** Present only the caller's permitted entries; route and permission decisions stay in the caller. */
export const DashboardSectionNav = ({ items, groups, activeId, onSelect }: { items: DashboardNavItem[]; groups: DashboardNavGroup[]; activeId: string; onSelect: (id: string) => void }) => {
 const assigned = new Set(groups.flatMap(group => [...group.ids]));
 const sections = [...groups, { label: 'أقسام أخرى', ids: items.filter(item => !assigned.has(item.id)).map(item => item.id) }];
 return <nav aria-label="أقسام اللوحة" className="space-y-4 px-3" dir="rtl">{sections.map(group => {
  const entries = group.ids.map(id => items.find(item => item.id === id)).filter((item): item is DashboardNavItem => !!item);
  if (!entries.length) return null;
  return <section key={group.label} className="rounded-2xl border border-slate-100 bg-slate-50/70 p-2"><h3 className="px-2 pb-2 pt-1 text-xs font-black text-slate-500">{group.label}</h3><div className="space-y-2">{entries.map(item => <button key={item.id} type="button" aria-current={activeId === item.id ? 'page' : undefined} onClick={() => onSelect(item.id)} className={'flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-right transition-colors ' + (activeId === item.id ? 'border-indigo-200 bg-indigo-50 text-indigo-800' : 'border-slate-200 bg-white text-slate-700 hover:border-indigo-200')}><span className="shrink-0 text-indigo-600">{item.icon}</span><span className="min-w-0 flex-1"><span className="block text-sm font-bold">{item.label}</span>{item.description ? <span className="mt-1 block text-[11px] leading-5 text-slate-500">{item.description}</span> : null}</span>{item.badge != null ? <span className="rounded-full bg-indigo-100 px-2 py-1 text-[10px] font-bold">{item.badge}</span> : null}</button>)}</div></section>;
 })}</nav>;
};
