import React from 'react';
import { Sparkles, TrendingUp, X } from 'lucide-react';

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

const getSimpleLevel = (percentage: number) => {
  if (percentage >= 80) {
    return {
      label: 'مستوى مطمئن',
      className: 'bg-emerald-50 text-emerald-700',
    };
  }

  if (percentage >= 60) {
    return {
      label: 'يحتاج مراجعة بسيطة',
      className: 'bg-amber-50 text-amber-700',
    };
  }

  return {
    label: 'ابدأ بها الآن',
    className: 'bg-rose-50 text-rose-700',
  };
};

const defaultSkills: Skill[] = [
  {
    name: 'العمليات الحسابية',
    percentage: 85,
    color: 'bg-blue-500',
    subjectName: 'القدرات',
    sectionName: 'الكمي',
    recommendation: 'استمر في تدريب قصير لتثبيت المستوى.',
  },
  {
    name: 'الجبر',
    percentage: 70,
    color: 'bg-purple-500',
    subjectName: 'القدرات',
    sectionName: 'الكمي',
    recommendation: 'راجع شرحًا قصيرًا ثم حل 5 أسئلة متنوعة.',
  },
  {
    name: 'الهندسة',
    percentage: 92,
    color: 'bg-emerald-500',
    subjectName: 'القدرات',
    sectionName: 'الكمي',
    recommendation: 'مستواك مطمئن، فقط راجع بين فترة وأخرى.',
  },
  {
    name: 'حل المسائل',
    percentage: 65,
    color: 'bg-amber-500',
    subjectName: 'القدرات',
    sectionName: 'التطبيقات',
    recommendation: 'ابدأ بالأبسط ثم ارفع الصعوبة تدريجيًا.',
  },
];

export const DetailedAnalysisModal: React.FC<DetailedAnalysisModalProps> = ({
  isOpen,
  onClose,
  skills,
  mode = 'test',
}) => {
  if (!isOpen) return null;

  const displaySkills = skills && skills.length > 0 ? skills : defaultSkills;
  const weakestSkill = [...displaySkills].sort((a, b) => a.percentage - b.percentage)[0];

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-3 backdrop-blur-sm sm:p-4" dir="rtl">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-3xl bg-white shadow-2xl animate-scale-up">
        <div className="flex items-start justify-between gap-3 bg-indigo-600 p-4 text-white sm:p-6">
          <div className="flex min-w-0 items-start gap-3">
            <div className="rounded-xl bg-white/20 p-2">
              <TrendingUp size={24} />
            </div>
            <div className="min-w-0">
              <h2 className="break-words text-lg font-bold sm:text-xl">تحليل المهارات ببساطة</h2>
              <p className="text-[11px] text-indigo-100 sm:text-xs">
                بناءً على أداء الطالب في {mode === 'bank' ? 'التدريب' : 'الاختبار'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 rounded-full p-2 transition-colors hover:bg-white/10"
            aria-label="إغلاق"
          >
            <X size={24} />
          </button>
        </div>

        <div className="max-h-[calc(90vh-96px)] space-y-6 overflow-y-auto p-4 sm:space-y-8 sm:p-8">
          {weakestSkill ? (
            <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4">
              <div className="text-xs font-black text-amber-700">ابدأ من هنا</div>
              <div className="mt-2 text-lg font-black text-gray-900">{weakestSkill.name}</div>
              <p className="mt-2 text-sm leading-7 text-amber-800">
                هذه هي المهارة الأضعف حاليًا. راجع شرحًا قصيرًا لها، ثم حل تدريبًا بسيطًا، وبعدها أعد القياس.
              </p>
            </div>
          ) : null}

          <div className="grid gap-4">
            {displaySkills.map((skill, idx) => {
              const levelMeta = getSimpleLevel(skill.percentage);

              return (
                <div key={`${skill.name}-${idx}`} className="space-y-3 rounded-2xl border border-gray-100 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="mb-3 flex flex-wrap gap-2 text-[11px] font-bold">
                        {skill.subjectName ? (
                          <span className="rounded-full bg-gray-100 px-3 py-1 text-gray-600">
                            {skill.subjectName}
                          </span>
                        ) : null}
                        {skill.sectionName ? (
                          <span className="rounded-full bg-indigo-50 px-3 py-1 text-indigo-600">
                            {skill.sectionName}
                          </span>
                        ) : null}
                        <span className={`rounded-full px-3 py-1 ${levelMeta.className}`}>
                          {levelMeta.label}
                        </span>
                      </div>
                      <h3 className="break-words text-base font-bold text-gray-800 sm:text-lg">
                        {skill.name}
                      </h3>
                      {skill.recommendation ? (
                        <div className="mt-3 rounded-xl bg-slate-50 px-3 py-3">
                          <div className="mb-1 text-[11px] font-bold text-slate-500">
                            الخطوة التالية
                          </div>
                          <p className="text-sm leading-7 text-gray-600">
                            {skill.recommendation}
                          </p>
                        </div>
                      ) : null}
                    </div>

                    <div className="shrink-0 rounded-2xl bg-gray-50 px-4 py-3 text-center">
                      <div className="text-xs font-bold text-gray-500">نسبة الإتقان</div>
                      <div className="mt-1 text-2xl font-black text-gray-800">
                        {skill.percentage}%
                      </div>
                    </div>
                  </div>

                  <div className="h-3 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className={`h-full ${skill.color} transition-all duration-1000 ease-out`}
                      style={{ width: `${skill.percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex flex-col gap-4 rounded-2xl border border-purple-100 bg-purple-50 p-4 sm:flex-row sm:p-5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-purple-100 text-purple-600">
              <Sparkles size={24} />
            </div>
            <div>
              <h4 className="mb-1 text-sm font-bold text-purple-900 sm:text-base">
                نصيحة سريعة
              </h4>
              <p className="text-sm leading-relaxed text-purple-700">
                لا تراجع كل شيء دفعة واحدة. ابدأ بالمهارة الأضعف، ثم الشرح المختصر، ثم تدريب قصير، وبعدها أعد القياس.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-full rounded-xl bg-gray-900 py-3 font-bold text-white transition-colors hover:bg-gray-800 sm:py-4"
          >
            فهمت، شكرًا
          </button>
        </div>
      </div>
    </div>
  );
};
