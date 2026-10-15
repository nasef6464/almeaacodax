type Input={quiz:any;orderedQuestions:any[];questionReview:any[];subjectNameById:Map<string,string>};
export interface QuizSubmissionSubjectResult {
 subjectId:string;subjectName:string;total:number;correct:number;wrong:number;unanswered:number;score:number;
}
const idOf=(question:any)=>String(question.id||question._id||'');

export function resolveQuizQuestionSubjectId(quiz:any,question:any):string{
 if(question.subjectId)return String(question.subjectId);
 if(!quiz.mockExam?.enabled)return String(quiz.subjectId||'');
 // The mock's top-level subject is a compatibility field, not the material
 // of every question. Only an unambiguous section may fill a missing link.
 const subjects=new Set<string>((quiz.mockExam.sections||[])
  .filter((section:any)=>(section.questionIds||[]).map(String).includes(idOf(question)))
  .map((section:any)=>String(section.subjectId||'')).filter(Boolean));
 return subjects.size===1?[...subjects][0]:'';
}
export function resolveQuizSectionSubjectId(quiz:any,section:any,orderedQuestions:any[]):string{
 const ids=new Set((section.questionIds||[]).map(String));
 const questions=orderedQuestions.filter(q=>ids.has(idOf(q)));
 if(!questions.length)return String(section.subjectId||'');
 const subjects=questions.map(q=>resolveQuizQuestionSubjectId(quiz,q));
 return subjects.every(Boolean)&&new Set(subjects).size===1?subjects[0]:'';
}
/** Counts each graded question once, regardless of its number of skill links. */
export function buildQuizSubmissionSubjectResults({quiz,orderedQuestions,questionReview,subjectNameById}:Input):QuizSubmissionSubjectResult[]{
 const reviewById=new Map(questionReview.map(row=>[String(row.questionId),row]));
 const groups=new Map<string,QuizSubmissionSubjectResult>();
 for(const question of orderedQuestions){
  const subjectId=resolveQuizQuestionSubjectId(quiz,question),review=reviewById.get(idOf(question));
  if(!subjectId||!review)continue; // Missing evidence remains explicit in report coverage.
  const row=groups.get(subjectId)||{subjectId,subjectName:subjectNameById.get(subjectId)||'',total:0,correct:0,wrong:0,unanswered:0,score:0};
  row.total++;
  if(typeof review.selectedOptionIndex!=='number'||review.selectedOptionIndex<0)row.unanswered++;
  else if(review.isCorrect)row.correct++;
  else row.wrong++;
  groups.set(subjectId,row);
 }
 return [...groups.values()].map(row=>({...row,score:Math.round(row.correct/row.total*100)}));
}
