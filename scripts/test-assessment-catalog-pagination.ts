import assert from 'node:assert/strict';
import {isolatedMongo} from './school-assessment-test-fixture.js';
const close=await isolatedMongo();let server:any;
try{
 Object.assign(process.env,{AI_PROVIDER:'none',REDIS_URL:'',NOTIFICATION_QUEUE_ENABLED:'false',RATE_LIMIT_REDIS_ENABLED:'false',SENTRY_DSN:''});
 const {UserModel}=await import('../server/src/models/User.js');const {QuizModel}=await import('../server/src/models/Quiz.js');const{QuestionModel}=await import('../server/src/models/Question.js');const{PathModel}=await import('../server/src/models/Path.js');const{SubjectModel}=await import('../server/src/models/Subject.js');
 const admin=await UserModel.create({name:'admin',email:'catalog-admin@isolated.invalid',passwordHash:'fixture',role:'admin',isActive:true});const student=await UserModel.create({name:'student',email:'catalog-student@isolated.invalid',passwordHash:'fixture',role:'student',isActive:true});
 await PathModel.create({_id:'catalog-path',name:'catalog',isActive:true});await SubjectModel.create({_id:'catalog-subject',name:'subject',pathId:'catalog-path'});
 await QuestionModel.create({id:'catalog-q',pathId:'catalog-path',subjectId:'catalog-subject',subject:'catalog-subject',text:'question',options:['a','b'],correctOptionIndex:0,approvalStatus:'approved'});
 const base={pathId:'catalog-path',subjectId:'catalog-subject',questionIds:['catalog-q'],mode:'regular',isPublished:true,showOnPlatform:true,approvalStatus:'approved',access:{type:'free'}};
 await QuizModel.insertMany(Array.from({length:251},(_,i)=>({...base,_id:'catalog-'+i,id:'catalog-'+i,title:'training '+i,quizKind:i===0?'test':'drill',createdAt:new Date(100000+i),learningPlacements:[{pathId:base.pathId,subjectId:base.subjectId,slot:'training',isVisible:true}]})));
 await QuizModel.create({...base,_id:'catalog-mock',id:'catalog-mock',title:'mock',quizKind:'mock',mockExam:{enabled:true,pathId:base.pathId,sections:[{id:'s',title:'section',questionIds:['catalog-q']}]}});
 await QuizModel.create({...base,_id:'foreign-catalog',id:'foreign-catalog',title:'foreign',pathId:'foreign',quizKind:'mock',mockExam:{enabled:true,pathId:'foreign',sections:[]}});
 await QuizModel.createIndexes();const {createApp}=await import('../server/src/app.js');const{signAccessToken}=await import('../server/src/utils/jwt.js');server=createApp().listen(0,'127.0.0.1');await new Promise<void>(r=>server.once('listening',r));const root='http://127.0.0.1:'+server.address().port+'/api';
 const c=await fetch(root+'/auth/csrf-token'),csrf:any=await c.json(),cookie=c.headers.getSetCookie().map(s=>s.split(';')[0]).join('; ');
 const request=async(actor:any,path:string,patch?:unknown)=>{const r=await fetch(root+path,{method:patch?'PATCH':'GET',headers:{authorization:'Bearer '+signAccessToken({...actor.toObject(),id:String(actor._id)}),cookie,'x-csrf-token':csrf.csrfToken,'content-type':'application/json'},...(patch?{body:JSON.stringify(patch)}:{}),signal:AbortSignal.timeout(30000)});const body:any=await r.json();assert.equal(r.status,200,JSON.stringify(body));return body;};
 const global=await request(admin,'/quizzes?limit=200&noTotal=true');assert.ok(!global.quizzes.some((q:any)=>q.id==='catalog-0'));
 const ids:string[]=[];for(let page=1;page<=3;page++){const r=await request(admin,'/quizzes?pathId=catalog-path&subjectId=catalog-subject&catalogKind=training&noTotal=true&limit=100&page='+page);ids.push(...r.quizzes.map((q:any)=>q.id));assert.equal(r.pagination.totalPages>page,page<3);}assert.equal(ids.length,251);assert.equal(new Set(ids).size,251);assert.ok(ids.includes('catalog-0'));
 const mocks=await request(admin,'/quizzes?pathId=catalog-path&catalogKind=mock&limit=100');assert.deepEqual(mocks.quizzes.map((q:any)=>q.id),['catalog-mock']);
 await QuizModel.create({...base,_id:'draft-show',id:'draft-show',title:'draft',isPublished:false,quizKind:'drill'});
 await request(admin,'/quizzes/draft-show',{isPublished:true,showOnPlatform:true,learningPlacements:[{pathId:base.pathId,subjectId:base.subjectId,slot:'training',isVisible:true}]});assert.equal((await QuizModel.findOne({id:'draft-show'}).lean())?.isPublished,true);
 await request(admin,'/quizzes/catalog-0',{displayPriority:1000000});const staff=await request(admin,'/quizzes?pathId=catalog-path&subjectId=catalog-subject&catalogKind=training&limit=100');assert.equal(staff.quizzes[0].id,'catalog-0');
 const learner=await request(student,'/quizzes?pathId=catalog-path&subjectId=catalog-subject&limit=100&noTotal=true');assert.equal(learner.quizzes[0].id,'catalog-0');assert.equal(learner.quizzes[0].displayPriority,1000000);
 const plan:any=await QuizModel.find({pathId:'catalog-path',subjectId:'catalog-subject'}).sort({displayPriority:-1,createdAt:-1,_id:-1}).limit(100).explain('executionStats');assert.ok(!JSON.stringify(plan.queryPlanner.winningPlan).includes('"stage":"SORT"'),'Presentation ordering must have an index-supported path');
 console.log('PASS catalog251/3pages: no global200 omission, explicit training placement, path mock isolation, persisted learner ordering and indexed sort');
}finally{if(server)await new Promise<void>(r=>server.close(()=>r()));await close();}
