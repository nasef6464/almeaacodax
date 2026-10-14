import React from 'react';
import type {SchoolAssessmentDimension,SchoolAssessmentReport} from '../../../types/schoolAssessments';

const value=(n:number|null)=>n===null?'غير متاح':String(n);
const Dimension:React.FC<{title:string;rows:SchoolAssessmentDimension[]}>=({title,rows})=>rows.length>0?<section className="rounded-2xl border bg-white p-4">
  <h3 className="mb-3 font-bold">{title}</h3>
  <div className="overflow-x-auto"><table className="w-full text-right text-sm"><thead><tr><th scope="col">الاسم</th><th scope="col">الطلاب</th><th scope="col">نسبة الإجابات الصحيحة</th></tr></thead>
    <tbody>{rows.map(row=><tr key={row.id} className="border-t"><th scope="row" className="py-3 font-medium">{row.label||row.id}</th><td>{row.learners}</td><td>{value(row.average)}{row.average!==null?'٪':''}</td></tr>)}</tbody>
  </table></div>
</section>:null;
export const SchoolAssessmentReportView:React.FC<{report:SchoolAssessmentReport}>=({report})=><div dir="rtl" className="space-y-4">
  <p className="text-sm text-gray-600">الملخص يشمل جميع الطلاب المستهدفين ضمن صلاحيتك، ويعتمد آخر محاولة مدرسية لكل طالب.</p>
  <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">{[
    ['المستهدفون',report.audience.targeted],['أدوا الاختبار',report.participation.completed],['لم يؤدوا',report.participation.notCompleted],
    ['متوسط الدرجات',report.scores.average],['نسبة النجاح ٪',report.scores.passRate],['أعلى درجة',report.scores.highest],['أقل درجة',report.scores.lowest],['بدأوا ولم يكملوا',report.participation.started],
  ].map(([label,n])=><div key={String(label)} className="rounded-xl border bg-white p-4"><dt className="text-xs text-gray-600">{label}</dt><dd className="mt-2 text-xl font-bold">{value(n as number|null)}</dd></div>)}</dl>
  {report.participation.completed===0&&<p className="rounded-xl bg-sky-50 p-4">لا توجد نتائج مدرسية مسجلة لهذا الاختبار حتى الآن.</p>}
  {report.coverage.missingEvidence.includes('mock_subject_totals')&&<p className="text-sm text-amber-800">تحليل المواد غير متاح من الأدلة المحفوظة حاليًا؛ تحليل أقسام المحاكي يظهر أدناه عند توفره.</p>}
  <Dimension title="المواد" rows={report.subjects}/><Dimension title="أقسام المحاكي" rows={report.sections}/><Dimension title="المهارات" rows={report.skills}/>
</div>;
