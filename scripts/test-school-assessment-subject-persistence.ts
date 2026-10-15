import assert from 'node:assert/strict';
import {QuizResultModel} from '../server/src/models/QuizResult.js';
const subject={subjectId:'science',subjectName:'العلوم',total:2,correct:1,wrong:1,unanswered:0,score:50};
const result:any=new QuizResultModel({userId:'student',quizId:'mock',quizTitle:'محاكي',subjectResults:[subject],sectionResults:[{sectionId:'section',sectionName:'قسم العلوم',subjectId:'science',subjectName:'العلوم',total:2,correct:1,wrong:1,unanswered:0,score:50}]}).toObject();
assert.deepEqual(result.subjectResults,[subject]);
assert.equal(result.sectionResults[0].subjectId,'science');assert.equal(result.sectionResults[0].subjectName,'العلوم');
assert.equal((new QuizResultModel({userId:'old',quizId:'mock',quizTitle:'قديم'}).toObject() as any).subjectResults,undefined,'Legacy outcomes remain unknown without backfill');
console.log('PASS material result persistence: scalar frozen subject/section metadata and absent legacy evidence');
