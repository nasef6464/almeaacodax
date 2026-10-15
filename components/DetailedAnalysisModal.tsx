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

  if (percentage >= 50) {
    return {
      label: 'متوسط',
      className: 'bg-amber-50 text-amber-800 border border-amber-200',
    };
  }

  return {
    label: 'تحتاج تدريبًا',
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

  const [selectedSubject, setSelectedSubject] = React.useState('');
  React.useEffect(() => { setSelectedSubject(''); }, [isOpen]);
  const subjectNames = Array.from(new Set(displaySkills.map(skill => skill.subjectName || 'غير مصنف')));
  const activeSubject = subjectNames.includes(selectedSubject) ? selectedSubject : '';
  const visibleSkills = activeSubject ? displaySkills.filter(skill => (skill.subjectName || 'غير مصنف') === activeSubject) : displaySkills;
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 p-2 backdrop-blur-sm sm:p-4 animate-fade-in" dir="rtl">
      <div role="dialog" aria-modal="true" aria-labelledby="skills-analysis-title" id="skills-analysis-modal-content" className="w-full max-w-6xl overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-2xl animate-scale-up">
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 bg-gradient-to-r from-indigo-50/70 via-white to-white p-4 sm:p-5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-sm shadow-indigo-200">
              <Target size={22} />
            </div>
            <div className="min-w-0">
              <h2 id="skills-analysis-title" className="truncate text-base font-black text-slate-900 sm:text-xl">تحليل المهارات</h2>
              <p className="mt-0.5 text-xs font-bold text-slate-500">
                {mode === 'bank' ? 'من التدريب' : 'من الاختبار'} • {visibleSkills.length} مهارات
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
          {subjectNames.length > 1 && <div role="group" aria-label="تصفية حسب المادة" className="mb-4 flex flex-wrap gap-2">
            {['', ...subjectNames].map(subject => <button key={subject} type="button" aria-pressed={activeSubject === subject} onClick={() => setSelectedSubject(subject)} className={`rounded-full border px-3 py-1.5 text-xs font-bold ${activeSubject === subject ? 'border-sky-400 bg-sky-100 text-sky-900' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>{subject || 'الكل'}</button>)}
          </div>}

          {displaySkills.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm font-bold text-slate-500">
              لا توجد مهارات موثقة لهذه المحاولة.
            </div>
          ) : (
            <div className="grid gap-2.5 sm:gap-3 lg:grid-cols-2">
              {visibleSkills.map((skill, idx) => {
                const levelMeta = getSimpleLevel(skill.percentage);
                return (
                  <div
                    key={`${skill.name}-${idx}`}
                    className="flex flex-col justify-between rounded-xl border border-slate-200/80 bg-white p-3 transition-colors hover:border-sky-200"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2.5">
                        <div className="min-w-0 flex-1">
                          <h3 className="break-words text-sm font-bold leading-relaxed text-slate-800"><span className="rounded bg-sky-50 px-1.5 py-0.5 decoration-sky-200 underline decoration-2 underline-offset-4">{skill.name}</span></h3>
                          <div className="mt-1 flex flex-wrap gap-1 text-[10px] font-bold text-slate-500">
                            {skill.sectionName ? <span className="rounded-md bg-indigo-50/80 px-1.5 py-0.5 text-indigo-700">{skill.sectionName}</span> : null}
                            {skill.subjectName ? <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-slate-600">{skill.subjectName}</span> : null}
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-1.5">
                          <span className={`rounded-md px-2 py-0.5 text-[10px] font-black ${levelMeta.className}`}>
                            {levelMeta.label}
                          </span>
                          <span className={`min-w-9 text-left text-sm font-bold ${
                            skill.percentage >= 80 ? 'text-emerald-700' : skill.percentage >= 50 ? 'text-amber-700' : 'text-rose-700'
                          }`}>
                            {skill.percentage}%
                          </span>
                        </div>
                      </div>

                      <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                        <div
                          className={`h-full rounded-full ${
                            skill.percentage >= 80 ? 'bg-emerald-500' : skill.percentage >= 50 ? 'bg-amber-500' : 'bg-rose-500'
                          } transition-all duration-500 ease-out`}
                          style={{ width: `${Math.max(0, Math.min(100, skill.percentage))}%` }}
                        />
                      </div>
                    </div>

                    <div className="mt-2 flex flex-wrap gap-2">
                      {skill.videoLink ? (
                        <Link
                          to={skill.videoLink}
                          onClick={onClose}
                          className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50/80 px-2.5 py-1 text-xs font-bold text-indigo-700 transition-all hover:bg-indigo-600 hover:text-white hover:border-indigo-600 active:scale-[0.98]"
                          title="مشاهدة شروحات المهارة في موضوع التأسيس"
                        >
                          <Video size={13} className="shrink-0" />
                          فيديو
                        </Link>
                      ) : (
                        <span className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-slate-200 bg-slate-50/60 px-2.5 py-1 text-xs font-medium text-slate-400">
                          <Video size={13} className="shrink-0 opacity-40" />
                          فيديو
                        </span>
                      )}

                      {skill.trainingLink ? (
                        <Link
                          to={skill.trainingLink}
                          onClick={onClose}
                          className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50/80 px-2.5 py-1 text-xs font-bold text-emerald-800 transition-all hover:bg-emerald-600 hover:text-white hover:border-emerald-600 active:scale-[0.98]"
                          title="بدء تدريب التأسيس المرتبط بهذه المهارة"
                        >
                          <FileText size={13} className="shrink-0" />
                          تدريب
                        </Link>
                      ) : (
                        <span className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-slate-200 bg-slate-50/60 px-2.5 py-1 text-xs font-medium text-slate-400">
                          <FileText size={13} className="shrink-0 opacity-40" />
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
