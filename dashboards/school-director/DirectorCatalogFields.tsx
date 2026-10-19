import React from 'react';
import {useStore} from '../../store/useStore';

export function DirectorCatalogFields({pathId,subjectId,skillId,onChange,labels}: {
  pathId:string;subjectId:string;skillId?:string;
  onChange:(selection:{pathId:string;subjectId:string;skillId:string})=>void;
  labels:{path:string;subject:string;skill?:string};
}) {
  const {paths,subjects,skills}=useStore();
  const availableSubjects=subjects.filter(item=>item.pathId===pathId);
  const subject=availableSubjects.find(item=>item.id===subjectId);
  const availableSkills=subject?skills.filter(item=>item.subjectId===subjectId&&item.pathId===pathId):[];
  const selectClass='mt-1 block w-full min-w-0 rounded-xl border bg-white px-3 py-2 text-sm disabled:bg-slate-50';
  return <>
    <label className="text-xs font-bold">{labels.path}<select aria-label={labels.path} className={selectClass} value={pathId} onChange={e=>onChange({pathId:e.target.value,subjectId:'',skillId:''})}>
      <option value="">اختر المسار</option>{paths.filter(item=>item.isActive!==false).map(item=><option key={item.id} value={item.id}>{item.name}</option>)}
    </select></label>
    <label className="text-xs font-bold">{labels.subject}<select aria-label={labels.subject} className={selectClass} disabled={!pathId} value={subject?.id||''} onChange={e=>onChange({pathId,subjectId:e.target.value,skillId:''})}>
      <option value="">اختر المادة</option>{availableSubjects.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}
    </select></label>
    {labels.skill&&<label className="text-xs font-bold">{labels.skill}<select aria-label={labels.skill} className={selectClass} disabled={!subject} value={availableSkills.some(item=>item.id===skillId)?skillId:''} onChange={e=>onChange({pathId,subjectId,skillId:e.target.value})}>
      <option value="">{subject?'اختر المهارة':'اختر المادة أولًا'}</option>{availableSkills.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}
    </select></label>}
  </>;
}
