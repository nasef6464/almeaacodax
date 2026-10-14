import type {SchoolAssessmentReport} from '../../types/schoolAssessments';
type Request = <T>(path:string,options?:{method?:'GET';cache?:RequestCache})=>Promise<T>;
export const createSchoolAssessmentsApi=(request:Request)=>({
  schoolAssessmentReport:(id:string)=>request<SchoolAssessmentReport>(`/school-assessments/${encodeURIComponent(id)}/report`,{cache:'no-store'}),
  schoolAssessmentContext:(id:string)=>request<{id:string;canManage:boolean;canClone:boolean}>(`/school-assessments/${encodeURIComponent(id)}/context`,{cache:'no-store'}),
});
