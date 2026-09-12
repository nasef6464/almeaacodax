import React from 'react';
import { BookOpenCheck, CalendarClock, Presentation, Target, Trophy, Zap } from 'lucide-react';
import { SmartClassroomReportsSection } from '../../components/classroom/SmartClassroomReportsSection';
import { ClassSkillGapsRadar } from '../../components/classroom/ClassSkillGapsRadar';
import { ClassroomPreparedTemplatesManager, ClassroomPreparedTemplate } from '../../components/classroom/ClassroomPreparedTemplatesManager';
import { ClassroomQuestionFilterBar, ClassroomFilterState } from '../../components/classroom/ClassroomQuestionFilterBar';

interface PreparedQuestionsProps {
  selectedSchool: any;
  userId?: string;
  selectedQuestionIds: string[];
  challengeQuestionIds: string[];
  filters: ClassroomFilterState;
  setFilters: React.Dispatch<React.SetStateAction<ClassroomFilterState>>;
  poolQuestions: any[];
  filteredQuestions: any[];
  questionsLoading: boolean;
  onOpenScheduler: () => void;
  onToggleQuestion: (id: string) => void;
  onToggleChallenge: (id: string) => void;
  onApplyTemplate: (template: ClassroomPreparedTemplate) => void;
}

export const SchoolTeacherPreparedQuestions: React.FC<PreparedQuestionsProps> = ({
  selectedSchool,
  userId,
  selectedQuestionIds,
  challengeQuestionIds,
  filters,
  setFilters,
  poolQuestions,
  filteredQuestions,
  questionsLoading,
  onOpenScheduler,
  onToggleQuestion,
  onToggleChallenge,
  onApplyTemplate,
}) => (
  <div className="space-y-6 animate-fade-in" dir="rtl">
    <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-black text-slate-900">
            <Target className="text-indigo-600" size={22} /> بنك التحضير المسبق وحزم التحدي الصفية
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            حضّر حزم الحصص والأسئلة وعيّن أسئلة التحدي مسبقاً قبل دخول الحصة لضمان الجاهزية اللحظية.
          </p>
        </div>
        <button type="button" onClick={onOpenScheduler} className="flex items-center gap-1.5 rounded-2xl bg-indigo-600 px-4 py-2.5 text-xs font-black text-white hover:bg-indigo-700 active:scale-95 transition-all">
          <Presentation size={15} /> إطلاق حزمة محضرة للفصل 🚀
        </button>
      </div>

      <div className="mt-6">
        <ClassroomPreparedTemplatesManager
          schoolId={selectedSchool.schoolId}
          teacherId={userId}
          selectedIds={selectedQuestionIds}
          challengeIds={challengeQuestionIds}
          onApplyTemplate={onApplyTemplate}
        />
      </div>

      <div className="mt-8 border-t border-slate-100 pt-6">
        <h3 className="text-sm font-black text-slate-900 mb-3">
          استعراض بنك أسئلة المدرسة المعتمد ({filteredQuestions.length} سؤال متاح)
        </h3>
        <ClassroomQuestionFilterBar
          filters={filters}
          onChange={setFilters}
          onReset={() => setFilters({ pathId: '', subjectId: '', sectionId: '', skillId: '', difficulty: '', search: '' })}
          totalCount={poolQuestions.length}
          filteredCount={filteredQuestions.length}
        />

        {questionsLoading ? (
          <div className="mt-6 text-center py-10 text-xs text-slate-400">جارٍ تحميل بنك الأسئلة المعتمد...</div>
        ) : (
          <div className="mt-4 space-y-2.5 max-h-[500px] overflow-y-auto">
            {filteredQuestions.map((question) => {
              const isChecked = selectedQuestionIds.includes(question.questionId);
              const isChallenge = challengeQuestionIds.includes(question.questionId);
              return (
                <div key={question.questionId} className={`flex items-start justify-between rounded-xl border p-3.5 transition-all ${isChecked ? 'border-indigo-500 bg-indigo-50/40' : 'border-slate-200 bg-white'}`}>
                  <label className="flex flex-1 cursor-pointer items-start gap-3">
                    <input type="checkbox" checked={isChecked} onChange={() => onToggleQuestion(question.questionId)} className="mt-1" />
                    <span>
                      <b className="text-slate-900 text-xs sm:text-sm">{question.text}</b>
                      <small className="mt-1 block text-slate-500 text-[11px]">
                        {question.subject || question.type} · {question.difficulty || 'متوسط'} · {question.options?.length || 4} خيارات · المهارة: {question.skillIds?.[0] || 'عام'}
                      </small>
                    </span>
                  </label>
                  {isChecked && (
                    <button type="button" onClick={() => onToggleChallenge(question.questionId)} className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-black transition-all ${isChallenge ? 'bg-amber-500 text-white' : 'border border-slate-300 bg-white text-slate-600'}`}>
                      <Zap size={12} /> {isChallenge ? 'سؤال تحدي ⚡' : 'تعيين كتحدي'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  </div>
);

export const SchoolTeacherReports: React.FC<{
  selectedSchool: any;
  onPrepareIntervention: (skillId: string) => void;
}> = ({ selectedSchool, onPrepareIntervention }) => (
  <div className="space-y-6 animate-fade-in" dir="rtl">
    <SmartClassroomReportsSection
      schoolId={selectedSchool.schoolId}
      assignments={selectedSchool.assignments}
      smartClassroomEnabled={selectedSchool.smartClassroomEnabled}
      onPrepareIntervention={onPrepareIntervention}
    />
  </div>
);

export const SchoolTeacherSkillsRadar: React.FC<{ selectedSchool: any }> = ({ selectedSchool }) => (
  <div className="space-y-6 animate-fade-in" dir="rtl">
    <ClassSkillGapsRadar schoolId={selectedSchool.schoolId} assignments={selectedSchool.assignments} />
  </div>
);

export const SchoolTeacherAssessments: React.FC<{ selectedSchool: any }> = ({ selectedSchool }) => (
  <div className="space-y-6 animate-fade-in" dir="rtl">
    <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-xs">
      <h2 className="flex items-center gap-2 text-xl font-black text-slate-900">
        <BookOpenCheck className="text-amber-600" size={22} /> اختبارات وتكليفات المدرسة الموجهة لفصولي
      </h2>
      <p className="mt-1 text-xs text-slate-500">
        قائمة الاختبارات المدرسية الموجهة للطلاب في فصولك المسندة مع تواريخ الاستحقاق ومتابعة الإنجاز.
      </p>
      <div className="mt-6 space-y-3">
        {selectedSchool.assessments.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-8 text-center text-slate-500">
            لا توجد اختبارات مدرسية موجهة لفصولك حالياً.
          </div>
        ) : (
          selectedSchool.assessments.map((assessment: any) => (
            <div key={assessment.assessmentId} className="flex flex-col gap-2 rounded-2xl border border-slate-100 bg-slate-50/40 p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-black text-slate-900 text-sm">{assessment.title}</p>
                <p className="mt-1 text-xs text-slate-500">
                  المادة: {assessment.subjectId || 'عام'} · {assessment.classIds.length} فصول موجهة · نوع الاختبار: {assessment.quizKind || 'اختبار مدرسي'}
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                <CalendarClock size={15} /> {assessment.dueDate ? `تاريخ التسليم: ${assessment.dueDate}` : 'بدون موعد نهائي'}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  </div>
);

export const SchoolTeacherCertificates: React.FC<{ onOpenCertificate: () => void }> = ({ onOpenCertificate }) => (
  <div className="space-y-6 animate-fade-in" dir="rtl">
    <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-black text-slate-900">
            <Trophy className="text-amber-500" size={22} /> شهادات التقدير والتحفيز الصفي
          </h2>
          <p className="mt-1 text-xs text-slate-500">إصدار شهادات شكر وتقدير رسمية للطلاب المتميزين في الحصص الذكية وسرعة التحديات.</p>
        </div>
        <button type="button" onClick={onOpenCertificate} className="flex items-center gap-2 rounded-2xl bg-amber-500 px-5 py-3 text-xs sm:text-sm font-black text-white shadow-md hover:bg-amber-600 active:scale-95 transition-all">
          <Trophy size={16} /> فتح مولد الشهادات الرسمي 🏆
        </button>
      </div>
      <div className="mt-6 rounded-2xl border border-amber-100 bg-amber-50/30 p-6 text-center">
        <Trophy size={36} className="mx-auto text-amber-500 mb-2" />
        <h3 className="text-sm font-black text-amber-950">تحفيز أبطال الحصص الذكية</h3>
        <p className="mt-1 text-xs text-amber-800 max-w-md mx-auto leading-5">
          يمكنك تخصيص اسم الطالب، الفصل الدراسي، نوع الإنجاز (الفائز بتحدي السرعة، الأكثر تفاعلاً، التميز الأكاديمي)، مع توقيع المعلم وإمكانية التحميل والطباعة بجودة عالية.
        </p>
        <button type="button" onClick={onOpenCertificate} className="mt-4 rounded-xl bg-amber-500 px-4 py-2 text-xs font-black text-white shadow-xs hover:bg-amber-600">
          إنشاء شهادة جديدة الآن
        </button>
      </div>
    </div>
  </div>
);
