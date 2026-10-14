import assert from 'node:assert/strict';
import { isolatedMongo, mongoose } from './school-assessment-test-fixture.js';
const close = await isolatedMongo();
try {
  const { UserModel } = await import('../server/src/models/User.js');
  const { GroupModel } = await import('../server/src/models/Group.js');
  const { QuizModel } = await import('../server/src/models/Quiz.js');
  const { QuizResultModel } = await import('../server/src/models/QuizResult.js');
  const { resolveSchoolAssessmentContext } = await import('../server/src/modules/quizzes/application/schoolAssessmentManagementPolicy.js');
  const { buildSchoolAssessmentReport } = await import('../server/src/modules/quizzes/application/schoolAssessmentReport.js');
  const admin = await UserModel.create({name:'admin',role:'admin',email:'report@isolated.test',passwordHash:'test'});
  const supervisor = await UserModel.create({name:'supervisor',role:'supervisor',email:'scope@isolated.test',passwordHash:'test'});
  const group = await GroupModel.create({name:'class',type:'CLASS',ownerId:String(admin._id),supervisorIds:[String(supervisor._id)]});
  const ids = Array.from({length:1005},()=>new mongoose.Types.ObjectId());
  await UserModel.collection.insertMany(ids.map((_id:any,i:number)=>({_id,name:'learner'+i,email:'learner-'+i+'@isolated.test',role:'student',groupIds:[String(group._id)],isActive:true})));
  const quiz = await QuizModel.create({_id:'full-report',title:'test',pathId:'math',subjectId:'math',targetGroupIds:[String(group._id)],ownerId:String(admin._id)});
  const makeResult = (userId:string, score:number, date:string)=>({userId,quizId:quiz._id,quizTitle:'test',learningContext:'school_assessment',score,passed:score>=60,
    date,createdAt:new Date(date),skillsAnalysis:[{skillId:'fraction',skill:'الكسور',subjectId:'math',questionCount:2,correctCount:score===100?2:0,mastery:score},
      {skillId:'fraction',skill:'مهارة مادة أخرى',subjectId:'chem',questionCount:1,correctCount:1,mastery:100}],
    sectionResults:[{sectionId:'s1',sectionName:'القسم الأول',total:2,correct:score===100?2:0,score}],quizSnapshot:{subjectId:'math'},questionReview:[]});
  await QuizResultModel.collection.insertMany(ids.map((_id:any)=>makeResult(String(_id),100,'2026-10-01')));
  await QuizResultModel.collection.insertMany([makeResult(String(ids[0]),0,'2026-10-02'),makeResult('outside',0,'2026-10-03'),
    {...makeResult(String(ids[1]),0,'2026-10-03'),learningContext:'platform_self_study'}]);
  let report = await buildSchoolAssessmentReport(await resolveSchoolAssessmentContext({id:String(admin._id)},quiz._id));
  assert.equal(report.audience.targeted,1005);
  assert.equal(report.participation.completed,1005);
  assert.equal(report.participation.notCompleted,0);
  assert.equal(report.scores.average,Math.round(100400/1005*100)/100);
  assert.equal(report.sections[0].learners,1005);
  assert.equal(report.skills[0].learners,1005);
  assert.equal(report.skills.length,2,'Same skill ID in distinct subjects must remain separate');
  assert.equal(report.participation.started,null);
  assert.equal(JSON.stringify(report).includes('questionReview'),false);
  const scoped = await buildSchoolAssessmentReport(await resolveSchoolAssessmentContext({id:String(supervisor._id)},quiz._id));
  assert.deepEqual(scoped.audience,report.audience);
  await QuizResultModel.deleteMany({});
  report = await buildSchoolAssessmentReport(await resolveSchoolAssessmentContext({id:String(admin._id)},quiz._id));
  assert.equal(report.scores.average,null);
  assert.equal(report.scores.passRate,null);
  assert.equal(report.participation.notCompleted,1005);
  console.log('PASS complete school report:1005 targets,latest attempt,foreign/self-study exclusion,empty evidence');
} finally { await close(); }
