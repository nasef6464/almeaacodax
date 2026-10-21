import {useState,type Dispatch,type SetStateAction} from 'react';
/** A new question renders private immediately, before any effect or paint. */
export function useScopedClassroomState<T>(scope:string,initial:T):[T,Dispatch<SetStateAction<T>>]{
 const [saved,setSaved]=useState({scope,value:initial});
 if(saved.scope!==scope)setSaved({scope,value:initial});
 const value=saved.scope===scope?saved.value:initial;
 const update:Dispatch<SetStateAction<T>>=next=>setSaved(previous=>{const current=previous.scope===scope?previous.value:initial;return {scope,value:typeof next==='function'?(next as (value:T)=>T)(current):next};});
 return [value,update];
}
