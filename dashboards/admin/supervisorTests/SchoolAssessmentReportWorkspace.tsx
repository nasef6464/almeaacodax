import React from 'react';
import {SchoolAssessmentSummaryPanel} from './SchoolAssessmentSummaryPanel';
import {SchoolAssessmentLearnersPanel} from './SchoolAssessmentLearnersPanel';

export const SchoolAssessmentReportWorkspace:React.FC<{quizId:string;actorId:string}>=({quizId,actorId})=><div className="space-y-6">
 <SchoolAssessmentSummaryPanel quizId={quizId} actorId={actorId}/>
 <SchoolAssessmentLearnersPanel quizId={quizId} actorId={actorId}/>
</div>;
