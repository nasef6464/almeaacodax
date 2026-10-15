import React,{useState} from 'react';
import {fromLocalDateTimeInput,toLocalDateTimeInput} from '../../../utils/quizAvailability';
export const SchoolAssessmentReopenDialog:React.FC<{
 title:string;opensAt?:string|null;closesAt?:string|null;onClose:()=>void;
 onSave:(window:{opensAt:string;closesAt:string})=>Promise<unknown>;
}>=({title,opensAt,closesAt,onSave,onClose})=>{
 const [opens,setOpens]=useState(toLocalDateTimeInput(opensAt||new Date().toISOString()));
 const [closes,setCloses]=useState(toLocalDateTimeInput(closesAt));
 const [busy,setBusy]=useState(false),[done,setDone]=useState(false),[error,setError]=useState('');
 const save=async()=>{
  if(busy)return;
  if(!opens||!closes||new Date(closes)<=new Date(opens)||new Date(closes).getTime()<=Date.now()){
   setError('حدد نهاية مستقبلية بعد البداية.');return;
  }
  setBusy(true);setError('');
  try{await onSave({opensAt:fromLocalDateTimeInput(opens)!,closesAt:fromLocalDateTimeInput(closes)!});setDone(true);}
  catch(e){setError(e instanceof Error?e.message:'تعذر حفظ الموعد. حاول مرة أخرى.');}
  finally{setBusy(false);}
 };
 return <div dir="rtl" className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-label="إعادة فتح الموعد">
  <div className="max-h-[85vh] w-full max-w-md space-y-4 overflow-y-auto rounded-2xl bg-white p-5">
   <h2 className="font-black">إعادة فتح الموعد: {title}</h2>
   {done?<p role="status">تم حفظ الموعد. عدد المحاولات والنتائج السابقة محفوظة.</p>:<>
    <p className="text-sm text-gray-600">تغيير الموعد العام للمستهدفين. المواعيد الفردية للإعادات تُدار من منح محاولة إضافية، وهي مطلوبة لمن استنفد محاولاته.</p>
    <label className="block text-sm">بداية الموعد<input aria-label="بداية الموعد" type="datetime-local" value={opens} onChange={e=>setOpens(e.target.value)} className="block w-full rounded-xl border p-2"/></label>
    <label className="block text-sm">نهاية الموعد<input aria-label="نهاية الموعد" type="datetime-local" value={closes} onChange={e=>setCloses(e.target.value)} className="block w-full rounded-xl border p-2"/></label>
    {error&&<p role="alert" className="text-rose-700">{error}</p>}
    <button disabled={busy} onClick={()=>void save()} className="w-full rounded-xl bg-indigo-600 p-3 font-bold text-white">{busy?'جارٍ الحفظ…':'حفظ الموعد'}</button>
   </>}
   <button disabled={busy} onClick={onClose} className="w-full rounded-xl border p-2">إغلاق</button>
  </div>
 </div>;
};
