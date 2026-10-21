import React from 'react';
import {Link} from 'react-router-dom';
import {QuestionContentRenderer} from './QuestionContentRenderer';
import {classroomOptionPresentation} from './classroomOptionPresentation';
interface Props {sessionId:string;currentQuestion:any;currentQAnalytics:any;distribution:Record<string,number>;showInlineExplanation:boolean;showResponses?:boolean;onToggleExplanation:()=>void}
export const ClassroomQuestionReviewPanel:React.FC<Props>=({sessionId,currentQuestion,currentQAnalytics,distribution,showInlineExplanation,showResponses=false,onToggleExplanation})=>(
 <section aria-label="السؤال الحالي" className="mt-4 rounded-3xl border border-indigo-100 bg-white p-4 sm:p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
  <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3 text-sm"><h2 className="font-black">السؤال {currentQuestion.index+1}</h2><div className="flex gap-2"><button type="button" onClick={onToggleExplanation} className="rounded-xl border px-3 py-2 font-bold">{showInlineExplanation?'إخفاء الشرح والحل':'عرض الحل النموذجي والمهارة 💡'}</button><Link to={`/classroom/${sessionId}/projector`} target="_blank" className="rounded-xl bg-indigo-50 px-3 py-2 font-bold text-indigo-700">تكبير السؤال</Link></div></div>
  <div className="mt-4"><QuestionContentRenderer content={currentQuestion.text} asHeading className="text-xl sm:text-2xl font-black"/></div>
  {currentQuestion.imageUrl&&<img src={currentQuestion.imageUrl} alt="توضيح السؤال" className="mx-auto mt-4 max-h-80 max-w-full object-contain"/>}
  <div className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-3">
   {(currentQuestion.options||[]).map((option:string,index:number)=>{const value=classroomOptionPresentation(currentQuestion,option,index);const correct=showInlineExplanation&&currentQuestion.correctOptionIndex===index;return <div data-testid="classroom-option" key={index} className={'min-w-0 rounded-xl border p-3 '+(correct?'border-emerald-500 bg-emerald-50 text-emerald-900':'border-slate-200 dark:border-slate-700')}>
    <div className="flex items-center gap-2"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 font-black text-indigo-700">{value.label}</span>{value.text&&<QuestionContentRenderer content={value.text} className="text-sm font-bold"/>}</div>
    {showResponses&&<p className="mt-2 text-xs"><span>{currentQAnalytics.percentages[index]||0}%</span> <span>({distribution[String(index)]||0})</span></p>}
   </div>;})}
  </div>
  {showResponses&&showInlineExplanation&&currentQAnalytics.maxWrongOption&&<p className="mt-3 text-xs text-amber-700">تنبيه المعلم لخطأ شائع: {currentQAnalytics.maxWrongOption.percent}% اختاروا ({currentQAnalytics.maxWrongOption.letter}).</p>}
  {showInlineExplanation&&<div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-slate-900"><QuestionContentRenderer content={currentQuestion.explanation||'لا يوجد شرح مسبق مسجل لهذا السؤال في بنك الأسئلة.'}/></div>}
 </section>
);
