import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createServer} from 'node:http';
import {build} from 'esbuild';
import {chromium} from 'playwright';
import postcss from 'postcss';
import tailwindcss from 'tailwindcss';
import config from '../tailwind.config.cjs';
const executable=process.argv.find(a=>a.startsWith('--executable='))?.slice(13);
const bundle=await build({stdin:{resolveDir:process.cwd(),loader:'tsx',contents:`
 import React from 'react';import{createRoot}from'react-dom/client';
 import{SchoolAssessmentReportWorkspace}from'./dashboards/admin/supervisorTests/SchoolAssessmentReportWorkspace';
 import{SchoolTeacherAssessments}from'./dashboards/school-teacher/SchoolTeacherSecondaryTabs';
 const root=createRoot(document.getElementById('root'));window.mode='workspace';
 window.show=(mode='workspace',schoolId='school',quizId='quiz')=>root.render(mode==='teacher'?<SchoolTeacherAssessments selectedSchool={{schoolId,assessments:[{assessmentId:quizId,title:'اختبار المدرسة',subjectId:'math',classIds:['class'],isPublished:true,ownedByTeacher:true}]}} onCreateAssessment={()=>{}}/>:<SchoolAssessmentReportWorkspace actorId='actor' schoolId={schoolId} quizId={quizId}/>);window.show();
`},bundle:true,write:false,loader:{'.css':'empty'},plugins:[{name:'fixture',setup(b){
 b.onResolve({filter:/store\/useStore$/},()=>({path:'store',namespace:'fixture'}));
 b.onResolve({filter:/services\/api$/},()=>({path:'api',namespace:'fixture'}));
 b.onLoad({filter:/.*/,namespace:'fixture'},({path})=>({loader:'js',contents:path==='store'?`const state={user:{id:'actor',role:'teacher'},subjects:[{id:'math',name:'الرياضيات'}],skills:[],nestedSkills:[]};export const useStore=f=>f?f(state):state;useStore.getState=()=>state;`:`
 window.calls=[];window.fail=false;
 const dim=(id,label)=>({id,label,learners:2,questions:10,correct:5,average:50});
 const math=dim('math','الرياضيات'),science=dim('science','العلوم');
 const report={coverage:{complete:false,missingEvidence:['started_attempts'],subjects:{completed:3,withEvidence:2,complete:false}},audience:{targeted:4},participation:{completed:3,notCompleted:1,started:null},scores:{average:60,passRate:50,highest:90,lowest:20},subjects:[math,science],sections:[],skills:[],subjectBreakdowns:[{...math,sections:[dim('same','قسم مختلط')],skills:[dim('m','مهارة الحساب')]},{...science,sections:[dim('same','قسم مختلط')],skills:[dim('s','مهارة الذرات')]}]};
 const learners=[{studentId:'passed',name:'اجتاز حسب الإعداد',result:{id:'r1',score:65,passed:true}},{studentId:'failed',name:'لم يجتز حسب الإعداد',result:{id:'r2',score:90,passed:false}},{studentId:'unknown',name:'حكم غير محفوظ',result:{id:'r3',score:20}},{studentId:'absent',name:'بدون تسليم',result:null}];
 export const api={schoolAssessmentReport:async(id,schoolId)=>{window.calls.push({kind:'report',id,schoolId});await new Promise(r=>setTimeout(r,20));if(window.fail){window.fail=false;throw Error('unavailable')}return id==='legacy'?{...report,subjects:[],subjectBreakdowns:[],sections:[],skills:[{...dim('old','مهارة قديمة محفوظة'),subjectId:'math'}]}:report},schoolAssessmentLearners:async(id,q,schoolId)=>{window.calls.push({kind:'learners',id,schoolId,...q});const rows=q.status==='needs_support'?learners.filter(x=>x.result?.passed===false):q.status==='not_completed'?learners.filter(x=>!x.result):learners;return{learners:rows,pagination:{page:q.page,limit:q.limit,total:rows.length,totalPages:1}}}};
 `}));
}}]});
const css=(await postcss([tailwindcss({...config,content:['./dashboards/admin/supervisorTests/SchoolAssessment*.tsx','./dashboards/school-teacher/SchoolTeacherSecondaryTabs.tsx','./components/DashboardDialog.tsx','./components/DisplayListControls.tsx']})]).process('@tailwind base;@tailwind components;@tailwind utilities;',{from:undefined})).css;
const server=createServer((_,res)=>{res.setHeader('content-type','text/html;charset=utf-8');res.end('<meta name="viewport" content="width=device-width,initial-scale=1"><style>'+css+'</style><div id="root" dir="rtl"></div><script>'+bundle.outputFiles[0].text+'</script>')});
await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
try{
 browser=await chromium.launch(executable?{executablePath:executable}:{});
 for(const width of[390,1280]){
  const page=await browser.newPage({viewport:{width,height:900}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:'+server.address().port);
  await page.getByRole('tab',{name:'الملخص',exact:true}).waitFor();await page.getByText('المستهدفون',{exact:true}).waitFor();
  assert.equal(await page.evaluate(()=>window.calls.filter(x=>x.kind==='learners').length),0,'Summary does not fetch student names');
  await page.getByRole('button',{name:'من يحتاج دعمًا في هذا الاختبار؟',exact:true}).click();
  await page.getByText('لم يجتز حسب الإعداد',{exact:true}).waitFor();
  assert.equal(await page.getByText('اجتاز حسب الإعداد',{exact:true}).count(),0);
  let last=await page.evaluate(()=>window.calls.at(-1));assert.equal(last.status,'needs_support');assert.equal(last.limit,12);assert.equal(last.schoolId,'school');
  await page.getByLabel('حالة الأداء',{exact:true}).selectOption('all');await page.getByText('اجتاز حسب الإعداد',{exact:true}).waitFor();
  const passed=page.getByRole('row').filter({hasText:'اجتاز حسب الإعداد'}).filter({hasNotText:'لم يجتز'});assert.ok(!(await passed.innerText()).includes('يحتاج دعمًا'),'Stored pass must override a hard-coded score threshold');
  const unknown=page.getByRole('row').filter({hasText:'حكم غير محفوظ'});assert.ok(!(await unknown.innerText()).includes('يحتاج دعمًا'));
  await page.getByRole('tab',{name:'المواد والمهارات',exact:true}).click();
  await page.getByText('اختر المادة لعرض تحليلها.',{exact:true}).waitFor();assert.equal(await page.getByText('مهارة الحساب',{exact:true}).count(),0);
  await page.getByRole('button',{name:'الرياضيات',exact:true}).click();await page.getByText('مهارة الحساب',{exact:true}).waitFor();await page.getByText(/متوسط درجة المادة/).waitFor();assert.equal(await page.getByText('مهارة الذرات',{exact:true}).count(),0);
  await page.getByRole('button',{name:'العلوم',exact:true}).click();await page.getByText('مهارة الذرات',{exact:true}).waitFor();assert.equal(await page.getByText('مهارة الحساب',{exact:true}).count(),0);
  assert.equal(await page.evaluate(()=>window.calls.filter(x=>x.kind==='report').length),1,'Tab/material switches reuse the loaded summary');
  await page.getByRole('tab',{name:'الملخص',exact:true}).focus();await page.keyboard.press('ArrowLeft');assert.equal(await page.getByRole('tab',{name:'الطلاب',exact:true}).getAttribute('aria-selected'),'true');
  await page.evaluate(()=>{window.fail=true;window.show('workspace','second-school','second-quiz')});await page.getByRole('alert').waitFor();assert.equal(await page.getByText('اجتاز حسب الإعداد',{exact:true}).count(),0,'New school/quiz does not expose old roster');
  await page.getByRole('button',{name:'إعادة المحاولة',exact:true}).click();await page.getByText('المستهدفون',{exact:true}).waitFor();
  await page.evaluate(()=>window.show('teacher','second-school','teacher-quiz'));await page.getByRole('button',{name:'النتائج والتحليل',exact:true}).click();
  const dialog=page.getByRole('dialog',{name:'متابعة اختبار المدرسة',exact:true});await dialog.waitFor();await dialog.getByRole('tab',{name:'الطلاب',exact:true}).click();await dialog.getByText('اجتاز حسب الإعداد',{exact:true}).waitFor();
  assert.equal(await page.evaluate(()=>window.calls.at(-1).schoolId),undefined);assert.equal(await page.evaluate(()=>window.calls.at(-1).id),'teacher-quiz');assert.equal(await dialog.getByRole('button',{name:/تذكير/}).count(),0,'Teacher report entry grants no management action');
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'No page overflow');
  fs.mkdirSync('scratch/school-assessment-clear-ui',{recursive:true});await page.screenshot({path:'scratch/school-assessment-clear-ui/'+width+'.png'});
  await page.keyboard.press('Escape');await dialog.waitFor({state:'hidden'});
  await page.evaluate(()=>window.show('workspace','school','legacy'));await page.getByText('المستهدفون',{exact:true}).waitFor();await page.getByRole('tab',{name:'المواد والمهارات',exact:true}).click();await page.getByText('مهارة قديمة محفوظة',{exact:true}).waitFor();await page.getByText('إجمالي المادة غير متاح؛ تُعرض تفاصيل الأدلة المحفوظة فقط.',{exact:true}).waitFor();
  assert.deepEqual(errors,[]);await page.close();
 }
 console.log('PASS clear report390/1280:lazy names,scoped requests,canonical support,material isolation,cached summary,keyboard,retry/scope reset,and teacher report entry.');
}finally{await browser?.close();await new Promise(r=>server.close(r));}
