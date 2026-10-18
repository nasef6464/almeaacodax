import type {CanonicalClassroomReport,CanonicalQuestionReport} from '../components/classroom/classroomReportViewModel';
/** Use the same canonical key for options and filtering; older reports retain their readable subject. */
export const classroomSubjectKey=(question:Partial<CanonicalQuestionReport>,report:{subjectName?:string})=>String(question.subjectId||question.subject||report.subjectName||'');
export function filterClassroomSkillsReports(reports:CanonicalClassroomReport[],pathId:string,subjectId:string):CanonicalClassroomReport[]{
 if(!subjectId||subjectId==='all')return [];
 return reports.map(report=>({...report,questions:report.questions.filter(question=>(!pathId||pathId==='all'||String(question.pathId||'')===pathId)&&classroomSubjectKey(question,report)===subjectId)})).filter(report=>report.questions.length>0);
}
/** Do not expose storage identifiers as names when a catalog entry is missing. */
type CatalogName={id:string;name:string;subSkills?:ReadonlyArray<CatalogName>};
export function schoolCatalogLabel(items:ReadonlyArray<CatalogName>,id:string|undefined,fallback:string):string{
 const key=String(id||'');const flattened=items.flatMap(item=>[item,...(item.subSkills||[])]);return flattened.find(item=>item.id===key||item.name===key)?.name||(/[\u0600-\u06ff]/.test(key)?key:fallback);
}
