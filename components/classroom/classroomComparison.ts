import {classroomMaterialIdentity} from '../../utils/classroomMaterialIdentity';
import type {CanonicalClassroomReport} from './classroomReportViewModel';
type Observation={at:number|null;answered:number;correct:number};
export type ClassroomTrend={answered:number;correct:number;accuracy:number|null;first:number|null;latest:number|null;delta:number|null;evidenceSessions:number};
const accuracy=(o:Observation|undefined)=>o?.answered?Math.round(o.correct/o.answered*100):null;
function trend(observations:Observation[]):ClassroomTrend{
  const dated=observations.filter(o=>o.at!==null).sort((a,b)=>a.at!-b.at!);
  const first=dated[0],last=dated.at(-1),start=accuracy(first),end=accuracy(last);
  const answered=observations.reduce((s,o)=>s+o.answered,0),correct=observations.reduce((s,o)=>s+o.correct,0);
  return {answered,correct,accuracy:answered?Math.round(correct/answered*100):null,first:start,latest:end,delta:dated.length>1&&first.at!==last?.at&&start!==null&&end!==null?end-start:null,evidenceSessions:observations.filter(o=>o.answered>0).length};
}
export function buildClassroomComparison(input:CanonicalClassroomReport[],subjects:Parameters<typeof classroomMaterialIdentity>[1]=[]){
  const materialFor=(q:CanonicalClassroomReport['questions'][number],fallback:string)=>classroomMaterialIdentity(q,subjects)||fallback||'غير مصنفة';
  const reports=[...new Map(input.map(r=>[r.sessionId,r])).values()];
  const studentMap=new Map<string,{studentId:string;name:string;material:string;mixed:boolean;observations:Observation[]}>();
  const skillsMap=new Map<string,{skillId:string;material:string;pathId:string;observations:Observation[]}>();
  for(const report of reports){
    const time=Date.parse(report.endedAt||report.startedAt||''),at=Number.isFinite(time)?time:null,materialIds=[...new Set(report.questions.map(q=>materialFor(q,report.subjectName)))].sort(),mixed=materialIds.length>1,material=materialIds.join(' + ')||report.subjectName||'غير مصنفة';
    for(const student of report.students||[]){const key=JSON.stringify([student.studentId,material]);const row=studentMap.get(key)||{studentId:student.studentId,name:student.name,material,mixed,observations:[]};row.observations.push({at,answered:student.answered,correct:student.correct});studentMap.set(key,row);}
    const perSession=new Map<string,{skillId:string;material:string;pathId:string;answered:number;correct:number}>();
    for(const q of report.questions)for(const skillId of [...new Set(q.skillIds)]){const material=materialFor(q,report.subjectName),pathId=q.pathId||'',key=JSON.stringify([pathId,material,skillId]);const row=perSession.get(key)||{skillId,material,pathId,answered:0,correct:0};row.answered+=q.answered;row.correct+=q.correct;perSession.set(key,row);}
    for(const [key,value]of perSession){const row=skillsMap.get(key)||{skillId:value.skillId,material:value.material,pathId:value.pathId,observations:[]};row.observations.push({at,answered:value.answered,correct:value.correct});skillsMap.set(key,row);}
  }
  const students=[...studentMap.values()].map(({observations,...row})=>{const data=trend(observations);if(row.mixed){data.first=null;data.latest=null;data.delta=null;}const state=row.mixed?'mixed_materials':!observations.some(o=>o.at!==null)?'insufficient_evidence':data.latest===null?'no_participation':data.delta!==null&&data.delta>0?'improved':data.latest<65?'needs_support':data.delta!==null&&data.delta<0?'declined':'steady';return {...row,...data,state,needsSupport:data.latest!==null&&data.latest<65};});
  const skills=[...skillsMap.values()].map(({observations,...row})=>({...row,...trend(observations)}));
  const answered=reports.reduce((s,r)=>s+r.totals.responses,0),correct=reports.reduce((s,r)=>s+r.totals.correct,0);
  return {sessions:reports.length,studentCount:new Set(students.map(s=>s.studentId)).size,answered,correct,accuracy:answered?Math.round(correct/answered*100):null,incompleteSessions:reports.filter(r=>!r.students||r.studentEvidenceComplete!==true).length,students,skills};
}
export const classroomTrendLabels:Record<string,string>={mixed_materials:'مواد متعددة؛ لا توجد مقارنة مادة موثقة',improved:'تحسّن',needs_support:'يحتاج دعمًا',declined:'تراجع',steady:'مستقر',no_participation:'لا توجد إجابات في أحدث حصة موثقة',insufficient_evidence:'بيانات زمنية غير كافية'};
export function classroomComparisonCsv(data:ReturnType<typeof buildClassroomComparison>){
  const cell=(v:unknown)=>{let text=String(v??'');if(/^(?:[\t\r\n]|\s*[=+@-])/.test(text))text="'"+text;return '"'+text.replaceAll('"','""')+'"';};
  const rows:unknown[][]=[['الطالب','المادة','الإجابات','الصحيح','أول دقة','أحدث دقة','الفرق بالنقاط','الحالة'],...data.students.map(s=>[s.name,s.material,s.answered,s.correct,s.first,s.latest,s.delta,classroomTrendLabels[s.state]]),[],['المهارة','المادة','الإجابات','الصحيح','أول دقة','أحدث دقة','الفرق بالنقاط'],...data.skills.map(s=>[s.skillId,s.material,s.answered,s.correct,s.first,s.latest,s.delta])];
  return '\uFEFF'+rows.map(row=>row.map(cell).join(',')).join('\r\n');
}
