import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import {isolatedMongo} from './school-assessment-test-fixture.js';
const close=await isolatedMongo();console.log("Image HTTP: disposable DB connected");let server:any;const original=globalThis.fetch;let images=0,providers=0;
try{
 Object.assign(process.env,{AI_PROVIDER:'gemini',GEMINI_API_KEY:'synthetic-test-key',GEMINI_MODEL:'gemini-2.5-flash',AI_TEACHING_IMAGE_ENABLED:'true',R2_PUBLIC_BASE_URL:'https://images.example',REDIS_URL:'',NOTIFICATION_QUEUE_ENABLED:'false',RATE_LIMIT_REDIS_ENABLED:'false',SENTRY_DSN:'',AI_QUESTION_ASSISTANT_PER_MINUTE:'60'});
 const raw={format:'compact_v1',mode:'lesson',language:'ar-SA',narration:'نحدد الطول.',board:'6',kind:'formula',prompt:'ما المساحة؟',explanation:'نضرب الطول بالعرض.',solution:['6 \\times 4 = 24'],solutionKind:'formula',marks:[{sceneId:'given',kind:'box',box_2d:[100,100,500,500]}]};
 globalThis.fetch=async(input,init)=>{
  const url=String(input);if(url.startsWith('http://127.0.0.1:'))return original(input,init);
  if(url.startsWith('https://images.example/questions/')){images++;return new Response(Buffer.from([137,80,78,71,13,10,26,10,0]),{headers:{'content-type':'image/png'}});}
  if(url.startsWith('https://generativelanguage.googleapis.com/')){providers++;const sent=JSON.parse(String(init?.body));assert.equal(sent.generationConfig.maxOutputTokens,sent.contents[0].parts[0].inlineData?900:450);if(sent.contents[0].parts[0].inlineData)assert.ok(sent.generationConfig.responseJsonSchema.properties.marks.items.anyOf[0].required.includes('box_2d'));return new Response(JSON.stringify({candidates:[{content:{parts:[{text:JSON.stringify(raw)}]}}],usageMetadata:{promptTokenCount:30,candidatesTokenCount:20,totalTokenCount:50}}));}
  throw Error('Unexpected external request in isolated test');
 };
 const {UserModel}=await import('../server/src/models/User.js');const {QuestionModel}=await import('../server/src/models/Question.js');const {QuizResultModel}=await import('../server/src/models/QuizResult.js');const {AiQuestionAssistCacheModel}=await import('../server/src/models/AiQuestionAssistCache.js');const {teachingImageIdentity}=await import('../server/src/modules/ai/application/teachingImageIdentity.js');
 const users=await UserModel.create(['a','b','outsider'].map((id,i)=>({name:id,email:id+'@image.isolated.invalid',passwordHash:'fixture',role:'student',isActive:true,schoolId:i===1?'schoolB':'schoolA'})));
 const question=await QuestionModel.create({id:'image-q',subject:'math',text:'مساحة مستطيل',options:['24','20'],correctOptionIndex:0,explanation:'نضرب ستة في أربعة فنحصل على24.',imageUrl:'https://images.example/questions/v2/a.png',sourceMeta:{imageHash:'a'.repeat(64)}});
 const identity=teachingImageIdentity(question.toObject())!;
 const review={questionId:'image-q',text:question.text,options:question.options,correctOptionIndex:0,selectedOptionIndex:1,explanation:question.explanation,imageUrl:question.imageUrl};
 const results=await QuizResultModel.create([0,1].map(i=>({userId:String(users[i]._id),schoolId:i===1?'schoolB':'schoolA',quizId:'fixture',quizTitle:'fixture',score:0,questionReview:[review]})));
 console.log('Image HTTP: fixtures ready');
 const express=createRequire(new URL('../server/package.json',import.meta.url))('express');const {aiRouter}=await import('../server/src/routes/ai.routes.js');const{requireAuth,requireActiveAuth}=await import('../server/src/middleware/auth.js');const{errorHandler}=await import('../server/src/middleware/errorHandler.js');const createApp=()=>express().use(express.json()).use('/api/ai',requireAuth,requireActiveAuth,aiRouter).use(errorHandler);const {signAccessToken}=await import('../server/src/utils/jwt.js');server=createApp().listen(0,'127.0.0.1');await new Promise<void>(r=>server.once('listening',r));
 console.log('Image HTTP: app listening');
 const endpoint='http://127.0.0.1:'+server.address().port+'/api/ai/question-assistant';
 const body={context:'result_review',resultId:String(results[0]._id),questionId:'image-q',helpLevel:'steps',boardMode:'storyboard_v2',imageVersion:identity.version,message:'اشرح حل هذا السؤال مباشرة بخطوات قصيرة، واكتب المعطيات والمعادلات على السبورة.'};
 const request=async(i:number,patch:any={})=>{const r=await fetch(endpoint,{method:'POST',headers:{authorization:'Bearer '+signAccessToken({...users[i].toObject(),id:String(users[i]._id)}),'content-type':'application/json'},body:JSON.stringify({...body,...patch})});const result={status:r.status,body:await r.json() as any};console.log(JSON.stringify({step:"image-http",user:i,status:r.status,imageSent:result.body.imageSentToProvider,images,providers}));return result;};
 assert.equal((await request(2)).status,404);assert.equal(images,0);assert.equal(providers,0);
 const stale=await request(0,{imageVersion:undefined});assert.equal(stale.body.storyboard?.version,1);assert.equal(images,0);const priorProviders=providers;
 const first=await request(0);assert.equal(first.status,200);assert.equal(first.body.storyboard?.version,2,JSON.stringify(first.body));assert.equal(first.body.imageSentToProvider,true);assert.equal(images,1);assert.equal(providers,priorProviders+1);
 assert.deepEqual(first.body.storyboard.image.marks,[{id:'mark0',sceneId:'given',kind:'box',x:.1,y:.1,width:.4,height:.4}],'HTTP exposes normalized playback geometry, never provider-native coordinates');
 const cached=await request(0);assert.equal(cached.body.cacheHit,true);assert.equal(cached.body.imageSentToProvider,false);assert.equal(images,1);assert.equal(providers,priorProviders+1);
 const other=await request(1,{resultId:String(results[1]._id)});assert.equal(other.body.cacheHit,false);assert.equal(images,2);assert.equal(providers,priorProviders+2);
 await QuestionModel.updateOne({_id:question._id},{$set:{'sourceMeta.imageHash':'b'.repeat(64)}});const changed=teachingImageIdentity({...question.toObject(),sourceMeta:{imageHash:'b'.repeat(64)}})!;
 assert.equal((await request(0,{imageVersion:changed.version})).body.cacheHit,false);assert.equal(images,3);
 const before=images;await QuizResultModel.updateOne({_id:results[0]._id},{$set:{'questionReview.0.text':'historical question'}});
 assert.equal((await request(0,{imageVersion:changed.version})).body.storyboard?.version,1);assert.equal(images,before,'historical snapshots never substitute canonical images');
 const caches=await AiQuestionAssistCacheModel.find().lean();assert.ok(caches.some((c:any)=>c.userId==='@shared-teaching-scenario'));assert.ok(!JSON.stringify(caches).includes('inlineData'));
 console.log('Teaching image HTTP: owned review, school isolation, cache0/0, version invalidation, historical fallback PASS');
}finally{globalThis.fetch=original;if(server)await new Promise<void>(r=>server.close(()=>r()));await close();}
