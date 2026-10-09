import React from 'react';
import { useStore } from '../../store/useStore';
import { resolveClassroomSkillName } from '../../utils/classroomSkillResolver';

export type ClassroomStudentEvidence = {
  studentId: string; name: string; joined: boolean; publishedQuestions: number;
  answered: number; correct: number; wrong: number; unanswered: number; accuracy: number | null;
  skills: Array<{ skillId: string; answered: number; correct: number; wrong: number; unanswered: number; accuracy: number | null }>;
};

export const ClassroomStudentReportTable: React.FC<{ students?: ClassroomStudentEvidence[]; complete?: boolean }> = ({ students, complete }) => {
  const { skills, nestedSkills, subjects } = useStore();
  if (!students) return <p className="mt-4 text-xs text-slate-500">هذا تقرير سابق لا يحتوي على تفاصيل محفوظة لكل طالب.</p>;
  return <section className="mt-5 rounded-2xl border border-slate-200 p-4 dark:border-slate-700" dir="rtl">
    <h3 className="font-black">{complete ? 'تقييم الطلاب في الحصة كاملة' : 'تقييم الطلاب في الأسئلة الموثقة'}</h3>
    {!complete && <p className="mt-1 text-xs text-amber-700">سجل الأسئلة المرسلة لهذه الحصة القديمة غير مكتمل؛ التفاصيل تشمل الأسئلة التي يمكن التحقق منها.</p>}
    <p className="mt-1 text-xs text-slate-500">الدقة تخص الإجابات على الأسئلة المرسلة. المهارات التي لم يحلها الطالب تظهر كغير مقيّمة.</p>
    <p className="mt-2 text-xs text-slate-500 sm:hidden">اسحب الجدول لعرض باقي النتائج.</p>
    {!students.length ? <p className="mt-3 text-sm">لا يوجد طلاب مسجلون لهذه الحصة.</p> :
      <div className="mt-3 overflow-x-auto"><table className="w-full min-w-[520px] text-right text-xs">
        <thead><tr>{['الطالب', 'المشاركة', 'حلّ / المرسل', 'صحيح', 'خطأ', 'لم يحل', 'دقة الحل'].map(label => <th key={label} scope="col" className="p-2">{label}</th>)}</tr></thead>
        <tbody>{students.map(student => <React.Fragment key={student.studentId}>
          <tr className="border-t border-slate-100 dark:border-slate-800">
            <th scope="row" className="p-2 font-bold">{student.name}</th>
            <td className="p-2">{!student.joined ? 'لم يدخل الحصة' : !student.answered ? 'دخل ولم يحل' : student.unanswered ? 'حلّ بعض الأسئلة' : 'أكمل الأسئلة'}</td>
            <td className="p-2">{student.answered}/{student.publishedQuestions}</td><td className="p-2">{student.correct}</td>
            <td className="p-2">{student.wrong}</td><td className="p-2">{student.unanswered}</td><td className="p-2">{student.accuracy === null ? 'لم يُقيّم' : `${student.accuracy}%`}</td>
          </tr>
          <tr><td colSpan={7} className="px-2 pb-3"><details><summary className="cursor-pointer font-bold text-indigo-600">مهارات {student.name}</summary>
            <div className="mt-2 flex flex-wrap gap-2">{student.skills.length ? student.skills.map(skill => <span key={skill.skillId} className="rounded-lg bg-slate-50 p-2 dark:bg-slate-800">
              {resolveClassroomSkillName(skill.skillId, skills, nestedSkills, subjects)}: {skill.answered ? `${skill.correct}/${skill.answered} صحيحة${skill.wrong ? ` · ${skill.wrong} أخطاء تحتاج مراجعة` : ''}` : 'لم تُقيّم'} · {skill.unanswered} لم يحل
            </span>) : <span>الأسئلة المرسلة غير مرتبطة بمهارة مسجلة.</span>}</div>
          </details></td></tr>
        </React.Fragment>)}</tbody>
      </table></div>}
  </section>;
};
