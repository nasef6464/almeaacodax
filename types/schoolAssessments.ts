export interface SchoolAssessmentDimension {
  id: string; label: string; learners: number; questions: number | null; correct: number | null; average: number | null;
}
export interface SchoolAssessmentReport {
  coverage: { complete: boolean; missingEvidence: string[] };
  audience: { targeted: number };
  participation: { completed: number; notCompleted: number; started: number | null };
  scores: { average: number | null; passRate: number | null; highest: number | null; lowest: number | null };
  subjects: SchoolAssessmentDimension[];
  sections: SchoolAssessmentDimension[];
  skills: SchoolAssessmentDimension[];
}
