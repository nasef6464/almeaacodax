import React,{useEffect,useMemo,useState} from 'react';
import {api} from '../../services/api';
import {useStore} from '../../store/useStore';
import {resolveClassroomSkillName} from '../../utils/classroomSkillResolver';
import {normalizeClassroomReport,type CanonicalClassroomReport,type ClassroomSavedReport} from './classroomReportViewModel';
import {buildClassroomComparison,classroomComparisonCsv,classroomTrendLabels} from './classroomComparison';

const legacyMaterialName=(value:string)=>{try{const parsed=JSON.parse(value);return Array.isArray(parsed)&&parsed.length===2?String(parsed[1]):value;}catch{return value;}};

export function ClassroomComparisonPanel({schoolId,reports,onClose}:{schoolId:string;reports:CanonicalClassroomReport[];onClose:()=>void}){
 const key=JSON.stringify([schoolId,reports.map(r=>r.sessionId).sort()]);
 const [state,setState]=useState<{key:string;reports:CanonicalClassroomReport[];loading:boolean;error:string}>({key:'',reports:[],loading:true,error:''});
 const [tab,setTab]=useState<'summary'|'students'|'skills'>('summary'),[material,setMaterial]=useState(''),[search,setSearch]=useState(''),[retry,setRetry]=useState(0);
 const {subjects,skills,nestedSkills}=useStore();
 useEffect(()=>{let active=true;setState({key,reports:[],loading:true,error:''});setMaterial('');setSearch('');setTab('summary');
  const load=async()=>{try{const loaded:CanonicalClassroomReport[]=[];
   for(let offset=0;offset<reports.length;offset+=3){if(!active)return;const batch=await Promise.all(reports.slice(offset,offset+3).map(async selected=>{
    const {report}=await api.get<{report:ClassroomSavedReport}>(`/classroom/sessions/${encodeURIComponent(selected.sessionId)}/aggregate?view=report`);
    if(report.sessionId!==selected.sessionId||report.schoolId!==schoolId)throw Error('Report scope mismatch');return normalizeClassroomReport(report);
   }));loaded.push(...batch);}
   if(active)setState({key,reports:loaded,loading:false,error:''});
  }catch{if(active)setState({key,reports:[],loading:false,error:'تعذر تحميل الحصص المحددة. تحقق من صلاحياتك وأعد المحاولة.'});}};void load();return()=>{active=false;};
 },[key,retry]);
 const current=state.key===key;
 const data=useMemo(()=>buildClassroomComparison(current?state.reports:[],subjects),[current,state.reports,subjects]);
 const materials=[...new Set([...data.students.map(s=>s.material),...data.skills.map(s=>s.material)])];
 const materialName=(id:string)=>id.split(' + ').map(part=>subjects.find(s=>s.id===part)?.name||legacyMaterialName(part)).join(' + ');
 const skillName=(id:string)=>resolveClassroomSkillName(id,skills,nestedSkills,subjects);
 const shownStudents=data.students.filter(s=>(!material||s.material===material)&&s.name.includes(search));
 const chosenMaterial=material||(materials.length===1?materials[0]:'');
 const shownSkills=data.skills.filter(s=>s.material===chosenMaterial);
 const percent=(v:number|null)=>v===null?'—':`${v}%`;
 const difference=(v:number|null)=>v===null?'أدلة غير كافية':`${v>0?'+':''}${v} نقطة`;
 const exportReport=()=>{const value={...data,students:data.students.map(s=>({...s,material:materialName(s.material)})),skills:data.skills.map(s=>({...s,skillId:skillName(s.skillId),material:materialName(s.material)}))};const blob=new Blob([classroomComparisonCsv(value)],{type:'text/csv;charset=utf-8'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='تقرير-الحصص-المحددة.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
 return <section aria-label="التقرير المجمع للحصص" className="mt-5 rounded-2xl border border-indigo-200 bg-white p-4 dark:bg-slate-900" dir="rtl">
  <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-lg font-black">تقرير الحصص المحددة</h3><p className="mt-1 text-xs text-slate-500">من هذه الحصص فقط · فرق الدقة يقارن أول وآخر حصة في المادة نفسها.</p></div><div className="flex gap-2"><button type="button" disabled={!current||state.loading||!!state.error} onClick={exportReport} className="rounded-xl bg-indigo-600 px-3 py-2 text-sm font-bold text-white disabled:opacity-40">تصدير Excel / CSV</button><button type="button" onClick={onClose} className="rounded-xl border px-3 py-2 text-sm">إغلاق التقرير المجمع</button></div></div>
  {!current||state.loading?<p role="status" className="py-6">جارٍ إعداد التقرير المجمع…</p>:state.error?<div role="alert" className="mt-4 rounded-xl bg-rose-50 p-3 text-rose-800">{state.error}<button type="button" onClick={()=>setRetry(v=>v+1)} className="mr-3 underline">إعادة المحاولة</button></div>:<>
  <div role="tablist" aria-label="أقسام التقرير المجمع" className="mt-4 grid grid-cols-3 gap-2">{([{id:'summary',label:'الملخص'},{id:'students',label:'الطلاب'},{id:'skills',label:'المهارات'}] as const).map(item=><button key={item.id} role="tab" id={`comparison-tab-${item.id}`} aria-controls="comparison-content" aria-selected={tab===item.id} type="button" onClick={()=>setTab(item.id)} className={`min-h-11 rounded-xl px-3 py-2 text-sm font-bold ${tab===item.id?'bg-indigo-600 text-white':'bg-slate-100 text-slate-700'}`}>{item.label}</button>)}</div>
  {data.incompleteSessions>0&&<p className="mt-3 rounded-xl bg-amber-50 p-3 text-xs text-amber-900">{data.incompleteSessions} حصة تحتوي أدلة قديمة أو ناقصة؛ لم نعتبر البيانات المفقودة إجابات خاطئة.</p>}
  <div id="comparison-content" role="tabpanel" aria-labelledby={`comparison-tab-${tab}`} className="mt-4">
  {tab==='summary'?<><div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{[['الحصص',data.sessions],['طلاب موثقون',data.studentCount],['الإجابات',data.answered],['دقة الحل',percent(data.accuracy)]].map(([label,value])=><div key={label} className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">{label}</p><strong className="mt-1 block text-xl">{value}</strong></div>)}</div><div className="mt-4 flex flex-wrap gap-2 text-sm"><span className="rounded-lg bg-emerald-50 px-3 py-2">تحسّن: {data.students.filter(s=>s.state==='improved').length}</span><span className="rounded-lg bg-amber-50 px-3 py-2">يحتاج دعمًا: {data.students.filter(s=>s.needsSupport).length}</span><span className="rounded-lg bg-slate-100 px-3 py-2">لم يحل أحدث حصة: {data.students.filter(s=>s.state==='no_participation').length}</span></div><p className="mt-3 text-xs text-slate-500">حالات الأداء محسوبة لكل طالب ومادة؛ قد يظهر الطالب في أكثر من مادة.</p></>:<>
   <div className="mb-3 flex flex-wrap gap-2"><label className="text-sm font-bold">المادة<select aria-label="مادة التقرير المجمع" value={material} onChange={e=>setMaterial(e.target.value)} className="mr-2 max-w-full rounded-xl border p-2"><option value="">{tab==='skills'?'اختر المادة':'كل المواد'}</option>{materials.map(id=><option key={id} value={id}>{materialName(id)}</option>)}</select></label>{tab==='students'&&<input aria-label="بحث الطلاب في التقرير المجمع" value={search} onChange={e=>setSearch(e.target.value)} placeholder="اسم الطالب" className="min-w-0 rounded-xl border p-2 text-sm"/>}</div>
   {tab==='students'?<div className="space-y-2">{shownStudents.map(s=><article key={JSON.stringify([s.studentId,s.material])} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3"><div className="min-w-0"><h4 className="break-words font-bold">{s.name}</h4><p className="text-xs text-slate-500">{materialName(s.material)} · {s.correct}/{s.answered} صحيحة</p></div><div className="flex flex-wrap gap-3 text-xs"><span>أول: {percent(s.first)}</span><span>أحدث موثقة: {percent(s.latest)}</span><strong>{difference(s.delta)}</strong><span>{classroomTrendLabels[s.state]}{s.state==='improved'&&s.needsSupport?' · يحتاج دعمًا':''}</span></div></article>)}{!shownStudents.length&&<p className="py-4 text-sm text-slate-500">لا توجد بيانات طلاب مطابقة.</p>}</div>:!chosenMaterial?<p className="py-4 text-sm text-slate-500">اختر المادة لعرض مهاراتها.</p>:<div className="space-y-2">{shownSkills.map(s=><article key={JSON.stringify([s.pathId,s.material,s.skillId])} className="rounded-xl border p-3"><div className="flex flex-wrap justify-between gap-2"><h4 className="font-bold">{skillName(s.skillId)}</h4><strong>{percent(s.accuracy)}</strong></div><div className="mt-2 h-1.5 rounded-full bg-slate-100"><div className="h-full rounded-full bg-sky-500" style={{width:`${s.accuracy||0}%`}}/></div><p className="mt-2 text-xs text-slate-500">{s.correct}/{s.answered} صحيحة · {s.evidenceSessions} حصص بأدلة · {difference(s.delta)}</p></article>)}{!shownSkills.length&&<p className="py-4 text-sm text-slate-500">لا توجد مهارات موثقة للمادة.</p>}</div>}
  </>}
  </div></>}
 </section>;
}
