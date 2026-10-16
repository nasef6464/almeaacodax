import assert from 'node:assert/strict';
import {summarizeFoundationCompletion,summarizeQuizCompletion} from '../server/src/modules/quizzes/application/learningCompletion.js';
const topics=[{id:'main',lessonIds:['a'],quizIds:[]},{id:'child',parentId:'main',lessonIds:['a','b'],quizIds:['q']},{id:'grand',parentId:'child',lessonIds:['c']},{id:'empty'},{id:'hidden',parentId:'main',showOnPlatform:false,lessonIds:['z']}];
let rows=summarizeFoundationCompletion(topics,new Set(['a','b','c']),new Set(['q']),new Set(['a','b']),new Set(['q']));assert.equal(rows.main.total,4);assert.equal(rows.main.completed,3);assert.equal(rows.main.percent,75);assert.equal(rows.empty.percent,0);
rows=summarizeFoundationCompletion(topics,new Set(['a','b','c']),new Set(['q']),new Set(['a','b','c']),new Set(['q']));assert.equal(rows.main.percent,100);assert.equal(rows.main.complete,true);assert.equal(rows.hidden,undefined);
const q=[{id:'a',access:{type:'free'}},{id:'b',access:{type:'paid'}},{id:'a',access:{type:'free'}}];const sum=summarizeQuizCompletion(q,new Set(['a']));assert.equal(sum.free.total,1);assert.equal(sum.free.completed,1);assert.equal(sum.paid.total,1);console.log('PASS main topic full descendants, unique units, empty/hidden exclusion and unique quiz completion');

const ids=Array.from({length:200},(_,i)=>String(i));const almost=summarizeFoundationCompletion([{id:'root',lessonIds:ids}],new Set(ids),new Set(),new Set(ids.slice(0,199)),new Set());assert.equal(almost.root.complete,false);assert.equal(almost.root.percent,99);
