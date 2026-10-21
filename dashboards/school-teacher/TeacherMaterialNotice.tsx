import React from 'react';
import {useStore} from '../../store/useStore';
export function TeacherMaterialNotice({assignments}:{assignments:Array<{subjectId?:string}>}){
 const {subjects}=useStore();const ids=[...new Set(assignments.map(a=>a.subjectId).filter(Boolean))];
 const ready=ids.length===1&&!assignments.some(a=>!a.subjectId);
 return ready?<p className="rounded-xl bg-sky-50 px-4 py-3 text-sm font-bold text-sky-900">مادتك: {subjects.find(s=>s.id===ids[0])?.name||'المادة المكلّف بها'}</p>:<div role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><strong>يلزم تحديد مادة المعلم</strong><p className="mt-1">اطلب من مدير المدرسة توحيد تكليفاتك على مادة واحدة. لا تُفتح بقية المواد تلقائيًا.</p></div>;
}
