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
      label: 'مطمئن',
      className: 'bg-emerald-50 text-emerald-700',
    };
  }

  if (percentage >= 60) {
    return {
      label: 'مراجعة بسيطة',
      className: 'bg-amber-50 text-amber-700',
    };
  }

  return {
    label: 'ابدأ بها',
    className: 'bg-rose-50 text-rose-700',
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
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-3 backdrop-blur-sm sm:p-4" dir="rtl">
      <div className="w-full max-w-xl overflow-hidden rounded-3xl bg-white shadow-2xl animate-scale-up">
        <div className="flex items-center justify-between gap-3 border-b border-gray-100 p-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-700">
              <Target size={20} />
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-base font-black text-gray-900">تحليل المهارات</h2>
              <p className="mt-0.5 text-xs font-bold text-gray-500">
                {mode === 'bank' ? 'من التدريب' : 'من الاختبار'} • {displaySkills.length} مهارات تم قياسها
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-50 text-gray-500 transition-colors hover:bg-gray-100"
            aria-label="إغلاق"
          >
            <X size={18} />
          </button>
        </div>

        <div className="max-h-[72vh] space-y-3 overflow-y-auto p-4">
          {weakestSkill ? (
            <div className="rounded-2xl border border-rose-100 bg-rose-50/70 p-4 shadow-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-0.5 text-xs font-black text-rose-700 shadow-xs">
                  أول تركيز موصى به
                </span>
                <span className="rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-black text-rose-800">
                  {weakestSkill.percentage}%
                </span>
              </div>
              <div className="mt-2 text-base font-black text-gray-900">{weakestSkill.name}</div>
              <p className="mt-1 text-xs font-bold leading-relaxed text-gray-600">
                {weakestSkill.recommendation || 'ابدأ بشرح قصير لهذه المهارة ثم انتقل للتدريب عليها لتثبيتها.'}
              </p>
            </div>
          ) : null}

          <div className="grid gap-2.5">
            {displaySkills.map((skill, idx) => {
              const levelMeta = getSimpleLevel(skill.percentage);

              return (
                <div key={`${skill.name}-${idx}`} className="rounded-2xl border border-gray-100 bg-white p-3.5 shadow-xs transition-shadow hover:shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="mb-1.5 flex flex-wrap items-center gap-1.5 text-[11px] font-black">
                        {skill.subjectName ? (
                          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-gray-600">
                            {skill.subjectName}
                          </span>
                        ) : null}
                        {skill.sectionName ? (
                          <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-indigo-700">
                            {skill.sectionName}
                          </span>
                        ) : null}
                        <span className={`rounded-full px-2 py-0.5 ${levelMeta.className}`}>
                          {levelMeta.label}
                        </span>
                      </div>
                      <h3 className="break-words text-sm font-black text-gray-900">
                        {skill.name}
                      </h3>
                      {skill.recommendation && skill.name !== weakestSkill?.name ? (
                        <p className="mt-1 text-xs font-bold leading-5 text-gray-500">{skill.recommendation}</p>
                      ) : null}
                    </div>

                    <div className="shrink-0 rounded-2xl bg-gray-50 px-3 py-1.5 text-center">
                      <div className="text-base font-black text-gray-900">{skill.percentage}%</div>
                    </div>
                  </div>

                  <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className={`h-full ${skill.percentage >= 80 ? 'bg-emerald-500' : skill.percentage >= 60 ? 'bg-amber-500' : 'bg-rose-500'} transition-all duration-500 ease-out`}
                      style={{ width: `${skill.percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <button
            onClick={onClose}
            className="w-full rounded-xl bg-gray-900 py-2.5 text-sm font-black text-white transition-colors hover:bg-gray-800"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
