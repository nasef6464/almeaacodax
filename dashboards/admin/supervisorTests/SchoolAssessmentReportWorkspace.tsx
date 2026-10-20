import React,{useId,useRef,useState} from 'react';
import type {SchoolAssessmentLearnerStatus} from '../../../types/schoolAssessments';
import {SchoolAssessmentSummaryPanel} from './SchoolAssessmentSummaryPanel';
import {SchoolAssessmentLearnersPanel} from './SchoolAssessmentLearnersPanel';

type Props={quizId:string;actorId:string;schoolId?:string};
type Tab='summary'|'students'|'analysis';
const tabs:{id:Tab;label:string}[]=[{id:'summary',label:'الملخص'},{id:'students',label:'الطلاب'},{id:'analysis',label:'المواد والمهارات'}];
export const SchoolAssessmentReportWorkspace:React.FC<Props>=props=><Workspace key={JSON.stringify([props.actorId,props.quizId,props.schoolId])} {...props}/>;
function Workspace(props:Props){
 const [active,setActive]=useState<Tab>('summary'),[presentation,setPresentation]=useState<'summary'|'analysis'>('summary');
 const [studentsOpened,setStudentsOpened]=useState(false),[preset,setPreset]=useState<SchoolAssessmentLearnerStatus>('all'),[filterRevision,setFilterRevision]=useState(0);
 const id=useId(),buttons=useRef<(HTMLButtonElement|null)[]>([]);
 const select=(tab:Tab)=>{setActive(tab);if(tab==='students')setStudentsOpened(true);else setPresentation(tab);};
 const openLearners=(status:SchoolAssessmentLearnerStatus)=>{setPreset(status);setFilterRevision(n=>n+1);select('students');buttons.current[1]?.focus();};
 const onKey=(event:React.KeyboardEvent,index:number)=>{
  const next=event.key==='ArrowLeft'?(index+1)%tabs.length:event.key==='ArrowRight'?(index+tabs.length-1)%tabs.length:event.key==='Home'?0:event.key==='End'?tabs.length-1:null;
  if(next===null)return;event.preventDefault();select(tabs[next].id);buttons.current[next]?.focus();
 };
 return <section dir="rtl" aria-label="ملف الاختبار المدرسي" className="min-w-0 space-y-4">
  <div role="tablist" aria-label="تفاصيل الاختبار" className="grid grid-cols-3 gap-2 rounded-xl border bg-slate-50 p-2">{tabs.map((tab,index)=><button key={tab.id} ref={node=>{buttons.current[index]=node;}} type="button" role="tab" id={id+'-'+tab.id} aria-controls={id+(tab.id==='students'?'-panel-students':'-panel-report')} aria-selected={active===tab.id} tabIndex={active===tab.id?0:-1} onClick={()=>select(tab.id)} onKeyDown={event=>onKey(event,index)} className={'rounded-lg px-2 py-3 text-xs font-bold sm:text-sm '+(active===tab.id?'bg-white text-indigo-700 shadow-sm':'text-slate-600')}>{tab.label}</button>)}</div>
  <div role="tabpanel" id={id+'-panel-report'} aria-labelledby={id+'-'+presentation} hidden={active==='students'}><SchoolAssessmentSummaryPanel {...props} presentation={presentation} onOpenLearners={openLearners}/></div>
  {<div role="tabpanel" id={id+'-panel-students'} aria-labelledby={id+'-students'} hidden={active!=='students'}>{studentsOpened&&<SchoolAssessmentLearnersPanel key={preset+'|'+filterRevision} {...props} initialStatus={preset}/>}</div>}
 </section>;
}
