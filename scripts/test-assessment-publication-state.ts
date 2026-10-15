import assert from'node:assert/strict';
import{resolveAssessmentDefinitionRead}from'../server/src/modules/quizzes/application/assessmentDefinitionReadAdapter.js';
for(const mode of['central','regular']){
 const current={id:'quiz',isPublished:false,mode,targetUserIds:['current-student'],questionIds:['old-content']};
 const version={definition:{id:'wrong-id',isPublished:true,mode,targetUserIds:['old-student'],questionIds:['published-content']}};
 const read=resolveAssessmentDefinitionRead(current,version);
 assert.equal(read.isPublished,false,'Withdrawal must remain authoritative after a published snapshot exists');
 assert.equal(read.id,'quiz');assert.deepEqual(read.questionIds,['published-content']);
 if(mode==='central')assert.deepEqual(read.targetUserIds,['current-student']);
}
assert.equal(resolveAssessmentDefinitionRead({id:'q'}, {definition:{isPublished:true}}).isPublished,true,'Absent legacy flag retains compatible fallback');
console.log('PASS publication-state read: central/regular withdrawal stays current, content and identity retained, legacy fallback preserved');

assert.deepEqual(resolveAssessmentDefinitionRead({id:'path-mock',mode:'saher',isPublished:false,questionIds:['draft-edit']},{definition:{mode:'saher',isPublished:true,questionIds:['old-published']}}).questionIds,['draft-edit'],'Hidden platform draft must show current edits to staff');
