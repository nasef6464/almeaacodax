import React,{useEffect,useRef,useState} from 'react';
import {teachingRegionSourceKey,type TeachingRegion,type VerifiedTeachingRegions} from '../../../server/src/modules/ai/contracts/verifiedTeachingRegions';

type Props={question:Record<string,any>;value?:VerifiedTeachingRegions;onChange:(value:VerifiedTeachingRegions)=>void;disabled?:boolean};
const clamp=(v:number)=>Math.max(0,Math.min(1,v));
export function QuestionTeachingRegionsEditor({question,value,onChange,disabled=false}:Props){
 const image=useRef<HTMLImageElement>(null),surface=useRef<HTMLDivElement>(null),start=useRef<{x:number;y:number}|null>(null);
 const [armed,setArmed]=useState(false),[loaded,setLoaded]=useState(false),[failed,setFailed]=useState(false),[draft,setDraft]=useState<TeachingRegion|null>(null);
 const sourceKey=teachingRegionSourceKey(question)||'';const matches=value?.sourceKey===sourceKey;
 const items=matches?value!.items:[];const approved=matches&&value?.approved;
 useEffect(()=>{setLoaded(false);setFailed(false);setArmed(false);setDraft(null);start.current=null;},[question.imageUrl]);
 const update=(next:TeachingRegion[])=>onChange({sourceKey,approved:false,items:next});
 const add=(area:Omit<TeachingRegion,'id'|'label'>)=>{
  if(!loaded||disabled||!sourceKey||items.length>=4)return;
  if(area.width<.01||area.height<.01)return;
  update([...items,{...area,id:'r'+Date.now().toString(36)+Math.random().toString(36).slice(2,5),label:''}]);setArmed(false);setDraft(null);
 };
 const point=(e:React.PointerEvent)=>{const b=image.current!.getBoundingClientRect();return {x:clamp((e.clientX-b.left)/b.width),y:clamp((e.clientY-b.top)/b.height)};};
 const area=(p:{x:number;y:number},q:{x:number;y:number})=>({x:Math.min(p.x,q.x),y:Math.min(p.y,q.y),width:Math.abs(p.x-q.x),height:Math.abs(p.y-q.y)});
 const move=(index:number,delta:number)=>{const next=[...items];[next[index],next[index+delta]]=[next[index+delta],next[index]];update(next);};
 const adjust=(index:number,key:'x'|'y'|'width'|'height',raw:string)=>{
  const number=Number(raw);if(!Number.isFinite(number))return;const a={...items[index],[key]:clamp(number/100)};
  a.x=Math.min(.99,a.x);a.y=Math.min(.99,a.y);a.width=Math.max(.01,Math.min(a.width,1-a.x));a.height=Math.max(.01,Math.min(a.height,1-a.y));
  update(items.map((v,i)=>i===index?a:v));
 };
 return <section data-testid="teaching-regions-editor" className="mt-4 rounded-2xl border border-sky-100 bg-white p-3">
  <div className="mb-2 flex flex-wrap items-center justify-between gap-2"><h4 className="text-sm font-bold text-slate-800">مناطق الشرح على الصورة</h4><span className="text-xs text-slate-500">{items.length}/4</span></div>
  <div ref={surface} data-testid="region-image-surface" role="group" aria-label="مساحة تحديد مناطق الصورة" tabIndex={0}
   className="relative mx-auto w-fit max-w-full overflow-hidden rounded-lg ring-1 ring-slate-100 outline-sky-500" style={{touchAction:armed?'none':'auto',cursor:armed?'crosshair':'default'}}
   onPointerDown={e=>{if(!armed||!loaded||disabled)return;e.preventDefault();start.current=point(e);e.currentTarget.setPointerCapture(e.pointerId);}}
   onPointerMove={e=>{if(start.current)setDraft({...area(start.current,point(e)),id:'draft',label:''});}}
   onPointerUp={e=>{if(!start.current)return;const selected=area(start.current,point(e));start.current=null;add(selected);setDraft(null);}}
   onPointerCancel={()=>{start.current=null;setDraft(null);}}
   onKeyDown={e=>{if(armed&&(e.key==='Enter'||e.key===' ')){e.preventDefault();add({x:.35,y:.35,width:.3,height:.3});}}}>
   <img ref={image} src={question.imageUrl} alt="صورة السؤال لتحديد مناطق الشرح" className="block h-auto w-auto max-w-full" style={{maxHeight:320}} draggable={false} onLoad={()=>setLoaded(true)} onError={()=>{setLoaded(false);setFailed(true);}}/>
   {loaded&&<svg viewBox="0 0 1000 1000" preserveAspectRatio="none" aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full">{[...items,...(draft?[draft]:[])].map((a,i)=><g key={a.id}><rect x={a.x*1000} y={a.y*1000} width={a.width*1000} height={a.height*1000} fill="#38bdf822" stroke="#0284c7" strokeWidth="4"/><text x={a.x*1000+5} y={a.y*1000+30} fontSize="30" fill="#075985">{i+1}</text></g>)}</svg>}
  </div>
  <p aria-live="polite" className="my-2 text-xs text-slate-500">{failed?'تعذر تحميل الصورة.':!sourceKey?'احفظ نسخة الصورة أو أعد رفعها لإضافة المناطق.':!matches&&value?.items.length?'الصورة تغيّرت؛ حدّد مناطقها من جديد.':armed?'اسحب على الصورة، أو اضغط Enter لإضافة منطقة قابلة للضبط.':approved?'المناطق معتمدة؛ تُحفظ مع السؤال.':'حدّد المناطق بالترتيب الذي تظهر به في الشرح.'}</p>
  <div className="flex flex-wrap gap-2"><button type="button" disabled={disabled||!loaded||!sourceKey||items.length>=4} onClick={()=>{setArmed(!armed);surface.current?.focus();}} className="min-h-11 rounded-lg bg-sky-50 px-3 text-xs font-bold text-sky-800 disabled:opacity-40">تحديد منطقة</button>
   <button type="button" disabled={disabled||!loaded||!matches||!items.length||approved} onClick={()=>onChange({sourceKey,items,approved:true})} className="min-h-11 rounded-lg bg-emerald-50 px-3 text-xs font-bold text-emerald-800 disabled:opacity-40">اعتماد المناطق</button></div>
  <div className="mt-2 space-y-2">{items.map((a,i)=><div key={a.id} data-testid="region-item" className="rounded-lg border border-slate-100 p-2">
   <div className="flex flex-wrap items-center gap-1"><span className="text-xs">{i+1}</span><input aria-label={`اسم المنطقة ${i+1}`} maxLength={80} value={a.label} onChange={e=>update(items.map((v,j)=>j===i?{...v,label:e.target.value}:v))} placeholder="اسم اختياري" className="min-w-0 flex-1 rounded border px-2 py-1 text-xs" disabled={disabled}/>
    <button type="button" disabled={disabled||i===0} aria-label={`رفع المنطقة ${i+1}`} onClick={()=>move(i,-1)} className="min-h-11 min-w-11 disabled:opacity-30">↑</button><button type="button" disabled={disabled||i===items.length-1} aria-label={`خفض المنطقة ${i+1}`} onClick={()=>move(i,1)} className="min-h-11 min-w-11 disabled:opacity-30">↓</button><button type="button" disabled={disabled} aria-label={`حذف المنطقة ${i+1}`} onClick={()=>update(items.filter((_,j)=>j!==i))} className="min-h-11 min-w-11 text-red-600">×</button></div>
   <details className="text-xs text-slate-500"><summary className="cursor-pointer py-2">ضبط الموضع</summary><div className="grid grid-cols-2 gap-2">{(['x','y','width','height'] as const).map((key,k)=><label key={key}>{['يسار','أعلى','عرض','ارتفاع'][k]} %<input aria-label={`${key} المنطقة ${i+1}`} type="number" min="0" max="100" step="0.1" disabled={disabled} value={Number((a[key]*100).toFixed(2))} onChange={e=>adjust(i,key,e.target.value)} className="block w-full rounded border p-1"/></label>)}</div></details>
  </div>)}</div>
 </section>;
}
