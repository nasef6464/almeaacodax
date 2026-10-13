import { useStudentExperience } from '../../contexts/StudentExperienceContext';
import React, { useEffect, useState } from 'react';
import { useStore } from '../../store/useStore';
import { api } from '../../services/api';
import { captureAuthActor, isCurrentAuthActor } from '../../utils/authSessionLifetime';
import type { Activity } from '../../types';
import type { HostingPolicy, LiveHost, LiveSessionInput, SessionView } from '../../types/liveSessions';
import { useLiveSessions } from './useLiveSessions';
import { LiveSessionCard, providerLabels } from './LiveSessionCard';
import { HostingChoice, hostingLabels } from './HostingChoice';

const liveTypes = ['zoom','google_meet','teams','live_youtube'];
const statusLabels: Record<string,string> = {pending:'بانتظار التأكيد',confirmed:'مؤكد',cancelled:'ملغي',rejected:'مرفوض'};
const blankInput = (): LiveSessionInput => ({teacherId:'',provider:'zoom',hostingMode:'manual_link',hostId:'',meetingUrl:'',meetingDate:'',duration:60});
const riyadhDate = (date:string) => new Date(date).toLocaleString('sv-SE',{timeZone:'Asia/Riyadh'}).slice(0,16).replace(' ','T');
export function LiveSessionWorkspace({manage=false}:{manage?:boolean}) {
  const {user,lessons,courses,groups} = useStore();
  const {scope}=useStudentExperience();
  const [hostOwner,setHostOwner]=useState<'teacher'|'platform'>('platform');
  const {sessions,error:sessionError,loading,reload} = useLiveSessions(manage?'manage':'me');
  const [data,setData] = useState<{actorId:string;bookings:Activity[];hosts:LiveHost[];teachers:{id:string;name:string;defaultHostingMode?:string}[]}>({actorId:'',bookings:[],hosts:[],teachers:[]});
  const [policy,setPolicy] = useState<HostingPolicy|null>(null), [error,setError] = useState(''), [notice,setNotice] = useState(''), [busy,setBusy] = useState(false);
  const [input,setInput] = useState(blankInput), [date,setDate] = useState(''), [bookingId,setBookingId] = useState(''), [editing,setEditing] = useState<SessionView|null>(null), [source,setSource] = useState(''), [audience,setAudience] = useState('public');
  const [hostLabel,setHostLabel] = useState('');
  const safe = data.actorId===user?.id ? data : {bookings:[],hosts:[],teachers:[]};
  const refresh = async() => {
    const actor=captureAuthActor(useStore.getState().user);if(!actor.actorId)return;
    try {
      const [bookings,hosts,teachers,settings] = await Promise.all([
        actor.actorId==='guest' ? Promise.resolve({activities:[]}) : manage ? user.role==='admin' ? api.getAdminSessionBookings({limit:100}) : api.getTeacherSessionBookings() : api.getMyActivities({limit:100}),
        manage?api.getLiveHosts():Promise.resolve({hosts:[]}),manage?api.getLiveTeachers():Promise.resolve({teachers:[]}),api.getLiveHostingPolicy(),
      ]);
      if(!isCurrentAuthActor(actor,useStore.getState().user))return;
      setData({actorId:actor.actorId,bookings:('bookings' in bookings ? bookings.bookings : bookings.activities).filter((item:any)=>item.type==='session_booked') as Activity[],hosts:hosts.hosts,teachers:teachers.teachers});setPolicy(settings.policy);
    }catch(error){if(isCurrentAuthActor(actor,useStore.getState().user))setError(error instanceof Error?error.message:'تعذر تحميل الطلبات');}
    await reload();
  };
  useEffect(()=>{setData({actorId:'',bookings:[],hosts:[],teachers:[]});setPolicy(null);setBookingId('');setEditing(null);setSource('');setError('');setNotice('');setBusy(false);setInput(blankInput());setHostLabel('');void refresh();},[user?.id,manage]);
  const run = async(action:()=>Promise<unknown>,success='تم حفظ التغيير') => {
    const actor=captureAuthActor(useStore.getState().user);if(busy || !actor.actorId)return;
    setBusy(true);setError('');setNotice('');
    try {await action();if(isCurrentAuthActor(actor,useStore.getState().user)){setNotice(success);await refresh();}}
    catch(error){if(isCurrentAuthActor(actor,useStore.getState().user))setError(error instanceof Error?error.message:'تعذر الحفظ');}
    finally{if(isCurrentAuthActor(actor,useStore.getState().user))setBusy(false);}
  };
  const chooseBooking = (booking:Activity) => {
    setEditing(null);setBookingId(booking.id);setSource('');
    setInput({...blankInput(),teacherId:booking.teacherId || (user.role==='teacher'?user.id:''),hostingMode:policy?.defaultHostingMode || 'teacher_account'});
    setDate(/^\d{4}-\d{2}-\d{2}$/.test(booking.scheduledDate||'') && /^\d{2}:\d{2}$/.test(booking.scheduledTime||'')?`${booking.scheduledDate}T${booking.scheduledTime}`:'');
  };
  const edit = (session:SessionView) => {
    setEditing(session);setBookingId('');setSource('');setDate(riyadhDate(session.startAt));
    setInput({...blankInput(),teacherId:session.teacherId,provider:session.provider,hostingMode:session.hostingMode,hostId:session.management?.hostId||'',meetingUrl:session.management?.meetingUrl||'',duration:(+new Date(session.endAt)-+new Date(session.startAt))/60000});
  };
  const submit = (event:React.FormEvent) => {
    event.preventDefault();
    const utc = new Date(`${date}:00+03:00`);
    if(!Number.isFinite(+utc)){setError('اختر موعدًا صحيحًا');return;}
    const payload={...input,meetingDate:utc.toISOString()};
    const capture=captureAuthActor(useStore.getState().user);
    void run(async()=>{
      if(editing) await api.changeLiveSession(editing.id,'reschedule',payload);
      else if(bookingId) await api.confirmLiveBooking(bookingId,payload);
      else if(source) await api.createLiveSession(JSON.parse(source),payload,audience==='public'?{kind:'public'}:{kind:'group',groupIds:[audience]});
      else throw new Error('اختر طلبًا أو درسًا مباشرًا');
      if(isCurrentAuthActor(capture,useStore.getState().user)){setEditing(null);setBookingId('');setSource('');}
    },'تم تأكيد الحصة وحفظ موعدها');
  };
  const options = [
    ...lessons.filter(lesson=>liveTypes.includes(lesson.type) && !String(lesson.id).startsWith('private_booking_') && !String(lesson.id).startsWith('live_conv_')).map(lesson=>({value:JSON.stringify({lessonId:lesson.id}),label:lesson.title})),
    ...courses.flatMap(course=>(course.modules||[]).flatMap(module=>module.lessons||[]).filter(lesson=>liveTypes.includes(lesson.type)).map(lesson=>({value:JSON.stringify({courseId:course.id,lessonId:lesson.id}),label:`${course.title} — ${lesson.title}`}))),
  ];
  return <section dir="rtl" className="space-y-4 rounded-2xl border border-indigo-100 bg-slate-50 p-4 text-slate-900">
    <div className="flex flex-wrap justify-between gap-2"><h2 className="font-bold text-lg">{manage?'إدارة الحصص والحجز الخاص':'حصصي وجلساتي'}</h2><button type="button" disabled={busy||loading} onClick={()=>void refresh()}>تحديث</button></div>
    {(error||sessionError) && <p role="alert" className="text-rose-700">{error||sessionError}</p>}{notice && <p role="status" className="text-emerald-700">{notice}</p>}
    {safe.bookings.length>0 && <div className="space-y-2"><h3 className="font-bold">طلبات الحصص الخاصة</h3>{safe.bookings.map(booking=><article key={booking.id} className="rounded-xl bg-white border p-3 space-y-2">
      <p>{booking.targetLabel||booking.title} — {statusLabels[booking.bookingStatus||'pending']}</p>
      <p className="text-sm">الموعد المقترح: {booking.scheduledDate} {booking.scheduledTime} {booking.studentName}</p>
      {booking.bookingStatus==='pending' && <div className="flex gap-3 flex-wrap">
        {manage ? <><button type="button" onClick={()=>chooseBooking(booking)}>تخصيص وتأكيد</button><button type="button" disabled={busy} onClick={()=>void run(()=>user.role==='admin'?api.updateAdminSessionBooking(booking.id,{bookingStatus:'rejected'}):api.rejectTeacherSessionRequest(booking.id))}>رفض الطلب</button></> : <button type="button" disabled={busy} onClick={()=>void run(()=>api.cancelMySessionRequest(booking.id))}>إلغاء الطلب</button>}
      </div>}
    </article>)}</div>}
    {manage && policy && <>
      <label className="block">جدولة درس مباشر<select aria-label="جدولة درس مباشر" className="block w-full rounded-xl border p-2" value={source} onChange={e=>{setSource(e.target.value);setBookingId('');setEditing(null);setInput({...blankInput(),teacherId:user.role==='teacher'?user.id:'',hostingMode:policy.defaultHostingMode});setDate('');}}><option value="">اختر درسًا أو طلبًا أعلاه</option>{options.map(option=><option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
      {(source||bookingId||editing) && <form onSubmit={submit} className="rounded-xl border bg-white p-4 space-y-3">
        <h3 className="font-bold">{bookingId?'تأكيد الجلسة الخاصة':editing?'تحديث موعد الحصة':'جدولة الحصة'}</h3>
        <label>المدرس<select aria-label="المدرس" className="block w-full rounded-xl border p-2" required value={input.teacherId} onChange={e=>setInput({...input,teacherId:e.target.value,hostId:'',hostingMode:safe.teachers.find(t=>t.id===e.target.value)?.defaultHostingMode || policy.defaultHostingMode})}><option value="">اختر مدرسًا</option>{safe.teachers.map(teacher=><option key={teacher.id} value={teacher.id}>{teacher.name}</option>)}</select></label>
        <div className="grid sm:grid-cols-2 gap-3"><label>الموعد بتوقيت الرياض<input aria-label="الموعد بتوقيت الرياض" required type="datetime-local" className="block border rounded-xl p-2 w-full" value={date} onChange={e=>setDate(e.target.value)}/></label><label>المدة بالدقائق<input aria-label="المدة بالدقائق" required type="number" min={15} max={480} className="block border rounded-xl p-2 w-full" value={input.duration} onChange={e=>setInput({...input,duration:Number(e.target.value)})}/></label></div>
        <HostingChoice policy={policy} hosts={safe.hosts} value={input} onChange={setInput} isPrivate={Boolean(bookingId||editing?.audience.kind==='private')}/>
        {source && !JSON.parse(source).courseId && <label>الجمهور<select className="block border rounded-xl p-2 w-full" value={audience} onChange={e=>setAudience(e.target.value)}><option value="public">عام — يظهر لجميع المستخدمين</option>{groups.map(group=><option key={group.id} value={group.id}>{group.name}</option>)}</select></label>}
        {bookingId && user.role==='admin' && <button type="button" disabled={busy||!input.teacherId} onClick={()=>void run(()=>api.updateAdminSessionBooking(bookingId,{teacherId:input.teacherId}))}>إرسال للمدرس للمراجعة</button>}
        <button type="submit" disabled={busy} className="rounded-xl bg-indigo-600 text-white px-4 py-2 disabled:opacity-40">حفظ وتأكيد الموعد</button>
      </form>}
      <details className="border rounded-xl p-3"><summary>حسابات الاستضافة</summary><p className="text-sm my-2">عرّف الحساب لتتبع مواعيده؛ هذا لا يربطه تلقائيًا بالمزود. السعة الافتراضية حصة واحدة.</p>
        <form className="flex flex-wrap gap-2" onSubmit={e=>{e.preventDefault();void run(()=>api.createLiveHost({label:hostLabel,provider:input.provider,ownerType:user.role==='admin'?hostOwner:'teacher',ownerId:user.role==='admin' && hostOwner==='teacher'?input.teacherId:undefined,capacity:1}));}}>{user.role==='admin' && <><select aria-label="نوع حساب الاستضافة" value={hostOwner} onChange={e=>setHostOwner(e.target.value as 'teacher'|'platform')}><option value="platform">حساب المنصة</option><option value="teacher">حساب مدرس</option></select>{hostOwner==='teacher' && <select aria-label="صاحب حساب الاستضافة" required value={input.teacherId} onChange={e=>setInput({...input,teacherId:e.target.value})}><option value="">اختر مدرسًا</option>{safe.teachers.map(teacher=><option key={teacher.id} value={teacher.id}>{teacher.name}</option>)}</select>}</>}<input aria-label="اسم حساب الاستضافة" required minLength={2} className="border rounded-xl p-2" value={hostLabel} onChange={e=>setHostLabel(e.target.value)} placeholder="اسم الحساب"/><select aria-label="مزود الحساب" value={input.provider} onChange={e=>setInput({...input,provider:e.target.value})}>{policy.providers.map(provider=><option key={provider} value={provider}>{providerLabels[provider]}</option>)}</select><button disabled={busy}>إضافة {user.role==='admin'?'حساب منصة':'حسابي'}</button></form>
        {safe.teachers.map(teacher=><label key={teacher.id} className="block text-sm mt-2">افتراضي {teacher.name}<select className="border ms-2 p-1" value={teacher.defaultHostingMode||policy.defaultHostingMode} onChange={e=>void run(()=>api.saveTeacherHostingDefault(teacher.id,e.target.value))}>{policy.hostingModes.map(mode=><option key={mode} value={mode}>{hostingLabels[mode]}</option>)}</select></label>)}
        {safe.hosts.map(host=><p key={host.id} className="text-sm mt-2">{host.label} — {!host.enabled?'موقوف':host.connected?'متصل':'لم يتم تفويض الحساب بعد'}{(user.role==='admin'||host.ownerId===user.id) && <button type="button" className="ms-3" disabled={busy} onClick={()=>void run(()=>api.updateLiveHost(host.id,{enabled:!host.enabled}))}>{host.enabled?'تعطيل':'تشغيل'}</button>}</p>)}
      </details>
      {user.role==='admin' && <details className="border rounded-xl p-3"><summary>إعدادات الحصص والاستضافة</summary>
        <form className="space-y-3 mt-3" onSubmit={e=>{e.preventDefault();void run(()=>api.saveLiveHostingPolicy(policy));}}>
          <p className="text-sm">الافتراضي يخص الحصص الجديدة؛ تعطيل المزود أو الاستضافة يمنع إنشاء الحصص والدخول إليها.</p>
          {liveTypes.map(provider=><label key={provider} className="inline-flex gap-2 ms-3"><input type="checkbox" checked={policy.providers.includes(provider)} onChange={e=>setPolicy({...policy,providers:e.target.checked?[...policy.providers,provider]:policy.providers.filter(p=>p!==provider)})}/>{providerLabels[provider]}</label>)}
          <div>{['teacher_account','platform_account','manual_link'].map((mode,i)=><label key={mode} className="inline-flex gap-2 ms-3"><input type="checkbox" checked={policy.hostingModes.includes(mode)} onChange={e=>setPolicy({...policy,hostingModes:e.target.checked?[...policy.hostingModes,mode]:policy.hostingModes.filter(m=>m!==mode)})}/>{['حساب المدرس','حساب المنصة','رابط يدوي'][i]}</label>)}</div>
          <label>الاستضافة الافتراضية<select className="border rounded-xl p-2 ms-2" value={policy.defaultHostingMode} onChange={e=>setPolicy({...policy,defaultHostingMode:e.target.value})}>{policy.hostingModes.map(mode=><option key={mode} value={mode}>{hostingLabels[mode]}</option>)}</select></label>
          <div className="flex flex-wrap gap-3"><label>دقائق قبل الموعد<input className="border p-2 w-20 ms-2" type="number" min={0} max={60} value={policy.earlyJoinMinutes} onChange={e=>setPolicy({...policy,earlyJoinMinutes:Number(e.target.value)})}/></label><label>دقائق بعد النهاية<input className="border p-2 w-20 ms-2" type="number" min={0} max={60} value={policy.lateJoinMinutes} onChange={e=>setPolicy({...policy,lateJoinMinutes:Number(e.target.value)})}/></label></div>
          <button disabled={busy} className="rounded-xl bg-indigo-600 text-white px-4 py-2">حفظ الإعدادات</button>
        </form>
      </details>}
    </>}
    <div className="grid gap-3 lg:grid-cols-2">{sessions.filter(session=>manage || session.audience.kind==='private' || scope.matchesContent(session)).map(session=><LiveSessionCard key={session.id} session={session} manage={manage} onChange={()=>void refresh()} onEdit={edit}/>)}</div>
    {!loading && !sessions.length && <p className="text-sm">لا توجد حصص مؤكدة متاحة لك حاليًا.</p>}
  </section>;
}
