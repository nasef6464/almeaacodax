import React,{useEffect,useState} from 'react';
import {api} from '../../services/api';
import {QuestionContentRenderer} from '../../components/classroom/QuestionContentRenderer';

export function DirectorQuestionPicker({pathId,subjectId,value,onChange}: {pathId:string;subjectId:string;value:string[];onChange:(ids:string[])=>void}) {
  const [page,setPage]=useState(1),[search,setSearch]=useState(''),[query,setQuery]=useState(''),[revision,setRevision]=useState(0);
  const identity=JSON.stringify([pathId,subjectId,page,query,revision]);
  const [result,setResult]=useState<{identity:string;rows:{id:string;text:string;imageUrl?:string;imageAlt?:string}[];hasNext:boolean;error?:string}>({identity:'',rows:[],hasNext:false});
  useEffect(()=>{setPage(1);setSearch('');setQuery('');},[pathId,subjectId]);
  useEffect(()=>{
    if(!pathId||!subjectId)return;
    let active=true;
    api.getQuestionsPaginated({pathId,subject:subjectId,page,limit:20,search:query,approvalStatus:'approved',summary:true,noTotal:true})
      .then(data=>{if(active)setResult({identity,rows:(data.data as {id?:string;_id?:string;text?:string;imageUrl?:string;imageAlt?:string}[]).map(q=>({id:String(q.id||q._id||''),text:String(q.text||''),imageUrl:q.imageUrl,imageAlt:q.imageAlt})).filter(q=>q.id),hasNext:Boolean(data.pagination.hasNext)});})
      .catch(()=>{if(active)setResult({identity,rows:[],hasNext:false,error:'تعذر تحميل الأسئلة. أعد المحاولة.'});});
    return()=>{active=false;};
  },[identity,pathId,subjectId,page,query]);
  if(!pathId||!subjectId)return <p className="text-xs text-slate-500">اختر المسار والمادة لعرض الأسئلة المعتمدة.</p>;
  const ready=result.identity===identity;
  return <section aria-label="اختيار أسئلة الاختبار" className="min-w-0 space-y-3 rounded-xl border bg-white p-3">
    <form className="flex gap-2" onSubmit={e=>{e.preventDefault();setPage(1);setQuery(search.trim());}}><input aria-label="البحث في الأسئلة" value={search} onChange={e=>setSearch(e.target.value)} className="min-w-0 flex-1 rounded-lg border px-2 py-2 text-sm"/><button className="rounded-lg border px-3 text-sm">بحث</button></form>
    <p className="text-xs font-bold">الأسئلة المختارة: {value.length}</p>
    {!ready?<p role="status">جارٍ تحميل الأسئلة…</p>:result.error?<p role="alert">{result.error} <button onClick={()=>setRevision(n=>n+1)} className="underline">إعادة المحاولة</button></p>:<>
      {!result.rows.length&&<p className="text-sm text-slate-500">لا توجد أسئلة معتمدة مطابقة.</p>}
      <div className="max-h-72 space-y-2 overflow-y-auto">{result.rows.map((q,i)=><label key={q.id} className="flex items-start gap-2 rounded-lg border p-2"><input type="checkbox" aria-label={`اختيار السؤال ${i+1}`} checked={value.includes(q.id)} onChange={e=>onChange(e.target.checked?[...value,q.id]:value.filter(id=>id!==q.id))}/><span className="min-w-0 flex-1"><QuestionContentRenderer content={q.text} className="break-words text-sm"/>{q.imageUrl&&<img src={q.imageUrl} alt={q.imageAlt||`صورة السؤال ${i+1}`} loading="lazy" className="mt-2 max-h-48 max-w-full rounded-lg object-contain"/>}</span></label>)}</div>
      <div className="flex items-center justify-between text-xs"><button disabled={page===1} onClick={()=>setPage(n=>n-1)} className="rounded-lg border p-2 disabled:opacity-40">السابق</button><span>صفحة {page}</span><button disabled={!result.hasNext} onClick={()=>setPage(n=>n+1)} className="rounded-lg border p-2 disabled:opacity-40">التالي</button></div>
    </>}
  </section>;
}
