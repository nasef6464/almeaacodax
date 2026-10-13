import React, { useState } from 'react';
import { api } from '../../services/api';
import type { SessionView } from '../../types/liveSessions';
import { useStore } from '../../store/useStore';
import { captureAuthActor, isCurrentAuthActor } from '../../utils/authSessionLifetime';
export const providerLabels: Record<string,string> = {zoom:'Zoom',google_meet:'Google Meet',teams:'Microsoft Teams',live_youtube:'YouTube Live'};
export function LiveSessionCard({session,manage=false,onChange,onEdit}:{session:SessionView;manage?:boolean;onChange?:()=>void;onEdit?:(session:SessionView)=>void}) {
  const [recording,setRecording] = useState(session.management?.recordingUrl || ''), [publish,setPublish] = useState(session.management?.showRecording || false);
  const [error,setError] = useState(''), [busy,setBusy] = useState(false);
  const act = async(action:'join'|'recording'|'cancel'|'complete') => {
    const actor = captureAuthActor(useStore.getState().user); if((!actor.actorId && session.audience.kind!=='public') || busy)return;
    setBusy(true);setError('');
    // Open synchronously so the browser permits a new tab, then use guarded URL.
    const target = (action === 'join' || action === 'recording') ? window.open('about:blank','_blank') : null;
    if(target) target.opener = null;
    try {
      if(action === 'join' || action === 'recording') { const result = (!actor.actorId || actor.actorId==='guest') && session.audience.kind==='public' ? await api.joinPublicLiveSession(session.id,action==='join'?'join':'recording') : action==='join'?await api.joinLiveSession(session.id):await api.getLiveRecording(session.id); if(!isCurrentAuthActor(actor,useStore.getState().user)){target?.close();return;} if(target)target.location.href=result.participantUrl; else window.location.assign(result.participantUrl); }
      else { await api.changeLiveSession(session.id,action); if(isCurrentAuthActor(actor,useStore.getState().user))onChange?.(); }
    } catch(error) {target?.close();if(isCurrentAuthActor(actor,useStore.getState().user))setError(error instanceof Error?error.message:'تعذر تنفيذ الإجراء');}
    finally{if(isCurrentAuthActor(actor,useStore.getState().user))setBusy(false);}
  };
  return <article dir="rtl" className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3 text-slate-900">
    <h3 className="font-bold">{session.title}</h3>
    <p className="text-sm">{providerLabels[session.provider]} · {session.audience.kind === 'private' ? 'جلسة خاصة' : session.audience.kind === 'course' ? 'درس دورة' : 'حصة جماعية'}</p>
    <p className="text-sm">{new Date(session.startAt).toLocaleString('ar-SA',{timeZone:session.timeZone})} · {session.teacherName}</p>
    <p className="text-sm">{session.state === 'cancelled' ? 'ملغاة' : session.state === 'completed' ? 'منتهية' : session.canJoin ? 'متاح للدخول' : session.meetingReadiness === 'awaiting_connection' ? 'مؤكدة — الرابط قيد التجهيز' : 'مؤكدة'}</p>
    {manage && !session.hostCapacityVerified && <p className="text-xs text-amber-800">سعة الحساب الخارجي غير متحققة؛ تعارض المدرس محمي.</p>}
    <div className="flex flex-wrap gap-2">
      <button type="button" className="rounded-xl bg-indigo-600 text-white px-4 py-2 disabled:opacity-40" disabled={!session.canJoin || busy} onClick={()=>void act('join')}>دخول الحصة</button>
      {session.state === 'confirmed' && <>
        {(manage || (session.audience.kind === 'private' && +new Date(session.startAt)>Date.now())) && <button type="button" disabled={busy} onClick={()=>void act('cancel')}>إلغاء الحصة</button>}
        {manage && <button type="button" onClick={()=>onEdit?.(session)}>تغيير الموعد أو الرابط</button>}
        {manage && +new Date(session.startAt)<=Date.now() && <button type="button" disabled={busy} onClick={()=>void act('complete')}>إنهاء الحصة</button>}
      </>}
    </div>
    {session.hasRecording && <button type="button" disabled={busy} onClick={()=>void act('recording')}>مشاهدة التسجيل</button>}
    {manage && <details><summary>التسجيل الخارجي</summary><form className="space-y-2 mt-2" onSubmit={async e=>{e.preventDefault();const actor=captureAuthActor(useStore.getState().user);setBusy(true);try{await api.saveLiveRecording(session.id,recording,publish);if(isCurrentAuthActor(actor,useStore.getState().user))onChange?.();}catch(error){if(isCurrentAuthActor(actor,useStore.getState().user))setError(error instanceof Error?error.message:'تعذر حفظ التسجيل');}finally{if(isCurrentAuthActor(actor,useStore.getState().user))setBusy(false);}}}><label>رابط التسجيل<input aria-label="رابط التسجيل" type="url" className="block border rounded-xl p-2 w-full" value={recording} onChange={e=>setRecording(e.target.value)}/></label><label className="flex gap-2"><input type="checkbox" checked={publish} onChange={e=>setPublish(e.target.checked)}/>إتاحة التسجيل لجمهور الحصة بعد انتهائها</label><button disabled={busy}>حفظ التسجيل</button></form></details>}
    {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
  </article>;
}
