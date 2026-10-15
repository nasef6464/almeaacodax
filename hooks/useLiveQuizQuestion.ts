import {useEffect,useRef} from 'react';
import {api} from '../services/api';
import {quizOptionSignature} from '../utils/quizAnswerEvidence';
import type {Question} from '../types';
type Input={actorId?:string;quizId?:string;question?:Question;active:boolean;onQuestion:(question:Question)=>void;onOptionsChanged:(questionId:string)=>void};
/** Refresh only the displayed question; preserve exam order, timer and progress. */
export function useLiveQuizQuestion(input:Input){
 const latest=useRef(input);latest.current=input;
 const id=input.question?.id;
 useEffect(()=>{
  if(!input.active||!input.quizId||!id)return;
  let cancelled=false,busy=false;
  const refresh=async()=>{
   if(cancelled||busy||document.visibilityState==='hidden')return;
   busy=true;
   try{
    const response=await api.getQuiz(input.quizId!,{questionId:id});
    if(cancelled)return;
    const raw=response?.questions?.find((row:any)=>String(row.id||row._id)===id);
    if(!raw)return;
    const previous=latest.current.question;
    if(!previous||previous.id!==id)return;
    const next={...previous,...raw,id,options:Array.isArray(raw.options)?raw.options.map(String):[]} as Question;
    const fields=['text','options','imageUrl','imageAlt','passage','passageId','hint','explanation','videoUrl','sourceMeta'] as const;
    const signature=(question:Question)=>JSON.stringify(fields.map(key=>(question as any)[key]||''));
    if(signature(previous)!==signature(next)){
     latest.current.onQuestion(next);
     if(quizOptionSignature(previous)!==quizOptionSignature(next))latest.current.onOptionsChanged(id);
    }
   }catch{ /* A temporary refresh failure must not erase the learner's work. */ }
   finally{busy=false;}
  };
  void refresh();
  const timer=window.setInterval(()=>{void refresh();},30000);
  const resume=()=>{void refresh();};
  window.addEventListener('focus',resume);document.addEventListener('visibilitychange',resume);
  return()=>{cancelled=true;window.clearInterval(timer);window.removeEventListener('focus',resume);document.removeEventListener('visibilitychange',resume);};
 },[input.actorId,input.quizId,id,input.active]);
}
