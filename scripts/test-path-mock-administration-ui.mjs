import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {createServer} from 'node:http';
import {chromium} from 'playwright';
const bundle=await build({stdin:{resolveDir:process.cwd(),loader:'tsx',contents:`
import React from 'react';import{createRoot}from'react-dom/client';import{MockExamManager}from'./dashboards/admin/MockExamManager';
createRoot(document.getElementById('root')).render(<MockExamManager pathId="future"/>);
`},bundle:true,write:false,format:'iife',plugins:[{name:'fixture',setup(b){
b.onResolve({filter:/UnifiedQuestionBuilder$/},()=>({path:'builder',namespace:'fixture'}));
b.onResolve({filter:/SmartQuestionSelector$/},()=>({path:'selector',namespace:'fixture'}));
b.onResolve({filter:/store\/useStore$/},()=>({path:'store',namespace:'fixture'}));
b.onResolve({filter:/questionBankSource$/},()=>({path:'bank',namespace:'fixture'}));
b.onLoad({filter:/.*/,namespace:'fixture'},({path})=>({loader:'tsx',contents:path==='builder'?'export const UnifiedQuestionBuilder=()=>null;':path==='selector'?'export const SmartQuestionSelector=()=>null;':path==='bank'?`export const EXAM_QUESTION_BANK_EMPTY_MESSAGE='empty';export const useExamQuestionBank=()=>({questions:[],total:0,isLoading:false,refresh:async()=>{}});`:`
window.writes=[];const state={paths:[{id:'other',name:'مسار آخر'},{id:'future',name:'مسار مستقبلي'}],subjects:[{id:'s',pathId:'future',name:'مادة'}],sections:[],skills:[],groups:[],quizzes:[{id:'own',title:'محاكي المسار',pathId:'future',quizKind:'mock',mockExam:{enabled:true,pathId:'future',sections:[]},access:{type:'free'},isPublished:true,showOnPlatform:true},{id:'foreign',title:'محاكي مسار آخر',pathId:'other',quizKind:'mock',mockExam:{enabled:true,pathId:'other',sections:[]},access:{type:'free'}}],addQuiz:async q=>window.writes.push(q),updateQuiz:async(id,q)=>window.writes.push({id,...q}),deleteQuiz:async()=>{},addQuestion:async()=>{}};export const useStore=()=>state;useStore.getState=()=>state;` }));
}}]});
const server=createServer((_,r)=>{r.setHeader('Content-Type','text/html;charset=utf-8');r.end('<html dir="rtl"><meta name="viewport" content="width=device-width,initial-scale=1"><main id="root"></main><script>'+bundle.outputFiles[0].text+'</script></html>');});await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({headless:true,channel:process.argv.includes('--chrome')?'chrome':undefined});
try{const page=await browser.newPage();await page.goto('http://127.0.0.1:'+server.address().port);await page.getByText('محاكي المسار',{exact:true}).waitFor();assert.equal(await page.getByText('محاكي مسار آخر',{exact:true}).count(),0);
await page.getByLabel('إتاحة الاختبار',{exact:true}).selectOption('paid');await page.getByRole('button',{name:'حفظ مسودة',exact:true}).click();const draft=await page.evaluate(()=>window.writes.at(-1));assert.equal(draft.pathId,'future');assert.equal(draft.isPublished,false);assert.equal(draft.questionIds.length,0);assert.equal(draft.access.type,'paid');assert.equal(await page.getByRole('button',{name:'اختبار عادي موجه',exact:false}).count(),0);
await page.getByRole('button',{name:'إخفاء الاختبار',exact:true}).click();const hide=await page.evaluate(()=>window.writes.at(-1));assert.equal(hide.id,'own');assert.equal(hide.isPublished,false);
console.log('PASS path-scoped mocks: future path isolation, empty private draft, withdrawal command');
}finally{await browser.close();await new Promise(r=>server.close(r));}
