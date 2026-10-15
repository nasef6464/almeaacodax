import React,{useRef,useState} from 'react';
import {api} from '../../../services/api';
import type {Quiz} from '../../../types';
import type {SchoolAssessmentCompositionSpec,SchoolAssessmentCompositionPreview} from '../../../types/schoolAssessments';

type Item={id:string;name:string;pathId?:string;subjectId?:string;subSkills?:{id:string;name:string}[]};
export const SchoolAssessmentComposePanel:React.FC<{
  paths:Item[];subjects:Item[];skills:Item[];onReview:(draft:Partial<Quiz>)=>void;onClose:()=>void;
  compose?:typeof api.composeSchoolAssessment;
}>=({paths,subjects,skills,onReview,onClose,compose=api.composeSchoolAssessment})=>{
  const [pathId,setPathId]=useState(paths[0]?.id||'');
  const [kind,setKind]=useState<'normal'|'mock'>('normal');
  const [rows,setRows]=useState<SchoolAssessmentCompositionSpec['subjectSpecs']>([]);
  const [prompt,setPrompt]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const [preview,setPreview]=useState<SchoolAssessmentCompositionPreview|null>(null);
  const generation=useRef(0),inFlight=useRef(false);
  const invalidate=()=>{generation.current++;setPreview(null);setError('');};
  const changeRow=(id:string,patch:Partial<(typeof rows)[number]>)=>{invalidate();setRows(current=>current.map(row=>row.subjectId===id?{...row,...patch}:row));};
  const load=async(ai:boolean)=>{
    if(inFlight.current||!rows.length||!pathId)return;
    inFlight.current=true;setBusy(true);setError('');setPreview(null);
    const current=++generation.current;
    try{
      const result=await compose({kind,pathId,subjectSpecs:rows,...(ai?{prompt:prompt.trim()}:{})});
      if(current===generation.current)setPreview(result);
    }catch(reason){if(current===generation.current)setError(reason instanceof Error?reason.message:'تعذر تجهيز المعاينة. حاول مرة أخرى.');}
    finally{inFlight.current=false;setBusy(false);}
  };
  return <section dir="rtl" className="space-y-5 rounded-2xl border bg-white p-5">
    <div className="flex items-center justify-between gap-3"><h2 className="text-lg font-black">إنشاء اختبار بالمواصفات</h2><button onClick={onClose}>رجوع</button></div>
    <p className="text-sm text-gray-600">اختر المواد والمهارات والعدد. نعرض أسئلة معتمدة من البنك لتراجعها وتحدد الطلاب قبل الحفظ.</p>
    <div className="flex flex-wrap gap-4">
      <label>المسار<select aria-label="المسار" value={pathId} onChange={event=>{invalidate();setPathId(event.target.value);setRows([]);}} className="m-2 rounded border p-2"><option value="">اختر المسار</option>{paths.map(path=><option key={path.id} value={path.id}>{path.name}</option>)}</select></label>
      <label>نوع الاختبار<select aria-label="نوع الاختبار" value={kind} onChange={event=>{invalidate();const next=event.target.value as typeof kind;setKind(next);if(next==='normal')setRows(current=>current.slice(0,1));}} className="m-2 rounded border p-2"><option value="normal">عادي — مادة واحدة</option><option value="mock">محاكي — مجموعة مواد</option></select></label>
    </div>
    <div className="space-y-3">{subjects.filter(subject=>subject.pathId===pathId).map(subject=>{
      const row=rows.find(item=>item.subjectId===subject.id);
      const subjectSkills=skills.filter(skill=>skill.subjectId===subject.id&&skill.pathId===pathId).flatMap(skill=>[{id:skill.id,name:skill.name},...(skill.subSkills||[])]);
      return <fieldset key={subject.id} className="space-y-3 rounded-xl border p-3">
        <label className="flex items-center gap-2 font-bold"><input type="checkbox" checked={Boolean(row)} onChange={event=>{invalidate();setRows(current=>event.target.checked?[...(kind==='normal'?[]:current),{subjectId:subject.id,skillIds:[],count:10}]:current.filter(item=>item.subjectId!==subject.id));}}/>{subject.name}</label>
        {row&&<><div className="flex flex-wrap gap-3"><label>عدد أسئلة {subject.name}<input aria-label={'عدد أسئلة '+subject.name} type="number" min={1} max={200} value={row.count} onChange={event=>changeRow(subject.id,{count:Number(event.target.value)})} className="m-2 w-24 rounded border p-2"/></label>
          <label>الصعوبة<select aria-label={'صعوبة '+subject.name} value={row.difficulty||''} onChange={event=>changeRow(subject.id,{difficulty:event.target.value?(event.target.value as typeof row.difficulty):undefined})} className="m-2 rounded border p-2"><option value="">كل المستويات</option><option value="Easy">سهل</option><option value="Medium">متوسط</option><option value="Hard">صعب</option></select></label></div>
          <p className="text-xs text-gray-500">اختيار المهارات اختياري؛ تركها فارغة يشمل مهارات المادة.</p>
          <div className="flex max-h-48 flex-wrap gap-3 overflow-auto">{subjectSkills.map(skill=><label key={skill.id} className="flex items-center gap-1 text-sm"><input type="checkbox" checked={row.skillIds.includes(skill.id)} onChange={event=>changeRow(subject.id,{skillIds:event.target.checked?[...row.skillIds,skill.id]:row.skillIds.filter(id=>id!==skill.id)})}/>{skill.name}</label>)}</div></>}
      </fieldset>;
    })}</div>
    <label className="block">وصف اختياري للاقتراح<textarea aria-label="وصف اختياري للاقتراح" value={prompt} maxLength={2000} onChange={event=>{invalidate();setPrompt(event.target.value);}} className="mt-2 block w-full rounded-xl border p-3" placeholder="مثال: ركّز على الكسور والأسئلة المتوسطة ضمن المواد والعدد المحددين"/></label>
    <div className="flex flex-wrap gap-3"><button disabled={busy||!rows.length} onClick={()=>void load(false)} className="rounded-xl bg-indigo-600 px-4 py-2 font-bold text-white disabled:opacity-50">معاينة من البنك</button><button disabled={busy||!rows.length||!prompt.trim()} onClick={()=>void load(true)} className="rounded-xl border px-4 py-2 disabled:opacity-50">اقتراح توزيع بالذكاء الاصطناعي</button></div>
    {busy&&<p role="status">جارٍ تجهيز المعاينة…</p>}{error&&<p role="alert" className="text-rose-700">{error}</p>}
    {preview&&<div className="space-y-3 rounded-xl bg-indigo-50 p-4"><h3 className="font-black">معاينة التوزيع</h3>{preview.coverage.map(item=><p key={item.subjectId}>{subjects.find(subject=>subject.id===item.subjectId)?.name||item.subjectId}: المطلوب {item.requested}، المتاح {item.available}، المختار {item.selected}</p>)}
      {preview.warnings.map((warning,index)=><p key={index} role="alert" className="text-amber-800">{warning}</p>)}
      <button disabled={preview.coverage.some(item=>item.selected!==item.requested)} onClick={()=>onReview(preview.draft)} className="rounded-xl bg-indigo-600 px-4 py-2 font-bold text-white disabled:opacity-50">مراجعة الأسئلة وتحديد الطلاب</button>
    </div>}
  </section>;
};
