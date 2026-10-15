import React from 'react';
import type {QuizResult} from '../../types';
export const QuizAnswerDistribution:React.FC<{result:Pick<QuizResult,'correctAnswers'|'wrongAnswers'|'unanswered'>}>=({result})=>{
 const rows=[{label:'صحيح',count:result.correctAnswers,color:'bg-emerald-500'},{label:'خطأ',count:result.wrongAnswers,color:'bg-rose-500'},{label:'دون إجابة',count:result.unanswered,color:'bg-slate-300'}];
 const total=rows.reduce((sum,row)=>sum+Math.max(0,row.count||0),0);
 return <section aria-label="توزيع الإجابات" dir="rtl" className="space-y-2">
  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs font-bold text-slate-600">{rows.map(row=><span key={row.label}>{row.label}: {row.count}</span>)}</div>
  <div role="img" aria-label={rows.map(row=>`${row.label}: ${row.count}`).join('، ')} className="flex h-2 overflow-hidden rounded-full bg-slate-100">{rows.map(row=><div key={row.label} className={row.color} style={{width:`${total?Math.max(0,row.count||0)/total*100:0}%`}}/>)}</div>
 </section>;
};
