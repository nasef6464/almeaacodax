import React from 'react';
import {ProgressBar} from '../ui/ProgressBar';
export function LearningCompletionSummary({enabled,loading,error,retry,stats,label}:{enabled:boolean;loading?:boolean;error?:string;retry:()=>void;stats?:{total:number;completed:number;locked:number};label:string}){
 if(!enabled)return null;
 return <section aria-label={'إنجاز '+label} className="mb-4 rounded-2xl border border-sky-100 bg-sky-50/50 p-4">
 {error?<div role="alert" className="flex justify-between gap-2 text-xs">{error}<button onClick={retry} className="font-bold text-indigo-700">إعادة المحاولة</button></div>:loading||!stats?<p role="status" className="text-xs text-slate-500">جارٍ حساب الإنجاز...</p>:<><div className="mb-2 flex items-center justify-between gap-3 text-sm font-bold"><span>أنجزت {stats.completed} من {stats.total} {label}</span><span>{stats.total?(stats.completed===stats.total?100:Math.min(99,Math.round(stats.completed/stats.total*100))):0}٪</span></div><ProgressBar percentage={stats.total?stats.completed/stats.total*100:0} showPercentage={false} color="primary"/>{stats.locked>0&&<p className="mt-2 text-xs text-slate-500">{stats.locked} إضافية ضمن باقة</p>}</>}
 </section>;
}
export function TopicCompletion({percent,complete=false}:{percent?:number;complete?:boolean}){return percent===undefined?null:<div className="mt-2 w-full text-xs text-sky-700"><div className="mb-1 flex justify-between"><span>{complete?'مكتمل':'إنجاز الموضوع كاملًا'}</span><span>{percent}٪</span></div><ProgressBar percentage={percent} showPercentage={false} color="primary"/></div>;}
