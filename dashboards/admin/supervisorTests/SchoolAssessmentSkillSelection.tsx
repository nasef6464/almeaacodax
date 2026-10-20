import React,{useState} from 'react';

type Skill={id:string;name:string};
const searchable=(value:string)=>value.normalize('NFKD').replace(/\p{M}/gu,'').toLocaleLowerCase('ar').trim();
export function SchoolAssessmentSkillSelection({subjectName,skills,selected,onChange}:{subjectName:string;skills:Skill[];selected:string[];onChange:(ids:string[])=>void}){
 const [search,setSearch]=useState('');
 const visible=skills.filter(skill=>searchable(skill.name).includes(searchable(search)));
 return <details className="min-w-0 rounded-lg border border-slate-100 bg-slate-50/50 p-3">
  <summary aria-label={'تحديد مهارات '+subjectName} className="cursor-pointer text-sm font-bold text-slate-700">المهارات: {selected.length?`${selected.length} محددة`:'جميع مهارات المادة'}</summary>
  <p className="mt-2 text-xs text-slate-500">اختياري؛ عدم تحديد مهارات يشمل المادة كلها.</p>
  {skills.length>0?<>
   <input type="search" aria-label={'البحث في مهارات '+subjectName} value={search} onChange={event=>setSearch(event.target.value)} placeholder="ابحث عن مهارة" className="my-3 block w-full min-w-0 rounded-lg border bg-white p-2 text-sm"/>
   <div className="max-h-48 space-y-2 overflow-y-auto">
    {visible.map(skill=><label key={skill.id} className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-1 shrink-0" checked={selected.includes(skill.id)} onChange={event=>onChange(event.target.checked?[...selected,skill.id]:selected.filter(id=>id!==skill.id))}/><span className="min-w-0 break-words">{skill.name}</span></label>)}
    {!visible.length&&<p className="text-sm text-slate-500">لا توجد مهارات مطابقة.</p>}
   </div>
  </>:<p className="mt-2 text-sm text-slate-500">لا توجد مهارات مصنفة لهذه المادة.</p>}
 </details>;
}
