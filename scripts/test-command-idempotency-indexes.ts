import assert from 'node:assert/strict';import {isolatedMongo} from './live-session-test-fixture.js';
const close=await isolatedMongo();
try{
 const [{CommandCenterDraftModel},{CommandCenterWorkflowModel}]=await Promise.all([import('../server/src/models/CommandCenterDraft.js'),import('../server/src/models/CommandCenterWorkflow.js')]);
 await Promise.all([CommandCenterDraftModel.init(),CommandCenterWorkflowModel.init()]);for(const model of[CommandCenterDraftModel,CommandCenterWorkflowModel]){
  await model.init();const indexes=await model.collection.indexes();const index=indexes.find(i=>i.name==='idempotencyKey_1');assert.ok(index);assert.equal(index.unique,true);assert.notEqual(index.sparse,true);assert.deepEqual(index.partialFilterExpression,{idempotencyKey:{$type:'string'}});
  await model.collection.insertMany([{fixture:true},{fixture:true},{fixture:true,idempotencyKey:null},{fixture:true,idempotencyKey:null}]);
  await model.collection.insertOne({fixture:true,createdBy:'isolated-owner',idempotencyKey:'isolated-key'});await assert.rejects(model.collection.insertOne({fixture:true,createdBy:'isolated-owner',idempotencyKey:'isolated-key'}),(e:any)=>e.code===11000);
  const race=await Promise.allSettled(Array.from({length:8},()=>model.collection.insertOne({fixture:true,idempotencyKey:'isolated-race'})));assert.equal(race.filter(r=>r.status==='fulfilled').length,1);assert.ok(race.filter(r=>r.status==='rejected').every((r:any)=>r.reason.code===11000));
  await model.collection.insertMany(Array.from({length:1000},(_,i)=>({fixture:true,idempotencyKey:'unrelated-'+i})));assert.equal((await model.findOne({idempotencyKey:'isolated-key'}).lean())?.idempotencyKey,'isolated-key');assert.equal(await model.findOne({idempotencyKey:'isolated-key',createdBy:'different-owner'}),null);assert.equal(await model.countDocuments({idempotencyKey:null}),4);const plan=await model.find({idempotencyKey:'isolated-key'}).explain('executionStats');assert.equal(plan.executionStats.nReturned,1);assert.equal(plan.executionStats.totalDocsExamined,1);assert.ok(JSON.stringify(plan.queryPlanner.winningPlan).includes('IXSCAN'));console.log('PASS '+model.modelName+' valid partial index, optional keys, duplicate rejection, concurrent uniqueness and indexed lookup');
 }
}finally{await close()}
