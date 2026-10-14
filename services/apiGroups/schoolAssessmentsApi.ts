import type {SchoolAssessmentReport} from '../../types/schoolAssessments';
import type {Quiz} from '../../types';
type Request = <T>(path:string,options?:{method?:'GET'|'POST';cache?:RequestCache;body?:unknown})=>Promise<T>;
export const createSchoolAssessmentsApi=(request:Request)=>({
  schoolAssessmentReport:(id:string)=>request<SchoolAssessmentReport>(`/school-assessments/${encodeURIComponent(id)}/report`,{cache:'no-store'}),
  schoolAssessmentContext:(id:string)=>request<{id:string;canManage:boolean;canClone:boolean;canEditContent:boolean}>(`/school-assessments/${encodeURIComponent(id)}/context`,{cache:'no-store'}),
  cloneSchoolAssessment:(id:string)=>request<Quiz>(`/school-assessments/${encodeURIComponent(id)}/clone`,{method:'POST',body:{}}),
});
