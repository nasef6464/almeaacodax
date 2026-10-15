import assert from 'node:assert/strict';
import {buildQuizSubmissionAnswerReview} from '../server/src/modules/quizzes/application/quizSubmissionAnswerReview.js';
import {buildQuizSubmissionSubjectResults} from '../server/src/modules/quizzes/application/quizSubmissionSubjectResults.js';
import {buildQuizSubmissionSectionResults} from '../server/src/modules/quizzes/application/quizSubmissionSectionResults.js';
const questions=Array.from({length:5},(_,i)=>({id:'q'+(i+1),subjectId:i<3?'math':'science',correctOptionIndex:0,skillIds:['main','sub']}));
const quiz={pathId:'path',subjectId:'math',mockExam:{enabled:true,sections:[
 {id:'a',subjectId:'math',title:'رياضيات أ',questionIds:['q1','q2']},
 {id:'b',subjectId:'math',title:'رياضيات ب',questionIds:['q3']},
 {id:'c',subjectId:'science',title:'علوم',questionIds:['q4','q5']},
]}};
const answers={q1:0,q2:1,q4:0,q5:1};
const review=buildQuizSubmissionAnswerReview({orderedQuestions:questions,answers});
const subjectNameById=new Map([['math','الرياضيات'],['science','العلوم']]);
const subjects=buildQuizSubmissionSubjectResults({quiz,orderedQuestions:questions,questionReview:review.questionReview,subjectNameById});
assert.deepEqual(subjects,[
 {subjectId:'math',subjectName:'الرياضيات',total:3,correct:1,wrong:1,unanswered:1,score:33},
 {subjectId:'science',subjectName:'العلوم',total:2,correct:1,wrong:1,unanswered:0,score:50},
]);
assert.equal(subjects.reduce((n,s)=>n+s.total,0),5,'Multi-skill links cannot multiply the material denominator');
assert.equal(review.correctAnswers/questions.length*100,40,'Overall grading remains question-weighted');
const sections=buildQuizSubmissionSectionResults({quiz,orderedQuestions:questions,answers,subjectNameById})!;
assert.deepEqual(sections.map(s=>s.subjectId),['math','math','science']);
assert.deepEqual(sections.map(s=>s.score),[50,0,50]);
const withoutSubject=questions.map(q=>({...q,subjectId:''}));
assert.deepEqual(buildQuizSubmissionSubjectResults({quiz,orderedQuestions:withoutSubject,questionReview:review.questionReview,subjectNameById}),subjects,'Unambiguous section subject can classify old question rows');
const ambiguous={...quiz,mockExam:{enabled:true,sections:[...quiz.mockExam.sections,{id:'d',subjectId:'science',questionIds:['q1']}]}};
const partial=buildQuizSubmissionSubjectResults({quiz:ambiguous,orderedQuestions:withoutSubject,questionReview:review.questionReview,subjectNameById});
assert.equal(partial.reduce((n,s)=>n+s.total,0),4,'Ambiguous material attribution stays incomplete instead of choosing the first subject');
const normal=buildQuizSubmissionSubjectResults({quiz:{subjectId:'math'},orderedQuestions:withoutSubject.slice(0,3),questionReview:review.questionReview,subjectNameById});
assert.equal(normal[0].total,3);
assert.equal(normal[0].unanswered,1);
console.log('PASS material analysis: path mock3+2,weighted40,wrong/unanswered,multi-skill dedup,section mapping,normal and unknown attribution');

// A timed Qudurat section may mix verbal and quantitative questions. A section
// total and a material total are independent dimensions, never synonyms.
const mixedQuiz={...quiz,mockExam:{enabled:true,sections:[{id:'mixed',title:'القسم الأول',subjectId:'',questionIds:questions.map(q=>q.id)}]}};
assert.deepEqual(buildQuizSubmissionSubjectResults({quiz:mixedQuiz,orderedQuestions:questions,questionReview:review.questionReview,subjectNameById}),subjects);
const mixedSection=buildQuizSubmissionSectionResults({quiz:mixedQuiz,orderedQuestions:questions,answers,subjectNameById})!;
assert.equal(mixedSection.length,1);assert.equal(mixedSection[0].total,5);assert.equal(mixedSection[0].score,40);
assert.equal(mixedSection[0].subjectId,'','Mixed section must not be attributed to its first material');
assert.equal(mixedSection[0].correct,2);assert.equal(mixedSection[0].wrong,2);assert.equal(mixedSection[0].unanswered,1);
console.log('PASS one mixed-material section: section40 independent from material33/50; each question counted once');
