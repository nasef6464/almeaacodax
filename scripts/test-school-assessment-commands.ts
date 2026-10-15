import assert from 'node:assert/strict';
import {resolveAssessmentDefinitionRead} from '../server/src/modules/quizzes/application/assessmentDefinitionReadAdapter.js';
import {normalizeSchoolAssessmentCommand,schoolCommandIdentity} from '../server/src/modules/quizzes/application/schoolAssessmentCommandSchema.js';
const commandId='369c711d-f5c2-405d-bd93-94d48a1dd8cf';
const first=normalizeSchoolAssessmentCommand({commandId,operation:'retarget',payload:{targetGroupIds:['b','a','a'],targetUserIds:['student']}});
const retry=normalizeSchoolAssessmentCommand({commandId,operation:'retarget',payload:{targetUserIds:['student'],targetGroupIds:['a','b']}});
assert.deepEqual(first,retry);
assert.deepEqual(schoolCommandIdentity('actor','quiz',first),schoolCommandIdentity('actor','quiz',retry));
assert.notEqual(schoolCommandIdentity('other','quiz',first).id,schoolCommandIdentity('actor','quiz',first).id);
assert.notEqual(schoolCommandIdentity('actor','other',first).id,schoolCommandIdentity('actor','quiz',first).id);
const utc=normalizeSchoolAssessmentCommand({commandId,operation:'reopen',payload:{opensAt:'2030-01-01T00:00:00Z',closesAt:'2030-01-01T01:00:00Z'}});
const offset=normalizeSchoolAssessmentCommand({commandId,operation:'reopen',payload:{opensAt:'2030-01-01T03:00:00+03:00',closesAt:'2030-01-01T04:00:00+03:00'}});
assert.deepEqual(utc,offset);
for(const bad of [
  {commandId,operation:'retarget',payload:{targetGroupIds:[],targetUserIds:[]}},
  {commandId,operation:'remind',payload:{studentIds:[]}},
  {commandId,operation:'retake',payload:{studentIds:['student'],maxAttempts:99}},
  {commandId,operation:'reopen',payload:{...utc.payload,maxAttempts:99}},
  {commandId:'bad',operation:'remind',payload:{}},
])assert.throws(()=>normalizeSchoolAssessmentCommand(bad));
const remind=normalizeSchoolAssessmentCommand({commandId,operation:'remind',payload:{}});
assert.notEqual(schoolCommandIdentity('actor','quiz',remind).hash,schoolCommandIdentity('actor','quiz',first).hash);
console.log('PASS school command normalization: stable semantic retry,actor/quiz identity,UTC windows,strict separated operations');
const frozen={title:'original',questionIds:['frozen-question'],settings:{maxAttempts:1},closesAt:'2030-01-01T01:00:00Z',targetUserIds:['old']};
const live={_id:'quiz',mode:'central',title:'changed',questionIds:['changed-question'],settings:{maxAttempts:99},closesAt:'2030-02-01T01:00:00Z',opensAt:null,targetUserIds:['new']};
const read=resolveAssessmentDefinitionRead(live,{definition:frozen});
assert.equal(read.closesAt,live.closesAt);assert.equal(read.opensAt,null);assert.deepEqual(read.targetUserIds,['new']);
assert.deepEqual(read.settings,{maxAttempts:1});assert.deepEqual(read.questionIds,['frozen-question']);assert.equal(read.title,'original');
assert.equal(resolveAssessmentDefinitionRead({...live,mode:'regular',targetUserIds:[]},{definition:frozen}).closesAt,frozen.closesAt,'Unrelated platform definitions retain version semantics');
console.log('PASS school operational fields overlay frozen content without changing scoring or platform version semantics');
