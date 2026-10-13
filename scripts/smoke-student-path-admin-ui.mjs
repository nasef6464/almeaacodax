import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {build} from 'esbuild';
import {chromium} from 'playwright';

const bundle=await build({stdin:{resolveDir:process.cwd(),loader:'tsx',contents:`
import React,{useState} from 'react';import {createRoot} from 'react-dom/client';
import {StudentSiteExperienceFields,PathStudentExperienceFields,PathStudentExperiencePanel} from './dashboards/admin/components/StudentExperienceSettings';
function Fixture(){const [site,setSite]=useState();const [path,setPath]=useState();return <main dir="rtl"><StudentSiteExperienceFields value={site} onChange={setSite}/><PathStudentExperienceFields value={path} onChange={setPath} levelCount={0}/><PathStudentExperiencePanel path={{id:'future',name:'مسار جديد',settings:{showPackageCard:false,futureKey:'retain'}}} levelCount={0} onSave={async(id,settings)=>{window.calls.push({id,settings});if(window.fail)throw Error('تعذر الحفظ التجريبي')}}/></main>};window.calls=[];window.fail=true;createRoot(document.getElementById('root')).render(<Fixture/>);
`},bundle:true,write:false});
const managerBundle=await build({stdin:{resolveDir:process.cwd(),loader:'tsx',contents:`
import React from 'react';import {createRoot} from 'react-dom/client';import {PathsManager} from './dashboards/admin/PathsManager';
window.fixture={paths:[{id:'future',name:'المسار الجديد',settings:{futureKey:'retain',showPackageCard:false}}],levels:[],subjects:[],courses:[],questions:[],lessons:[],quizzes:[],libraryItems:[],topics:[]};window.calls=[];window.fail=true;window.listeners=new Set();createRoot(document.getElementById('root')).render(<PathsManager/>);
`},bundle:true,write:false,plugins:[{name:'admin-fixture',setup(b){
 b.onResolve({filter:/store\/useStore$/},()=>({path:'store',namespace:'fixture'}));
 b.onResolve({filter:/services\/api$/},()=>({path:'api',namespace:'fixture'}));
 b.onResolve({filter:/^\.\/(CoursesManager|QuestionBankManager|FoundationManager|SkillsTreeManager|QuizzesManager|SubjectQuizzesPanel|LibraryManager)$/},args=>({path:args.path.slice(2),namespace:'stub'}));
 b.onLoad({filter:/.*/,namespace:'stub'},args=>({contents:'export const '+args.path+'=()=>null;',loader:'js'}));
 b.onLoad({filter:/.*/,namespace:'fixture'},({path})=>({resolveDir:process.cwd(),loader:'js',contents:path==='api'
 ? `export const api={updatePath:async(id,data)=>{window.calls.push({id,data});if(window.fail)throw Error('رفض الخادم الحفظ');return {_id:id,...data}},clearTaxonomyBootstrapCache:()=>{window.cacheCleared=true}};`
 : `import {useSyncExternalStore} from 'react';export const useStore=()=>useSyncExternalStore(fn=>{window.listeners.add(fn);return()=>window.listeners.delete(fn)},()=>window.fixture);useStore.getState=()=>window.fixture;useStore.setState=fn=>{window.fixture={...window.fixture,...fn(window.fixture)};window.listeners.forEach(fn=>fn())};`}));
}}]});
const server=createServer((req,res)=>{res.setHeader('Content-Type','text/html');res.end('<html><body><div id="root"></div></body></html>')});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:'+server.address().port);await page.addScriptTag({content:bundle.outputFiles[0].text});
 assert.equal(await page.getByLabel('ما يظهر للطالب في الموقع').inputValue(),'all');assert.equal(await page.getByLabel('تذكير الطالب باختيار مساره').isChecked(),true);
 await page.getByLabel('ما يظهر للطالب في الموقع').selectOption('enrolled');await page.getByLabel('تذكير الطالب باختيار مساره').uncheck();assert.equal(await page.getByLabel('ما يظهر للطالب في الموقع').inputValue(),'enrolled');
 const editor=page.getByTestId('path-student-experience-panel');const fields=page.getByTestId('path-student-experience-fields').first();assert.equal(await fields.getByLabel(/^اختيار المرحلة/).inputValue(),'auto');assert.equal(await fields.getByLabel('سؤال اختيار المرحلة').inputValue(),'اختر مرحلتك');
 await fields.getByLabel(/^اختيار المرحلة/).selectOption('none');assert.equal(await fields.getByLabel('سؤال اختيار المرحلة').isDisabled(),true);await fields.getByLabel(/^اختيار المرحلة/).selectOption('required');await fields.getByRole('status').waitFor();
 await editor.getByLabel(/^اختيار المرحلة/).selectOption('none');await editor.getByLabel('عرض صفحة المسار').selectOption('simple');await editor.getByRole('button',{name:'حفظ تجربة الطالب'}).click();await editor.getByRole('alert').waitFor();assert.equal(await editor.getByLabel('عرض صفحة المسار').inputValue(),'simple');
 await page.evaluate(()=>window.fail=false);await editor.getByRole('button',{name:'حفظ تجربة الطالب'}).click();await editor.getByText('تم حفظ تجربة الطالب.').waitFor();
 const calls=await page.evaluate(()=>window.calls);assert.equal(calls.length,2);assert.equal(calls[1].settings.futureKey,'retain');assert.equal(calls[1].settings.showPackageCard,false);assert.equal(calls[1].settings.stageSelection,'none');assert.equal(calls[1].settings.studentTemplate,'simple');assert.deepEqual(errors,[]);
 console.log('PASS admin student experience: defaults, modes, zero-level warning, none policy, failed-save retry, retained settings');
 const manager=await browser.newPage();await manager.goto('http://127.0.0.1:'+server.address().port);await manager.addScriptTag({content:managerBundle.outputFiles[0].text});
 await manager.getByRole('button',{name:'إضافة مسار جديد',exact:true}).click();assert.equal(await manager.getByTestId('path-student-experience-fields').getByLabel(/^اختيار المرحلة/).inputValue(),'auto');await manager.getByRole('button',{name:'إلغاء',exact:true}).click();
 await manager.getByRole('button',{name:'تعديل المسار المسار الجديد',exact:true}).click();await manager.getByTestId('path-student-experience-fields').getByLabel('عرض صفحة المسار').selectOption('simple');await manager.getByRole('button',{name:'حفظ التعديلات',exact:true}).click();await manager.getByRole('alert').waitFor();assert.equal(await manager.evaluate(()=>window.fixture.paths[0].settings.studentTemplate),undefined);
 await manager.evaluate(()=>window.fail=false);await manager.getByRole('button',{name:'حفظ التعديلات',exact:true}).click();await manager.waitForFunction(()=>window.fixture.paths[0].settings.studentTemplate==='simple');assert.equal(await manager.evaluate(()=>window.fixture.paths[0].settings.futureKey),'retain');assert.equal(await manager.evaluate(()=>window.fixture.paths[0].settings.showPackageCard),false);assert.equal(await manager.evaluate(()=>window.cacheCleared),true);
 console.log('PASS actual PathsManager: new-path fields, failed edit keeps modal/store unchanged, confirmed edit retains settings and clears cache');
 await manager.getByTestId('learning-manager-path-future').click();await manager.getByRole('button',{name:'إعدادات المسار',exact:true}).click();const livePanel=manager.getByTestId('path-student-experience-panel');await livePanel.getByLabel(/^اختيار المرحلة/).selectOption('required');await livePanel.getByRole('status').waitFor();await livePanel.getByRole('button',{name:'حفظ تجربة الطالب',exact:true}).click();await livePanel.getByText('تم حفظ تجربة الطالب.').waitFor();assert.equal(await manager.evaluate(()=>window.fixture.paths[0].settings.stageSelection),'required');assert.equal(await manager.evaluate(()=>window.fixture.paths[0].settings.futureKey),'retain');
 console.log('PASS actual settings tab: required/zero-level warning, confirmed persistence and visible success');
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
