import React,{useState} from 'react';
import type {Quiz} from '../../types';
import {AssessmentOrderControl} from './components/AssessmentOrderControl';
import {getMockExamQuestionCount,getMockExamSections} from '../../utils/mockExam';
type Catalog={loading:boolean;error:string;hasMore:boolean;loadMore:()=>void;retry:()=>void};
export function PathMockCatalog({quizzes,catalog,onAdd,onEdit,onUpdate,onDelete}:{quizzes:Quiz[];catalog:Catalog;onAdd:()=>void;onEdit:(quiz:Quiz)=>void;onUpdate:(id:string,patch:Partial<Quiz>)=>Promise<unknown>;onDelete:(id:string)=>Promise<void>}){
 const[search,setSearch]=useState('');const[error,setError]=useState('');const[busy,setBusy]=useState('');
 const act=async(id:string,run:()=>Promise<unknown>)=>{setBusy(id);setError('');try{await run();}catch(e){setError(e instanceof Error?e.message:'تعذر حفظ التغيير');}finally{setBusy('');}};
 const rows=quizzes.filter(q=>q.title.includes(search));
 return <section aria-label="إدارة محاكيات المسار" className="space-y-4">
  <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-black">الاختبارات المحاكية</h2><button onClick={onAdd} className="rounded-xl bg-indigo-600 px-4 py-2 font-bold text-white">إضافة اختبار محاكي</button></div>
  <input aria-label="البحث في محاكيات المسار" value={search} onChange={e=>setSearch(e.target.value)} placeholder="ابحث باسم الاختبار" className="w-full rounded-xl border p-3"/>
  {(error||catalog.error)&&<div role="alert" className="rounded-xl bg-red-50 p-3 text-red-700">{error||catalog.error}{catalog.error&&<button onClick={catalog.retry}>إعادة المحاولة</button>}</div>}
  {catalog.loading&&<p role="status">جارٍ تحميل محاكيات المسار...</p>}
  {rows.map(quiz=><article key={quiz.id} aria-label={quiz.title} className="space-y-3 rounded-2xl border bg-white p-4 shadow-sm">
    <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-black">{quiz.title}</h3><span className="text-xs text-gray-500">{getMockExamSections(quiz).length} أقسام · {getMockExamQuestionCount(quiz)} أسئلة</span></div>
    <div className="flex flex-wrap gap-2 text-xs"><span className="rounded-lg bg-gray-50 px-2 py-1">{quiz.isPublished!==true?'مسودة':quiz.showOnPlatform===false?'منشور مخفي':'ظاهر للطالب'}</span><span className="rounded-lg bg-sky-50 px-2 py-1">{quiz.access?.type==='paid'?'ضمن باقة':quiz.access?.type==='private'?'خاص':'مجاني'}</span></div>
    <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
      <button onClick={()=>onEdit(quiz)} className="rounded-lg bg-indigo-50 px-3 py-2 text-indigo-700">تعديل</button>
      <a href={'/quiz/'+encodeURIComponent(quiz.id)} target="_blank" rel="noreferrer" className="rounded-lg bg-violet-50 px-3 py-2 text-violet-700">معاينة</a>
      <button disabled={busy===quiz.id} onClick={()=>void act(quiz.id,()=>onUpdate(quiz.id,{isPublished:quiz.isPublished!==true,showOnPlatform:quiz.isPublished===true?false:true}))} className="rounded-lg bg-gray-100 px-3 py-2">{quiz.isPublished===true?'إخفاء الاختبار':'نشر الاختبار'}</button>
      <button disabled={busy===quiz.id} onClick={()=>void act(quiz.id,()=>onUpdate(quiz.id,{access:{...quiz.access,type:quiz.access?.type==='free'?'paid':'free'}}))} className="rounded-lg bg-amber-50 px-3 py-2 text-amber-700">{quiz.access?.type==='free'?'جعله ضمن باقة':'جعله مجانيًا'}</button>
      <button disabled={busy===quiz.id} onClick={()=>{if(window.confirm('حذف هذا الاختبار؟'))void act(quiz.id,()=>onDelete(quiz.id));}} className="rounded-lg bg-red-50 px-3 py-2 text-red-600">حذف</button>
    </div>
    <AssessmentOrderControl quiz={quiz} onSave={priority=>onUpdate(quiz.id,{displayPriority:priority})}/>
  </article>)}
  {!catalog.loading&&!catalog.error&&!rows.length&&<p className="rounded-xl border border-dashed p-6 text-center text-gray-500">{search?'لا توجد نتائج للبحث':'لا توجد محاكيات لهذا المسار'}</p>}
  {catalog.hasMore&&<button disabled={catalog.loading} onClick={catalog.loadMore} className="rounded-xl bg-indigo-50 px-4 py-2 font-bold text-indigo-700">تحميل المزيد</button>}
 </section>;
}
