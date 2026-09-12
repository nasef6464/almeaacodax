import React from 'react';
import { Filter, RotateCcw, Search, Sparkles } from 'lucide-react';

export interface ClassroomFilterState {
  track: string;
  subject: string;
  difficulty: string;
  search: string;
}

interface ClassroomQuestionFilterBarProps {
  filters: ClassroomFilterState;
  onChange: (filters: ClassroomFilterState) => void;
  onReset: () => void;
  totalCount: number;
  filteredCount: number;
}

const TRACK_OPTIONS = [
  { value: '', label: 'جميع المسارات' },
  { value: 'qudurat', label: 'قدرات عامة' },
  { value: 'tahsili', label: 'تحصيلي علمي وأدبي' },
  { value: 'general', label: 'عام ومدرسي' },
];

const SUBJECT_OPTIONS = [
  { value: '', label: 'جميع المواد' },
  { value: 'sub_quant', label: 'قدرات - كمي' },
  { value: 'sub_verbal', label: 'قدرات - لفظي' },
  { value: 'sub_math', label: 'رياضيات' },
  { value: 'sub_physics', label: 'فيزياء' },
  { value: 'sub_chem', label: 'كيمياء' },
  { value: 'sub_bio', label: 'أحياء' },
];

const DIFFICULTY_OPTIONS = [
  { value: '', label: 'كافة المستويات' },
  { value: 'Easy', label: 'تأسيسي (سهل)' },
  { value: 'Medium', label: 'متوسط' },
  { value: 'Hard', label: 'متقدم وتحدي' },
];

export const ClassroomQuestionFilterBar: React.FC<ClassroomQuestionFilterBarProps> = ({
  filters,
  onChange,
  onReset,
  totalCount,
  filteredCount,
}) => {
  const hasActiveFilters = Boolean(
    filters.track || filters.subject || filters.difficulty || filters.search
  );

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/60" dir="rtl">
      {/* Top Filter Bar Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 pb-3 dark:border-slate-800">
        <div className="flex items-center gap-2 text-xs sm:text-sm font-black text-slate-800 dark:text-white">
          <Filter size={16} className="text-indigo-600" />
          <span>فلترة بنك الأسئلة الذكي المعتمد</span>
          <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-bold text-indigo-800 dark:bg-indigo-950/80 dark:text-indigo-300">
            {filteredCount} من {totalCount} سؤالاً
          </span>
        </div>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={onReset}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-50 dark:border-slate-700 dark:bg-slate-800 dark:text-rose-400 dark:hover:bg-rose-950/40"
          >
            <RotateCcw size={12} /> إعادة ضبط الفلاتر
          </button>
        )}
      </div>

      {/* Filter Inputs Grid */}
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {/* Track Filter */}
        <div>
          <label className="block text-[11px] font-bold text-slate-500 mb-1">المسار التدريبي</label>
          <select
            value={filters.track}
            onChange={(e) => onChange({ ...filters, track: e.target.value })}
            className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs font-bold text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            {TRACK_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        {/* Subject Filter */}
        <div>
          <label className="block text-[11px] font-bold text-slate-500 mb-1">المادة الدراسية</label>
          <select
            value={filters.subject}
            onChange={(e) => onChange({ ...filters, subject: e.target.value })}
            className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs font-bold text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            {SUBJECT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        {/* Difficulty Filter */}
        <div>
          <label className="block text-[11px] font-bold text-slate-500 mb-1">مستوى الصعوبة</label>
          <select
            value={filters.difficulty}
            onChange={(e) => onChange({ ...filters, difficulty: e.target.value })}
            className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs font-bold text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            {DIFFICULTY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        {/* Search Filter */}
        <div>
          <label className="block text-[11px] font-bold text-slate-500 mb-1">بحث في نص السؤال</label>
          <div className="relative">
            <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={filters.search}
              onChange={(e) => onChange({ ...filters, search: e.target.value })}
              placeholder="ابحث بالكلمة أو المفهوم…"
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pr-8 pl-3 text-xs font-bold text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
