import fs from 'node:fs';
import os from 'node:os';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {parseFixture,parseWorkerArgs,loginClient,origin} from './client.mjs';
import {instrument} from './traffic.mjs';
const {group,sessionId,expected,runId,runner}=parseWorkerArgs(process.argv.slice(2));
// The workflow sources credentials from its temporary secret environment and
// passes them through an anonymous pipe, never CLI arguments or fixture files.
let fixtureInput='';for await(const chunk of process.stdin){fixtureInput+=chunk;assert.ok(Buffer.byteLength(fixtureInput)<65536,'Oversized trial fixture');}
const fixture=parseFixture(fixtureInput,group,sessionId);fixtureInput='';
if(process.argv.includes('--validate-only')){console.log(JSON.stringify({validated:true,group,students:fixture.students.length,productionTraffic:0}));process.exit(0);}
const directory='output/classroom-distributed';fs.mkdirSync(directory,{recursive:true});
const evidence={status:'RUNNING',group,runId,runner,expectedPublished:expected,startedAt:new Date().toISOString(),independentContexts:0,actors:[],errors:[],traffic:[],pending:[],socketFrames:[],memory:{totalBytes:os.totalmem(),freeBeforeBytes:os.freemem()}};
const save=()=>fs.writeFileSync(directory+'/group-'+group+'.json',JSON.stringify(evidence,null,2));
const pages=[];let browser;
try {
 const health=await fetch(origin+'/api/health/scale-ready',{signal:AbortSignal.timeout(45000)});const release=await health.json();assert.equal(health.status,200,'Published readiness unavailable');
 const actual=release.commitSha||release.commit||release.version;assert.ok(expected.startsWith(actual),'Published release mismatch');evidence.observedPublished=actual;
 browser=await chromium.launch({headless:true});save();
 for(const row of fixture.students) {
  const client=await loginClient(row.email,row.password,'student',row.userId);
  const context=await browser.newContext({viewport:{width:390,height:844}});await context.addCookies(client.cookies());
  const page=await context.newPage();page.setDefaultTimeout(720000);
  const actor={actor:'student-'+String(row.index+1).padStart(2,'0'),index:row.index,phase:'join',batches:[],joined:false,ended:false};evidence.actors.push(actor);
  const capture=await instrument(page,actor.actor,()=>actor.phase,evidence.errors);pages.push({page,context,actor,capture});
  await page.goto(origin+'/classroom/'+sessionId,{waitUntil:'domcontentloaded',timeout:90000});
  await page.getByRole('heading',{name:'تابع الشرح مع المعلم',exact:true}).waitFor();actor.joined=true;evidence.independentContexts++;save();
  console.log(JSON.stringify({group,actor:actor.actor,joined:true}));
 }
 assert.equal(pages.length,6);assert.equal(new Set(pages.map(p=>p.context)).size,6);
 for(let batch=1;batch<=3;batch++) {
  await Promise.all(pages.map(async({page,actor})=>{
   actor.phase='batch-'+batch;const started=performance.now();await page.getByText('السؤال 1 من 5',{exact:true}).first().waitFor();
   const appearanceMs=Math.round(performance.now()-started);page.setDefaultTimeout(180000);
   for(let q=0;q<5;q++) {
    await page.locator('img').evaluateAll(async images=>{await Promise.all(images.map(image=>image.complete?Promise.resolve():new Promise((resolve,reject)=>{image.addEventListener('load',resolve,{once:true});image.addEventListener('error',()=>reject(Error('Question image failed')),{once:true});})));if(images.some(image=>!image.complete||image.naturalWidth===0))throw Error('Question image incomplete');});
    await page.getByRole('button',{name:new RegExp('^'+['أ','ب','ج','د'][actor.index%4])}).first().click();
    if(q<4)await page.getByRole('button',{name:'التالي',exact:true}).click();
   }
   const [submission]=await Promise.all([page.waitForResponse(r=>r.url().endsWith('/submit')&&r.request().method()==='POST'),page.getByRole('button',{name:'تسليم وإنهاء الاختبار',exact:true}).click()]);
   assert.equal(submission.status(),200,'UI submission failed');
   await page.getByRole('heading',{name:'تم تسليم جميع إجاباتك بنجاح للمعلم!',exact:true}).waitFor();
   await page.getByRole('heading',{name:'تابع الشرح مع المعلم',exact:true}).waitFor();
   actor.batches.push({number:batch,answers:5,submissionStatus:200,returnedToWaiting:true,appearanceWaitMs:appearanceMs});save();
  }));console.log(JSON.stringify({group,batch,submitted:6}));
 }
 await Promise.all(pages.map(async({page,actor})=>{actor.phase='end';await page.getByRole('heading',{name:'انتهت الحصة الذكية',exact:true}).waitFor();actor.ended=true;}));
 await pages[0].page.screenshot({path:directory+'/group-'+group+'-student.png',fullPage:true});
 assert.equal(evidence.errors.length,0,'Browser errors detected');
 evidence.requiredAssertions=6*(1+3+1);evidence.passedAssertions=evidence.actors.reduce((n,a)=>n+Number(a.joined)+a.batches.filter(b=>b.answers===5&&b.submissionStatus===200&&b.returnedToWaiting).length+Number(a.ended),0);
 assert.equal(evidence.passedAssertions,evidence.requiredAssertions);
 evidence.status='PASSED_BROWSER_MEASUREMENT';
}catch(error){evidence.status='FAILED';evidence.failure={type:error.name,stage:'distributed-browser-journey'};process.exitCode=1;}
finally {
 for(const {actor,capture} of pages){const snapshot=capture.ledger.snapshot();evidence.traffic.push(...snapshot.completed);evidence.pending.push(...snapshot.pending);evidence.socketFrames.push({actor:actor.actor,...capture.sockets});}
 const bad=evidence.traffic.filter(r=>(r.kind==='api'||r.kind==='transport'||r.kind==='questionImages')&&(r.status>=400||r.failed));
 evidence.httpFailures=bad.map(({actor,kind,path,status,failed})=>({actor,kind,path,status,failed}));
 if(bad.length){evidence.status='FAILED';process.exitCode=1;}
 for(const actor of evidence.actors){const rows=evidence.traffic.filter(r=>r.actor===actor.actor);actor.completedRequests=rows.length;actor.encodedReceivedBytes=rows.reduce((n,r)=>n+r.receivedBytes,0);actor.joinPosts=rows.filter(r=>r.method==='POST'&&r.path.endsWith('/instant-join')).length;actor.submitPosts=rows.filter(r=>r.method==='POST'&&r.path.endsWith('/submit')).length;}
 if(evidence.actors.some(a=>a.joinPosts!==1||a.submitPosts!==3)){evidence.status='FAILED';process.exitCode=1;}
 evidence.memory.freeAfterBytes=os.freemem();evidence.endedAt=new Date().toISOString();
 evidence.limits='24 distributed virtual browsers across four runners; completed CDP encoded received bytes, open stream counters and websocket payloads reported separately. Excludes API login setup, teacher controller, TLS/TCP overhead and billed egress; not physical tablets or full A-S classroom certification.';
 await browser?.close();save();console.log(JSON.stringify({group,status:evidence.status,contexts:evidence.independentContexts,passed:evidence.passedAssertions,required:evidence.requiredAssertions,errors:evidence.errors.length,httpFailures:evidence.httpFailures.length}));
}
