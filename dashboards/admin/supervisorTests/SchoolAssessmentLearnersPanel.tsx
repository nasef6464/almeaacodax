import React, {useEffect,useState} from 'react';
import {api} from '../../../services/api';
import type {SchoolAssessmentLearnerPage,SchoolAssessmentLearnerStatus} from '../../../types/schoolAssessments';
import {SchoolAssessmentLearnerResult} from './SchoolAssessmentLearnerResult';

type Props={actorId:string;quizId:string;schoolId?:string};
// Remount on principal/definition change so no old roster or selected review is
// visible even during the render before effects clean up the previous request.
export const SchoolAssessmentLearnersPanel:React.FC<Props>=props=><Learners key={JSON.stringify([props.actorId,props.quizId,props.schoolId])} {...props}/>;
const Learners:React.FC<Props>=({quizId,schoolId})=>{
 const [query,setQuery]=useState<{page:number;status:SchoolAssessmentLearnerStatus;search:string}>({page:1,status:'all',search:''});
 const [draftSearch,setDraftSearch]=useState(''),[revision,setRevision]=useState(0),[selected,setSelected]=useState<string|null>(null);
 const key=JSON.stringify([query,revision]);
 const [state,setState]=useState<{key:string;data?:SchoolAssessmentLearnerPage;error?:boolean}>({key:''});
 useEffect(()=>{
  let cancelled=false;
  api.schoolAssessmentLearners(quizId,{...query,limit:50},schoolId).then(data=>{if(!cancelled)setState({key,data});})
   .catch(()=>{if(!cancelled)setState({key,error:true});});
  return()=>{cancelled=true;};
 },[quizId,key,schoolId]);
 const data=state.key===key?state.data:undefined,error=state.key===key&&state.error;
 const change=(patch:Partial<typeof query>)=>{setSelected(null);setQuery(current=>({...current,...patch}));};
 return <section dir="rtl" aria-label="نتائج الطلاب" className="space-y-4 rounded-2xl border bg-white p-4">
  <h3 className="font-black">نتائج الطلاب</h3>
  <p className="text-sm text-gray-600">آخر محاولة لكل طالب مستهدف ضمن صلاحيتك. «لم يؤدِّ» تعني عدم وجود نتيجة لهذا الاختبار المدرسي.</p>
  <div className="flex flex-wrap gap-3">
   <label className="text-sm">حالة الأداء<select aria-label="حالة الأداء" value={query.status} onChange={event=>change({page:1,status:event.target.value as SchoolAssessmentLearnerStatus})} className="mr-2 rounded-lg border p-2">
    <option value="all">جميع المستهدفين</option><option value="completed">أكملوا الاختبار</option><option value="not_completed">لم يؤدوا الاختبار</option><option value="needs_support">يحتاجون دعمًا</option>
   </select></label>
   <form className="flex gap-2" onSubmit={event=>{event.preventDefault();change({page:1,search:draftSearch.trim()});}}>
    <input aria-label="بحث عن طالب" value={draftSearch} onChange={event=>setDraftSearch(event.target.value)} maxLength={120} placeholder="اسم الطالب أو معرفه" className="min-w-0 rounded-lg border p-2"/>
    <button type="submit" className="rounded-lg border px-3">بحث</button>
   </form>
  </div>
  {!data&&!error&&<p role="status">جارٍ تحميل الطلاب…</p>}
  {error&&<div role="alert"><p>تعذر تحميل الطلاب.</p><button type="button" onClick={()=>setRevision(n=>n+1)} className="rounded-lg border p-2">إعادة المحاولة</button></div>}
  {data&&<>
   <p role="status" className="text-sm">{data.pagination.total} طالب مطابق · الصفحة {data.pagination.page} من {Math.max(1,data.pagination.totalPages)}</p>
   {data.learners.length===0?<p>لا يوجد طلاب مطابقون.</p>:<div className="overflow-x-auto"><table className="w-full text-right text-sm"><caption className="sr-only">آخر نتائج الطلاب المستهدفين</caption><thead><tr><th className="p-2">الطالب</th><th>الحالة</th><th>الدرجة</th><th>المحاولة</th><th>التفاصيل</th></tr></thead>
    <tbody>{data.learners.map(row=><tr key={row.studentId} className="border-t"><td className="p-2">{row.name||row.studentId}</td><td>{row.result?(row.result.passed===false?'يحتاج دعمًا':'أكمل'):'لم يؤدِّ'}</td><td>{row.result?`${row.result.score}٪`:'—'}</td><td>{row.result?.attemptNumber??'—'}</td><td>{row.result&&<button type="button" onClick={()=>setSelected(row.result!.id)} className="whitespace-nowrap rounded-lg border p-2">عرض النتيجة</button>}</td></tr>)}</tbody>
   </table></div>}
   <nav aria-label="صفحات الطلاب" className="flex items-center gap-3"><button type="button" disabled={query.page<=1} onClick={()=>change({page:query.page-1})} className="rounded-lg border p-2 disabled:opacity-40">السابق</button><button type="button" disabled={query.page>=data.pagination.totalPages} onClick={()=>change({page:query.page+1})} className="rounded-lg border p-2 disabled:opacity-40">التالي</button></nav>
  </>}
  {selected&&<SchoolAssessmentLearnerResult schoolId={schoolId} key={selected} quizId={quizId} resultId={selected} onClose={()=>setSelected(null)}/>}
 </section>;
};
