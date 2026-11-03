import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {build} from 'esbuild';
import {chromium} from 'playwright';
import {readFileSync,readdirSync,mkdirSync} from 'node:fs';

const fixture=`
import React from 'react';import {createRoot} from 'react-dom/client';
import {SmartClassroomInterventionPanel} from './dashboards/admin/SmartClassroomInterventionPanel';
window.calls=[];window.empty=false;
window.catalog={paths:[{id:'p',name:'القدرات',isActive:true}],subjects:[{id:'m',pathId:'p',name:'الكمي'},{id:'v',pathId:'p',name:'اللفظي'}],skills:[{id:'fractions',pathId:'p',subjectId:'m',name:'الكسور'},{id:'ratios',pathId:'p',subjectId:'m',name:'النسب'},{id:'reading',pathId:'p',subjectId:'v',name:'الاستيعاب'}]};
const skill=(skillId,accuracy)=>({skillId,evidenceCount:4,accuracy});
window.api={getSupervisorClassroomIntelligence:async()=>({intelligence:{bounds:{sessionLimit:200,responseLimit:5000},schoolPerformance:{smartClassroom:{skillHeatmap:[skill('ratios',0)],studentSkillEvidence:window.empty?[]:[{studentId:'a',name:'أحمد',schoolId:'school',classId:'c',evidenceCount:4,accuracy:25,skills:[skill('fractions',25)]},{studentId:'b',name:'باسم',schoolId:'school',classId:'c',evidenceCount:4,accuracy:25,skills:[skill('ratios',25)]}]}}}}),getSupervisorInterventions:async()=>({interventions:[{_id:'i',skillId:'fractions',actionRef:'p',targetStudentIds:['a'],status:'completed'}]}),createSupervisorIntervention:async payload=>{window.calls.push(payload);},getSupervisorInterventionOutcome:async()=>({comparison:{confidence:'measured',delta:null}})};
createRoot(document.getElementById('root')).render(<SmartClassroomInterventionPanel/>);
`;
const bundle=await build({stdin:{contents:fixture,loader:'tsx',resolveDir:process.cwd()},bundle:true,write:false,format:'iife',plugins:[{name:'fixtures',setup(b){b.onResolve({filter:/services\/api$/},()=>({path:'api',namespace:'fixture'}));b.onResolve({filter:/store\/useStore$/},()=>({path:'store',namespace:'fixture'}));b.onLoad({filter:/.*/,namespace:'fixture'},args=>({contents:args.path==='api'?'export const api=new Proxy({}, {get:(_,key)=>(...args)=>window.api[key](...args)});':'export const useStore=()=>window.catalog;',loader:'js'}));}}]});
const cssFile=readdirSync('dist/assets').find(file=>/^index-.*\.css$/.test(file));
assert.ok(cssFile,'Build the app first: visual verification requires the actual application stylesheet');
const css=readFileSync(`dist/assets/${cssFile}`,'utf8');
const server=createServer((req,res)=>{res.setHeader('Content-Type',req.url==='/app.js'?'application/javascript':'text/html');res.end(req.url==='/app.js'?bundle.outputFiles[0].text:`<!doctype html><html lang="ar" dir="rtl"><meta name="viewport" content="width=device-width, initial-scale=1"><style>${css}</style><div id="root"></div><script src="/app.js"></script></html>`);});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await chromium.launch({headless:true,...(process.argv.includes('--chrome') ? {channel:'chrome'} : {})});
try{
const page=await browser.newPage();page.setDefaultTimeout(7000);const errors=[];page.on('pageerror',error=>errors.push(error.message));
await page.goto(`http://127.0.0.1:${server.address().port}`);
await page.getByLabel('المسار').selectOption('p');await page.getByLabel('المادة').selectOption('m');
await page.getByLabel('الطالب').selectOption(JSON.stringify(['a','school','c']));
assert.deepEqual(await page.getByLabel('المهارة').locator('option').evaluateAll(options=>options.map(o=>o.value)),['','fractions'],'no school-wide or other-student skill');
await page.getByLabel('المهارة').selectOption('fractions');await page.getByRole('button',{name:'إسناد خطة متابعة',exact:true}).click();
await page.waitForFunction(()=>window.calls.length===1);
assert.deepEqual(await page.evaluate(()=>window.calls[0]),{schoolId:'school',classId:'c',skillId:'fractions',targetStudentIds:['a'],pathId:'p',minimumEvidence:3});
await page.getByText('إعدادات المتابعة',{exact:true}).click();await page.getByLabel('الحد الأدنى للإجابات قبل المتابعة وبعدها').fill('501');assert.equal(await page.getByRole('button',{name:'إسناد خطة متابعة',exact:true}).isDisabled(),true);await page.getByLabel('الحد الأدنى للإجابات قبل المتابعة وبعدها').fill('3');
await page.getByLabel('الطالب').selectOption(JSON.stringify(['b','school','c']));assert.equal(await page.getByLabel('المهارة').inputValue(),'');
assert.deepEqual(await page.getByLabel('المهارة').locator('option').evaluateAll(options=>options.map(o=>o.value)),['','ratios']);
await page.getByLabel('المادة').selectOption('v');assert.equal(await page.getByLabel('الطالب').inputValue(),'');assert.equal(await page.getByRole('button',{name:'إسناد خطة متابعة',exact:true}).isDisabled(),true);
await page.getByRole('button',{name:'قياس النتيجة',exact:true}).click();await page.getByText('لا تتوفر مقارنة كافية قبل المتابعة وبعدها.').waitFor();
mkdirSync('output/playwright/student-intervention',{recursive:true});
await page.getByLabel('المادة').selectOption('m');await page.getByLabel('الطالب').selectOption(JSON.stringify(['a','school','c']));await page.getByLabel('المهارة').selectOption('fractions');
for(const width of [390,1440]){await page.setViewportSize({width,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.equal(await page.getByRole('button',{name:'إسناد خطة متابعة',exact:true}).evaluate(button=>getComputedStyle(button).backgroundColor),'rgb(5, 150, 105)','application styles must actually be applied');await page.screenshot({path:`output/playwright/student-intervention/${width}.png`,fullPage:true});}
await page.evaluate(()=>{window.empty=true;});await page.getByRole('button',{name:'تحديث',exact:true}).click();await page.getByText('لا توجد أدلة حصص متاحة لهذا الاختيار.').waitFor();
assert.deepEqual(errors,[]);console.log('PASS intervention UI: material-first selection, learner-specific skills, scoped command, reset on context change, disabled incomplete command, null delta, empty state,390/1440 overflow,zero browser errors.');
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
