import React, { useMemo } from 'react';
import { buildClassSkillMatrix, type MatrixStudent } from '../../utils/classSkillMatrix';

export function SupervisorFollowUpPriorities({ students, onOpenSkill, onOpenUnmeasured, onOpenTests, scopeLabels = {} }: {
  students: Array<MatrixStudent & { average: number }>;
  onOpenSkill: (pathId?: string, subjectId?: string) => void;
  onOpenUnmeasured: () => void; onOpenTests: () => void; scopeLabels?: Record<string, string>;
}) {
  const data = useMemo(() => {
    const matrix = buildClassSkillMatrix(students);
    const priorities = matrix.skillColumns.filter(skill => skill.avg < 60).slice(0, 3).map(skill => {
      const affected = students.filter(student => { const cell = matrix.studentSkillMap.get(student.id)?.get(skill.key); return cell && cell.total / cell.count < 60; });
      return { ...skill, affected: affected.length, classes: [...new Set(affected.map(student => [student.schoolName, student.className].filter(Boolean).join(' — ')).filter(Boolean))] };
    });
    return { priorities, unmeasured: students.filter(s => !s.resultsList.length).length, measured: students.filter(s => s.resultsList.length).length, weak: students.filter(s => s.resultsList.length && s.average < 60).length };
  }, [students]);
  return <section aria-label="أولوية المتابعة" className="rounded-3xl border border-indigo-100 bg-white p-5 space-y-4">
    <h2 className="text-lg font-black text-slate-900">أولوية المتابعة</h2>
    <p className="text-xs text-slate-500">من النتائج المتاحة في نطاق إشرافك: {data.measured} طالبًا لديهم قياس، منهم {data.weak} يحتاجون دعمًا. {data.unmeasured} لم يبدأوا القياس؛ لا يُصنفون ضعافًا لغياب النتيجة.</p>
    {data.unmeasured > 0 && <button type="button" onClick={onOpenUnmeasured} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold">عرض من لم يبدأ القياس</button>}
    {!data.priorities.length ? <p className="text-sm text-slate-500">لا توجد مهارات دون 60% في النتائج المتاحة.</p> : <div className="grid gap-3 lg:grid-cols-3">{data.priorities.map(skill => <article key={skill.key} className="rounded-2xl bg-rose-50 p-4 space-y-2">
      <h3 className="font-bold">{skill.skill}</h3>{scopeLabels[`path:${skill.pathId}`] && <p className="text-xs">{scopeLabels[`path:${skill.pathId}`]}</p>}<p className="text-xs">{scopeLabels[skill.subjectId || ''] || 'مادة غير مصنفة'} • تمكن {skill.avg}%</p>
      <p className="text-xs">{skill.affected} طالبًا يحتاجون دعمًا • {skill.count} قياس</p><p className="text-xs text-slate-600">الفصول: {skill.classes.slice(0, 3).join('، ') || 'غير محددة'}{skill.classes.length > 3 ? ` +${skill.classes.length - 3}` : ''}</p>
      <button type="button" onClick={() => onOpenSkill(skill.pathId, skill.subjectId)} className="rounded-xl bg-white px-3 py-2 text-xs font-bold text-indigo-700">افتح المهارة والفصول</button>
    </article>)}</div>}
    <button type="button" onClick={onOpenTests} className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white">افتح الاختبارات للمتابعة</button>
    <p className="text-xs text-slate-500">وجّه اختبار متابعة من مركز الاختبارات. متابعة أثر التدخل متاحة في تقارير الحصص؛ هذا الملخص لا يثبت التحسن من تلقاء نفسه.</p>
  </section>;
}
