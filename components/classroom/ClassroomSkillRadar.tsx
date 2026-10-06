import React from 'react';
import { AlertTriangle, CheckCircle2, Target } from 'lucide-react';

export type ClassroomSkillRadarItem = {
  skillId: string;
  skillName: string;
  accuracy: number | null;
  evidenceCount: number;
  sessionsCount?: number;
};

interface ClassroomSkillRadarProps {
  items: ClassroomSkillRadarItem[];
  title?: string;
  subtitle?: string;
  weakThreshold?: number;
  emptyLabel?: string;
  onSkillClick?: (skillId: string) => void;
}

export const ClassroomSkillRadar: React.FC<ClassroomSkillRadarProps> = ({
  items,
  title = 'رادار المهارات',
  subtitle = 'قراءة سريعة لمستوى إتقان المهارات من أدلة الحصة الذكية.',
  weakThreshold = 65,
  emptyLabel = 'لا توجد أدلة مهارية كافية في الفترة المحددة.',
  onSkillClick,
}) => {
  const visibleItems = items
    .filter((item) => item.accuracy !== null && item.evidenceCount > 0)
    .sort((left, right) => (left.accuracy ?? 101) - (right.accuracy ?? 101));

  return (
    <section className="rounded-2xl border border-slate-100 bg-white p-4 dark:border-slate-800 dark:bg-slate-900" dir="rtl">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h4 className="flex items-center gap-2 text-sm font-black text-slate-900 dark:text-white">
            <Target size={17} className="text-indigo-600" />
            {title}
          </h4>
          <p className="mt-1 text-[11px] leading-5 text-slate-500">{subtitle}</p>
        </div>
        {visibleItems.length > 0 && (
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            {visibleItems.length} مهارة
          </span>
        )}
      </div>

      {visibleItems.length === 0 ? (
        <div className="mt-4 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-center text-xs font-bold text-slate-500 dark:border-slate-800 dark:bg-slate-950/40">
          {emptyLabel}
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {visibleItems.map((item) => {
            const accuracy = item.accuracy ?? 0;
            const weak = accuracy < weakThreshold;
            const content = (
              <>
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-xs font-black text-slate-900 dark:text-white">{item.skillName || item.skillId}</div>
                    <div className="mt-0.5 text-[10px] font-bold text-slate-500">
                      {item.evidenceCount} استجابة{item.sessionsCount ? ` · ${item.sessionsCount} حصة` : ''}
                    </div>
                  </div>
                  <div className={`flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-[10px] font-black ${weak ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'}`}>
                    {weak ? <AlertTriangle size={11} /> : <CheckCircle2 size={11} />}
                    {accuracy}%
                  </div>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div
                    className={`h-full rounded-full transition-all ${weak ? 'bg-rose-500' : 'bg-emerald-500'}`}
                    style={{ width: `${Math.max(2, Math.min(100, accuracy))}%` }}
                  />
                </div>
              </>
            );

            return onSkillClick ? (
              <button key={item.skillId} type="button" onClick={() => onSkillClick(item.skillId)} className="block w-full rounded-xl border border-slate-100 p-3 text-right transition hover:border-indigo-200 hover:bg-indigo-50/30 dark:border-slate-800 dark:hover:border-indigo-800 dark:hover:bg-indigo-950/20">
                {content}
              </button>
            ) : (
              <div key={item.skillId} className="rounded-xl border border-slate-100 p-3 dark:border-slate-800">{content}</div>
            );
          })}
        </div>
      )}
    </section>
  );
};
