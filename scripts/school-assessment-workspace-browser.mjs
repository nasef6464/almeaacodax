import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {build} from 'esbuild';
import {chromium} from 'playwright';

/** Real components + real API client URLs + loopback fixture API, no mocked responses. */
export async function certifySchoolAssessmentWorkspaceBrowser({base,quizId,tokens,cookie,csrfToken,chrome=false}){
 const target=new URL(base);
 assert.equal(target.hostname,'127.0.0.1');assert.equal(target.protocol,'http:');
 const audit=[];
 const bundle=await build({stdin:{resolveDir:process.cwd(),loader:'tsx',contents:`
import React from'react';import{createRoot}from'react-dom/client';
import{api}from'./services/api';import{createSchoolAssessmentsApi}from'./services/apiGroups/schoolAssessmentsApi';
import{SchoolAssessmentComposePanel}from'./dashboards/admin/supervisorTests/SchoolAssessmentComposePanel';
import{SchoolAssessmentReportWorkspace}from'./dashboards/admin/supervisorTests/SchoolAssessmentReportWorkspace';
import{QuizSubjectResults}from'./components/quiz/QuizSubjectResults';
const params=new URLSearchParams(location.search),mode=params.get('mode')||'report';
const actor=mode==='student'?'student':mode==='outsider'?'outsider':'supervisor';
const request=async(path,options={})=>{const response=await fetch('/api'+path,{method:options.method||'GET',headers:{'content-type':'application/json','x-test-actor':actor},...(options.body?{body:JSON.stringify(options.body)}:{})});const data=await response.json();if(!response.ok)throw Error(data.message||String(response.status));return data};
Object.assign(api,createSchoolAssessmentsApi(request));
function Student(){const[result,setResult]=React.useState(null);React.useEffect(()=>{request('/quiz-results/my?quizId='+encodeURIComponent(${JSON.stringify(quizId)})+'&limit=10').then(data=>setResult((data.results||data.data||[])[0]));},[]);return result?<><h2>الدرجة الإجمالية {result.score}٪</h2><QuizSubjectResults result={result}/></>:<p role='status'>جارٍ التحميل</p>}
function Compose(){const[draft,setDraft]=React.useState(null);return <><SchoolAssessmentComposePanel paths={[{id:'subject-path',name:'المسار متعدد المواد'}]} subjects={[{id:'math',name:'الرياضيات',pathId:'subject-path'},{id:'science',name:'العلوم',pathId:'subject-path'}]} skills={[]} onClose={()=>{}} onReview={setDraft}/>{draft&&<p role='status'>أسئلة المسودة: {draft.questionIds.length}</p>}</>}
createRoot(document.getElementById('root')).render(mode==='compose'?<Compose/>:mode==='student'?<Student/>:<SchoolAssessmentReportWorkspace quizId={${JSON.stringify(quizId)}} actorId={actor}/>);
`},bundle:true,format:'iife',platform:'browser',write:false,define:{'import.meta.env':'{}'}});
 const frontend=createServer(async(req,res)=>{
  try{
   if(req.url.startsWith('/api/')){
    const actor=String(req.headers['x-test-actor']||'');
    if(!Object.hasOwn(tokens,actor)){res.writeHead(403);res.end('{}');return;}
    let body='';for await(const chunk of req)body+=chunk;
    const path=req.url.slice(4);
    const response=await fetch(base+path,{method:req.method,headers:{'content-type':'application/json',authorization:'Bearer '+tokens[actor],cookie,'x-csrf-token':csrfToken},...(body?{body}:{}),signal:AbortSignal.timeout(30000)});
    audit.push({actor,path,method:req.method,status:response.status});
    res.writeHead(response.status,{'content-type':'application/json','cache-control':'no-store'});res.end(await response.text());return;
   }
   res.writeHead(200,{'content-type':'text/html;charset=utf-8'});res.end('<html dir="rtl"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><main id="root"></main><script>'+bundle.outputFiles[0].text+'</script></html>');
  }catch{res.writeHead(500,{'content-type':'application/json'});res.end('{"message":"Isolated proxy failed"}');}
 });
 await new Promise(r=>frontend.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({headless:true,...(chrome?{channel:'chrome'}:{})});
 try{
  const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const url='http://127.0.0.1:'+frontend.address().port;
  for(const width of [390,1280]){
   await page.setViewportSize({width,height:844});
   await page.goto(url+'/?mode=compose');await page.getByLabel('نوع الاختبار').selectOption('mock');
   await page.getByRole('checkbox',{name:'الرياضيات',exact:true}).check();await page.getByLabel('عدد أسئلة الرياضيات').fill('3');
   await page.getByRole('checkbox',{name:'العلوم',exact:true}).check();await page.getByLabel('عدد أسئلة العلوم').fill('2');
   await page.getByRole('button',{name:'معاينة من البنك',exact:true}).click();
   await page.getByText('الرياضيات: المطلوب 3، المتاح 3، المختار 3',{exact:true}).waitFor();
   await page.getByText('العلوم: المطلوب 2، المتاح 2، المختار 2',{exact:true}).waitFor();
   await page.getByRole('button',{name:'مراجعة الأسئلة وتحديد الطلاب',exact:true}).click();await page.getByText('أسئلة المسودة: 5',{exact:true}).waitFor();
   const before=audit.length;
   await page.goto(url+'/?mode=report');await page.getByText('student',{exact:true}).waitFor();await page.getByText('absent',{exact:true}).waitFor();
   await page.getByRole('region',{name:'تحليل مادة الرياضيات',exact:true}).waitFor();
   assert.ok(!audit.slice(before).some(r=>r.path.includes('/results/scoped')||r.path.includes('/results/')),'Opening analytics has no bulk or selected question reviews');
   await page.getByRole('button',{name:'عرض النتيجة',exact:true}).click();
   await page.getByRole('region',{name:'تفاصيل نتيجة الطالب',exact:true}).getByText('سؤال 0',{exact:true}).waitFor();
   assert.ok(audit.slice(before).some(r=>r.path.includes('/school-assessments/'+quizId+'/results/')&&r.status===200));
   await page.getByLabel('حالة الأداء').selectOption('not_completed');await page.getByText('absent',{exact:true}).waitFor();assert.equal(await page.getByText('student',{exact:true}).count(),0);
   await page.getByLabel('حالة الأداء').selectOption('needs_support');await page.getByText('student',{exact:true}).waitFor();assert.equal(await page.getByText('absent',{exact:true}).count(),0);
   await page.goto(url+'/?mode=student');await page.getByRole('heading',{name:'الدرجة الإجمالية 40٪',exact:true}).waitFor();
   assert.ok((await page.getByRole('region',{name:'أداؤك في مادة الرياضيات',exact:true}).innerText()).includes('33٪'));
   assert.ok((await page.getByRole('region',{name:'أداؤك في مادة العلوم',exact:true}).innerText()).includes('50٪'));
   await page.goto(url+'/?mode=outsider');await page.getByRole('alert').first().waitFor();assert.equal(await page.getByText('student',{exact:true}).count(),0);
   assert.ok(audit.some(r=>r.actor==='outsider'&&r.path.endsWith('/report')&&r.status===404));
  }
  assert.deepEqual(errors,[]);
  console.log('PASS real school workspace browser390/1280: actual bank composition,client URLs,full report/roster,selected frozen review,status filters,student40/material33+50,foreign refusal and0bulk reviews');
 }finally{await browser.close();await new Promise(r=>frontend.close(r));}
}
