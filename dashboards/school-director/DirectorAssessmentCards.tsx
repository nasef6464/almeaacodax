import React,{Suspense,useEffect,useMemo,useRef,useState} from 'react';
import {useStore} from '../../store/useStore';
import {api} from '../../services/api';
import type {Quiz} from '../../types';
import {DashboardDialog} from '../../components/DashboardDialog';
import {DisplayListControls,useDisplayLimit} from '../../components/DisplayListControls';
import {SchoolAssessmentReportWorkspace} from '../admin/supervisorTests/SchoolAssessmentReportWorkspace';
import {SchoolAssessmentReopenDialog} from '../admin/supervisorTests/SchoolAssessmentReopenDialog';
import {useSchoolAssessmentCommands} from '../admin/supervisorTests/useSchoolAssessmentCommands';
const Builder=React.lazy(()=>import('../admin/UnifiedQuizBuilder').then(module=>({default:module.UnifiedQuizBuilder})));
export type DirectorAssessment={id?:string;_id?:string;title:string;subjectId?:string;isPublished?:boolean;dueDate?:string};
export function DirectorAssessmentCards({items,schoolId,classes=[],onRefresh}: {items:DirectorAssessment[];schoolId:string;classes?:{classId:string;className:string}[];onRefresh?:()=>Promise<void>|void}) {
 const {user,subjects}=useStore();const rows=useDisplayLimit(6,schoolId);
 const [selected,setSelected]=useState<DirectorAssessment|null>(null),[editing,setEditing]=useState<Quiz|null>(null),[reopen,setReopen]=useState(false),[revision,setRevision]=useState(0);
 const [context,setContext]=useState<Awaited<ReturnType<typeof api.schoolAssessmentContext>>|null>(null);
 const [error,setError]=useState(''),[busy,setBusy]=useState(false),[notice,setNotice]=useState('');const inFlight=useRef(false),generation=useRef(0);
 const selectedId=String(selected?.id||selected?._id||'');
 const sender=useMemo(()=> (id:string,command:Parameters<typeof api.schoolAssessmentCommand>[1])=>api.schoolAssessmentCommand(id,command,schoolId),[schoolId]);
 const runCommand=useSchoolAssessmentCommands(user.id+'|'+schoolId,sender);
 const targets=useMemo(()=>[{id:schoolId,name:'المدرسة بالكامل',type:'SCHOOL'},...classes.map(item=>({id:item.classId,name:item.className,type:'CLASS'}))],[classes,schoolId]);
 useEffect(()=>{
  const current=++generation.current;setContext(null);setError('');setNotice('');setReopen(false);
  if(selectedId)api.schoolAssessmentContext(selectedId,schoolId).then(data=>{if(current===generation.current)setContext(data);}).catch(()=>{if(current===generation.current)setError('تعذر تحميل صلاحيات الاختبار. أغلق النافذة وأعد المحاولة.');});
  return()=>{generation.current++;};
 },[selectedId,schoolId,user.id,revision]);
 const refresh=()=>{const current=generation.current;void Promise.resolve(onRefresh?.()).catch(()=>{if(current===generation.current)setNotice('تم الحفظ؛ تعذر تحديث القائمة، أعد فتح القسم.');});};
 const run=async(action:()=>Promise<void>)=>{
  if(inFlight.current)return;inFlight.current=true;setBusy(true);setNotice('');const current=generation.current;
  try{await action();}catch(e){if(current===generation.current)setNotice(e instanceof Error?e.message:'تعذر تنفيذ العملية. حاول مرة أخرى.');}
  finally{inFlight.current=false;setBusy(false);}
 };
 const openEditor=()=>run(async()=>{const current=generation.current;const quiz=await api.schoolAssessmentDefinition(selectedId,schoolId);if(current===generation.current)setEditing(quiz);});
 const copy=()=>run(async()=>{const current=generation.current;const quiz=await api.cloneSchoolAssessment(selectedId,schoolId);if(current!==generation.current)return;setSelected(quiz);setEditing(quiz);refresh();});
 const publication=()=>run(async()=>{const current=generation.current;const quiz=await api.updateSchoolAssessmentDefinition(selectedId,{isPublished:!context!.isPublished},schoolId);if(current!==generation.current)return;setSelected(quiz);setRevision(n=>n+1);refresh();});
 return <div className="space-y-3">
  {!items.length&&<p className="rounded-xl border border-dashed p-4 text-sm text-slate-500">لا توجد اختبارات مدرسية ظاهرة لهذا النطاق.</p>}
  {items.slice(0,rows.limit).map(item=><article key={String(item.id||item._id)} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-white p-4">
   <div className="min-w-0"><h4 className="break-words font-bold">{item.title}</h4><p className="mt-1 text-xs text-slate-500">{subjects.find(s=>s.id===item.subjectId)?.name||'اختبار المدرسة'} · {item.isPublished?'منشور':'غير منشور'}</p></div>
   <button type="button" onClick={()=>setSelected(item)} className="rounded-lg border border-indigo-200 px-3 py-2 text-xs font-bold text-indigo-700">النتائج والإدارة</button>
  </article>)}
  <DisplayListControls {...rows} total={items.length} label="اختبارات المدرسة"/>
  {selected&&!editing&&<DashboardDialog label={'متابعة '+selected.title} onClose={()=>setSelected(null)} className="max-w-5xl rounded-2xl bg-white shadow-xl">
   <header className="flex items-center justify-between gap-3 border-b p-4"><h3 className="font-bold">{selected.title}</h3><button onClick={()=>setSelected(null)} className="rounded-lg border px-3 py-2 text-sm">إغلاق</button></header>
   <div className="space-y-4 overflow-y-auto p-4">
    {error?<p role="alert" className="text-rose-700">{error}</p>:!context?<p role="status">جارٍ تحميل الاختبار…</p>:<>
     <div className="flex flex-wrap gap-2">
      {context.canEditContent&&context.canManageDefinition&&<button disabled={busy} onClick={()=>void openEditor()} className="rounded-lg border px-3 py-2 text-sm disabled:opacity-40">تعديل محتوى الاختبار</button>}
      {context.canManageDefinition&&<button disabled={busy} onClick={()=>void publication()} className="rounded-lg border px-3 py-2 text-sm disabled:opacity-40">{context.isPublished?'إخفاء الاختبار عن الطلاب':'نشر الاختبار للطلاب'}</button>}
      {context.canClone&&<button disabled={busy} onClick={()=>void copy()} className="rounded-lg border px-3 py-2 text-sm disabled:opacity-40">إنشاء نسخة للتعديل</button>}
      {context.canManage&&<button disabled={busy} onClick={()=>void run(async()=>{const current=generation.current;const result=await runCommand(selectedId,{operation:'remind',payload:{}});if(current===generation.current)setNotice('تم تذكير '+(result.notifiedCount??0)+' طالب ممن لم يؤدوا الاختبار.');})} className="rounded-lg border px-3 py-2 text-sm disabled:opacity-40">تذكير الغائبين</button>}
      {context.canManage&&context.isPublished&&<button disabled={busy} onClick={()=>setReopen(true)} className="rounded-lg border px-3 py-2 text-sm">إعادة فتح الموعد</button>}
     </div>
     {context.canManage&&!context.canEditContent&&<p className="text-xs text-slate-500">لتغيير أسئلة اختبار منشور أو له محاولات محفوظة، أنشئ نسخة للتعديل.</p>}
     {!context.canManage&&<p className="text-xs text-slate-500">النتائج متاحة حسب صلاحيتك؛ إجراءات التعديل تتطلب صلاحية إدارة هذا الاختبار.</p>}
     <SchoolAssessmentReportWorkspace quizId={selectedId} actorId={user.id} schoolId={schoolId}/>
    </>}
    {notice&&<p role="status" className="text-sm">{notice}</p>}
   </div>
  </DashboardDialog>}
  {selected&&reopen&&<SchoolAssessmentReopenDialog title={selected.title} closesAt={selected.dueDate} onClose={()=>setReopen(false)} onSave={window=>runCommand(selectedId,{operation:'reopen',payload:window})}/>}
  {editing&&<Suspense fallback={<p role="status">جارٍ تحميل المحرر…</p>}><Builder key={editing.id} role="school_admin" editingQuiz={editing} allowedGroupIds={targets.map(item=>item.id)} targetGroupOptions={targets} persistQuiz={(id,payload)=>api.updateSchoolAssessmentDefinition(id,payload,schoolId)} onSave={quiz=>{setSelected(quiz);setRevision(n=>n+1);refresh();}} onClose={()=>setEditing(null)}/></Suspense>}
 </div>;
}
