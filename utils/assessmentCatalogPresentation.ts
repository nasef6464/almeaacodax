import type {Quiz} from '../types';
import {isTrueMockExam, inferQuizKind} from './quizPlacement';
import {getQuizLearningPlacement} from './quizLearningPlacement';
export const priorityForOrder = (order:number) => 1000001-Math.max(1,Math.min(1000000,Math.trunc(order)));
export const orderForPriority = (quiz:Partial<Quiz>) => typeof quiz.displayPriority==='number'?1000001-quiz.displayPriority:undefined;
export const compareAssessmentPresentation = (a:Partial<Quiz>,b:Partial<Quiz>) => (b.displayPriority??-1)-(a.displayPriority??-1) || (b.createdAt??0)-(a.createdAt??0);
export function matchesSubjectCatalog(quiz:Quiz,pathId:string,subjectId:string,kind:'drill'|'test') {
 if(isTrueMockExam(quiz)||quiz.subjectId!==subjectId||(pathId&&quiz.pathId!==pathId))return false;
 return Boolean(getQuizLearningPlacement(quiz,{pathId:quiz.pathId,subjectId,slot:kind==='drill'?'training':'tests'})) || inferQuizKind(quiz)===kind;
}
export const visibleInSubjectCatalog=(quiz:Quiz,kind:'drill'|'test')=>{const placement=getQuizLearningPlacement(quiz,{pathId:quiz.pathId,subjectId:quiz.subjectId,slot:kind==='drill'?'training':'tests'});return quiz.isPublished!==false&&quiz.showOnPlatform!==false&&Boolean(placement)&&placement?.isVisible!==false;};
