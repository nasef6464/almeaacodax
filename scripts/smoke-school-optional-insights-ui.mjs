import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {build} from 'esbuild';
import {chromium} from 'playwright';
import {readFileSync,readdirSync} from 'node:fs';

const caller = readFileSync('dashboards/admin/SupervisorDashboard.tsx','utf8');
assert.match(caller, /<ClassSkillsMapPanel\s+pathId=\{skillPathFilter\}\s+subjectId=\{skillSubjectFilter\}/);
const consoleSource = readFileSync('components/classroom/ClassroomActiveSessionPanel.tsx','utf8');
assert.match(consoleSource, /isTeacher && <ClassroomOptionalPulse canPrepareSupport=\{data\?\.status === 'live'\}/);
const bundle = await build({stdin:{resolveDir:process.cwd(),loader:'tsx',contents:`
import React from 'react';import {createRoot} from 'react-dom/client';
import {ClassSkillsMapPanel} from './dashboards/admin/ClassSkillsMapPanel';
import {ClassReportPanel} from './dashboards/admin/ClassReportPanel';
import {SupervisorFollowUpPriorities} from './dashboards/admin/SupervisorFollowUpPriorities';
import {SchoolExecutiveSummary} from './dashboards/SchoolExecutiveSummary';
import {ClassroomOptionalPulse} from './components/classroom/ClassroomOptionalPulse';
import {buildClassSkillMatrix} from './utils/classSkillMatrix';
const entry=(mastery,subjectId='math',skillId='same')=>({skill:'النسبة',mastery,subjectId,skillId,pathId:'p'});
const students=[{id:'a',name:'طالب أ',schoolName:'مدرسة 1',className:'أ',classId:'c1',average:20,attempts:1,status:'danger',weakSkills:['النسبة'],resultsList:[{skillsAnalysis:[entry(20),entry(100,'chem'),...Array.from({length:13},(_,i)=>({...entry(95,'math','s'+i),skill:'مهارة '+i}))]}]},{id:'b',name:'طالب ب',schoolName:'مدرسة 2',className:'أ',classId:'c2',average:80,attempts:1,status:'good',weakSkills:[],resultsList:[{skillsAnalysis:[entry(80)]}]},{id:'c',name:'لم يختبر',schoolName:'مدرسة 1',className:'أ',classId:'c1',average:0,attempts:0,status:'danger',weakSkills:[],resultsList:[]}];
window.calls=[];window.matrix=filters=>{const m=buildClassSkillMatrix(students,filters);return m.skillColumns.map(s=>({subject:s.subjectId,key:s.key,avg:s.avg,count:s.count,measured:s.measuredStudents}))};
const root=createRoot(document.getElementById('root'));
function Fixture({mode='matrix',pathId='all',subjectId='all',sessionId='one',canPrepareSupport=true}){return <main dir='rtl'>{mode==='matrix'?<ClassSkillsMapPanel students={students} groupSnapshots={[]} pathId={pathId} subjectId={subjectId} scopeLabels={{math:'رياضيات',chem:'كيمياء'}} onSelectStudent={id=>window.calls.push(id)}/>:mode==='priority'?<SupervisorFollowUpPriorities students={students} scopeLabels={{math:'رياضيات'}} onOpenSkill={(p,s)=>window.calls.push([p,s])} onOpenUnmeasured={()=>window.calls.push('unmeasured')} onOpenTests={()=>window.calls.push('tests')}/>:mode==='report'?<ClassReportPanel students={students} groupSnapshots={[]} overallAverage={50} onSelectStudent={()=>{}} onPrint={()=>{}} onExportCSV={()=>{}}/>:mode==='director'?<SchoolExecutiveSummary report={{bounds:{sessionLimit:200,resultLimit:2000},schoolPerformance:{smartClassroom:{sessions:2,responses:10,accuracy:20,skillHeatmap:[{skillId:'same',accuracy:20,evidenceCount:10}],trend:[{day:'2026-10-09',responses:5,accuracy:10},{day:'2026-10-10',responses:5,accuracy:30}]},officialAssessments:{attempts:8,averageScore:0,skills:[{skillId:'same',accuracy:50,evidenceCount:2}]}},platformSelfStudy:{attempts:999}}} skillNames={{same:'النسبة'}}/>:<ClassroomOptionalPulse canPrepareSupport={canPrepareSupport} sessionId={sessionId} questions={[{questionId:'q1',index:0,responseCount:10,correctCount:2,skillIds:['same']},{questionId:'q2',index:1,responseCount:10,correctCount:8,skillIds:['other']},{questionId:'active',index:2,responseCount:100,correctCount:0,skillIds:['secret']}]} batches={[{batchId:'b1',label:'دفعة مكتملة',endedAt:'2026-10-10',questionIds:['q1','q2']},{batchId:'b2',label:'دفعة جارية',questionIds:['active']}]} skillNames={{same:'النسبة',other:'الجمع',secret:'مهارة جارية'}} onPrepareSupport={id=>window.calls.push(id)}/>}</main>}
window.renderFixture=props=>root.render(<Fixture {...props}/>);window.renderFixture({});
`},bundle:true,write:false});
const server=createServer((req,res)=>{
  if(req.url==='/fixture.js'){res.setHeader('Content-Type','text/javascript');res.end(bundle.outputFiles[0].text);}
  else if(req.url==='/style.css'){res.setHeader('Content-Type','text/css');const f=readdirSync('dist/assets').find(n=>/^index-.*\.css$/.test(n));res.end(readFileSync('dist/assets/'+f));}
  else res.end('<html><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/style.css"></head><body><div id="root"></div><script src="/fixture.js"></script></body></html>');
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch();const errors=[];
try {
  const page=await browser.newPage({viewport:{width:1280,height:900}});page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:'+server.address().port);
  const render=async props=>{await page.evaluate(props=>window.renderFixture(props),props);await page.waitForTimeout(100);};
  const matrix=await page.evaluate(()=>window.matrix({}));
  assert.equal(matrix.length,15);assert.equal(matrix.find(s=>s.subject==='chem').avg,100);assert.equal(matrix.find(s=>s.subject==='math'&&s.count===2).avg,50);
  assert.equal(new Set(matrix.map(s=>s.key)).size,15);
  assert.equal((await page.evaluate(()=>window.matrix({subjectId:'math'}))).length,14);
  assert.equal((await page.evaluate(()=>window.matrix({pathId:'missing'}))).length,0);
  assert.equal(await page.locator('thead th').count(),14);
  await page.getByRole('button',{name:'المهارات التالية',exact:true}).click();assert.equal(await page.locator('thead th').count(),5);
  await render({mode:'matrix',pathId:'p',subjectId:'chem'});assert.equal(await page.locator('thead th').count(),3);assert.ok((await page.locator('thead').innerText()).includes('100%'));
  await render({mode:'matrix',pathId:'p',subjectId:'math'});await page.getByRole('combobox').selectOption('c1');assert.equal(await page.locator('tbody tr').count(),2);assert.ok((await page.locator('thead').innerText()).includes('20%'));
  assert.ok(!(await page.locator('tbody').innerText()).includes('طالب ب'));await page.locator('tbody tr').first().click();assert.equal((await page.evaluate(()=>window.calls)).at(-1),'a');
  await render({mode:'priority'});const priority=page.getByRole('region',{name:'أولوية المتابعة'});assert.match(await priority.innerText(),/1 لم يبدأوا القياس/);assert.match(await priority.innerText(),/1 طالبًا يحتاجون دعمًا/);
  await priority.getByRole('button',{name:'افتح المهارة والفصول'}).click();assert.deepEqual((await page.evaluate(()=>window.calls)).at(-1),['p','math']);await priority.getByRole('button',{name:'عرض من لم يبدأ القياس'}).click();assert.equal((await page.evaluate(()=>window.calls)).at(-1),'unmeasured');
  await render({mode:'report'});const urgent=page.getByRole('heading',{name:/قائمة التدخل العاجل/}).locator('..');assert.equal(await urgent.locator('tbody tr').count(),1);assert.ok(!(await urgent.innerText()).includes('لم يختبر'));
  await render({mode:'pulse'});assert.equal(await page.getByText('دفعة مكتملة',{exact:false}).count(),0);await page.getByRole('button',{name:'عرض نبض الفصل (اختياري)',exact:true}).click();assert.match(await page.locator('main').innerText(),/20 إجابة • دقة 50%/);assert.ok(!(await page.locator('main').innerText()).includes('مهارة جارية'));assert.match(await page.locator('main').innerText(),/8 إجابة خاطئة من 10/);
  await page.getByRole('button',{name:'تجهيز دفعة دعم لهذه المهارة'}).click();assert.equal((await page.evaluate(()=>window.calls)).at(-1),'same');await render({mode:'pulse',sessionId:'two'});assert.equal(await page.getByRole('button',{name:'عرض نبض الفصل (اختياري)',exact:true}).getAttribute('aria-expanded'),'false');
  await render({mode:'pulse',sessionId:'two',canPrepareSupport:false});await page.getByRole('button',{name:'عرض نبض الفصل (اختياري)',exact:true}).click();assert.equal(await page.getByRole('button',{name:'تجهيز دفعة دعم لهذه المهارة'}).count(),0);
  await render({mode:'director'});assert.ok(!(await page.locator('main').innerText()).includes('999'));assert.match(await page.locator('main').innerText(),/8 محاولة • متوسط الدرجة 0%/);assert.match(await page.locator('main').innerText(),/نسبة القياسات التي بلغت 60%/);
  for(const mode of ['matrix','priority','pulse','director']){await render({mode});for(const width of [1280,390]){await page.setViewportSize({width,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,mode+' overflow');}}
  assert.deepEqual(errors,[]);console.log('PASS optional school insights: cross-subject identity, known scores, path/subject/class filters,15 skill columns reachable, callbacks, unmeasured exclusion, closed-batch opt-in/no active leaks/session reset, separate director sources,1280/390 overflow, zero page errors.');
} finally {await browser.close();server.close();}
