import {useRef} from 'react';
import {api} from '../../../services/api';
import type {SchoolAssessmentCommandInput,SchoolAssessmentCommandResult} from '../../../types/schoolAssessments';

// A failed/lost response keeps its identity for retry. A completed, deliberately
// repeated action gets a new identity; concurrent clicks share one request.
export function useSchoolAssessmentCommands(actorId:string,send=api.schoolAssessmentCommand){
  const pending=useRef(new Map<string,{commandId:string;flight?:Promise<SchoolAssessmentCommandResult>}>());
  return (quizId:string,input:SchoolAssessmentCommandInput)=>{
    const payload=Object.fromEntries(Object.entries(input.payload).sort(([a],[b])=>a.localeCompare(b)).map(([key,value])=>[
      key,Array.isArray(value)?[...new Set(value.map(id=>id.trim()))].sort():
        (key==='opensAt'||key==='closesAt')?new Date(value as string).toISOString():value,
    ]));
    const key=JSON.stringify([actorId,quizId,input.operation,payload]);
    let entry=pending.current.get(key);
    if(!entry){entry={commandId:crypto.randomUUID()};pending.current.set(key,entry);}
    if(entry.flight)return entry.flight;
    const current=entry;
    current.flight=Promise.resolve().then(()=>send(quizId,{...input,payload,commandId:current.commandId} as Parameters<typeof send>[1]))
      .then(result=>{pending.current.delete(key);return result;})
      .finally(()=>{current.flight=undefined;});
    return current.flight;
  };
}
