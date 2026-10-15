import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {build} from 'esbuild';
import {chromium} from 'playwright';
const bundle=await build({stdin:{resolveDir:process.cwd(),loader:'tsx',contents:`
import React from 'react';import{createRoot}from'react-dom/client';
import{api}from'./services/api';import{SchoolAssessmentReportWorkspace}from'./dashboards/admin/supervisorTests/SchoolAssessmentReportWorkspace';
window.calls=[];window.fail=false;window.failDetail=false;window.bulkReads=0;
api.getScopedQuizResults=async()=>{window.bulkReads++;throw Error('Bulk review request must not happen')};
api.schoolAssessmentReport=async()=>({coverage:{complete:false,missingEvidence:['started_attempts']},audience:{targeted:1005},participation:{completed:2,notCompleted:1003,started:null},scores:{average:40,passRate:0,highest:40,lowest:40},subjects:[],sections:[],skills:[]});
api.schoolAssessmentLearners=async(id,q)=>{window.calls.push({id,...q});if(window.fail){window.fail=false;throw Error('fixture failure')};return {learners:[{studentId:'s'+q.page,name:q.status==='not_completed'?'طالب لم يؤد':'طالب الصفحة '+q.page,result:q.status==='not_completed'?null:{id:'r'+q.page,score:40,passed:false,date:'2026-10-15',attemptNumber:2}}],pagination:{page:q.page,limit:50,total:q.status==='not_completed'?3:1005,totalPages:q.status==='not_completed'?1:21}}};
api.schoolAssessmentLearnerResult=async(id,resultId)=>{if(window.failDetail){window.failDetail=false;throw Error('detail failure')};return {result:{id:resultId,userId:'s2',score:40,totalQuestions:1,subjectResults:[{subjectId:'math',subjectName:'الرياضيات',total:1,correct:0,wrong:1,unanswered:0,score:0}],questionReview:[{questionId:'q',text:'سؤال محفوظ',options:['أ','ب'],selectedOptionIndex:1,isCorrect:false}]}}};
const root=createRoot(document.getElementById('root'));window.show=(id='q')=>root.render(<SchoolAssessmentReportWorkspace actorId='actor' quizId={id}/>);window.show();
`},bundle:true,format:'iife',platform:'browser',write:false});
const server=createServer((_,res)=>{res.setHeader('Content-Type','text/html;charset=utf-8');res.end('<html dir="rtl"><meta charset="utf-8"><main id="root"></main><script>'+bundle.outputFiles[0].text+'</script></html>');});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({headless:true,...(process.argv.includes('--chrome')?{channel:'chrome'}:{})});
try{
 const page=await browser.newPage();const url='http://127.0.0.1:'+server.address().port;
 for(const width of [390,1280]){
  await page.setViewportSize({width,height:844});await page.goto(url);
  await page.getByText('طالب الصفحة 1',{exact:true}).waitFor();await page.getByText(/1005/).first().waitFor();
  assert.equal(await page.evaluate(()=>window.bulkReads),0,'Opening the per-test workspace never loads bulk question reviews');
  await page.getByRole('button',{name:'التالي',exact:true}).click();await page.getByText('طالب الصفحة 2',{exact:true}).waitFor();
  assert.equal(await page.getByText('طالب الصفحة 1',{exact:true}).count(),0,'replace page rather than accumulating');
  await page.evaluate(()=>window.failDetail=true);await page.getByRole('button',{name:'عرض النتيجة',exact:true}).click();await page.getByRole('alert').waitFor();
  await page.getByRole('button',{name:'إعادة تحميل النتيجة',exact:true}).click();await page.getByText('سؤال محفوظ',{exact:true}).waitFor();
  await page.getByRole('region',{name:'أداؤك في مادة الرياضيات',exact:true}).waitFor();
  await page.getByLabel('حالة الأداء').selectOption('not_completed');await page.getByText('طالب لم يؤد',{exact:true}).waitFor();
  assert.equal(await page.getByText('سؤال محفوظ',{exact:true}).count(),0,'filter clears selected evidence');
  assert.equal(await page.getByRole('button',{name:'عرض النتيجة',exact:true}).count(),0);
  const last=await page.evaluate(()=>window.calls.at(-1));assert.equal(last.page,1);assert.equal(last.status,'not_completed');
  await page.getByLabel('بحث عن طالب').fill('اسم');await page.getByRole('button',{name:'بحث',exact:true}).click();
  await page.waitForFunction(()=>window.calls.at(-1).search==='اسم');
  await page.evaluate(()=>{window.fail=true;window.show('new-quiz')});await page.getByRole('alert').waitFor();
  assert.equal(await page.getByText('طالب لم يؤد',{exact:true}).count(),0,'failed new identity never exposes old roster');
  await page.getByRole('button',{name:'إعادة المحاولة',exact:true}).click();await page.getByText('طالب الصفحة 1',{exact:true}).waitFor();
 }
 console.log('PASS school learner UI390/1280:page replacement,authoritative counts,filters/search,selected frozen review,retry and no stale identity data');
}finally{await browser.close();await new Promise(r=>server.close(r));}
