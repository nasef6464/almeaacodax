import assert from 'node:assert/strict';import {isolatedMongo} from './live-session-test-fixture.js';
const close=await isolatedMongo();let failed=0;
try{
 const [{ClassroomSessionModel},{GroupModel},{UserModel},{buildClassroomTeacherReports,buildClassroomSessionReport}]=await Promise.all([import('../server/src/models/ClassroomSession.js'),import('../server/src/models/Group.js'),import('../server/src/models/User.js'),import('../server/src/modules/schools/application/classroomSupervisorReport.js')]);
 const [A,B]=await UserModel.create(['A','B'].map(name=>({name,email:`report-${name}@isolated.test`,passwordHash:'fixture',role:'student',isActive:true})));
 const school=await GroupModel.create({name:'school',type:'SCHOOL',ownerId:'fixture-teacher',studentIds:[String(A._id),String(B._id)]});
 const classroom=await GroupModel.create({name:'class A',type:'CLASS',parentId:String(school._id),ownerId:'fixture-teacher',studentIds:[String(A._id)]});
 await UserModel.updateOne({_id:A._id},{$set:{schoolId:String(school._id),groupIds:[String(classroom._id)]}});
 await UserModel.updateOne({_id:B._id},{$set:{schoolId:String(school._id),groupIds:[]}});
 const base={schoolId:String(school._id),classId:String(classroom._id),teacherId:'fixture-teacher',pinHash:'isolated-fixture-hash',pinExpiresAt:new Date(Date.now()+86400000),status:'ended',questions:[],sentQuestionIds:[],sentHistory:[]};
 const legacy=await ClassroomSessionModel.create(base);
 const test=async(name:string,run:()=>Promise<void>)=>{try{await run();console.log('PASS '+name)}catch(error:any){failed++;console.error('FAIL '+name+': '+error.message)}};
 await test('legacy class report never imports parent-school students through virtual-id query',async()=>{const report=await buildClassroomSessionReport(legacy.toObject());assert.equal(report.roster.expected,1);assert.equal(report.students.some((row:any)=>row.studentId===String(B._id)),false)});
 // Synthetic frozen payloads only; no question bank, results or production data.
 await ClassroomSessionModel.collection.insertMany(Array.from({length:24},(_,i)=>({...base,teacherId:'fixture-teacher-'+(i%2),createdAt:new Date(Date.now()+i),reportSnapshot:{teacherId:'fixture-teacher-'+(i%2),roster:{joined:3},totals:{responses:10,correct:8},questions:Array.from({length:80},()=>({explanation:'x'.repeat(600)}))}})));
 let returnedBytes=0;const originalFind=ClassroomSessionModel.find;const originalAggregate=ClassroomSessionModel.collection.aggregate;
 (ClassroomSessionModel as any).find=function(...args:any[]){const query=(originalFind as any).apply(this,args);const exec=query.exec;query.exec=async function(...rest:any[]){const rows=await exec.apply(this,rest);returnedBytes+=Buffer.byteLength(JSON.stringify(rows));return rows};return query};
 (ClassroomSessionModel.collection as any).aggregate=function(...args:any[]){const cursor=(originalAggregate as any).apply(this,args);const next=cursor.next.bind(cursor);cursor.next=async(...rest:any[])=>{const row=await next(...rest);if(row)returnedBytes+=Buffer.byteLength(JSON.stringify(row));return row};return cursor};
 let rows:any[];try{rows=await buildClassroomTeacherReports({all:false,schoolIds:[],classIds:[String(classroom._id)]} as any)}finally{ClassroomSessionModel.find=originalFind;ClassroomSessionModel.collection.aggregate=originalAggregate}
 await test('all historical totals preserved while database result payload stays bounded',async()=>{const gold=rows.find(row=>row.teacherId==='fixture-teacher-0');assert.deepEqual(gold,{teacherId:'fixture-teacher-0',sessions:12,joined:36,responses:120,correct:96,accuracy:80});assert.equal(rows.find(row=>row.teacherId==='fixture-teacher-1').sessions,12);assert.equal(rows.find(row=>row.teacherId==='fixture-teacher').sessions,1);assert.ok(returnedBytes<20000,`report materialized ${returnedBytes} bytes instead of summary fields`)});
 console.log(JSON.stringify({sessions:25,returnedDatabaseDocumentBytes:returnedBytes,failed}));if(failed)throw Error(failed+' teacher report groups failed');
}finally{await close()}
