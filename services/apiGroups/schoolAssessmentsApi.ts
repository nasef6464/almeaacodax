import type {LearningEvidenceQuery,LearningEvidenceReport} from '../../types/learningEvidence';
import type {SchoolAssessmentReport,SchoolAssessmentCompositionSpec,SchoolAssessmentCompositionPreview,SchoolAssessmentCommand,SchoolAssessmentCommandResult} from '../../types/schoolAssessments';
import type {Quiz,QuizResult} from '../../types';
import type {SchoolAssessmentLearnerPage,SchoolAssessmentLearnerQuery} from '../../types/schoolAssessments';
type Request = <T>(path:string,options?:{method?:'GET'|'POST'|'PATCH';cache?:RequestCache;body?:unknown})=>Promise<T>;
const inSchool=(path:string,schoolId?:string)=>schoolId?path+(path.includes('?')?'&':'?')+'schoolId='+encodeURIComponent(schoolId):path;
export const createSchoolAssessmentsApi=(request:Request)=>({
  learningEvidence:(query:LearningEvidenceQuery)=>request<LearningEvidenceReport>('/quizzes/results/learning-evidence?'+new URLSearchParams(Object.entries(query).filter(([,value])=>value!==undefined).map(([key,value])=>[key,String(value)])),{cache:'no-store'}),
  composeSchoolAssessment:(spec:SchoolAssessmentCompositionSpec)=>request<SchoolAssessmentCompositionPreview>('/school-assessments/compose',{method:'POST',body:spec,cache:'no-store'}),
  schoolAssessmentReport:(id:string,schoolId?:string)=>request<SchoolAssessmentReport>(inSchool(`/school-assessments/${encodeURIComponent(id)}/report`,schoolId),{cache:'no-store'}),
  schoolAssessmentLearners:(id:string,query:SchoolAssessmentLearnerQuery={},schoolId?:string)=>request<SchoolAssessmentLearnerPage>(inSchool(`/school-assessments/${encodeURIComponent(id)}/learners?${new URLSearchParams(Object.entries(query).filter(([,value])=>value!==undefined).map(([key,value])=>[key,String(value)]))}`,schoolId),{cache:'no-store'}),
  schoolAssessmentLearnerResult:(id:string,resultId:string,schoolId?:string)=>request<{result:QuizResult}>(inSchool(`/school-assessments/${encodeURIComponent(id)}/results/${encodeURIComponent(resultId)}`,schoolId),{cache:'no-store'}),
  schoolAssessmentContext:(id:string,schoolId?:string)=>request<{id:string;canManage:boolean;canClone:boolean;canEditContent:boolean;isPublished:boolean;schoolId?:string;canManageDefinition?:boolean}>(inSchool(`/school-assessments/${encodeURIComponent(id)}/context`,schoolId),{cache:'no-store'}),
  schoolAssessmentCommand:(id:string,command:SchoolAssessmentCommand,schoolId?:string)=>request<SchoolAssessmentCommandResult>(inSchool(`/school-assessments/${encodeURIComponent(id)}/commands`,schoolId),{method:'POST',body:command,cache:'no-store'}),
  schoolAssessmentDefinition:(id:string,schoolId?:string)=>request<Quiz>(inSchool(`/school-assessments/${encodeURIComponent(id)}/definition`,schoolId),{cache:'no-store'}),
  updateSchoolAssessmentDefinition:(id:string,payload:Partial<Quiz>,schoolId?:string)=>request<Quiz>(inSchool(`/quizzes/${encodeURIComponent(id)}`,schoolId),{method:'PATCH',body:payload,cache:'no-store'}),
  cloneSchoolAssessment:(id:string,schoolId?:string)=>request<Quiz>(inSchool(`/school-assessments/${encodeURIComponent(id)}/clone`,schoolId),{method:'POST',body:{}}),
});
