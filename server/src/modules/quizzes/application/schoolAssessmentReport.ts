import type { SchoolAssessmentContext } from './schoolAssessmentManagementPolicy.js';
import { readSchoolAssessmentReport } from '../infrastructure/schoolAssessmentReportRepository.js';

export async function buildSchoolAssessmentReport(context: SchoolAssessmentContext) {
  const data = await readSchoolAssessmentReport(context.targetPredicate,String(context.quiz.id||context.quiz._id));
  const totals = data?.totals?.[0] || {targeted:0,completed:0,average:null,highest:null,lowest:null,passed:0};
  const missingEvidence = ['started_attempts'];
  const subjectCoverage=data?.subjectCoverage?.[0]||{completed:0,withEvidence:0};
  const completeSubjects=subjectCoverage.completed===subjectCoverage.withEvidence;
  if(!completeSubjects)missingEvidence.push(context.quiz.mockExam?.enabled?'mock_subject_totals':'subject_totals');
  const subjects=data?.subjects?.length?data.subjects:context.quiz.mockExam?.enabled?[]:data?.legacySubjects||[];
  return {
    coverage:{complete:false,missingEvidence,subjects:{completed:subjectCoverage.completed,withEvidence:subjectCoverage.withEvidence,complete:completeSubjects}},
    audience:{targeted:totals.targeted},
    participation:{completed:totals.completed,notCompleted:totals.targeted-totals.completed,started:null},
    scores:{average:totals.average===null?null:Math.round(totals.average*100)/100,
      passRate:totals.completed?Math.round(totals.passed/totals.completed*10000)/100:null,highest:totals.highest,lowest:totals.lowest},
    subjects,sections:data?.sections||[],skills:data?.skills||[],
    subjectBreakdowns:subjects.map((subject:any)=>({...subject,
      sections:(data?.sections||[]).filter((row:any)=>row.subjectId===subject.id),
      skills:(data?.skills||[]).filter((row:any)=>row.subjectId===subject.id),
    })),
  };
}
