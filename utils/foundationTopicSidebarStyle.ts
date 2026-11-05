/** Shared, subtle separation for Foundation topic choices across learner entry points. */
export const foundationTopicSidebarListSpacing = 'space-y-2';

export const foundationTopicSidebarItemTone = (selected: boolean): string =>
  selected
    ? 'bg-indigo-50 border-indigo-100 shadow-sm'
    : 'bg-slate-50 border-slate-200 hover:bg-slate-100 hover:border-indigo-200';
