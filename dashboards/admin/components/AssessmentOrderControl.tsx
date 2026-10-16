import React,{useEffect,useState} from 'react';
import type {Quiz} from '../../../types';
import {orderForPriority,priorityForOrder} from '../../../utils/assessmentCatalogPresentation';
export function AssessmentOrderControl({quiz,onSave}:{quiz:Quiz;onSave:(priority:number)=>Promise<unknown>}){
 const [order,setOrder]=useState(String(orderForPriority(quiz)??''));const [busy,setBusy]=useState(false);const[error,setError]=useState('');
 useEffect(()=>setOrder(String(orderForPriority(quiz)??'')),[quiz.id,quiz.displayPriority]);
 return <div className="flex flex-wrap items-center gap-2 text-xs"><label className="flex items-center gap-2">ترتيب العرض<input aria-label={'ترتيب '+quiz.title} type="number" min="1" max="1000000" placeholder="تلقائي" value={order} onChange={e=>setOrder(e.target.value)} className="w-20 rounded-lg border p-1.5"/></label><button disabled={busy||!Number.isInteger(Number(order))||Number(order)<1||Number(order)>1000000} onClick={async()=>{setBusy(true);setError('');try{await onSave(priorityForOrder(Number(order)));}catch(e){setError(e instanceof Error?e.message:'تعذر حفظ الترتيب');}finally{setBusy(false);}}} className="rounded-lg bg-sky-50 px-2 py-1.5 font-bold text-sky-700 disabled:opacity-40">{busy?'جارٍ الحفظ':'حفظ الترتيب'}</button>{error&&<span role="alert" className="text-red-600">{error}</span>}</div>;
}
