import React from 'react';
import type {QuizResult} from '../../types';

export const QuizSubjectResults:React.FC<{result:Pick<QuizResult,'subjectResults'|'sectionResults'|'skillsAnalysis'>&{totalQuestions?:number}}>=({result})=>{
 if(!Array.isArray(result.subjectResults))return null;
 const knownIds=new Set(result.subjectResults.map(row=>row.subjectId));
 const unclassified=(result.sectionResults||[]).filter(row=>!row.subjectId||!knownIds.has(row.subjectId));
 const classified=result.subjectResults.reduce((n,row)=>n+row.total,0);
 return <section dir="rtl" className="mt-5 space-y-3 rounded-2xl border border-indigo-100 bg-white p-4">
  <h3 className="font-black">أداؤك لكل مادة</h3>
  {typeof result.totalQuestions==='number'&&classified!==result.totalQuestions&&<p role="status" className="text-sm text-amber-800">تفصيل المواد غير مكتمل؛ الأسئلة المصنفة {classified} من {result.totalQuestions}.</p>}
  <div className="grid gap-3 md:grid-cols-2">{result.subjectResults.map(subject=>{
   const sections=(result.sectionResults||[]).filter(row=>row.subjectId===subject.subjectId);
   const skills=(result.skillsAnalysis||[]).filter(row=>row.subjectId===subject.subjectId);
   return <section key={subject.subjectId} aria-label={`أداؤك في مادة ${subject.subjectName||'بدون اسم محفوظ'}`} className="space-y-3 rounded-xl border p-3">
    <div className="flex items-center justify-between gap-3"><h4 className="font-bold">{subject.subjectName||'مادة بدون اسم محفوظ'}</h4><strong>{subject.score}٪</strong></div>
    <p className="text-sm">{subject.total} أسئلة · {subject.correct} صحيح · {subject.wrong} خطأ · {subject.unanswered} دون إجابة</p>
    {sections.length>0&&<div><h5 className="mb-2 text-sm font-bold">أقسام المادة</h5><ul className="space-y-1 text-sm">{sections.map(row=><li key={row.sectionId} className="flex justify-between gap-2"><span>{row.sectionName}</span><span>{row.score}٪</span></li>)}</ul></div>}
    {skills.length>0&&<div><h5 className="mb-2 text-sm font-bold">مهارات المادة</h5><ul className="space-y-1 text-sm">{skills.map((row,i)=><li key={`${row.level||''}|${row.skillId||i}`} className="flex justify-between gap-2"><span>{row.skill}{row.level==='sub'?' (فرعية)':''}</span><span>{row.mastery}٪</span></li>)}</ul></div>}
   </section>;
  })}</div>
  {unclassified.length>0&&<section aria-label="أقسام غير مصنفة" className="space-y-2 rounded-xl border border-amber-200 p-3">
    <h4 className="font-bold">مادة غير مصنفة</h4><ul className="space-y-1 text-sm">{unclassified.map((row,i)=><li key={`${row.subjectId||''}|${row.sectionId}|${i}`} className="flex justify-between gap-2"><span>{row.sectionName}</span><span>{row.score}٪</span></li>)}</ul>
  </section>}
 </section>;
};
