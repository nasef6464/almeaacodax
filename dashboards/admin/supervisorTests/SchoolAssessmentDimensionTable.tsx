import React from 'react';
import type {SchoolAssessmentDimension} from '../../../types/schoolAssessments';
export const assessmentValue=(value:number|null|undefined,suffix='')=>value==null||!Number.isFinite(value)?'غير متاح':String(value)+suffix;
export function SchoolAssessmentDimensionTable({title,rows}:{title:string;rows:SchoolAssessmentDimension[]}){
 if(!rows.length)return null;
 return <section className="min-w-0 rounded-2xl border bg-white p-4"><h3 className="mb-3 font-bold">{title}</h3>
  <div className="overflow-x-auto"><table className="w-full text-right text-sm"><thead><tr><th scope="col">الاسم</th><th scope="col">الطلاب</th><th scope="col">الصحيح / الأسئلة</th><th scope="col">نسبة الإجابات الصحيحة</th></tr></thead>
  <tbody>{rows.map(row=><tr key={row.id} className="border-t"><th scope="row" className="py-3 font-medium">{row.label||row.id}</th><td>{row.learners}</td><td>{assessmentValue(row.correct)} / {assessmentValue(row.questions)}</td><td>{assessmentValue(row.average,'٪')}</td></tr>)}</tbody></table></div>
 </section>;
}
