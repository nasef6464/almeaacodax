import React from 'react';
import type {SchoolAssessmentLearnerStatus,SchoolAssessmentReport} from '../../../types/schoolAssessments';
import {assessmentValue} from './SchoolAssessmentDimensionTable';
export function SchoolAssessmentOverview({report,onOpenLearners}:{report:SchoolAssessmentReport;onOpenLearners?:(status:SchoolAssessmentLearnerStatus)=>void}){
 const total=report.audience.targeted,completed=report.participation.completed;
 const percentage=total>0?Math.max(0,Math.min(100,Math.round(completed*100/total))):0;
 const primary=[['المستهدفون',assessmentValue(total)],['سلّموا الاختبار',assessmentValue(completed)],['لم يسلّموا',assessmentValue(report.participation.notCompleted)],['متوسط الدرجات',assessmentValue(report.scores.average,'٪')]];
 return <div className="min-w-0 space-y-4" dir="rtl">
  <p className="text-sm text-slate-600">هذا الاختبار المدرسي فقط · أحدث محاولة لكل طالب ضمن صلاحيتك.</p>
  <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">{primary.map(([label,value])=><div key={label} className="rounded-xl border bg-white p-3"><dt className="text-xs text-slate-600">{label}</dt><dd className="mt-2 text-xl font-black">{value}</dd></div>)}</dl>
  <section aria-label="متابعة التسليم" className="space-y-2 rounded-xl border bg-sky-50/50 p-4"><div className="flex flex-wrap justify-between gap-2 text-sm"><strong>متابعة التسليم</strong><span>{completed} من {total}</span></div>
   {total>0?<div role="progressbar" aria-label="نسبة التسليم" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percentage} className="h-2 overflow-hidden rounded-full bg-slate-200"><div style={{width:percentage+'%'}} className="h-full rounded-full bg-indigo-600"/></div>:<p className="text-sm text-slate-600">لا يوجد طلاب مستهدفون ضمن هذا النطاق.</p>}
   <p className="text-xs text-slate-600">عدم التسليم ليس حكمًا بضعف الطالب. الحضور وإتقان المهارة لهما أدلتهما المستقلة.</p>
  </section>
  {completed===0&&<p className="rounded-xl bg-sky-50 p-4 text-sm">لا توجد نتائج مدرسية مسجلة لهذا الاختبار حتى الآن.</p>}
  {onOpenLearners&&<div className="flex flex-wrap gap-2"><button type="button" onClick={()=>onOpenLearners('not_completed')} className="rounded-xl border bg-white px-3 py-2 text-sm font-bold">من لم يسلّم؟</button><button type="button" onClick={()=>onOpenLearners('needs_support')} className="rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm font-bold text-indigo-800">من يحتاج دعمًا في هذا الاختبار؟</button></div>}
  <p className="text-xs text-slate-500">قائمة الدعم تتبع حكم اجتياز الاختبار المحفوظ؛ لا تعني حكمًا شاملًا على مهارات الطالب.</p>
  <details className="rounded-xl border bg-white p-3"><summary className="cursor-pointer text-sm font-bold">إحصاءات إضافية</summary><dl className="mt-3 grid grid-cols-2 gap-3">{[['نسبة الاجتياز',assessmentValue(report.scores.passRate,'٪')],['أعلى درجة',assessmentValue(report.scores.highest,'٪')],['أقل درجة',assessmentValue(report.scores.lowest,'٪')],['بدأوا ولم يكملوا',assessmentValue(report.participation.started)]].map(([label,value])=><div key={label}><dt className="text-xs text-slate-500">{label}</dt><dd className="font-bold">{value}</dd></div>)}</dl></details>
 </div>;
}
