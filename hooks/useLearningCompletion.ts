import {useCallback,useEffect,useRef,useState} from 'react';
import {api} from '../services/api';
import {useStore} from '../store/useStore';
export interface CompletionCount {total:number;completed:number}
export interface LearningCompletion {training:Record<string,CompletionCount>;tests:Record<string,CompletionCount>;mock:Record<string,CompletionCount>;completedQuizIds:string[];foundation:Record<string,{total:number;completed:number;percent:number;complete:boolean}>;foundationLocked:string[]}
export function useLearningCompletion(pathId?:string,subjectId?:string){
 const {user,examResults=[],completedLessons=[]}=useStore();const actor=user?.role==='student'?user.id:'';const key=JSON.stringify([actor,pathId,subjectId]);
 const [state,setState]=useState<{key:string;data?:LearningCompletion;error?:string;loading:boolean}>({key:'',loading:false});const generation=useRef(0);const [revision,setRevision]=useState(0);
 const retry=useCallback(()=>setRevision(v=>v+1),[]);
 useEffect(()=>{const token=++generation.current;if(!actor||!pathId)return;setState({key,loading:true});
  void Promise.resolve().then(()=>api.getLearningCompletion({pathId,subjectId})).then(data=>{if(token===generation.current)setState({key,data,loading:false});}).catch(()=>{if(token===generation.current)setState({key,error:'تعذر تحديث الإنجاز',loading:false});});
  return()=>{generation.current++;};
 },[key,actor,pathId,subjectId,examResults.length,completedLessons.length,revision]);
 useEffect(()=>{let last=Date.now();const refresh=()=>{if(document.visibilityState==='visible'&&Date.now()-last>30000){last=Date.now();retry();}};document.addEventListener('visibilitychange',refresh);return()=>document.removeEventListener('visibilitychange',refresh);},[retry]);
 return {...(state.key===key?state:{loading:Boolean(actor&&pathId),data:undefined,error:undefined}),enabled:Boolean(actor&&pathId),retry};
}
export function selectCompletion(counts:Record<string,CompletionCount>,hasPackage:boolean){
 let total=0,completed=0,locked=0;for(const [type,row] of Object.entries(counts)){if(type==='free'||type==='private'||hasPackage){total+=row.total;completed+=row.completed;}else locked+=row.total;}
 return {total,completed,locked};
}
export function selectFoundationCompletion(data:LearningCompletion,hasPackage:boolean,hardLock:boolean){
 const lockedIds=new Set(data.foundationLocked);let total=0,completed=0,locked=0;
 for(const [id,row] of Object.entries(data.foundation)){if(!hasPackage&&(hardLock||lockedIds.has(id))){locked++;continue;}total++;if(row.complete)completed++;}
 return {total,completed,locked};
}
