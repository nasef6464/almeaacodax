import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { orderMockExamQuestions } from '../utils/mockExam.ts';
import { normalizeMockExam } from '../services/mockExamNormalization.ts';
import { restoreStrictSectionProgress, getSectionDeadlineSeconds } from '../utils/quizProgressDraft.ts';
const quiz:any={mockExam:{enabled:true,sections:[{id:'second',order:1,questionIds:['b1','b2']},{id:'first',order:0,questionIds:['a1','a2']}]}};
const questions=[{id:'b1'},{id:'a1'},{id:'b2'},{id:'a2'}];
const original=JSON.stringify(questions);
assert.deepEqual(orderMockExamQuestions(quiz,questions,true,()=>0).map(x=>x.id),['a2','a1','b2','b1']);
assert.deepEqual(orderMockExamQuestions(quiz,questions,false).map(x=>x.id),['a1','a2','b1','b2']);
assert.equal(JSON.stringify(questions),original);
const oldDraft=[questions[0],questions[1],questions[2],questions[3]];
const restored=orderMockExamQuestions(quiz,oldDraft,false);
assert.equal(restored.findIndex(x=>x.id===oldDraft[0].id),2);
assert.equal(new Set(restored.map(x=>x.id)).size,4);
assert.deepEqual(orderMockExamQuestions({mockExam:{sections:[]}} as any,questions),questions);
console.log('PASS mock section order, per-section shuffle, stable resume identity, exact question preservation and input immutability');

const normalized=normalizeMockExam({enabled:true,pathId:'p',qiyasCategory:'tahsili',targetScore:90,isStrictSectionLock:true,presentationMode:'qiyas_strict',sections:[{id:'s',title:' Math ',subjectId:'math',questionIds:['q'],timeLimit:25,order:0,domain:'math',isStrictSectionLock:true}]});
assert.equal(normalized?.presentationMode,'qiyas_strict');
assert.equal(normalized?.isStrictSectionLock,true);
assert.equal(normalized?.qiyasCategory,'tahsili');
assert.equal(normalized?.targetScore,90);
assert.equal(normalized?.sections[0].domain,'math');
assert.equal(normalized?.sections[0].isStrictSectionLock,true);
assert.equal(normalizeMockExam({enabled:true,isStrictSectionLock:false,presentationMode:'flexible',sections:[]})?.isStrictSectionLock,false);
assert.equal(normalizeMockExam({enabled:true,sections:[]})?.isStrictSectionLock,undefined);
assert.equal(normalizeMockExam(undefined),undefined);
console.log('PASS strict/flexible mock normalization retains published policy and legacy optional fields');

const now = 1_000_000;
const timing = restoreStrictSectionProgress({ strictSectionDeadlines: { a: now + 172_000, b: now - 1000, unknown: now + 1000, invalid: NaN }, lockedSectionIds: ['a', 'unknown'] } as any,
  [{ id: 'a', timeLimit: 3 }, { id: 'b', timeLimit: 3 }, { id: 'invalid', timeLimit: 3 }], now);
assert.deepEqual(timing.deadlines, { a: now + 172_000, b: now - 1000 });
assert.deepEqual([...timing.lockedIds], ['a']);
assert.equal(getSectionDeadlineSeconds(timing.deadlines.a, now + 8000), 164);
assert.equal(getSectionDeadlineSeconds(timing.deadlines.b, now), 0);
assert.equal(getSectionDeadlineSeconds(now + 1001, now), 2);
assert.deepEqual(restoreStrictSectionProgress(null, [{ id: 'a', timeLimit: 3 }], now).deadlines, {});
assert.equal(restoreStrictSectionProgress({ strictSectionDeadlines: { a: now + 999_000 } } as any, [{ id: 'a', timeLimit: 3 }], now).deadlines.a, now + 180_000);
console.log('PASS strict deadline resume subtracts elapsed time, retains expiry/valid locks and accepts legacy drafts');

assert.match(readFileSync(new URL('../services/adapter.ts',import.meta.url),'utf8'),/mockExam:\s*normalizeMockExam\(quiz\?\.mockExam,\s*cleanText\)/);
assert.match(readFileSync(new URL('../pages/QuizPage.tsx',import.meta.url),'utf8'),/orderMockExamQuestions\(foundQuiz/);
