import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdir} from 'node:fs/promises';
import {createServer} from 'node:http';
import {chromium} from 'playwright';
import postcss from 'postcss';
import tailwindcss from 'tailwindcss';
import config from '../tailwind.config.cjs';
const executable=process.argv.find(a=>a.startsWith('--executable='))?.split('=').slice(1).join('=');
const artifacts='scratch/director-clear-workspace-ui';await mkdir(artifacts,{recursive:true});
const bundle=await build({stdin:{resolveDir:process.cwd(),loader:'tsx',contents:`
import React from 'react';import{createRoot}from'react-dom/client';import{SchoolDirectorDashboard}from'./dashboards/SchoolDirectorDashboard';
window.calls=[];window.writes=[];
createRoot(document.getElementById('root')).render(<SchoolDirectorDashboard/>);
`},bundle:true,write:false,define:{'import.meta.env':'{}'},plugins:[{name:'director-fixtures',setup(b){
 b.onResolve({filter:/store\/useStore$/},()=>({path:'store',namespace:'fixture'}));
 b.onResolve({filter:/services\/api$/},()=>({path:'api',namespace:'fixture'}));
 b.onResolve({filter:/\/Header$/},()=>({path:'header',namespace:'fixture'}));
 b.onLoad({filter:/.*/,namespace:'fixture'},({path})=>({loader:'jsx',resolveDir:process.cwd(),contents:path==='header'?`import React from'react';export const Header=()=> <header style={{height:64}}>المنصة</header>;`:path==='store'?`
const s={user:{id:'director',role:'school_admin',schoolId:'school'},paths:[{id:'p',name:'القدرات'},{id:'p2',name:'التحصيلي'}],subjects:[{id:'math',pathId:'p',name:'الكمي'},{id:'verbal',pathId:'p',name:'اللفظي'},{id:'bio',pathId:'p2',name:'الأحياء'}],skills:[{id:'k',name:'الحساب',pathId:'p',subjectId:'math'},{id:'v',name:'القراءة',pathId:'p',subjectId:'verbal'}]};export const useStore=(select)=>select?select(s):s;`:`
const permissions=['SCHOOL_OVERVIEW_VIEW','SCHOOL_STUDENTS_VIEW','SCHOOL_STUDENTS_ADD','SCHOOL_CLASSES_MANAGE','SCHOOL_TEACHERS_ASSIGN','SCHOOL_REPORTS_DETAILED_VIEW','SCHOOL_ASSESSMENTS_MANAGE','SCHOOL_INTERVENTIONS_MANAGE'];
const school={schoolId:'school',schoolName:'مدرستي',permissions:location.search.includes('restricted')?permissions.slice(0,2):permissions,modules:['SCHOOL_CORE','SCHOOL_ASSESSMENTS','INTERVENTION_CENTER','REPORTS','SCHOOL_INTELLIGENCE']};
const overview={metrics:{students:1,classes:1,teachers:1,supervisors:1,schoolAssessments:1,completedSmartClasses:0},classes:[{classId:'c',className:'الأول'}]};
export const api=new Proxy({getSchoolDirectorWorkspace:async()=>({schools:[school,{...school,schoolId:'school2',schoolName:'المدرسة الثانية'}]}),getSchoolDirectorOverview:async()=>overview,getSchoolDirectorStudents:async id=>{if(id==='school2'&&window.delaySchool2)await new Promise(resolve=>{window.resolveSchool2=resolve});return({students:[{studentId:'s',name:'طالب',classId:'c',className:'الأول',isActive:true}],total:1})},addSchoolDirectorStudent:async()=>{await new Promise(resolve=>{window.finishAdd=resolve});return{created:true}},getSchoolDirectorTeachers:async()=>({teachers:[{teacherId:'t',name:'معلم'}],assignments:[]}),getSchoolDirectorAcademicAssessments:async()=>{window.calls.push('assessments');return{assessments:[{id:'q',title:'اختبار الحساب',subjectId:'math',isPublished:true}]}},getSchoolDirectorInterventions:async()=>({interventions:[]}),getQuestionsPaginated:async query=>{window.calls.push(query);return{data:[{id:'question',text:'كم يساوي ٢ + ٢؟'},{id:'image',text:'',imageUrl:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aJxkAAAAASUVORK5CYII=',imageAlt:'رسم السؤال الهندسي'}],pagination:{hasNext:query.page===1,totalPages:2,page:query.page}}},createSchoolDirectorAssessment:async(id,payload)=>{window.writes.push({id,payload});return{}},schoolAssessmentContext:async()=>{window.calls.push('context');return({id:'q',canManage:false,canEditContent:false,isPublished:true})},schoolAssessmentReport:async()=>({coverage:{complete:true,missingEvidence:[]},audience:{targeted:1},participation:{completed:0,notCompleted:1,started:0},scores:{average:null,passRate:null,highest:null,lowest:null},subjects:[],sections:[],skills:[]}),schoolAssessmentLearners:async()=>({learners:[],pagination:{page:1,limit:20,total:0,totalPages:1}})},{get:(t,k)=>t[k]||(()=>Promise.resolve({}))});
` }));
}}]});
const css=await postcss([tailwindcss({...config,content:['dashboards/SchoolDirector*.tsx','components/Dashboard*.tsx','components/DisplayListControls.tsx','dashboards/school-director/**/*.tsx']})]).process('@tailwind base;@tailwind components;@tailwind utilities;',{from:undefined});
const server=createServer((_,r)=>{r.setHeader('content-type','text/html;charset=utf-8');r.end(`<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css.css}</style><div id="root"></div><script>${bundle.outputFiles[0].text}</script>`);});await new Promise(r=>server.listen(0,'127.0.0.1',r));
let browser;
try{
 browser=await chromium.launch(executable?{executablePath:executable}:{});
 for(const width of [390,1280]){
 const page=await browser.newPage({viewport:{width,height:900}});page.setDefaultTimeout(7000);const errors=[];page.on('pageerror',e=>{errors.push(e.message);console.error('PAGEERROR',e.message)});
 await page.goto(`http://127.0.0.1:${server.address().port}`);
 await page.getByRole('heading',{name:'لوحة مدير المدرسة',exact:true}).waitFor().catch(async e=>{console.error((await page.locator('body').innerText()).slice(0,1000));throw e;});
 const select=async name=>{if(width===390)await page.getByRole('button',{name:'فتح أقسام لوحة التحكم',exact:true}).click();const nav=page.getByRole('navigation',{name:'أقسام اللوحة',exact:true}).filter({visible:true});if(await page.getByRole('navigation',{name:'مسار الصفحة',exact:true}).locator('[aria-current="page"]').innerText()==='الملخص العام')await nav.getByRole('button',{name:'الملخص العام',exact:true}).waitFor({state:'visible'});const button=nav.getByRole('button',{name,exact:true});if(!await button.isVisible()){await nav.locator('summary').filter({hasText:['اختبارات المدرسة','الدعم والمهارات'].includes(name)?'التعلم والمتابعة':'إدارة المدرسة'}).click();}await button.click();};
 assert.deepEqual(await page.evaluate(()=>window.calls),[],'Do not load closed academic centers');
 await select('الدعم والمهارات');
 assert.equal(await page.getByRole('option',{name:'الحساب',exact:true}).count(),0,'No mixed skills before material');
 await page.getByLabel('المسار العلاجي',{exact:true}).selectOption('p');
 await page.getByLabel('مادة الدعم',{exact:true}).selectOption('math');
 assert.equal(await page.getByRole('option',{name:'الحساب',exact:true}).count(),1);
 assert.equal(await page.getByRole('option',{name:'القراءة',exact:true}).count(),0);
 await page.getByLabel('المهارة',{exact:true}).selectOption('k');
 await page.getByLabel('مادة الدعم',{exact:true}).selectOption('verbal');
 assert.equal(await page.getByLabel('المهارة',{exact:true}).inputValue(),'');
 await select('اختبارات المدرسة');await page.getByText('اختبار الحساب',{exact:true}).waitFor();
 assert.equal(await page.evaluate(()=>window.calls.includes('context')),false,'No per-card permission fan-out');
 await page.getByRole('button',{name:'النتائج والإدارة',exact:true}).click();await page.getByText('النتائج متاحة حسب صلاحيتك؛ إجراءات التعديل تتطلب صلاحية إدارة هذا الاختبار.',{exact:true}).waitFor();assert.equal(await page.getByRole('button',{name:'تذكير الغائبين',exact:true}).count(),0);await page.keyboard.press('Escape');
 await page.getByRole('button',{name:'إضافة اختبار',exact:true}).click();
 await page.getByLabel('مسار الاختبار',{exact:true}).selectOption('p');await page.getByLabel('مادة الاختبار',{exact:true}).selectOption('math');
 await page.getByText('كم يساوي ٢ + ٢؟',{exact:true}).waitFor();
 await page.getByAltText('رسم السؤال الهندسي',{exact:true}).waitFor();
 const query=await page.evaluate(()=>window.calls.find(c=>typeof c==='object'));
 assert.equal(query.limit,20);assert.equal(query.subject,'math');assert.equal(query.approvalStatus,'approved');
 await page.getByLabel('اختيار السؤال 1',{exact:true}).check();
 await page.getByRole('button',{name:'التالي',exact:true}).click();await page.getByText('صفحة 2',{exact:true}).waitFor();assert.equal(await page.getByLabel('اختيار السؤال 1',{exact:true}).isChecked(),true,'Keep canonical selection across pages');
 await page.getByLabel('مسار الاختبار',{exact:true}).selectOption('p2');await page.getByLabel('مادة الاختبار',{exact:true}).selectOption('bio');await page.getByText('الأسئلة المختارة: 0',{exact:true}).waitFor();await page.getByLabel('مسار الاختبار',{exact:true}).selectOption('p');await page.getByLabel('مادة الاختبار',{exact:true}).selectOption('math');await page.getByLabel('اختيار السؤال 1',{exact:true}).check();await page.getByLabel('عنوان الاختبار',{exact:true}).fill('اختبار جديد');await page.getByLabel('فصل الاختبار',{exact:true}).selectOption('c');
 await page.getByRole('button',{name:'إنشاء الاختبار',exact:true}).click();
 await page.waitForFunction(()=>window.writes.length===1);
 assert.deepEqual(await page.evaluate(()=>window.writes[0]),{id:'school',payload:{title:'اختبار جديد',classId:'c',pathId:'p',subjectId:'math',questionIds:['question']}});
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'No viewport overflow');assert.deepEqual(errors,[]);
 await page.evaluate(()=>scrollTo(0,0));
 await page.screenshot({path:artifacts+'/'+width+'.png',fullPage:true});
 await select('المعلمون والتكليفات');await page.getByLabel('مسار التكليف',{exact:true}).selectOption('p');await page.getByLabel('مادة التكليف (اختياري)',{exact:true}).selectOption('math');
 await page.evaluate(()=>window.delaySchool2=true);
 const schoolSelector=page.getByRole('combobox').filter({has:page.locator('option[value="school2"]')});
 const changeSchool=async id=>{await schoolSelector.selectOption(id);await page.getByRole('navigation',{name:'مسار الصفحة',exact:true}).getByText('الملخص العام',{exact:true}).waitFor();};
 await changeSchool('school2');await page.waitForFunction(()=>typeof window.resolveSchool2==='function');await changeSchool('school');await page.evaluate(()=>window.resolveSchool2());
 await select('الطلاب');await page.getByRole('heading',{name:'طلاب مدرستي',exact:true}).waitFor();
 assert.equal(await page.getByRole('heading',{name:'طلاب المدرسة الثانية',exact:true}).count(),0);
 await changeSchool('school2');await page.waitForFunction(()=>typeof window.resolveSchool2==='function');await page.evaluate(()=>window.resolveSchool2());
 await select('اختبارات المدرسة');await page.getByText('اختبار الحساب',{exact:true}).waitFor();assert.equal(await page.getByRole('button',{name:'النتائج والإدارة',exact:true}).isEnabled(),false,'No cross-school report entry through primary-context API');
 await page.evaluate(()=>window.delaySchool2=false);await changeSchool('school');await select('الطلاب');await page.getByRole('button',{name:'إضافة طالب',exact:true}).click();await page.getByPlaceholder('اسم الطالب',{exact:true}).fill('طالب جديد');await page.getByPlaceholder('البريد الإلكتروني',{exact:true}).fill('fixture@example.invalid');await page.getByPlaceholder('كلمة مرور مؤقتة',{exact:true}).fill('fixture-password');await page.getByRole('button',{name:'إنشاء وربط',exact:true}).click();await page.waitForFunction(()=>typeof window.finishAdd==='function');await changeSchool('school2');await select('الطلاب');await page.getByRole('heading',{name:'طلاب المدرسة الثانية',exact:true}).waitFor();await page.evaluate(()=>window.finishAdd());await page.waitForTimeout(150);await page.getByRole('heading',{name:'طلاب المدرسة الثانية',exact:true}).waitFor();
 await page.goto(`http://127.0.0.1:${server.address().port}/?restricted`);await page.getByRole('heading',{name:'لوحة مدير المدرسة',exact:true}).waitFor();
 if(width===390)await page.getByRole('button',{name:'فتح أقسام لوحة التحكم',exact:true}).click();
 assert.equal(await page.getByRole('button',{name:'اختبارات المدرسة',exact:true}).count(),0,'No unauthorized destinations');
 assert.deepEqual(await page.evaluate(()=>window.calls),[]);await page.close();
 }
 console.log('PASS director390/1280: scoped navigation,lazy centers,material-first skills/reset,approved paginated question picker,image-only questions,canonical create payload,school switching/stale response isolation,secondary-school report gate,restricted destinations,no errors/overflow.');
}finally{await browser?.close();await new Promise(r=>server.close(r));}
