import assert from 'node:assert/strict';
import {quizOptionSignature,restoreQuizAnswers,mergeRestoredQuizAnswers} from '../utils/quizAnswerEvidence.js';
const original={id:'q',options:['A','B'],imageUrl:''},changed={...original,options:['B','A']};
const evidence={q:quizOptionSignature(original)};
assert.deepEqual(restoreQuizAnswers([original],{q:0},evidence),{q:0});
assert.deepEqual(restoreQuizAnswers([changed],{q:0},evidence),{},'Local/server resume cannot restore old option index after correction');
assert.deepEqual(restoreQuizAnswers([original],{q:0},{}),{},'Legacy unsigned draft answer remains unverified');
assert.deepEqual(restoreQuizAnswers([original],{q:-1},evidence),{});
assert.deepEqual(restoreQuizAnswers([{...original,imageUrl:'corrected.png'}],{q:0},evidence),{},'Image-embedded options must also be checked');
console.log('PASS local/server resume evidence: same choices retained, reordered/image/unknown/unset choices rejected');

assert.deepEqual(mergeRestoredQuizAnswers([changed],{},{q:0},evidence),{},'Delayed progress after a live correction cannot reintroduce cleared choice');
assert.deepEqual(mergeRestoredQuizAnswers([original],{q:1},{q:0},evidence),{q:1},'Delayed progress cannot overwrite a newer learner choice');
console.log('PASS delayed restore: current live options checked and newer learner selection retained');
