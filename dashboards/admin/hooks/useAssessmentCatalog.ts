import {useCallback,useEffect,useRef,useState} from 'react';
import {normalizeQuiz} from '../../../services/adapter';
import {api} from '../../../services/api';
import {useStore} from '../../../store/useStore';
import type {Quiz} from '../../../types';
export function useAssessmentCatalog(pathId:string, subjectId:string|undefined, kind:'training'|'tests'|'mock',enabled=true){
 const {user}=useStore();const actor=user?.id||'';const key=JSON.stringify([actor,pathId,subjectId,kind]);
 const [state,setState]=useState({key:'',loading:false,error:'',page:0,hasMore:false});const generation=useRef(0);
 const load=useCallback(async(page:number,token:number)=>{
  setState(s=>({...s,key,loading:true,error:''}));const before=new Map(useStore.getState().quizzes.map(q=>[q.id,q]));
  try{const result=await api.getQuizCatalogPage({pathId,subjectId,catalogKind:kind,page,limit:100});if(token!==generation.current)return;
   useStore.setState(s=>{const rows=new Map(s.quizzes.map(q=>[q.id,q]));for(const item of result.quizzes){const q=normalizeQuiz(item);if(!rows.has(q.id)||rows.get(q.id)===before.get(q.id))rows.set(q.id,q);}return {quizzes:[...rows.values()]};});
   setState({key,loading:false,error:'',page,hasMore:result.pagination.page<result.pagination.totalPages});
  }catch(e){if(token===generation.current)setState(s=>({...s,key,loading:false,error:e instanceof Error?e.message:'تعذر تحميل القائمة'}));}
 },[key,pathId,subjectId,kind]);
 useEffect(()=>{const token=++generation.current;if(enabled&&pathId&&actor)void load(1,token);return()=>{generation.current++;};},[enabled,actor,pathId,load]);
 return {...(state.key===key?state:{loading:Boolean(enabled),error:'',page:0,hasMore:false}),loadMore:()=>{if(!state.loading)void load(Math.max(1,state.page+1),generation.current);},retry:()=>void load(Math.max(1,state.page),generation.current)};
}
