import React from 'react';
import { Link } from 'react-router-dom';
import { FileText, Target, Video, X } from 'lucide-react';
import { sanitizeArabicText } from '../utils/sanitizeMojibakeArabic';

interface Skill {
  name: string;
  percentage: number;
  color: string;
  subjectName?: string;
  sectionName?: string;
  recommendation?: string;
  videoLink?: string;
  trainingLink?: string;
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
    label: 'تحتاج تركيز وتأسيس',
    className: 'bg-rose-50 text-rose-800 border border-rose-200',
  };
};

export const DetailedAnalysisModal: React.FC<DetailedAnalysisModalProps> = ({
  isOpen,
  onClose,
  skills,
  mode = 'test',
}) => {
  const displaySkills = React.useMemo(() => {
    const raw = (skills || []).map((skill) => ({
      ...skill,
      name: displayText(skill.name) || 'مهارة غير مسماة',
      subjectName: displayText(skill.subjectName),
      sectionName: displayText(skill.sectionName),
      recommendation: displayText(skill.recommendation),
    }));

    const seen = new Set<string>();
    return raw.filter((skill) => {
      const key = `${skill.name}::${skill.percentage}::${skill.subjectName || ''}::${skill.sectionName || ''}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [skills]);

  if (!isOpen) return null;

  const weakestSkill = displaySkills[0];

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 p-2 backdrop-blur-sm sm:p-4 animate-fade-in" dir="rtl">
      <div id="skills-analysis-modal-content" className="w-full max-w-6xl overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-2xl animate-scale-up">
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 bg-gradient-to-r from-indigo-50/70 via-white to-white p-4 sm:p-5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-sm shadow-indigo-200">
              <Target size={22} />
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-base font-black text-slate-900 sm:text-xl">تفاصيل أكثر — تحليل المهارات</h2>
              <p className="mt-0.5 text-xs font-bold text-slate-500">
                {mode === 'bank' ? 'من التدريب' : 'من الاختبار'} • {displaySkills.length} مهارات مقاسة من نفس المحاولة
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

        <div className="max-h-[78vh] overflow-y-auto p-3 sm:p-5">
          {weakestSkill ? (
            <div className="mb-4 rounded-2xl border border-rose-200 bg-gradient-to-br from-rose-50/80 via-white to-rose-50/30 p-4 shadow-xs sm:p-5">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <span className="inline-flex rounded-full bg-rose-600 px-3 py-1 text-xs font-black text-white">
                    أول مهارة تحتاج تركيز
                  </span>
                  <div className="mt-2 text-base font-black text-slate-900 sm:text-lg">{weakestSkill.name}</div>
                </div>
                <span className="self-start rounded-full border border-rose-200 bg-rose-100 px-3 py-1 text-sm font-black text-rose-800">
                  {weakestSkill.percentage}%
                </span>
              </div>
            </div>
          ) : null}

          <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm font-black text-slate-900">كل المهارات التي ظهرت في التحليل</div>
            <div className="text-xs font-bold text-slate-500">الفيديو يفتح موضوع التأسيس • التدريب يفتح تدريب نفس المهارة</div>
          </div>

          {displaySkills.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm font-bold text-slate-500">
              لا توجد مهارات موثقة لهذه المحاولة. لن نعرض مهارات افتراضية بدلًا من بيانات الاختبار الفعلية.
            </div>
          ) : (
            <div className="grid gap-3 lg:grid-cols-2">
              {displaySkills.map((skill, idx) => {
                const levelMeta = getSimpleLevel(skill.percentage);
                return (
                  <div
                    key={`${skill.name}-${idx}`}
                    className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs transition-all hover:border-indigo-100 hover:shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <h3 className="break-words text-sm font-black leading-6 text-slate-900 sm:text-base">{skill.name}</h3>
                        <div className="mt-1 flex flex-wrap gap-1.5 text-[11px] font-bold text-slate-500">
                          {skill.sectionName ? <span className="rounded-full bg-indigo-50 px-2 py-1 text-indigo-700">{skill.sectionName}</span> : null}
                          {skill.subjectName ? <span className="rounded-full bg-slate-100 px-2 py-1">{skill.subjectName}</span> : null}
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <span className={`rounded-lg px-2.5 py-1 text-[11px] font-black ${levelMeta.className}`}>
                          {levelMeta.label}
                        </span>
                        <span className={`min-w-12 text-left text-lg font-black ${
                          skill.percentage >= 80 ? 'text-emerald-700' : skill.percentage >= 60 ? 'text-amber-700' : 'text-rose-700'
                        }`}>
                          {skill.percentage}%
                        </span>
                      </div>
                    </div>

                    <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className={`h-full rounded-full ${
                          skill.percentage >= 80 ? 'bg-emerald-500' : skill.percentage >= 60 ? 'bg-amber-500' : 'bg-rose-500'
                        } transition-all duration-500 ease-out`}
                        style={{ width: `${Math.max(4, Math.min(100, skill.percentage))}%` }}
                      />
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-2">
                      {skill.videoLink ? (
                        <Link
                          to={skill.videoLink}
                          onClick={onClose}
                          className="inline-flex items-center justify-center gap-2 rounded-xl border border-indigo-100 bg-indigo-50 px-3 py-2.5 text-xs font-black text-indigo-700 transition-colors hover:bg-indigo-100"
                        >
                          <Video size={15} />
                          فيديو
                        </Link>
                      ) : (
                        <span className="inline-flex items-center justify-center gap-2 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-black text-slate-400">
                          <Video size={15} />
                          فيديو
                        </span>
                      )}

                      {skill.trainingLink ? (
                        <Link
                          to={skill.trainingLink}
                          onClick={onClose}
                          className="inline-flex items-center justify-center gap-2 rounded-xl border border-amber-100 bg-amber-50 px-3 py-2.5 text-xs font-black text-amber-700 transition-colors hover:bg-amber-100"
                        >
                          <FileText size={15} />
                          تدريب
                        </Link>
                      ) : (
                        <span className="inline-flex items-center justify-center gap-2 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-black text-slate-400">
                          <FileText size={15} />
                          تدريب
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/80 p-4">
          <span className="text-xs font-bold text-slate-500">المهارات مرتبة من الأضعف للأقوى.</span>
          <button
            onClick={onClose}
            className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-xs font-black text-slate-700 transition-colors hover:bg-slate-100 sm:text-sm"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
