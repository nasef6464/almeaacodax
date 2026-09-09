import React from 'react';
import { Target, X } from 'lucide-react';
import { sanitizeArabicText } from '../utils/sanitizeMojibakeArabic';

interface Skill {
  name: string;
  percentage: number;
  color: string;
  subjectName?: string;
  sectionName?: string;
  recommendation?: string;
}

interface DetailedAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  skills?: Skill[];
  mode?: 'test' | 'bank';
}

const displayText = (value?: string | null) => sanitizeArabicText(value) || '';

const getSimpleLevel = (percentage: number) => {
  if (percentage >= 80) {
    return {
      label: 'إتقان ممتاز',
      className: 'bg-emerald-50 text-emerald-800 border border-emerald-200',
    };
  }

  if (percentage >= 60) {
    return {
      label: 'متوسط',
      className: 'bg-amber-50 text-amber-800 border border-amber-200',
    };
  }

  return {
    label: 'يحتاج دعم',
    className: 'bg-rose-50 text-rose-800 border border-rose-200',
  };
};

const defaultSkills: Skill[] = [
  {
    name: 'الفهم الأساسي',
    percentage: 85,
    color: 'bg-blue-500',
    subjectName: 'المادة الحالية',
    sectionName: 'المهارة الرئيسية',
    recommendation: 'تدريب قصير يكفي للتثبيت.',
  },
  {
    name: 'المهارة التطبيقية',
    percentage: 70,
    color: 'bg-purple-500',
    subjectName: 'المادة الحالية',
    sectionName: 'المهارة الرئيسية',
    recommendation: 'شرح قصير ثم أسئلة متدرجة.',
  },
  {
    name: 'حل المسألة',
    percentage: 45,
    color: 'bg-rose-500',
    subjectName: 'المادة الحالية',
    sectionName: 'المهارة الرئيسية',
    recommendation: 'ابدأ بها الآن.',
  },
];

export const DetailedAnalysisModal: React.FC<DetailedAnalysisModalProps> = ({
  isOpen,
  onClose,
  skills,
  mode = 'test',
}) => {
  if (!isOpen) return null;

  // Normalized display skills preserving authoritative values
  const displaySkills = React.useMemo(() => {
    const raw = (skills && skills.length > 0 ? skills : defaultSkills).map((skill) => ({
      ...skill,
      name: displayText(skill.name) || 'مهارة غير مسماة',
      subjectName: displayText(skill.subjectName),
      sectionName: displayText(skill.sectionName),
      recommendation: displayText(skill.recommendation),
    }));

    // Hide exact duplicate records without recalculating or picking min/max values
    const seen = new Set<string>();
    return raw.filter((skill) => {
      const key = `${skill.name}::${skill.percentage}::${skill.subjectName || ''}::${skill.sectionName || ''}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [skills]);

  const weakestSkill = displaySkills[0];

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 p-3 backdrop-blur-sm sm:p-4 animate-fade-in" dir="rtl">
      <div id="skills-analysis-modal-content" className="w-full max-w-xl overflow-hidden rounded-3xl bg-white shadow-2xl border border-slate-200/80 animate-scale-up">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 p-5 bg-gradient-to-r from-indigo-50/60 via-white to-white">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-sm shadow-indigo-200">
              <Target size={22} />
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-base sm:text-lg font-black text-slate-900">تقرير تحليل المهارات التفصيلي</h2>
              <p className="mt-0.5 text-xs font-bold text-slate-500">
                {mode === 'bank' ? 'من التدريب' : 'من الاختبار'} • {displaySkills.length} مهارات تم قياسها بدقة
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-800"
            aria-label="إغلاق"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Scrollable Content */}
        <div className="max-h-[72vh] space-y-4 overflow-y-auto p-4 sm:p-5">
          {weakestSkill ? (
            <div className="rounded-2xl border border-rose-200 bg-gradient-to-br from-rose-50/80 via-white to-rose-50/30 p-4 sm:p-5 shadow-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-rose-600 px-3 py-1 text-xs font-black text-white shadow-xs">
                  أول تركيز موصى به للتحسين
                </span>
                <span className="rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-black text-rose-800 border border-rose-200">
                  {weakestSkill.percentage}% إتقان
                </span>
              </div>
              <div className="mt-2.5 text-base sm:text-lg font-black text-slate-900">{weakestSkill.name}</div>
              <p className="mt-1.5 text-xs sm:text-sm font-bold leading-relaxed text-slate-600">
                {weakestSkill.recommendation || 'ابدأ بمراجعة شرح هذه المهارة أولاً ثم نفّذ تدريباً قصيراً لرفع نسبة إتقانك وتثبيت المعلومة.'}
              </p>
            </div>
          ) : null}

          <div className="space-y-3">
            <span className="text-xs font-black text-slate-400 block px-1">
              جميع المهارات المقاسة ({displaySkills.length}):
            </span>

            {displaySkills.map((skill, idx) => {
              const levelMeta = getSimpleLevel(skill.percentage);

              return (
                <div
                  key={`${skill.name}-${idx}`}
                  className="rounded-2xl border border-slate-200/80 bg-slate-50/40 hover:bg-slate-50/80 p-3.5 sm:p-4 shadow-2xs transition-all"
                >
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="break-words text-sm sm:text-base font-black text-slate-900 min-w-0 flex-1 truncate">
                      {skill.name}
                    </h3>

                    <div className="flex items-center gap-2.5 shrink-0">
                      <span className={`px-2.5 py-0.5 rounded-lg text-xs font-black ${levelMeta.className}`}>
                        {levelMeta.label}
                      </span>
                      <span className={`text-base font-black w-11 text-left ${
                        skill.percentage >= 80 ? 'text-emerald-700' : skill.percentage >= 60 ? 'text-amber-700' : 'text-rose-700'
                      }`}>
                        {skill.percentage}%
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-200/70">
                    <div
                      className={`h-full ${skill.percentage >= 80 ? 'bg-emerald-500' : skill.percentage >= 60 ? 'bg-amber-500' : 'bg-rose-500'} rounded-full transition-all duration-500 ease-out`}
                      style={{ width: `${Math.max(4, Math.min(100, skill.percentage))}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-100 bg-slate-50/80 p-4 flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="rounded-xl bg-white border border-slate-200 px-5 py-2.5 text-xs sm:text-sm font-black text-slate-700 transition-colors hover:bg-slate-100 shadow-xs"
          >
            إغلاق
          </button>
          <button
            onClick={() => {
              if (typeof window !== 'undefined') {
                window.print();
              }
            }}
            className="rounded-xl bg-indigo-600 px-5 py-2.5 text-xs sm:text-sm font-black text-white transition-colors hover:bg-indigo-700 shadow-sm shadow-indigo-100"
          >
            طباعة تقرير المهارات 🖨️
          </button>
        </div>
      </div>
    </div>
  );
};
