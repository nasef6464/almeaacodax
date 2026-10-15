export interface SchoolAssessmentDimension {
  id: string; label: string; learners: number; questions: number | null; correct: number | null; average: number | null;
  subjectId?:string;wrong?:number|null;unanswered?:number|null;
}
export interface SchoolAssessmentReport {
  coverage: { complete: boolean; missingEvidence: string[];subjects?:{completed:number;withEvidence:number;complete:boolean} };
  audience: { targeted: number };
  participation: { completed: number; notCompleted: number; started: number | null };
  scores: { average: number | null; passRate: number | null; highest: number | null; lowest: number | null };
  subjects: SchoolAssessmentDimension[];
  sections: SchoolAssessmentDimension[];
  skills: SchoolAssessmentDimension[];
  subjectBreakdowns?: (SchoolAssessmentDimension & {sections:SchoolAssessmentDimension[];skills:SchoolAssessmentDimension[]})[];
}
export type SchoolAssessmentLearnerStatus='all'|'completed'|'not_completed'|'needs_support';
export interface SchoolAssessmentLearnerQuery {page?:number;limit?:number;status?:SchoolAssessmentLearnerStatus;search?:string}
export interface SchoolAssessmentLearnerPage {
 learners:{studentId:string;name:string;result:{id:string;score:number;passed?:boolean;date?:string;attemptNumber?:number}|null}[];
 pagination:{page:number;limit:number;total:number;totalPages:number};
}
import type {Quiz} from '../types';
export interface SchoolAssessmentCompositionSpec {
  kind:'normal'|'mock';pathId:string;prompt?:string;
  subjectSpecs:{subjectId:string;skillIds:string[];count:number;difficulty?:'Easy'|'Medium'|'Hard'}[];
}
export interface SchoolAssessmentCompositionPreview {
  draft:Partial<Quiz>;
  coverage:{subjectId:string;skillIds:string[];requested:number;available:number;selected:number}[];
  warnings:string[];
}
export type SchoolAssessmentCommandInput =
  | {operation:'retarget';payload:{targetGroupIds:string[];targetUserIds:string[]}}
  | {operation:'remind';payload:{studentIds?:string[]}}
  | {operation:'reopen';payload:{opensAt:string;closesAt:string}}
  | {operation:'retake';payload:{studentIds:string[];opensAt:string;closesAt:string}};
export type SchoolAssessmentCommand = SchoolAssessmentCommandInput & {commandId:string};
export interface SchoolAssessmentCommandResult {
  commandId:string;operation:SchoolAssessmentCommandInput['operation'];
  targetGroupCount?:number;targetUserCount?:number;notifiedCount?:number;grantedCount?:number;reopened?:boolean;
}
