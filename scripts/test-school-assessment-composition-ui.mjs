import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {build} from 'esbuild';
import {chromium} from 'playwright';
const bundle=await build({stdin:{resolveDir:process.cwd(),loader:'tsx',contents:`
import React from 'react';import{createRoot}from'react-dom/client';
import{SchoolAssessmentComposePanel}from'./dashboards/admin/supervisorTests/SchoolAssessmentComposePanel';
import{UnifiedQuizBuilder}from'./dashboards/admin/UnifiedQuizBuilder';
import{useStore}from'./store/useStore';import{api}from'./services/api';
const root=createRoot(document.getElementById('root'));
const paths=[{id:'p',name:'مسار'}],subjects=[{id:'math',pathId:'p',name:'رياضيات'},{id:'chem',pathId:'p',name:'كيمياء'}];
window.shortage=true;window.fail=false;window.reviewed=null;window.saved=null;window.fetched=[];
api.getQuestions=async filters=>{window.fetched.push(filters.ids);return filters.ids.split(',').map(id=>({id,text:'سؤال للمراجعة',options:['أ','ب']}));};
useStore.setState({paths,subjects,groups:[{id:'class',name:'الفصل',type:'CLASS',studentIds:[]}],questions:[],
addQuiz:async payload=>{window.saved={kind:'add',payload};return{...payload,id:'fresh'};},updateQuiz:async()=>{throw Error('must create a new assessment');}});
window.showBuilder=draft=>root.render(<UnifiedQuizBuilder key={draft.quizKind} role="supervisor" initialDefinition={draft} initialStep={4} allowedGroupIds={['class']}/>);
root.render(<SchoolAssessmentComposePanel paths={paths} subjects={subjects} skills={[]} onClose={()=>{}} onReview={draft=>window.reviewed=draft}
compose={async spec=>{if(window.fail)throw Error('تعذر الاتصال');const coverage=spec.subjectSpecs.map(s=>({subjectId:s.subjectId,requested:s.count,available:window.shortage?1:s.count,selected:window.shortage?1:s.count,skillIds:s.skillIds}));
const sections=coverage.map((s,i)=>({id:'sec'+i,title:subjects.find(v=>v.id===s.subjectId).name,subjectId:s.subjectId,questionIds:Array.from({length:s.selected},(_,j)=>s.subjectId+'-'+j),order:i}));
return{draft:{title:'اختبار مقترح',quizKind:spec.kind==='mock'?'mock':'test',pathId:'p',subjectId:spec.subjectSpecs[0].subjectId,questionIds:sections.flatMap(s=>s.questionIds),isPublished:false,showOnPlatform:false,mode:'central',targetGroupIds:[],...(spec.kind==='mock'?{mockExam:{enabled:true,sections,presentationMode:'flexible'}}:{})},coverage,warnings:window.shortage?['عدد الأسئلة المطابقة غير كافٍ']:[]};}}/>);
`},bundle:true,format:'iife',platform:'browser',write:false});
const server=createServer((_,res)=>{res.setHeader('Content-Type','text/html;charset=utf-8');res.end('<main dir="rtl" id="root"></main><script>'+bundle.outputFiles[0].text+'</script>');});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await chromium.launch({headless:true,...(process.argv.includes('--chrome')?{channel:'chrome'}:{})});
try{
  const page=await browser.newPage({viewport:{width:390,height:844}});
  await page.goto('http://127.0.0.1:'+server.address().port);
  await page.getByLabel('رياضيات',{exact:true}).check();
  await page.getByLabel('عدد أسئلة رياضيات',{exact:true}).fill('2');
  await page.getByRole('button',{name:'معاينة من البنك',exact:true}).click();
  await page.getByText('عدد الأسئلة المطابقة غير كافٍ',{exact:true}).waitFor();
  assert.equal(await page.getByRole('button',{name:'مراجعة الأسئلة وتحديد الطلاب'}).isDisabled(),true);
  await page.getByLabel('عدد أسئلة رياضيات',{exact:true}).fill('1');
  assert.equal(await page.getByText('معاينة التوزيع',{exact:true}).count(),0);
  await page.evaluate(()=>{window.fail=true;window.shortage=false;});
  await page.getByRole('button',{name:'معاينة من البنك',exact:true}).click();
  await page.getByRole('alert').filter({hasText:'تعذر الاتصال'}).waitFor();
  await page.evaluate(()=>{window.fail=false;});
  await page.getByRole('button',{name:'معاينة من البنك',exact:true}).click();
  await page.getByText('معاينة التوزيع',{exact:true}).waitFor();assert.equal(await page.getByRole('alert').count(),0);
  await page.getByLabel('نوع الاختبار',{exact:true}).selectOption('mock');
  await page.getByLabel('كيمياء',{exact:true}).check();
  await page.getByLabel('عدد أسئلة كيمياء',{exact:true}).fill('1');
  await page.getByRole('button',{name:'معاينة من البنك',exact:true}).click();
  await page.getByRole('button',{name:'مراجعة الأسئلة وتحديد الطلاب'}).click();
  assert.equal(await page.evaluate(()=>window.reviewed.mockExam.sections.length),2);
  await page.evaluate(()=>window.showBuilder(window.reviewed));
  await page.getByTestId('assessment-builder').waitFor();
  await page.waitForFunction(()=>window.fetched.length>0,undefined,{timeout:5000});
  await page.getByTestId('assessment-builder-target-group-class').check();
  await page.getByTestId('assessment-builder-save').click();
  await page.waitForFunction(()=>window.saved!==null);
  const saved=await page.evaluate(()=>window.saved);
  assert.equal(saved.kind,'add');assert.equal(saved.payload.id,undefined);
  assert.equal(saved.payload.isPublished,false);assert.equal(saved.payload.mockExam.sections.length,2);
  assert.deepEqual(saved.payload.targetGroupIds,['class']);
  console.log('PASS composition mobile UI: shortage blocks save,changed filters clear preview,error retry,mock review hydrates questions and creates a new unpublished assessment');
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
