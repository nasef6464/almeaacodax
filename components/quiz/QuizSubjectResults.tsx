import React from 'react';
import type {QuizResult,SkillGap} from '../../types';
const percent=(value:number)=>Math.min(100,Math.max(0,Number.isFinite(value)?value:0));
const SkillEvidence:React.FC<{skill:SkillGap}>=({skill})=><div className="space-y-1 rounded-lg border border-slate-100 p-2">
 <div className="flex items-center justify-between gap-3 text-sm"><span>{skill.skill}</span><strong>{skill.mastery}٪</strong></div>
 <div role="progressbar" aria-label={skill.skill} aria-valuenow={percent(skill.mastery)} aria-valuemin={0} aria-valuemax={100} className="h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-indigo-500" style={{width:`${percent(skill.mastery)}%`}}/></div>
 {typeof skill.questionCount==='number'&&typeof skill.correctCount==='number'&&<p className="text-xs text-slate-500">{skill.correctCount} صحيح من {skill.questionCount}</p>}
</div>;
export const QuizSubjectResults:React.FC<{result:Pick<QuizResult,'subjectResults'|'sectionResults'|'skillsAnalysis'>&{totalQuestions?:number}}>=({result})=>{
 if(!Array.isArray(result.subjectResults))return null;
 const classified=result.subjectResults.reduce((n,row)=>n+row.total,0);
 return <section dir="rtl" className="mt-5 space-y-3 rounded-2xl border border-indigo-100 bg-white p-4">
  <h3 className="font-black">أداؤك لكل مادة</h3>
  {typeof result.totalQuestions==='number'&&classified!==result.totalQuestions&&<p role="status" className="text-sm text-amber-800">تفصيل المواد غير مكتمل؛ الأسئلة المصنفة {classified} من {result.totalQuestions}.</p>}
  <div className="grid gap-3 md:grid-cols-2">{result.subjectResults.map(subject=>{
   const skills=(result.skillsAnalysis||[]).filter(row=>row.subjectId===subject.subjectId);
   const main=skills.filter(row=>row.level!=='sub');
   const children=(parent:SkillGap)=>skills.filter(row=>row.level==='sub'&&row.parentSkillId===parent.skillId&&Boolean(parent.skillId));
   const unlinked=skills.filter(row=>row.level==='sub'&&!main.some(parent=>parent.skillId&&parent.skillId===row.parentSkillId));
   return <section key={subject.subjectId} aria-label={`أداؤك في مادة ${subject.subjectName||'بدون اسم محفوظ'}`} className="space-y-3 rounded-xl border border-slate-200 p-3">
    <div className="flex items-center justify-between gap-3"><h4 className="font-bold">{subject.subjectName||'مادة بدون اسم محفوظ'}</h4><strong className="text-lg text-indigo-700">{subject.score}٪</strong></div>
    <div role="progressbar" aria-label={`درجة ${subject.subjectName||'المادة'}`} aria-valuenow={percent(subject.score)} aria-valuemin={0} aria-valuemax={100} className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-indigo-500" style={{width:`${percent(subject.score)}%`}}/></div>
    <p className="text-sm text-slate-600">{subject.total} أسئلة · {subject.correct} صحيح · {subject.wrong} خطأ · {subject.unanswered} دون إجابة</p>
    {skills.length>0&&<details className="border-t border-slate-100 pt-2"><summary className="cursor-pointer text-sm font-bold text-indigo-700">تفاصيل المهارات ({skills.length})</summary>
      <div className="mt-3 space-y-3">{main.map((row,i)=><div key={row.skillId||`main-${i}`} className="space-y-2"><SkillEvidence skill={row}/>{children(row).length>0&&<div className="ms-3 space-y-2 border-s-2 border-indigo-100 ps-3">{children(row).map((child,j)=><SkillEvidence key={child.skillId||`sub-${j}`} skill={child}/>)}</div>}</div>)}
      {unlinked.map((row,i)=><SkillEvidence key={row.skillId||`unlinked-${i}`} skill={row}/>)}</div>
    </details>}
   </section>;
  })}</div>
 </section>;
};
