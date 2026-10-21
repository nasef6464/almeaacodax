export type TeacherMaterial = { ids: string[]; name?: string; pathId?: string };
type Assignment = { subjectId?: string; status?: string };
export function resolveTeacherMaterial(assignments: Assignment[]): {state:'ready'|'unconfigured'|'conflict';subjectId:string} {
  const active=assignments.filter(a=>!a.status||a.status==='active');
  if(!active.length||active.some(a=>!String(a.subjectId||'').trim()))return {state:'unconfigured',subjectId:''};
  const ids=[...new Set(active.map(a=>String(a.subjectId).trim()))];
  return ids.length===1?{state:'ready',subjectId:ids[0]}:{state:'conflict',subjectId:''};
}
export function questionMatchesTeacherMaterial(scope:TeacherMaterial,question:{subjectId?:unknown;subject?:unknown;pathId?:unknown}) {
  const subjectId=String(question.subjectId||'');
  if(subjectId)return scope.ids.includes(subjectId);
  const subject=String(question.subject||'');
  return scope.ids.includes(subject)||Boolean(scope.name&&scope.pathId&&subject===scope.name&&String(question.pathId||'')===scope.pathId);
}
export function teacherMaterialQuestionFilter(scope:TeacherMaterial) {
  return {$or:[{subjectId:{$in:scope.ids}},{$and:[{subjectId:{$in:['',null]}},{$or:[{subject:{$in:scope.ids}},...(scope.name&&scope.pathId?[{subject:scope.name,pathId:scope.pathId}]:[])]}]}]};
}
