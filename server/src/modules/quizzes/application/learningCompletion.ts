export type CompletionCount = {total:number;completed:number};
const idOf=(x:any)=>String(x.id||x._id||'');
export function summarizeQuizCompletion(quizzes:any[],completed:Set<string>){
 const result:Record<string,CompletionCount>={};const seen=new Set<string>();
 for(const q of quizzes){const id=idOf(q);if(!id||seen.has(id))continue;seen.add(id);const type=q.access?.type||'free';const row=result[type]||={total:0,completed:0};row.total++;if(completed.has(id))row.completed++;}
 return result;
}
export function summarizeFoundationCompletion(topics:any[],visibleLessons:Set<string>,visibleQuizzes:Set<string>,completedLessons:Set<string>,completedQuizzes:Set<string>){
 const visible=topics.filter(t=>t.showOnPlatform!==false);const children=new Map<string,any[]>();for(const t of visible){const parent=String(t.parentId||'');children.set(parent,[...(children.get(parent)||[]),t]);}
 const output:Record<string,{total:number;completed:number;percent:number;complete:boolean}>={};
 for(const root of visible.filter(t=>!t.parentId)){
  const visited=new Set<string>(),lessonIds=new Set<string>(),quizIds=new Set<string>();
  const visit=(t:any)=>{const id=idOf(t);if(visited.has(id))return;visited.add(id);for(const l of t.lessonIds||[])if(visibleLessons.has(String(l)))lessonIds.add(String(l));for(const q of t.quizIds||[])if(visibleQuizzes.has(String(q)))quizIds.add(String(q));for(const child of children.get(id)||[])visit(child);};visit(root);
  const total=lessonIds.size+quizIds.size;const done=[...lessonIds].filter(id=>completedLessons.has(id)).length+[...quizIds].filter(id=>completedQuizzes.has(id)).length;
  output[idOf(root)]={total,completed:done,percent:total?(done===total?100:Math.min(99,Math.round(done/total*100))):0,complete:total>0&&done===total};
 }
 return output;
}
