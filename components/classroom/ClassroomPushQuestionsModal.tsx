import React from 'react';
import { BookOpen, PlusCircle, X } from 'lucide-react';
import { QuestionContentRenderer } from './QuestionContentRenderer';

interface ClassroomPushQuestionsModalProps {
  isOpen: boolean;
  pushingQuestions: boolean;
  pushFilterSubject: string;
  pushFilterSection: string;
  pushFilterSkill: string;
  subjects: any[];
  sections: any[];
  skills: any[];
  availableQuestions: any[];
  selectedIds: string[];
  onClose: () => void;
  onSubjectChange: (value: string) => void;
  onSectionChange: (value: string) => void;
  onSkillChange: (value: string) => void;
  onQuickSelectBatch: () => void;
  onClearSelection: () => void;
  onToggleQuestion: (id: string) => void;
  onSubmit: () => void;
}

export const ClassroomPushQuestionsModal: React.FC<ClassroomPushQuestionsModalProps> = ({
  isOpen,
  pushingQuestions,
  pushFilterSubject,
  pushFilterSection,
  pushFilterSkill,
  subjects,
  sections,
  skills,
  availableQuestions,
  selectedIds,
  onClose,
  onSubjectChange,
  onSectionChange,
  onSkillChange,
  onQuickSelectBatch,
  onClearSelection,
  onToggleQuestion,
  onSubmit,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs" dir="rtl">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-3xl bg-white shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between border-b border-slate-100 p-5 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
              <PlusCircle size={20} />
            </span>
            <div>
              <h3 className="font-black text-slate-900 dark:text-white text-base">إرسال أسئلة أو حزمة مهارة جديدة للطلاب أثناء الحصة</h3>
              <p className="text-xs text-slate-500">اختر سؤالاً فردياً أو حزمة 5-6 أسئلة على مهارة شرحتها تواً على السبورة</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="rounded-xl p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
            <X size={20} />
          </button>
        </div>

        <div className="border-b border-slate-100 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-850/50 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <select
              value={pushFilterSubject}
              onChange={(event) => onSubjectChange(event.target.value)}
              className="rounded-xl border border-slate-200 bg-white p-2 text-xs font-bold text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <option value="">كافة المواد</option>
              {subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}
            </select>
            <select
              value={pushFilterSection}
              onChange={(event) => onSectionChange(event.target.value)}
              className="rounded-xl border border-slate-200 bg-white p-2 text-xs font-bold text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <option value="">كافة المهارات الرئيسية</option>
              {(pushFilterSubject ? sections.filter((section) => section.subjectId === pushFilterSubject) : sections).map((section) => (
                <option key={section.id} value={section.id}>{section.name}</option>
              ))}
            </select>
            <select
              value={pushFilterSkill}
              onChange={(event) => onSkillChange(event.target.value)}
              className="rounded-xl border border-slate-200 bg-white p-2 text-xs font-bold text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <option value="">كافة المهارات الفرعية</option>
              {(pushFilterSection ? skills.filter((skill) => skill.sectionId === pushFilterSection) : skills).map((skill) => (
                <option key={skill.id} value={skill.id}>{skill.name}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onQuickSelectBatch}
                disabled={availableQuestions.length === 0}
                className="flex items-center gap-1 rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-black text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-300 disabled:opacity-40"
              >
                <BookOpen size={13} /> تحديد حزمة تدريب (5 أسئلة)
              </button>
              {selectedIds.length > 0 && (
                <button type="button" onClick={onClearSelection} className="text-xs font-bold text-rose-600 hover:underline">
                  إلغاء التحديد ({selectedIds.length})
                </button>
              )}
            </div>
            <div className="text-xs font-bold text-slate-500">{availableQuestions.length} سؤال متوفر</div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {availableQuestions.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400 font-bold">لا توجد أسئلة مطابقة للفلتر أو تم إضافتها جميعاً لهذه الحصة.</div>
          ) : (
            availableQuestions.map((question) => {
              const qId = String(question.questionId || question.id);
              const isChecked = selectedIds.includes(qId);
              return (
                <label
                  key={qId}
                  className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-3 text-xs transition-all ${isChecked ? 'border-emerald-500 bg-emerald-50/50 dark:border-emerald-500 dark:bg-emerald-950/30' : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-850'}`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => onToggleQuestion(qId)}
                    className="mt-1 text-emerald-600 focus:ring-emerald-500"
                  />
                  <div className="flex-1 min-w-0">
                    <QuestionContentRenderer content={question.text} className="font-bold text-slate-900 dark:text-white leading-relaxed text-xs sm:text-sm block" />
                    {question.imageUrl && (
                      <div className="mt-2 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 p-2 dark:border-slate-700 dark:bg-slate-950">
                        <img src={question.imageUrl} alt="صورة السؤال" className="mx-auto max-h-44 w-auto max-w-full object-contain" loading="lazy" />
                      </div>
                    )}
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] text-slate-500">
                      <span>{question.options?.length || 4} خيارات</span>
                      <span>•</span>
                      <span>مستوى: {question.difficulty || 'متوسط'}</span>
                      {question.skillIds?.length > 0 && (
                        <>
                          <span>•</span>
                          <span className="text-indigo-600 dark:text-indigo-400 font-bold">{question.skillIds.join(', ')}</span>
                        </>
                      )}
                    </div>
                  </div>
                </label>
              );
            })
          )}
        </div>

        <div className="flex items-center justify-between border-t border-slate-100 p-4 dark:border-slate-800 bg-slate-50 dark:bg-slate-850">
          <span className="text-xs font-black text-slate-700 dark:text-slate-300">
            المحدد للإرسال: <strong className="text-emerald-600 text-sm font-black">{selectedIds.length}</strong> أسئلة
          </span>
          <div className="flex items-center gap-2">
            <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300">إلغاء</button>
            <button
              type="button"
              onClick={onSubmit}
              disabled={selectedIds.length === 0 || pushingQuestions}
              className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-2 text-xs font-black text-white hover:from-emerald-700 hover:to-teal-700 shadow-md disabled:opacity-50 transition-all active:scale-95"
            >
              <PlusCircle size={14} /> {pushingQuestions ? 'جارٍ الإرسال…' : `إرسال فوراً لتابلت الطلاب (${selectedIds.length}) 🚀`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
