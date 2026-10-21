type Material = {id:string;name?:string;pathId?:string};
type QuestionMaterial = {subjectId?:unknown;subject?:unknown;pathId?:unknown};
/** Explicit IDs take precedence. Legacy names resolve only within one known path. */
export function classroomMaterialIdentity(question:QuestionMaterial,subjects:readonly Material[]=[]):string {
  if(question.subjectId)return String(question.subjectId);
  const value=String(question.subject||'');
  if(subjects.some(s=>s.id===value))return value;
  const matches=question.pathId?subjects.filter(s=>s.name===value&&s.pathId===question.pathId):[];
  return matches.length===1?matches[0].id:value?JSON.stringify([String(question.pathId||''),value]):'';
}
