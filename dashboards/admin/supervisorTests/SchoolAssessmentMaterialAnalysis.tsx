import React,{useState} from 'react';
import type {SchoolAssessmentReport} from '../../../types/schoolAssessments';
import {SchoolAssessmentDimensionTable as Dimension,assessmentValue} from './SchoolAssessmentDimensionTable';
export function SchoolAssessmentMaterialAnalysis({report}:{report:SchoolAssessmentReport}){
 const [selected,setSelected]=useState('');
 const totals=[...new Map([...report.subjects,...(report.subjectBreakdowns||[])].map(item=>[item.id,item])).values()];
 const classifiedIds=[...new Set([...report.sections,...report.skills].map(item=>item.subjectId).filter((id):id is string=>!!id))];
 const options:{id:string;label:string}[]=[...totals];
 for(const id of classifiedIds)if(!options.some(item=>item.id===id))options.push({id,label:id});
 const subject=options.find(item=>item.id===selected)||(options.length===1?options[0]:undefined);
 const subjectTotals=totals.find(item=>item.id===subject?.id);
 const breakdown=report.subjectBreakdowns?.find(item=>item.id===subject?.id);
 const sections=breakdown?.sections||report.sections.filter(item=>!!subject&&item.subjectId===subject.id);
 const skills=breakdown?.skills||report.skills.filter(item=>!!subject&&item.subjectId===subject.id);
 const unknownSections=report.sections.filter(item=>!item.subjectId),unknownSkills=report.skills.filter(item=>!item.subjectId);
 return <div className="min-w-0 space-y-4" dir="rtl">
  <p className="text-sm text-slate-600">المادة أولًا، ثم أقسامها ومهاراتها. القسم الواحد قد يضم أسئلة من أكثر من مادة.</p>
  {options.length>0?<div aria-label="مواد الاختبار" className="flex flex-wrap gap-2">{options.map(item=><button type="button" key={item.id} aria-pressed={subject?.id===item.id} onClick={()=>setSelected(item.id)} className={'rounded-xl border px-3 py-2 text-sm font-bold '+(subject?.id===item.id?'border-indigo-600 bg-indigo-50 text-indigo-800':'bg-white text-slate-600')}>{item.label||item.id}</button>)}</div>:<p className="rounded-xl border border-dashed p-4 text-sm text-slate-500">لا توجد بيانات مواد مصنفة في النتائج المحفوظة.</p>}
  {options.length>1&&!subject&&<p className="rounded-xl border border-dashed p-6 text-center text-slate-500">اختر المادة لعرض تحليلها.</p>}
  {report.coverage.subjects&&!report.coverage.subjects.complete&&<p className="text-xs text-amber-800">الأدلة المصنفة متاحة لـ {report.coverage.subjects.withEvidence} من {report.coverage.subjects.completed} نتيجة مدرسية؛ الأدلة الناقصة لا تُحسب صفرًا ولا تنسب لمادة افتراضية.</p>}
  {subject&&<section aria-label={'تحليل مادة '+subject.label} className="min-w-0 space-y-3 rounded-2xl border border-indigo-100 p-3"><h3 className="font-black">المادة: {subject.label}</h3><p className="text-sm">{subjectTotals?<>نسبة الإجابات الصحيحة {assessmentValue(subjectTotals.average,'٪')} · {subjectTotals.learners} طالب · {assessmentValue(subjectTotals.correct)} صحيح من {assessmentValue(subjectTotals.questions)} سؤالًا.</>:'إجمالي المادة غير متاح؛ تُعرض تفاصيل الأدلة المحفوظة فقط.'}</p><Dimension title="أقسام المادة" rows={sections}/><Dimension title="مهارات المادة" rows={skills}/>{!sections.length&&!skills.length&&<p className="text-sm text-slate-500">تتوفر نتيجة المادة؛ لا توجد تفاصيل أقسام أو مهارات مصنفة لها.</p>}</section>}
  {(unknownSections.length>0||unknownSkills.length>0)&&<details className="min-w-0 rounded-xl border bg-white p-3"><summary className="cursor-pointer text-sm font-bold">أدلة بدون تصنيف مادة محفوظ</summary><p className="my-3 text-xs text-slate-500">هذه الأدلة مستقلة عن المادة المختارة.</p><Dimension title="أقسام غير مصنفة" rows={unknownSections}/><Dimension title="مهارات غير مصنفة" rows={unknownSkills}/></details>}
 </div>;
}
