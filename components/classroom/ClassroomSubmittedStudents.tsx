import React,{useEffect,useState} from 'react';
import {api} from '../../services/api';
type Student={studentId:string;name:string;correctAnswers?:number;totalQuestions?:number};
export function ClassroomSubmittedStudents({sessionId,submissionSummary}:{sessionId:string;submissionSummary?:{submissionKey?:string;submitted?:Student[]}}){
 const [grades,setGrades]=useState(false),[data,setData]=useState<Student[]|null>(null),[error,setError]=useState(false);
 const key=JSON.stringify([submissionSummary?.submissionKey,submissionSummary?.submitted?.map(s=>s.studentId)]);
 useEffect(()=>{let active=true;setData(null);setError(false);api.getClassroomAggregate(sessionId).then(result=>{if(active)setData(result.submissionSummary?.submitted||[]);}).catch(()=>{if(active)setError(true);});return()=>{active=false;};},[sessionId,key]);
 return <section aria-label="قائمة تسليم الطلاب" className="mt-4 rounded-2xl border bg-white p-4 text-slate-900 dark:bg-slate-900 dark:text-white">
  <div className="flex flex-wrap justify-between gap-2"><h2 className="font-black">الطلاب الذين سلّموا</h2><button type="button" aria-pressed={grades} onClick={()=>setGrades(!grades)} className="rounded-xl border px-3 py-2 text-sm font-bold">{grades?'إخفاء الدرجات':'إظهار الدرجات'}</button></div>
  <p className="mt-2 text-xs text-slate-500">هذه القائمة ظاهرة على الشاشة الحالية. الدرجة للدفعة المسلّمة، وليست نسبة الإنجاز.</p>
  {error?<p role="alert">تعذر تحميل قائمة التسليم. أغلق القائمة وافتحها لإعادة المحاولة.</p>:!data?<p role="status">جارٍ تحميل التسليم…</p>:<ul className="mt-3 max-h-64 overflow-auto divide-y">{data.map(student=><li key={student.studentId} className="flex justify-between gap-3 py-3"><span className="font-bold">{student.name}</span><span>{grades?(typeof student.correctAnswers==='number'&&typeof student.totalQuestions==='number'?`${student.correctAnswers} / ${student.totalQuestions}`:'الدرجة غير متاحة'):'سلّم ✓'}</span></li>)}{!data.length&&<li className="py-3 text-sm">لم يسلّم أحد بعد.</li>}</ul>}
 </section>;
}
