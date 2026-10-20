import React,{useState} from 'react';
import {SchoolAssessmentReportWorkspace} from './SchoolAssessmentReportWorkspace';
import {DashboardDialog} from '../../../components/DashboardDialog';

export const SchoolAssessmentDetailsDialog:React.FC<{quizId:string;title:string;actorId:string;schoolId?:string;onClose:()=>void;onRemind?:()=>Promise<unknown>}>=({quizId,title,actorId,schoolId,onClose,onRemind})=>{
 const [busy,setBusy]=useState(false),[feedback,setFeedback]=useState('');
 return <DashboardDialog label={`متابعة ${title}`} onClose={onClose} className="max-w-5xl rounded-2xl bg-white shadow-xl">
   <header className="flex items-center justify-between gap-3 bg-indigo-600 p-4 text-white"><h2 className="font-black">{title}</h2><button type="button" onClick={onClose} className="rounded-lg border px-3 py-2">إغلاق</button></header>
   <div className="space-y-4 overflow-y-auto p-4">
    {onRemind&&<button type="button" disabled={busy} className="rounded-lg border p-2 disabled:opacity-40" onClick={async()=>{if(busy)return;setBusy(true);setFeedback('');try{await onRemind();setFeedback('تم تنفيذ طلب التذكير.');}catch(error){setFeedback(error instanceof Error?error.message:'تعذر إرسال التذكير.');}finally{setBusy(false);}}}>تذكير من لم يؤدوا الاختبار</button>}
    {feedback&&<p role="status">{feedback}</p>}<SchoolAssessmentReportWorkspace quizId={quizId} actorId={actorId} schoolId={schoolId}/>
   </div>
 </DashboardDialog>;
};
