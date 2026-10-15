import type {SchoolAssessmentReport,SchoolAssessmentCompositionSpec,SchoolAssessmentCompositionPreview,SchoolAssessmentCommand,SchoolAssessmentCommandResult} from '../../types/schoolAssessments';
import type {Quiz} from '../../types';
type Request = <T>(path:string,options?:{method?:'GET'|'POST';cache?:RequestCache;body?:unknown})=>Promise<T>;
export const createSchoolAssessmentsApi=(request:Request)=>({
  composeSchoolAssessment:(spec:SchoolAssessmentCompositionSpec)=>request<SchoolAssessmentCompositionPreview>('/school-assessments/compose',{method:'POST',body:spec,cache:'no-store'}),
  schoolAssessmentReport:(id:string)=>request<SchoolAssessmentReport>(`/school-assessments/${encodeURIComponent(id)}/report`,{cache:'no-store'}),
  schoolAssessmentContext:(id:string)=>request<{id:string;canManage:boolean;canClone:boolean;canEditContent:boolean;isPublished:boolean}>(`/school-assessments/${encodeURIComponent(id)}/context`,{cache:'no-store'}),
  schoolAssessmentCommand:(id:string,command:SchoolAssessmentCommand)=>request<SchoolAssessmentCommandResult>(`/school-assessments/${encodeURIComponent(id)}/commands`,{method:'POST',body:command,cache:'no-store'}),
  cloneSchoolAssessment:(id:string)=>request<Quiz>(`/school-assessments/${encodeURIComponent(id)}/clone`,{method:'POST',body:{}}),
});
