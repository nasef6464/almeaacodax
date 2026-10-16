import assert from 'node:assert/strict';
import {isolatedMongo} from './school-assessment-test-fixture.js';
const close=await isolatedMongo();let server:any;
try{
 Object.assign(process.env,{AI_PROVIDER:'none',REDIS_URL:'',NOTIFICATION_QUEUE_ENABLED:'false',RATE_LIMIT_REDIS_ENABLED:'false',SENTRY_DSN:''});
 const {UserModel}=await import('../server/src/models/User.js');const {QuizModel}=await import('../server/src/models/Quiz.js');const{QuestionModel}=await import('../server/src/models/Question.js');const{PathModel}=await import('../server/src/models/Path.js');const{QuizResultModel}=await import('../server/src/models/QuizResult.js');const{TopicModel}=await import('../server/src/models/Topic.js');const{LessonModel}=await import('../server/src/models/Lesson.js');const{LessonProgressModel}=await import('../server/src/models/LessonProgress.js');
 const a=await UserModel.create({name:'a',email:'completion-a@isolated.invalid',passwordHash:'fixture',role:'student',isActive:true}),b=await UserModel.create({name:'b',email:'completion-b@isolated.invalid',passwordHash:'fixture',role:'student',isActive:true});
 await PathModel.create({_id:'completion-path',name:'path',isActive:true});await PathModel.create({_id:'inactive-path',name:'inactive',isActive:false});
 await QuestionModel.create({id:'q',pathId:'completion-path',subjectId:'s',subject:'s',text:'question',options:['a','b'],correctOptionIndex:0,approvalStatus:'approved'});
 const base={pathId:'completion-path',subjectId:'s',questionIds:['q'],mode:'regular',isPublished:true,showOnPlatform:true,approvalStatus:'approved',access:{type:'free'},quizKind:'drill',learningPlacements:[{pathId:'completion-path',subjectId:'s',slot:'training',isVisible:true}]};
 await QuizModel.insertMany(Array.from({length:251},(_,i)=>({...base,_id:'quiz'+i,id:'quiz'+i,title:'training '+i})));
 await QuizModel.create({...base,_id:'hidden-quiz',id:'hidden-quiz',title:'hidden',showOnPlatform:false});
 await QuizModel.create({...base,_id:'mock',id:'mock',title:'mock',quizKind:'mock',mockExam:{enabled:true,pathId:'completion-path',sections:[{id:'s',title:'section',questionIds:['q']}]}});
 for(const quizId of ['quiz0','quiz0'])await QuizResultModel.create({userId:String(a._id),quizId,quizTitle:'completed',score:0});
 await QuizResultModel.create({userId:String(b._id),quizId:'quiz1',quizTitle:'other student',score:100});
 await TopicModel.insertMany([{id:'root',pathId:'completion-path',subjectId:'s',title:'root',lessonIds:['a'],quizIds:['quiz0']},{id:'child',parentId:'root',pathId:'completion-path',subjectId:'s',title:'child',lessonIds:['a','b']},{id:'grand',parentId:'child',pathId:'completion-path',subjectId:'s',title:'grand',lessonIds:['c']},{id:'hidden',parentId:'root',pathId:'completion-path',subjectId:'s',title:'hidden',showOnPlatform:false,lessonIds:['z']}]);
 await LessonModel.insertMany(['a','b','c','z'].map(id=>({id,title:id,type:'text',pathId:'completion-path',subjectId:'s',approvalStatus:'approved'})));
 await LessonProgressModel.insertMany(['a','b'].map(lessonId=>({userId:String(a._id),lessonId,completed:true})));
 const{createApp}=await import('../server/src/app.js');const{signAccessToken}=await import('../server/src/utils/jwt.js');server=createApp().listen(0,'127.0.0.1');await new Promise<void>(r=>server.once('listening',r));const root='http://127.0.0.1:'+server.address().port+'/api/quizzes/learning-completion';
 const token=signAccessToken({...a.toObject(),id:String(a._id)});const request=async(params:string)=>{const r=await fetch(root+params,{headers:{authorization:'Bearer '+token},signal:AbortSignal.timeout(30000)});return {status:r.status,body:await r.json() as any};};
 const r=await request('?pathId=completion-path&subjectId=s&userId='+String(b._id));assert.equal(r.status,200);assert.deepEqual(r.body.training.free,{total:251,completed:1});assert.deepEqual(r.body.completedQuizIds,['quiz0']);assert.equal(r.body.foundation.root.total,4);assert.equal(r.body.foundation.root.percent,75);assert.equal(r.body.foundation.root.complete,false);assert.ok(!JSON.stringify(r.body).includes('correctOptionIndex'));assert.ok(!JSON.stringify(r.body).includes('other student'));
 const mocks=await request('?pathId=completion-path');assert.equal(mocks.body.mock.free.total,1);assert.deepEqual(mocks.body.training,{});
 assert.equal((await request('?pathId=inactive-path&subjectId=s')).status,404);const anon=await fetch(root+'?pathId=completion-path&subjectId=s');assert.equal(anon.status,401);
 console.log('PASS full251 catalog, duplicate retry dedup, caller isolation, parent75%, hidden subtree exclusion, mock-only path scope, inactive path and anonymous denial');
}finally{if(server)await new Promise<void>(r=>server.close(()=>r()));await close();}
