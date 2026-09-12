import React from 'react';
import { Filter, RotateCcw, Search } from 'lucide-react';
import { useStore } from '../../store/useStore';

export interface ClassroomFilterState {
  pathId?: string;
  subjectId?: string;
  sectionId?: string;
  skillId?: string;
  difficulty?: string;
  search?: string;
  track?: string; // backwards compatibility
  subject?: string; // backwards compatibility
}

interface ClassroomQuestionFilterBarProps {
  filters: ClassroomFilterState;
  onChange: (filters: ClassroomFilterState) => void;
  onReset: () => void;
  totalCount: number;
  filteredCount: number;
}

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
  const { paths, subjects, sections, skills } = useStore();

  const activePathId = filters.pathId || filters.track || '';
  const activeSubjectId = filters.subjectId || filters.subject || '';
  const activeSectionId = filters.sectionId || '';
  const activeSkillId = filters.skillId || '';

  const availableSubjects = activePathId
    ? subjects.filter((s) => s.pathId === activePathId)
    : subjects;

  const availableSections = activeSubjectId
    ? sections.filter((sec) => sec.subjectId === activeSubjectId)
    : sections;

  const availableSkills = activeSectionId
    ? skills.filter((sk) => sk.sectionId === activeSectionId)
    : activeSubjectId
      ? skills.filter((sk) => sk.subjectId === activeSubjectId)
      : skills;

  const hasActiveFilters = Boolean(
    activePathId || activeSubjectId || activeSectionId || activeSkillId || filters.difficulty || filters.search
  );

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/60" dir="rtl">
      {/* Top Filter Bar Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 pb-3 dark:border-slate-800">
        <div className="flex items-center gap-2 text-xs sm:text-sm font-black text-slate-800 dark:text-white">
          <Filter size={16} className="text-indigo-600" />
          <span>فلترة بنك أسئلة المنصة المعتمد</span>
          <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-bold text-indigo-800 dark:bg-indigo-950/80 dark:text-indigo-300">
            {filteredCount} من {totalCount} سؤالاً
          </span>
        </div>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={onReset}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-50 dark:border-slate-700 dark:bg-slate-800 dark:text-rose-400 dark:hover:bg-rose-950/40 transition-colors"
          >
            <RotateCcw size={12} /> إعادة ضبط الفلاتر
          </button>
        )}
      </div>

      {/* Filter Inputs Grid */}
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {/* 1. Track / Path Filter */}
        <div>
          <label className="block text-[11px] font-bold text-slate-500 mb-1">المسار التدريبي</label>
          <select
            value={activePathId}
            onChange={(e) =>
              onChange({
                ...filters,
                pathId: e.target.value,
                track: e.target.value,
                subjectId: '',
                subject: '',
                sectionId: '',
                skillId: '',
              })
            }
            className="w-full rounded-xl border border-slate-200 bg-white p-2 text-xs font-bold text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            <option value="">جميع المسارات</option>
            {paths.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        {/* 2. Subject Filter */}
        <div>
          <label className="block text-[11px] font-bold text-slate-500 mb-1">المادة الدراسية</label>
          <select
            value={activeSubjectId}
            onChange={(e) =>
              onChange({
                ...filters,
                subjectId: e.target.value,
                subject: e.target.value,
                sectionId: '',
                skillId: '',
              })
            }
            className="w-full rounded-xl border border-slate-200 bg-white p-2 text-xs font-bold text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            <option value="">جميع المواد</option>
            {availableSubjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        {/* 3. Main Skill / Section Filter */}
        <div>
          <label className="block text-[11px] font-bold text-slate-500 mb-1">المهارة الرئيسية</label>
          <select
            value={activeSectionId}
            onChange={(e) =>
              onChange({
                ...filters,
                sectionId: e.target.value,
                skillId: '',
              })
            }
            className="w-full rounded-xl border border-slate-200 bg-white p-2 text-xs font-bold text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            <option value="">كل المهارات الرئيسية</option>
            {availableSections.map((sec) => (
              <option key={sec.id} value={sec.id}>
                {sec.name}
              </option>
            ))}
          </select>
        </div>

        {/* 4. Sub-skill Filter */}
        <div>
          <label className="block text-[11px] font-bold text-slate-500 mb-1">المهارة الفرعية</label>
          <select
            value={activeSkillId}
            onChange={(e) => onChange({ ...filters, skillId: e.target.value })}
            className="w-full rounded-xl border border-slate-200 bg-white p-2 text-xs font-bold text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            <option value="">كل المهارات الفرعية</option>
            {availableSkills.map((sk) => (
              <option key={sk.id} value={sk.id}>
                {sk.name}
              </option>
            ))}
          </select>
        </div>

        {/* 5. Difficulty Filter */}
        <div>
          <label className="block text-[11px] font-bold text-slate-500 mb-1">مستوى الصعوبة</label>
          <select
            value={filters.difficulty}
            onChange={(e) => onChange({ ...filters, difficulty: e.target.value })}
            className="w-full rounded-xl border border-slate-200 bg-white p-2 text-xs font-bold text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            {DIFFICULTY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* 6. Search Filter */}
        <div>
          <label className="block text-[11px] font-bold text-slate-500 mb-1">بحث في نص السؤال</label>
          <div className="relative">
            <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={filters.search}
              onChange={(e) => onChange({ ...filters, search: e.target.value })}
              placeholder="ابحث بالكلمة أو المفهوم…"
              className="w-full rounded-xl border border-slate-200 bg-white py-2 pr-8 pl-3 text-xs font-bold text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
