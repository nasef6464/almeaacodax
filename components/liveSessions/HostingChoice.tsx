import React from 'react';
import type { HostingPolicy, LiveHost, LiveSessionInput } from '../../types/liveSessions';
import { providerLabels } from './LiveSessionCard';
export const hostingLabels: Record<string,string> = {teacher_account:'حساب المدرس',platform_account:'حساب المنصة',manual_link:'رابط يدوي'};
export function HostingChoice({policy,hosts,value,onChange,isPrivate=false}:{policy:HostingPolicy;hosts:LiveHost[];value:LiveSessionInput;onChange:(value:LiveSessionInput)=>void;isPrivate?:boolean}) {
  const available = hosts.filter(host=>host.enabled && host.provider===value.provider && (value.hostingMode==='platform_account' ? host.ownerType==='platform' : host.ownerType==='teacher' && host.ownerId===value.teacherId));
  return <div className="grid gap-3 sm:grid-cols-2">
    <label>مزود الاجتماع<select aria-label="مزود الاجتماع" className="block w-full rounded-xl border p-2" value={value.provider} onChange={e=>onChange({...value,provider:e.target.value,hostId:'',meetingUrl:''})}>{policy.providers.filter(p=>!isPrivate || p!=='live_youtube').map(p=><option key={p} value={p}>{providerLabels[p]}</option>)}</select></label>
    <label>الاستضافة<select aria-label="الاستضافة" className="block w-full rounded-xl border p-2" value={value.hostingMode} onChange={e=>onChange({...value,hostingMode:e.target.value,hostId:''})}>{policy.hostingModes.map(mode=><option key={mode} value={mode}>{hostingLabels[mode]}</option>)}</select></label>
    {value.hostingMode!=='manual_link' && <label>حساب الاستضافة<select aria-label="حساب الاستضافة" className="block w-full rounded-xl border p-2" required value={value.hostId} onChange={e=>onChange({...value,hostId:e.target.value})}><option value="">اختر حسابًا</option>{available.map(host=><option key={host.id} value={host.id}>{host.label}{!host.connected?' — يحتاج ربطًا':''}</option>)}</select></label>}
    <label>رابط الاجتماع<input aria-label="رابط الاجتماع" className="block w-full rounded-xl border p-2" type="url" placeholder="https://" value={value.meetingUrl} onChange={e=>onChange({...value,meetingUrl:e.target.value})}/></label>
    <p className="text-xs text-slate-600 sm:col-span-2">يمكن إضافة الرابط الذي أنشأته في حسابك. الإنشاء التلقائي يحتاج تفويض الحساب؛ الفيديو والصوت عند مزود الاجتماع.</p>
  </div>;
}
