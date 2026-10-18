import {resolveClassroomSkillName} from './classroomSkillResolver';
import type {Skill,NestedSkill,CategorySubject} from '../types';
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

/** Reuse the existing classroom resolver for both current and legacy nested catalogs. */
export function schoolSkillLabel(id:string|undefined,skills:Skill[],nestedSkills:NestedSkill[],subjects:CategorySubject[],fallback='مهارة غير مصنفة'):string{
 const key=String(id||'').trim();if(key.startsWith('subject:'))return schoolCatalogLabel(subjects,key.slice(8),fallback);
 const resolved=resolveClassroomSkillName(key,skills,nestedSkills,subjects);
 return resolved&&resolved!==key?resolved:schoolCatalogLabel([...skills,...nestedSkills,...subjects],key,fallback);
}
export function schoolSkillOptions(skills:Skill[],nestedSkills:NestedSkill[],subjectId:string,sectionId=''){
 if(!subjectId)return [];
 const items=[...skills,...nestedSkills].filter(item=>item.subjectId===subjectId&&(!sectionId||item.sectionId===sectionId)).flatMap(item=>[item,...(item.subSkills||[])]);
 return [...new Map(items.map(item=>[item.id,{id:item.id,name:item.name}])).values()];
}
