import assert from 'node:assert/strict';import {build} from 'esbuild';import {createServer} from 'node:http';import {chromium} from 'playwright';
const arg=name=>process.argv.find(value=>value.startsWith('--'+name+'='))?.slice(name.length+3);
const bundle=await build({stdin:{resolveDir:process.cwd(),loader:'tsx',contents:`
import React from 'react';import {createRoot} from 'react-dom/client';
import {SkillsTreeManager} from './dashboards/admin/SkillsTreeManager';
import {SchoolTeacherAssessments} from './dashboards/school-teacher/SchoolTeacherSecondaryTabs';
window.reads=[];
createRoot(document.getElementById('root')).render(<><SkillsTreeManager subjectId={location.search.includes('pinned')?'math':undefined}/><SchoolTeacherAssessments selectedSchool={{assessments:[{assessmentId:'quiz',title:'اختبار المدرسة',subjectId:'math',classIds:['class'],quizKind:'test'}]}} onCreateAssessment={()=>{}}/></>);
`},bundle:true,write:false,loader:{'.css':'empty'},define:{'import.meta.env':'{}'},logOverride:{'empty-import-meta':'silent'},plugins:[{name:'isolated-staff',setup(b){
 b.onResolve({filter:/store\/useStore$/},()=>({path:'store',namespace:'fixture'}));b.onResolve({filter:/services\/api$/},()=>({path:'api',namespace:'fixture'}));
 b.onLoad({filter:/.*/,namespace:'fixture'},a=>({resolveDir:process.cwd(),loader:'js',contents:a.path==='store'?`const state={user:{role:new URLSearchParams(location.search).get('role')||'teacher'},paths:[{id:'path',name:'المسار'}],subjects:[{id:'math',pathId:'path',name:'الرياضيات'},{id:'verbal',pathId:'path',name:'العربية'}],sections:[{id:'math-sec',subjectId:'math',name:'الحساب'},{id:'verbal-sec',subjectId:'verbal',name:'القراءة'}],skills:[],lessons:[],questions:[],quizzes:[],libraryItems:[],nestedSkills:[]};export const useStore=(select)=>select?select(state):state;useStore.getState=()=>state;`:`export const api={getQuestionsPaginated:async input=>{window.reads.push(input);return{coverage:{total:0,skillQuestionCounts:{},sectionQuestionCounts:{}}}}};`}));
}}]});
const server=createServer((_,res)=>{res.setHeader('content-type','text/html;charset=utf-8');res.end(`<meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><script>${bundle.outputFiles[0].text}</script>`)});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
let browser;try{browser=await chromium.launch(arg('executable')?{executablePath:arg('executable')}:{});const page=await browser.newPage();page.setDefaultTimeout(7000);page.on('pageerror',e=>console.error('PAGEERROR',e.message));
 for(const role of ['teacher','supervisor']){
  await page.goto(`http://127.0.0.1:${server.address().port}/?role=${role}`);
  await page.getByRole('heading',{name:'مركز المهارات',exact:true}).waitFor();await page.getByText('اختر المادة لعرض مهاراتها',{exact:true}).waitFor();
  assert.equal(await page.getByRole('heading',{name:'الحساب',exact:true}).count(),0);assert.deepEqual(await page.evaluate(()=>window.reads),[],'No broad coverage request before material selection');
  assert.equal(await page.getByRole('button',{name:'إضافة مهارة رئيسة',exact:true}).isEnabled(),false);
  const subject=page.getByLabel('المادة',{exact:true});assert.equal(await subject.isEnabled(),true,'Staff can choose material directly');await subject.selectOption('math');
  await page.getByRole('heading',{name:'الحساب',exact:true}).waitFor();assert.equal(await page.getByRole('heading',{name:'القراءة',exact:true}).count(),0);
  await page.waitForFunction(()=>window.reads.length===1);assert.equal(await page.evaluate(()=>window.reads[0].subject),'math');
  await subject.selectOption('verbal');await page.getByRole('heading',{name:'القراءة',exact:true}).waitFor();assert.equal(await page.getByRole('heading',{name:'الحساب',exact:true}).count(),0);
  await subject.selectOption('');await page.getByRole('heading',{name:'مركز المهارات',exact:true}).waitFor();await page.getByText('اختر المادة لعرض مهاراتها',{exact:true}).waitFor();assert.equal(await page.getByRole('heading',{name:'القراءة',exact:true}).count(),0);
  await page.getByText(/المادة: الرياضيات/).waitFor();assert.equal((await page.locator('body').innerText()).includes('نوع الاختبار: test'),false,'No internal kind token in learner-facing staff card');
 }
 await page.goto(`http://127.0.0.1:${server.address().port}/?role=admin`);await page.getByRole('heading',{name:'الحساب',exact:true}).waitFor();await page.getByRole('heading',{name:'القراءة',exact:true}).waitFor();
 await page.goto(`http://127.0.0.1:${server.address().port}/?role=teacher&pinned`);await page.getByRole('heading',{name:'الحساب',exact:true}).waitFor();assert.equal(await page.getByRole('heading',{name:'القراءة',exact:true}).count(),0);
 console.log('PASS staff skill entry: teacher/supervisor choose-first,no broad coverage,material switching/reset,pinned material,admin unchanged,readable assessment material/kind.');
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
