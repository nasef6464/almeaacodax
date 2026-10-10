import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { QuestionAttempt, QuizResult } from '../../types';
import { selectStudentContextResults, studentLearningContextLabels, type StudentLearningContext } from '../../utils/studentLearningContext';
import { buildStudentAggregatedSkills } from './studentAnalyticsViewModel';
import { buildStudentActivitySummary } from '../../utils/studentQuestionActivity';

export const StudentJourneySourcesPanel = ({ results, attempts, completedLessons, periodLabel }: {
  results: QuizResult[]; attempts: QuestionAttempt[]; completedLessons: string[]; periodLabel: string;
}) => {
  const [context, setContext] = useState<StudentLearningContext>('platform_self_study');
  const rows = useMemo(() => selectStudentContextResults(results, context), [context, results]);
  const activity = useMemo(() => buildStudentActivitySummary(attempts), [attempts]);
  const skillRows = useMemo(() => buildStudentAggregatedSkills({ examResults: rows, questionAttempts: [], questions: [], skills: [], subjects: [], sections: [], minSkillEvidence: 3 }), [rows]);
  const average = rows.length ? Math.round(rows.reduce((sum, row) => sum + row.score, 0) / rows.length) : null;
  return (
    <section data-testid="student-journey-sources" className="space-y-4 rounded-3xl border border-slate-200 bg-white p-4 sm:p-6">
      <h2 className="text-lg font-black text-slate-900">رحلتي: تعلمي واختباراتي</h2>
      <div className="rounded-2xl bg-emerald-50 p-4">
        <h3 className="font-bold text-emerald-900">شغلي على المنصة</h3>
        <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
          <p>دروس أنجزتها: <strong>{new Set(completedLessons).size}</strong><span className="block text-xs text-slate-500">إجمالي إنجاز الدروس المسجل</span></p>
          <p data-testid="student-practice-activity">إجابات التدريب: <strong>{activity.practice}</strong><span className="block text-xs text-slate-500">{periodLabel} — نشاط التدريب المسجل، دون إجابات الاختبارات</span></p>
          <p data-testid="student-review-activity">أنشطة المراجعة والعلاج: <strong>{activity.review}</strong><span className="block text-xs text-slate-500">{periodLabel} — إجابات المراجعة والعلاج وإعادة القياس المسجلة، دون الأسئلة المتروكة</span></p>
        </div>
        <p data-testid="student-quiz-question-activity" className="mt-3 text-xs leading-6 text-slate-600">إجابات أسئلة الاختبارات المحملة: المنصة {activity.platformQuiz}، المدرسة {activity.schoolQuiz}. هذا عداد نشاط الإجابة، وليس عدد الاختبارات أو درجاتها.</p>
        {activity.unknown > 0 ? <p data-testid="student-unclassified-question-activity" className="mt-3 text-xs leading-6 text-slate-600">{activity.unknown} إجابة سؤال محملة قد تكون من التدريب أو الاختبارات؛ نوع نشاطها لم يُسجل منفصلًا. لا تُحتسب كتدريب أو مراجعات هنا، وتبقى ضمن أدلة التقدم العام.</p> : null}
        <div className="mt-3 flex flex-wrap gap-3 text-sm font-bold text-emerald-800"><Link to="/courses">متابعة التعلم</Link><Link to="/review">تدريبي ومراجعتي</Link><Link to="/plan">خطتي</Link></div>
      </div>
      <div className="flex flex-wrap gap-2" aria-label="تقارير حسب مصدر الاختبار">
        {Object.entries(studentLearningContextLabels).map(([value, label]) => (
          <button key={value} type="button" aria-pressed={context === value} onClick={() => setContext(value as StudentLearningContext)}
            className={`rounded-xl px-3 py-2 text-sm font-bold ${context === value ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700'}`}>{label}</button>
        ))}
      </div>
      <div data-testid="student-source-summary" className="space-y-3">
        <p className="text-sm font-bold">{studentLearningContextLabels[context]} — {periodLabel}</p>
        <p className="text-xs leading-6 text-slate-500">{rows.length} محاولة محملة؛ {average === null ? 'لا توجد درجة بعد' : `متوسط درجاتها ${average}%`}. هذا الملخص لا يخلط نتائج المصادر المختلفة.</p>
        {context === 'legacy_unknown' ? <p className="text-xs text-amber-800">هذه النتائج محفوظة، لكن مصدرها لم يُسجل. لا ننسبها إلى المدرسة أو المنصة بالتخمين.</p> : null}
        {rows.length ? <div className="space-y-2">{rows.slice(0, 3).map(row => (
          <Link key={String(row.id || row._id || `${row.quizId}:${row.date}`)} to={`/results?attempt=${encodeURIComponent(String(row._id || row.id || row.date))}`}
            className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 p-3 text-sm"><span className="min-w-0 break-words">{row.quizTitle}</span><strong className="shrink-0">{row.score}%</strong></Link>
        ))}</div> : <p className="text-sm text-slate-500">لا توجد محاولات محملة في هذا القسم بعد.</p>}
        {skillRows.length ? <div className="space-y-2"><h3 className="text-sm font-bold">المهارات المقاسة في هذه المحاولات</h3>{skillRows.slice(0, 5).map(skill => (
          <p key={`${skill.pathId}:${skill.subjectId}:${skill.level}:${skill.skillId || skill.skill}`} className="text-sm">{skill.skill}: {skill.mastery}% <span className="text-xs text-slate-500">{skill.isReliable ? 'دليل كافٍ' : 'قراءة أولية'}</span></p>
        ))}</div> : null}
        <Link className="inline-block text-sm font-bold text-indigo-700" to={`/my-quizzes?context=${context}`}>فتح سجل هذا القسم وتحميل المحاولات الأقدم</Link>
      </div>
      <p className="border-t border-slate-100 pt-3 text-xs leading-6 text-slate-500">تقرير المهارات والخطة العام أدناه يجمع الأدلة التعليمية لتحديد ما تحتاج تعلمه. تقارير الاختبارات هنا منفصلة حسب مصدرها.</p>
    </section>
  );
};
