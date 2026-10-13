import React, { useCallback, useEffect, useState } from 'react';
import { api } from '../../services/api';
import { useStore } from '../../store/useStore';
import { captureAuthActor, isCurrentAuthActor } from '../../utils/authSessionLifetime';
import type { SessionView } from '../../types/liveSessions';
import { LiveSessionCard } from './LiveSessionCard';
export function LiveLessonPanel({courseId,lessonId}:{courseId:string;lessonId:string}) {
  const user = useStore(state=>state.user);
  const key = `${user?.id}:${courseId}:${lessonId}`;
  const [snapshot,setSnapshot]=useState<{key:string;item?:SessionView}>({key:''});
  const [error,setError]=useState(''),[loading,setLoading]=useState(false);
  const reload=useCallback(async()=>{
    const actor=captureAuthActor(useStore.getState().user);setLoading(true);setError('');
    try{const result=await api.getCourseLiveSession(courseId,lessonId);if(isCurrentAuthActor(actor,useStore.getState().user))setSnapshot({key,item:result.session});}
    catch(error){if(isCurrentAuthActor(actor,useStore.getState().user))setError(error instanceof Error?error.message:'موعد الحصة قيد التجهيز');}
    finally{if(isCurrentAuthActor(actor,useStore.getState().user))setLoading(false);}
  },[key,courseId,lessonId]);
  useEffect(()=>{setSnapshot({key:''});void reload();},[reload]);
  const item=snapshot.key===key?snapshot.item:undefined;
  return <div className="w-full h-full overflow-auto p-4 text-right" dir="rtl">
    {item ? <LiveSessionCard session={item} onChange={()=>void reload()}/> : <p className="text-white">{loading?'جاري تحميل موعد الحصة…':error || 'موعد الحصة المباشرة قيد التجهيز'}</p>}
  </div>;
}
