import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFileSync,readdirSync} from 'node:fs';
import {build} from 'esbuild';
import {chromium} from 'playwright';

const helperBundle=await build({entryPoints:['utils/studentPlanSchedule.ts'],bundle:true,write:false,platform:'node',format:'esm'});
const {scheduleStudentPlanTasks}=await import('data:text/javascript;base64,'+Buffer.from(helperBundle.outputFiles[0].text).toString('base64'));
const tasks=[{id:'first',type:'lesson',subjectId:'math',durationMinutes:20,completed:false},{id:'second',type:'lesson',subjectId:'math',durationMinutes:20,completed:false}];
const schedule=t=>scheduleStudentPlanTasks(t,{subjectIds:['math'],dailyMinutes:20},['2026-10-10','2026-10-11'],[],()=> 'foundation',()=>({label:'تأسيس'}),(_time,minutes)=>String(minutes));
const before=schedule(tasks).map(t=>({id:t.id,date:t.scheduledDate}));
assert.deepEqual(schedule([{...tasks[0],completed:true},tasks[1]]).map(t=>({id:t.id,date:t.scheduledDate})),before,'recording completion must not swap lesson dates');

const bundle=await build({stdin:{resolveDir:process.cwd(),loader:'tsx',contents:`
import React from 'react';import {createRoot} from 'react-dom/client';import {MemoryRouter} from 'react-router-dom';
import Plan from './pages/Plan';import {createStudyPlansSlice} from './store/slices/studyPlansSlice';
const today=new Date().toISOString().slice(0,10);
window.saved=[];window.pending=[];window.calls=[];
window.fixture={user:{id:'learner',role:'student'},paths:[{id:'quant',name:'الكمي'}],subjects:[{id:'math',pathId:'quant',name:'الرياضيات'}],skills:[],topics:[],lessons:[],enrolledCourses:['course'],hasScopedPackageAccess:()=>true,
courses:[{id:'course',title:'دورة',pathId:'quant',subjectId:'math',modules:[{id:'module',lessons:[{id:'first',title:'الدرس الأول',duration:'20',subjectId:'math'},{id:'second',title:'الدرس الثاني',duration:'20',subjectId:'math'}]}]}],
quizzes:[{id:'prior',title:'اختبار سابق',pathId:'quant',subjectId:'math',quizKind:'test'},{id:'new',title:'اختبار جديد',pathId:'quant',subjectId:'math',quizKind:'test'}],
libraryItems:[{id:'reference',title:'ملف مساعد',pathId:'quant',subjectId:'math',url:'https://example.org/reference.pdf'}],completedLessons:['first'],
examResults:[{id:'old',quizId:'prior',date:new Date(Date.now()-86400000).toISOString(),skillsAnalysis:[]}],
studyPlans:[{id:'plan',userId:'learner',name:'خطة اختبار',pathId:'quant',subjectIds:['math'],courseIds:['course'],startDate:today,endDate:new Date(Date.now()+7*86400000).toISOString().slice(0,10),offDays:[],dailyMinutes:120,preferredStartTime:'17:00',skipCompletedQuizzes:true,createdAt:Date.now()-60000,updatedAt:Date.now(),status:'active'}]};
let listeners=new Set();window.subscribe=fn=>{listeners.add(fn);return()=>listeners.delete(fn)};
window.publish=()=>listeners.forEach(fn=>fn());
window.patch=data=>{window.fixture={...window.fixture,...data};window.publish()};
window.fixture.hydrateContentBootstrap=data=>window.patch(data);
window.saved=window.fixture.studyPlans;window.fixture.studyPlans=[];window.planReadPending=[];window.deferRead=true;
const api=Object.fromEntries(['createStudyPlan','updateStudyPlan','deleteStudyPlan'].map(method=>[method,(...args)=>{window.calls.push({method,args});return new Promise((resolve,reject)=>window.pending.push({resolve,reject,args,method}))}]));
window.actions=createStudyPlansSlice(change=>{window.fixture={...window.fixture,...(typeof change==='function'?change(window.fixture):change)};window.publish()},api,()=>window.fixture);
window.fixture={...window.fixture,...window.actions};
createRoot(document.getElementById('root')).render(<MemoryRouter><main dir="rtl"><Plan/></main></MemoryRouter>);
`},bundle:true,write:false,plugins:[{name:'store-fixture',setup(b){
 b.onResolve({filter:/store\/useStore$/},()=>({path:'store',namespace:'fixture'}));
 b.onResolve({filter:/services\/api$/},()=>({path:'api',namespace:'fixture'}));
 b.onLoad({filter:/.*/,namespace:'fixture'},({path})=>({resolveDir:process.cwd(),loader:'js',contents:path==='api'
 ? `export const api={getMyStudyPlans:()=>window.deferRead?new Promise((resolve,reject)=>window.planReadPending.push({resolve:rows=>{window.deferRead=false;resolve(rows)},reject})):Promise.resolve({studyPlans:window.fixture.studyPlans,limit:200})};`
 : `import {useSyncExternalStore} from 'react';export const useStore=()=>useSyncExternalStore(window.subscribe,()=>window.fixture);useStore.getState=()=>window.fixture;`}));
}}]});
const cssFiles=readdirSync('dist/assets').filter(file=>file.endsWith('.css'));
const css=cssFiles.map(file=>readFileSync('dist/assets/'+file,'utf8')).join('\n');
const server=createServer((req,res)=>{res.setHeader('Content-Type',req.url==='/style.css'?'text/css':'text/html');res.end(req.url==='/style.css'?css:'<html><head><link rel="stylesheet" href="/style.css"></head><body><div id="root"></div></body></html>')});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await chromium.launch({headless:true});let checks=0;
try {
 for(const enrolled of [false,true]){
  const page=await browser.newPage({viewport:{width:1280,height:900}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:'+server.address().port);await page.addScriptTag({content:bundle.outputFiles[0].text});
  await page.waitForFunction(()=>window.planReadPending?.length===1);
  assert.equal(await page.getByRole('button',{name:'إنشاء الخطة الدراسية',exact:true}).isDisabled(),true);assert.equal(await page.getByTestId('student-next-action-strip').count(),0);checks++;
  if(enrolled){await page.evaluate(()=>window.planReadPending.shift().reject(new Error('503 read')));await page.getByRole('alert').waitFor();assert.equal(await page.getByRole('button',{name:'إنشاء الخطة الدراسية',exact:true}).isDisabled(),true);await page.getByRole('button',{name:'إعادة تحميل الخطط'}).click();await page.waitForFunction(()=>window.planReadPending.length===1);checks++;}
  await page.evaluate(()=>window.planReadPending.shift().resolve({studyPlans:window.saved,limit:200}));
  await page.getByTestId('student-plan-progress').waitFor();
  if(enrolled)await page.evaluate(()=>window.patch({user:{...window.fixture.user,schoolId:'school'}}));
  assert.equal(await page.getByTestId('student-plan-progress').textContent(),'33%');
  assert.match(await page.getByTestId('student-next-action-title').textContent(),/الدرس الثاني/);
  assert.equal(await page.getByTestId('student-next-action-primary').getAttribute('href'),'/course/course?learn=1&lesson=second');checks++;
  await page.evaluate(()=>window.patch({completedLessons:['first','second'],examResults:[...window.fixture.examResults,{id:'new-result',quizId:'new',date:new Date().toISOString(),skillsAnalysis:[]}]}));
  await page.waitForFunction(()=>document.querySelector('[data-testid="student-plan-progress"]').textContent==='100%');
  assert.match(await page.getByTestId('student-next-action-title').textContent(),/أنجزت/);assert.equal(await page.getByTestId('student-next-action-primary').getAttribute('href'),'/reports');checks++;
  await page.locator('summary').click();const name=page.locator('input:not([type])').first();await name.fill('اسم محفوظ بعد المحاولة');
  await page.getByRole('button',{name:'تحديث الخطة الدراسية',exact:true}).click();
  assert.equal(await page.getByRole('button',{name:'جارٍ حفظ الخطة...'}).isDisabled(),true);
  assert.equal(await page.getByText('تم تحديث الخطة الدراسية الوقتية بنجاح.').count(),0);
  assert.equal(await page.evaluate(()=>window.fixture.studyPlans[0].name),'خطة اختبار');checks++;
  await page.evaluate(()=>window.pending.shift().reject(new Error('503 fixture')));
  await page.getByText('تعذر حفظ الخطة. لم تُغيّر خطتك؛ حاول مرة أخرى.').waitFor();assert.equal(await name.inputValue(),'اسم محفوظ بعد المحاولة');
  assert.equal(await page.evaluate(()=>window.fixture.studyPlans[0].name),'خطة اختبار');checks++;
  await page.getByRole('button',{name:'تحديث الخطة الدراسية',exact:true}).click();await page.evaluate(()=>{const p=window.pending.shift();p.resolve({...window.fixture.studyPlans[0],...p.args[1],name:'اسم الخادم'});});
  await page.getByText('تم تحديث الخطة الدراسية الوقتية بنجاح.').waitFor();assert.equal(await name.inputValue(),'اسم الخادم');checks++;
  await page.getByRole('button',{name:'إعادة تعيين / إلغاء',exact:true}).click();await name.fill('خطة جديدة مستقلة');await page.getByRole('button',{name:/الرياضيات مادة داخل/}).click();
  const dates=await page.evaluate(()=>[new Date().toISOString().slice(0,10),new Date(Date.now()+7*86400000).toISOString().slice(0,10)]);await page.locator('input[type="date"]').nth(0).fill(dates[0]);await page.locator('input[type="date"]').nth(1).fill(dates[1]);const createdAfter=await page.evaluate(()=>Date.now());
  await page.getByRole('button',{name:'إنشاء الخطة الدراسية',exact:true}).click();
  await page.waitForFunction(()=>window.calls.at(-1)?.method==='createStudyPlan',null,{timeout:10000}).catch(async error=>{console.log(JSON.stringify({createForm:await page.locator('details').innerText(),lastMethod:await page.evaluate(()=>window.calls.at(-1)?.method)}));throw error});
  const payload=await page.evaluate(()=>window.calls.at(-1).args[0]);assert.ok(payload.createdAt>=createdAfter,'a new plan must not inherit the prior plan creation boundary');
  await page.evaluate(()=>{const p=window.pending.shift();window.createdPlanId=p.args[0].id;p.resolve(p.args[0])});await page.getByRole('heading',{name:'خطة جديدة مستقلة',exact:true}).waitFor();checks++;
  await page.evaluate(async()=>{const result=window.actions.deleteStudyPlan(window.createdPlanId);window.pending.shift().resolve({success:true});window.cleanupResult=await result});assert.equal(await page.evaluate(()=>window.cleanupResult),true);assert.equal(await page.evaluate(()=>window.fixture.studyPlans.length),1);checks++;
  await page.evaluate(async()=>{const before=window.fixture.studyPlans;const result=window.actions.archiveStudyPlan('plan');window.pending.shift().reject(new Error('503 archive'));window.archiveResult=await result;window.samePlans=before===window.fixture.studyPlans});
  assert.equal(await page.evaluate(()=>window.archiveResult),false);assert.equal(await page.evaluate(()=>window.samePlans),true);
  await page.evaluate(async()=>{const result=window.actions.deleteStudyPlan('plan');window.pending.shift().reject(new Error('503 delete'));window.deleteResult=await result});assert.equal(await page.evaluate(()=>window.deleteResult),false);assert.equal(await page.evaluate(()=>window.fixture.studyPlans.length),1);checks++;
  await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(errors,[]);checks++;
  await page.evaluate(async()=>{const result=window.actions.updateStudyPlan('plan',{name:'late'});const pending=window.pending.shift();window.patch({user:{id:'another'},studyPlans:[]});pending.resolve({...pending.args[1],id:'plan',userId:'learner'});window.actorResult=await result});
  assert.equal(await page.evaluate(()=>window.actorResult),false);assert.deepEqual(await page.evaluate(()=>window.fixture.studyPlans),[]);checks++;
  await page.evaluate(()=>window.patch({user:{id:'learner'}}));await page.waitForFunction(()=>!document.querySelector('[role="status"]'));
  await page.evaluate(async()=>{const result=window.actions.createStudyPlan({id:'created',userId:'learner',name:'requested'});window.pending.shift().resolve({id:'created',userId:'learner',name:'server-created'});window.createResult=await result});
  assert.equal(await page.evaluate(()=>window.createResult),true);assert.equal(await page.evaluate(()=>window.fixture.studyPlans[0].name),'server-created');checks++;
  await page.evaluate(async()=>{const before=window.fixture.studyPlans;const result=window.actions.createStudyPlan({id:'failed',userId:'learner'});window.pending.shift().reject(new Error('503 create'));window.createResult=await result;window.samePlans=before===window.fixture.studyPlans});
  assert.equal(await page.evaluate(()=>window.createResult),false);assert.equal(await page.evaluate(()=>window.samePlans),true);checks++;
  await page.close();
 }
 const switching=await browser.newPage();await switching.goto('http://127.0.0.1:'+server.address().port);await switching.addScriptTag({content:bundle.outputFiles[0].text});await switching.waitForFunction(()=>window.planReadPending?.length===1);
 await switching.evaluate(()=>window.patch({user:{id:'new-actor',role:'student'},studyPlans:[]}));await switching.waitForFunction(()=>window.planReadPending.length===2);
 await switching.evaluate(()=>window.planReadPending.shift().resolve({studyPlans:window.saved,limit:200}));assert.deepEqual(await switching.evaluate(()=>window.fixture.studyPlans),[]);checks++;
 await switching.evaluate(()=>window.planReadPending.shift().resolve({studyPlans:[],limit:200}));await switching.waitForFunction(()=>!document.querySelector('[role="status"]'));assert.equal(await switching.getByTestId('student-plan-progress').count(),0);checks++;await switching.close();
 console.log(JSON.stringify({status:'PASS',checks,actors:['independent','enrolled'],transport:'isolated actual page and slice',writes:'none'}));
} finally {await browser.close();server.close()}
