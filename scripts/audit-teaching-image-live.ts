/** Opt-in bounded real-provider audit. Synthetic images + disposable loopback DB only. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {isolatedMongo} from './school-assessment-test-fixture.js';
const argument=(name:string)=>process.argv.find(v=>v.startsWith('--'+name+'='))?.slice(name.length+3);
const credentialFile=argument('credentials');const imageDir=argument('images');
if(!credentialFile||!imageDir)throw Error('Explicit --credentials and --images are required; secrets are never printed');
const model=argument('model');
if(!model)throw Error('Explicit --model is required; do not spend audit budget on a local env model by accident');
const require=createRequire(new URL('../server/package.json',import.meta.url));
const credentials=require('dotenv').parse(fs.readFileSync(credentialFile));
if(!credentials.GEMINI_API_KEY)throw Error('Existing Gemini credential unavailable; do not create a new key');
const close=await isolatedMongo();const original=globalThis.fetch;let server:any;let providerAttempts=0;
const providerStatuses:number[]=[];
const run='image-live-'+Date.now();const cases:any[]=[];
const maxCalls=Number(argument('max-calls')||3);if(!Number.isInteger(maxCalls)||maxCalls<1||maxCalls>3)throw Error('Budget must be1..3');
const sampleNames=argument('samples')?.split(',');
const allSamples=[{name:'Geometry',question:'احسب مساحة المستطيل ذي الطول6 والعرض4.',reference:'المساحة تساوي الطول في العرض:6×4=24.',answer:'24'},
 {name:'Fraction',question:'اجمع الكسرين في الصورة.',reference:'نحول النصف إلى ربعين ثم نجمع ربعًا:2/4+1/4=3/4.',answer:'3/4'},
 {name:'Table',question:'كم عمودًا مسمى في الصورة؟',reference:'الصورة تحتوي على عنوانين A وB، أي عمودين.',answer:'2'}];
const samples=allSamples.filter(s=>!sampleNames||sampleNames.includes(s.name)).slice(0,maxCalls);
const bytes=new Map(samples.map(s=>[s.name,fs.readFileSync(imageDir+'/source-'+s.name+'.png')]));
try{
 Object.assign(process.env,{AI_PROVIDER:'gemini',GEMINI_API_KEY:credentials.GEMINI_API_KEY,GEMINI_MODEL:model,AI_TEACHING_IMAGE_ENABLED:'true',R2_PUBLIC_BASE_URL:'https://fixture.images',REDIS_URL:'',NOTIFICATION_QUEUE_ENABLED:'false',RATE_LIMIT_REDIS_ENABLED:'false',SENTRY_DSN:''});
 globalThis.fetch=async(input,init)=>{
  const url=String(input);
  if(url.startsWith('http://127.0.0.1:'))return original(input,init);
  if(url.startsWith('https://fixture.images/questions/')){
   const name=new URL(url).pathname.split('/').at(-1)!.replace('.png','');const image=bytes.get(name);
   assert.ok(image);return new Response(image,{headers:{'content-type':'image/png'}});
  }
  if(url.startsWith('https://generativelanguage.googleapis.com/')){
   if(++providerAttempts>maxCalls)throw Error('Real-provider audit budget exhausted');
   const request=JSON.parse(String(init?.body));assert.equal(request.generationConfig.maxOutputTokens,900);assert.ok(request.contents[0].parts[0].inlineData);
   const response=await original(input,init);providerStatuses.push(response.status);return response;
  }
  throw Error('Unexpected outbound request in bounded audit');
 };
 const {UserModel}=await import('../server/src/models/User.js');const{QuestionModel}=await import('../server/src/models/Question.js');const{ReviewCardModel}=await import('../server/src/models/ReviewCard.js');const{AiInteractionModel}=await import('../server/src/models/AiInteraction.js');const{teachingImageIdentity}=await import('../server/src/modules/ai/application/teachingImageIdentity.js');
 const user=await UserModel.create({name:'Synthetic vision audit',email:'synthetic@vision.invalid',passwordHash:'fixture',role:'student',isActive:true,schoolId:'synthetic-school'});
 const express=createRequire(new URL('../server/package.json',import.meta.url))('express');const {aiRouter}=await import('../server/src/routes/ai.routes.js');const{requireAuth,requireActiveAuth}=await import('../server/src/middleware/auth.js');const{errorHandler}=await import('../server/src/middleware/errorHandler.js');const createApp=()=>express().use(express.json()).use('/api/ai',requireAuth,requireActiveAuth,aiRouter).use(errorHandler);const{signAccessToken}=await import('../server/src/utils/jwt.js');
 server=createApp().listen(0,'127.0.0.1');await new Promise<void>(r=>server.once('listening',r));
 const token=signAccessToken({...user.toObject(),id:String(user._id)});
 for(const sample of samples){
  const question=await QuestionModel.create({id:run+sample.name,subject:'math',text:sample.question,explanation:sample.reference,options:[sample.answer,'غير ذلك'],correctOptionIndex:0,imageUrl:'https://fixture.images/questions/v2/'+sample.name+'.png',sourceMeta:{imageHash:createHash('sha256').update(bytes.get(sample.name)!).digest('hex')}});
  await ReviewCardModel.create({userId:String(user._id),questionId:question.id,savedForReview:true,reviewType:'saved_review'});
  const started=Date.now();const response=await fetch('http://127.0.0.1:'+server.address().port+'/api/ai/question-assistant',{method:'POST',headers:{authorization:'Bearer '+token,'content-type':'application/json'},body:JSON.stringify({context:'saved_review',questionId:question.id,helpLevel:'steps',boardMode:'storyboard_v2',imageVersion:teachingImageIdentity(question.toObject())!.version,tutorSessionId:run,message:'اشرح حل هذا السؤال مباشرة بخطوات قصيرة، واكتب المعطيات والمعادلات على السبورة.'}),signal:AbortSignal.timeout(30000)});
  const body:any=await response.json();const passed=response.ok&&body.storyboard?.version===2&&body.storyboard.image?.marks.length>0&&!body.usedFallback;
  cases.push({name:sample.name,http:response.status,latencyMs:Date.now()-started,passed,reference:sample.reference,answer:sample.answer,provider:body.provider,model:body.model,imageSentToProvider:body.imageSentToProvider,text:body.text,storyboard:body.storyboard});
  console.log(JSON.stringify({name:sample.name,status:response.status,passed,provider:body.provider,model:body.model,latencyMs:Date.now()-started}));
  if(!passed)break;
 }
 const usage=await AiInteractionModel.find({'metadata.tutorSessionId':run}).select('provider model inputTokens outputTokens totalTokens usageEstimated estimatedCostMicrosUsd pricingKnown latencyMs metadata.imageSentToProvider').lean();
 const report={run,model,providerAttempts,providerStatuses,cases,usage,passed:cases.length>0&&cases.length===samples.length&&providerAttempts===cases.length&&usage.length===cases.length&&cases.every(c=>c.passed)&&usage.every((u:any)=>!u.usageEstimated&&u.outputTokens>0&&u.outputTokens<=900),boundary:'At most3real provider requests through normal local gateway/quota/ledger; synthetic images and disposable loopback DB. No production questions/results/progress changed. Manual region/reference review still required.'};
 fs.writeFileSync(argument('output')||'scratch/teaching-image-live-proof.json',JSON.stringify(report,null,2));
 console.log(JSON.stringify({passed:report.passed,providerAttempts,usageRecords:usage.length}));
 if(!report.passed)process.exitCode=1;
}finally{globalThis.fetch=original;if(server)await new Promise<void>(r=>server.close(()=>r()));await close();}
