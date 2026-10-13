import assert from 'node:assert/strict';import {isolatedMongo} from './live-session-test-fixture.js';
const close=await isolatedMongo();
try{
 const [{SchoolSkillEvidenceModel},{SchoolSkillAggregateModel},{updateSchoolSkillReadModelFromResult}]=await Promise.all([import('../server/src/models/SchoolSkillEvidence.js'),import('../server/src/models/SchoolSkillAggregate.js'),import('../server/src/modules/quizzes/application/schoolSkillReadModel.js')]);
 await Promise.all([SchoolSkillEvidenceModel.init(),SchoolSkillAggregateModel.init()]);
 const scope={schoolId:'isolated-school',classId:'isolated-class',userId:'isolated-A',pathId:'math',subjectId:'math',skillId:'fraction'};
 const history=Array.from({length:1000},(_,i)=>({...scope,evidenceKey:'owned-history-'+i,resultId:'history-'+i,questionCount:10,correctCount:i%11,occurredAt:new Date(1700000000000+i*1000)}));
 await SchoolSkillEvidenceModel.insertMany([...history,...history.map((row,i)=>({...row,userId:'isolated-B',evidenceKey:'other-history-'+i,resultId:'other-'+i}))]);
 const counts:number[]=[];const original=SchoolSkillEvidenceModel.aggregate;
 // Explain repeats counters inside executionStages: count each execution summary once.
 const examined=(node:any):number=>!node||typeof node!=='object'?0:typeof node.totalDocsExamined==='number'?node.totalDocsExamined:Object.values(node).reduce<number>((sum,value)=>sum+examined(value),0);
 (SchoolSkillEvidenceModel as any).aggregate=function(...args:any[]){const aggregation=(original as any).apply(this,args);const exec=aggregation.exec;aggregation.exec=async function(...rest:any[]){const result=await exec.apply(this,rest);const explain=await (original as any).apply(SchoolSkillEvidenceModel,args).explain('executionStats');counts.push(examined(explain));return result};return aggregation};
 const result={submissionKey:'owned-current-result',schoolId:scope.schoolId,classId:scope.classId,createdAt:new Date(1700002000000),skillsAnalysis:[{pathId:'math',subjectId:'math',skillId:'fraction',skill:'fractions',questionCount:10,correctCount:9}]};
 try{await updateSchoolSkillReadModelFromResult(result,scope.userId)}finally{SchoolSkillEvidenceModel.aggregate=original}
 const row=await SchoolSkillAggregateModel.findOne(scope).lean();assert.ok(row);
 const totalCorrect=history.reduce((sum,item)=>sum+item.correctCount,0)+9;
 assert.equal(row.attemptCount,1001);assert.equal(row.totalEvidence,10010);assert.equal(row.totalCorrect,totalCorrect);assert.equal(row.recentMastery,78);assert.equal(row.trend,'improving');assert.equal(await SchoolSkillAggregateModel.countDocuments({userId:'isolated-B'}),0);
 await updateSchoolSkillReadModelFromResult(result,scope.userId);assert.equal((await SchoolSkillAggregateModel.findOne(scope).lean())?.attemptCount,1001,'retry must not duplicate evidence');
 const scanned=counts.reduce((sum,count)=>sum+count,0);console.log(JSON.stringify({historyRows:2000,affectedEvidenceRows:1001,aggregateExaminedDocuments:scanned,byAggregate:counts}));
 assert.ok(scanned<1300,`recent-five computation examined ${scanned} documents instead of one cumulative pass plus bounded indexed recent history`);
 const priorCount=await SchoolSkillEvidenceModel.countDocuments();
 await updateSchoolSkillReadModelFromResult({...result,submissionKey:'no-school-result',schoolId:''},scope.userId);
 assert.equal(await SchoolSkillEvidenceModel.countDocuments(),priorCount,'non-school results remain no-ops');
 const tiedScope={...scope,skillId:'ties'};
 await SchoolSkillEvidenceModel.insertMany(Array.from({length:7},(_,i)=>({...tiedScope,evidenceKey:'tie-'+i,resultId:'tie-'+i,questionCount:10,correctCount:5,occurredAt:new Date(1700000000000)})));
 await updateSchoolSkillReadModelFromResult({...result,submissionKey:'tie-current',createdAt:new Date(1700000000000),skillsAnalysis:[{...result.skillsAnalysis[0],skillId:'ties',correctCount:5}]},scope.userId);
 const tied=await SchoolSkillAggregateModel.findOne(tiedScope).lean();assert.equal(tied?.attemptCount,8);assert.equal(tied?.recentMastery,50);assert.equal(tied?.trend,'stable');
 console.log('PASS exact totals/recent trend, learner isolation, idempotency and bounded recent-history indexed work');
}finally{await close()}
