import React, {useEffect, useState} from 'react';
import {ChevronDown, ChevronLeft} from 'lucide-react';
export type DashboardNavItem = { id: string; label: string; icon?: React.ReactNode; description?: string; badge?: React.ReactNode };
export type DashboardNavGroup = { label: string; ids: readonly string[] };
/** Present only the caller's permitted entries; route and permission decisions stay in the caller. */
export const DashboardSectionNav = ({ items, groups, activeId, onSelect, collapsible = false }: { items: DashboardNavItem[]; groups: DashboardNavGroup[]; activeId: string; onSelect: (id: string) => void; collapsible?: boolean }) => {
 const assigned = new Set(groups.flatMap(group => [...group.ids]));
 const sections = [...groups, { label: 'أقسام أخرى', ids: items.filter(item => !assigned.has(item.id)).map(item => item.id) }];
 const activeGroup = sections.find(group => group.ids.includes(activeId))?.label || '';
 const [expandedGroup, setExpandedGroup] = useState(activeGroup);
 useEffect(() => { setExpandedGroup(activeGroup); }, [activeId, activeGroup]);
 return <nav aria-label="أقسام اللوحة" className="space-y-4 px-3" dir="rtl">{sections.map(group => {
  const entries = group.ids.map(id => items.find(item => item.id === id)).filter((item): item is DashboardNavItem => !!item);
  if (!entries.length) return null;
  const buttons = <div className="space-y-2">{entries.map(item => <button key={item.id} type="button" aria-current={activeId === item.id ? 'page' : undefined} onClick={() => onSelect(item.id)} className={'flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-right transition-colors ' + (activeId === item.id ? 'border-indigo-200 bg-indigo-50 text-indigo-800' : 'border-slate-200 bg-white text-slate-700 hover:border-indigo-200')}><span className="shrink-0 text-indigo-600">{item.icon}</span><span className="min-w-0 flex-1"><span className="block text-sm font-bold">{item.label}</span>{item.description ? <span className="mt-1 block text-[11px] leading-5 text-slate-500">{item.description}</span> : null}</span>{item.badge != null ? <span className="rounded-full bg-indigo-100 px-2 py-1 text-[10px] font-bold">{item.badge}</span> : null}</button>)}</div>;
  return collapsible ? <details key={group.label} open={expandedGroup === group.label} className="rounded-2xl border border-slate-100 bg-slate-50/70 p-2">
   <summary onClick={event => {event.preventDefault();setExpandedGroup(current => current === group.label ? '' : group.label);}} className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 rounded-lg px-2 py-2 text-sm font-black text-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500 [&::-webkit-details-marker]:hidden">
    {group.label}<ChevronDown aria-hidden="true" size={16} className={'shrink-0 transition-transform ' + (expandedGroup === group.label ? 'rotate-180' : '')}/>
   </summary><div className="pt-2">{buttons}</div>
  </details> : <section key={group.label} className="rounded-2xl border border-slate-100 bg-slate-50/70 p-2"><h3 className="px-2 pb-2 pt-1 text-xs font-black text-slate-500">{group.label}</h3>{buttons}</section>;
 })}</nav>;
};

export const DashboardSectionBreadcrumb = ({items, groups, activeId, homeLabel, onHome}: {items: DashboardNavItem[]; groups: DashboardNavGroup[]; activeId: string; homeLabel: string; onHome: () => void}) => {
 const current = items.find(item => item.id === activeId);
 const group = groups.find(item => item.ids.includes(activeId));
 return <nav aria-label="مسار الصفحة" dir="rtl" className="flex min-w-0 flex-wrap items-center gap-1.5 text-xs text-slate-500 print:hidden">
  <button type="button" onClick={onHome} className="min-h-11 rounded-lg px-1 font-bold text-indigo-700 hover:underline">{homeLabel}</button>
  {group && group.ids.length > 1 && <><ChevronLeft aria-hidden="true" size={12}/><span>{group.label}</span></>}
  {current && <><ChevronLeft aria-hidden="true" size={12}/><span aria-current="page" className="font-bold text-slate-800">{current.label}</span></>}
 </nav>;
};
