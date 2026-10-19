import React,{useEffect,useState} from 'react';
import {useStore} from '../../store/useStore';
import {api} from '../../services/api';
import {DashboardDialog} from '../../components/DashboardDialog';
import {DisplayListControls,useDisplayLimit} from '../../components/DisplayListControls';
import {SchoolAssessmentSummaryPanel} from '../admin/supervisorTests/SchoolAssessmentSummaryPanel';
import {SchoolAssessmentLearnersPanel} from '../admin/supervisorTests/SchoolAssessmentLearnersPanel';
import {SchoolAssessmentReopenDialog} from '../admin/supervisorTests/SchoolAssessmentReopenDialog';
import {useSchoolAssessmentCommands} from '../admin/supervisorTests/useSchoolAssessmentCommands';

export type DirectorAssessment={id?:string;_id?:string;title:string;subjectId?:string;isPublished?:boolean;dueDate?:string};
export function DirectorAssessmentCards({items,schoolId}: {items:DirectorAssessment[];schoolId:string}) {
  const {user,subjects}=useStore();
  const activeSchool=Boolean(user.schoolId&&user.schoolId===schoolId);
  const rows=useDisplayLimit(6,schoolId);
  const [selected,setSelected]=useState<DirectorAssessment|null>(null),[reopen,setReopen]=useState(false);
  const [context,setContext]=useState<Awaited<ReturnType<typeof api.schoolAssessmentContext>>|null>(null);
  const [error,setError]=useState(''),[busy,setBusy]=useState(false),[notice,setNotice]=useState('');
  const runCommand=useSchoolAssessmentCommands(user.id);
  const selectedId=String(selected?.id||selected?._id||'');
  useEffect(()=>{
    let active=true;setContext(null);setError('');setNotice('');setReopen(false);
    if(selectedId&&activeSchool)api.schoolAssessmentContext(selectedId).then(data=>{if(active)setContext(data);}).catch(()=>{if(active)setError('تعذر تحميل صلاحيات الاختبار. أغلق النافذة وأعد المحاولة.');});
    return()=>{active=false;};
  },[selectedId,schoolId,user.id,activeSchool]);
  return <div className="space-y-3">
    {!activeSchool&&<p className="text-xs text-slate-600">متابعة نتائج كل اختبار وإدارته متاحة في المدرسة الأساسية للحساب. يمكنك هنا استعراض اختبارات المدرسة المحددة وإضافة اختبار حسب صلاحيتك.</p>}
    {!items.length&&<p className="rounded-xl border border-dashed p-4 text-sm text-slate-500">لا توجد اختبارات مدرسية ظاهرة لهذا النطاق.</p>}
    {items.slice(0,rows.limit).map(item=><article key={String(item.id||item._id)} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-white p-4">
      <div className="min-w-0"><h4 className="break-words font-bold">{item.title}</h4><p className="mt-1 text-xs text-slate-500">{subjects.find(s=>s.id===item.subjectId)?.name||'اختبار المدرسة'} · {item.isPublished?'منشور':'غير منشور'}</p></div>
      <button type="button" disabled={!activeSchool} onClick={()=>setSelected(item)} className="rounded-lg border border-indigo-200 px-3 py-2 text-xs font-bold text-indigo-700 disabled:opacity-40">النتائج والإدارة</button>
    </article>)}
    <DisplayListControls {...rows} total={items.length} label="اختبارات المدرسة"/>
    {selected&&<DashboardDialog label={`متابعة ${selected.title}`} onClose={()=>setSelected(null)} className="max-w-5xl rounded-2xl bg-white shadow-xl">
      <header className="flex items-center justify-between gap-3 border-b p-4"><h3 className="font-bold">{selected.title}</h3><button onClick={()=>setSelected(null)} className="rounded-lg border px-3 py-2 text-sm">إغلاق</button></header>
      <div className="space-y-4 overflow-y-auto p-4">
        {error?<p role="alert" className="text-rose-700">{error}</p>:!context?<p role="status">جارٍ تحميل الاختبار…</p>:<>
          <SchoolAssessmentSummaryPanel quizId={selectedId} actorId={user.id}/>
          <SchoolAssessmentLearnersPanel quizId={selectedId} actorId={user.id}/>
          {context.canManage&&<div className="flex flex-wrap gap-2">
            <button disabled={busy} onClick={async()=>{setBusy(true);setNotice('');try{const result=await runCommand(selectedId,{operation:'remind',payload:{}});setNotice(`تم تذكير ${result.notifiedCount??0} طالب ممن لم يؤدوا الاختبار.`);}catch(e){setNotice(e instanceof Error?e.message:'تعذر إرسال التذكير.');}finally{setBusy(false);}}} className="rounded-lg border px-3 py-2 text-sm disabled:opacity-50">تذكير الغائبين</button>
            {context.isPublished&&<button onClick={()=>setReopen(true)} className="rounded-lg border px-3 py-2 text-sm">إعادة فتح الموعد</button>}
          </div>}
          {!context.canManage&&<p className="text-xs text-slate-500">النتائج متاحة حسب صلاحيتك؛ إجراءات التعديل تتطلب صلاحية إدارة هذا الاختبار.</p>}
        </>}
        {notice&&<p role="status" className="text-sm">{notice}</p>}
      </div>
    </DashboardDialog>}
    {selected&&reopen&&<SchoolAssessmentReopenDialog title={selected.title} closesAt={selected.dueDate} onClose={()=>setReopen(false)} onSave={window=>runCommand(selectedId,{operation:'reopen',payload:window})}/>}
  </div>;
}
