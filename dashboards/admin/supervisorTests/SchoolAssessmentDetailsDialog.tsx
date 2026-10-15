import React,{useState} from 'react';
import {SchoolAssessmentSummaryPanel} from './SchoolAssessmentSummaryPanel';
import {SchoolAssessmentLearnersPanel} from './SchoolAssessmentLearnersPanel';

export const SchoolAssessmentDetailsDialog:React.FC<{quizId:string;title:string;actorId:string;onClose:()=>void;onRemind?:()=>Promise<unknown>}>=({quizId,title,actorId,onClose,onRemind})=>{
 const [busy,setBusy]=useState(false),[feedback,setFeedback]=useState('');
 return <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4" dir="rtl">
  <section role="dialog" aria-modal="true" aria-label={`متابعة ${title}`} className="flex max-h-[95vh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl sm:max-w-4xl sm:rounded-2xl">
   <header className="flex items-center justify-between gap-3 bg-indigo-600 p-4 text-white"><h2 className="font-black">{title}</h2><button type="button" onClick={onClose} className="rounded-lg border px-3 py-2">إغلاق</button></header>
   <div className="space-y-4 overflow-y-auto p-4"><SchoolAssessmentSummaryPanel quizId={quizId} actorId={actorId}/>
    {onRemind&&<button type="button" disabled={busy} className="rounded-lg border p-2 disabled:opacity-40" onClick={async()=>{if(busy)return;setBusy(true);setFeedback('');try{await onRemind();setFeedback('تم تنفيذ طلب التذكير.');}catch(error){setFeedback(error instanceof Error?error.message:'تعذر إرسال التذكير.');}finally{setBusy(false);}}}>تذكير من لم يؤدوا الاختبار</button>}
    {feedback&&<p role="status">{feedback}</p>}<SchoolAssessmentLearnersPanel quizId={quizId} actorId={actorId}/>
   </div>
  </section>
 </div>;
};
