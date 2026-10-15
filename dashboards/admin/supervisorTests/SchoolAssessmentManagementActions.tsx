import React,{useEffect,useRef,useState} from 'react';
import {api} from '../../../services/api';
import type {Quiz} from '../../../types';
type Context=Awaited<ReturnType<typeof api.schoolAssessmentContext>>;
export const SchoolAssessmentManagementActions:React.FC<{
  quizId:string;actorId:string;onEdit:()=>void;onClone:(quiz:Quiz)=>void;onReopen?:()=>void;
  loadContext?:typeof api.schoolAssessmentContext;clone?:typeof api.cloneSchoolAssessment;
}>=({quizId,actorId,onEdit,onClone,onReopen,loadContext=api.schoolAssessmentContext,clone=api.cloneSchoolAssessment})=>{
  const identity=JSON.stringify([actorId,quizId]);
  const generation=useRef(0),inFlight=useRef(false);
  const [revision,setRevision]=useState(0);
  const [state,setState]=useState<{identity:string;context?:Context;error?:string}>({identity:''});
  const [cloning,setCloning]=useState(false),[copied,setCopied]=useState(false);
  useEffect(()=>{
    const current=++generation.current;
    setState({identity});setCopied(false);
    loadContext(quizId).then(context=>{if(current===generation.current)setState({identity,context});})
      .catch(()=>{if(current===generation.current)setState({identity,error:'تعذر تحميل صلاحيات الاختبار.'});});
    return()=>{generation.current++;};
  },[identity,quizId,revision,loadContext]);
  const createCopy=async()=>{
    if(inFlight.current||!state.context?.canClone)return;
    inFlight.current=true;setCloning(true);setCopied(false);
    setState(s=>({...s,error:undefined}));
    const current=generation.current;
    try{const quiz=await clone(quizId);if(current===generation.current){setCopied(true);onClone(quiz);}}
    catch{if(current===generation.current)setState(s=>({...s,error:'تعذر إنشاء النسخة. حاول مرة أخرى.'}));}
    finally{inFlight.current=false;if(current===generation.current)setCloning(false);}
  };
  if(state.identity!==identity||(!state.context&&!state.error))return <p role="status">جارٍ تحميل إدارة الاختبار…</p>;
  return <section dir="rtl" className="space-y-3 rounded-2xl border border-indigo-100 bg-white p-4">
    <h3 className="font-black">إدارة الاختبار</h3>
    {state.error&&<p role="alert" className="text-rose-700">{state.error} <button className="underline" onClick={()=>setRevision(n=>n+1)}>إعادة المحاولة</button></p>}
    {state.context&&!state.context.canManage&&<p className="text-sm text-gray-600">يمكنك متابعة نتائج طلابك؛ تعديل الاختبار متاح لصاحب صلاحية إدارته.</p>}
    {state.context?.canManage&&!state.context.canEditContent&&<p className="text-sm text-gray-600">محتوى الاختبار محفوظ لحماية المحاولات والنتائج. أنشئ نسخة مستقلة لتغيير الأسئلة.</p>}
    <div className="flex flex-wrap gap-2">
      {state.context?.canManage&&state.context.isPublished&&onReopen&&<button onClick={onReopen} className="rounded-xl border border-indigo-200 px-4 py-2 font-bold text-indigo-700">إعادة فتح الموعد</button>}
      {state.context?.canEditContent&&<button onClick={onEdit} className="rounded-xl border border-indigo-200 px-4 py-2 font-bold text-indigo-700">تعديل محتوى الاختبار</button>}
      {state.context?.canClone&&<button disabled={cloning} aria-busy={cloning} onClick={()=>void createCopy()} className="rounded-xl bg-indigo-600 px-4 py-2 font-bold text-white disabled:opacity-50">{cloning?'جارٍ إنشاء النسخة…':'إنشاء نسخة للتعديل'}</button>}
    </div>
    {copied&&<p role="status" className="text-sm text-emerald-700">تم إنشاء نسخة مستقلة.</p>}
  </section>;
};
