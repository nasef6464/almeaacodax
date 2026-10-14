import type { SchoolAssessmentContext } from './schoolAssessmentManagementPolicy.js';
import { readSchoolAssessmentReport } from '../infrastructure/schoolAssessmentReportRepository.js';

export async function buildSchoolAssessmentReport(context: SchoolAssessmentContext) {
  const data = await readSchoolAssessmentReport(context.targetPredicate,String(context.quiz.id||context.quiz._id));
  const totals = data?.totals?.[0] || {targeted:0,completed:0,average:null,highest:null,lowest:null,passed:0};
  const missingEvidence = ['started_attempts'];
  if (context.quiz.mockExam?.enabled) missingEvidence.push('mock_subject_totals');
  return {
    coverage:{complete:false,missingEvidence},
    audience:{targeted:totals.targeted},
    participation:{completed:totals.completed,notCompleted:totals.targeted-totals.completed,started:null},
    scores:{average:totals.average===null?null:Math.round(totals.average*100)/100,
      passRate:totals.completed?Math.round(totals.passed/totals.completed*10000)/100:null,highest:totals.highest,lowest:totals.lowest},
    subjects:data?.subjects||[],sections:data?.sections||[],skills:data?.skills||[],
  };
}
