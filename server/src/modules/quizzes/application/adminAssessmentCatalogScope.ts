export function buildAdminAssessmentCatalogScope(pathId: string, subjectId: string, kind: unknown, staff: boolean): Record<string, unknown> {
  const scope: Record<string, unknown> = { ...(pathId ? {pathId} : {}), ...(subjectId ? {subjectId} : {}) };
  if (!staff || typeof kind!=='string' || !['training','tests','mock'].includes(kind)) return scope;
  const mock = {$or:[{quizKind:'mock'},{'mockExam.enabled':true}]};
  if (kind === 'mock') {
    delete scope.pathId;
    return {...scope,$and:[mock,...(pathId?[{$or:[{pathId},{'mockExam.pathId':pathId}]}]:[])]};
  }
  const slot = String(kind);
  const canonical = slot === 'training' ? 'drill' : 'test';
  const legacy = slot === 'training' ? {$or:[{type:'bank'},{placement:{$in:['training','both']}},{showInTraining:true}]} : {$or:[{type:'quiz'},{placement:{$in:['mock','both']}},{showInMock:true}]};
  return {...scope,$and:[{$nor:mock.$or},{$or:[{learningPlacements:{$elemMatch:{slot,...(pathId?{pathId}:{}),...(subjectId?{subjectId}:{})}}},{quizKind:canonical},{$and:[{quizKind:null},legacy]}]}]};
}
