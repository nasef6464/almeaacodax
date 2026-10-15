import type {SchoolAssessmentReport,SchoolAssessmentCompositionSpec,SchoolAssessmentCompositionPreview,SchoolAssessmentCommand,SchoolAssessmentCommandResult} from '../../types/schoolAssessments';
import type {Quiz,QuizResult} from '../../types';
import type {SchoolAssessmentLearnerPage,SchoolAssessmentLearnerQuery} from '../../types/schoolAssessments';
type Request = <T>(path:string,options?:{method?:'GET'|'POST';cache?:RequestCache;body?:unknown})=>Promise<T>;
export const createSchoolAssessmentsApi=(request:Request)=>({
  composeSchoolAssessment:(spec:SchoolAssessmentCompositionSpec)=>request<SchoolAssessmentCompositionPreview>('/school-assessments/compose',{method:'POST',body:spec,cache:'no-store'}),
  schoolAssessmentReport:(id:string)=>request<SchoolAssessmentReport>(`/school-assessments/${encodeURIComponent(id)}/report`,{cache:'no-store'}),
  schoolAssessmentLearners:(id:string,query:SchoolAssessmentLearnerQuery={})=>request<SchoolAssessmentLearnerPage>(`/school-assessments/${encodeURIComponent(id)}/learners?${new URLSearchParams(Object.entries(query).filter(([,value])=>value!==undefined).map(([key,value])=>[key,String(value)]))}`,{cache:'no-store'}),
  schoolAssessmentLearnerResult:(id:string,resultId:string)=>request<{result:QuizResult}>(`/school-assessments/${encodeURIComponent(id)}/results/${encodeURIComponent(resultId)}`,{cache:'no-store'}),
  schoolAssessmentContext:(id:string)=>request<{id:string;canManage:boolean;canClone:boolean;canEditContent:boolean;isPublished:boolean}>(`/school-assessments/${encodeURIComponent(id)}/context`,{cache:'no-store'}),
  schoolAssessmentCommand:(id:string,command:SchoolAssessmentCommand)=>request<SchoolAssessmentCommandResult>(`/school-assessments/${encodeURIComponent(id)}/commands`,{method:'POST',body:command,cache:'no-store'}),
  cloneSchoolAssessment:(id:string)=>request<Quiz>(`/school-assessments/${encodeURIComponent(id)}/clone`,{method:'POST',body:{}}),
});
