import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFileSync, readdirSync } from 'node:fs';
import { build } from 'esbuild';
import { chromium } from 'playwright';

const sliceBundle = await build({entryPoints:['store/slices/learningInteractionsSlice.ts'],bundle:true,write:false,platform:'node',format:'esm'});
const {createLearningInteractionsSlice} = await import('data:text/javascript;base64,'+Buffer.from(sliceBundle.outputFiles[0].text).toString('base64'));
let sliceState={user:{id:'learner'},questionAttempts:[],favorites:[],reviewLater:[]};
let completeSave; const payloads=[];
const slice = createLearningInteractionsSlice(change=>{sliceState={...sliceState,...(typeof change==='function'?change(sliceState):change)};},()=>sliceState,
 {createQuestionAttempt:payload=>{payloads.push(payload);return new Promise(resolve=>completeSave=resolve);},updateMyPreferences:async()=>{}},
 {shouldSyncUserToApi:()=>true});
slice.recordQuestionAttempt({questionId:'q',selectedOptionIndex:1,isCorrect:true,date:'now',timeSpentSeconds:0,activityType:'quiz',quizId:'directed'});
assert.equal(payloads[0].isCorrect,undefined);
completeSave({questionId:'q',activityType:'quiz',quizId:'directed',learningContext:'school_assessment',schoolId:'school'}); await Promise.resolve();
assert.equal(sliceState.questionAttempts[0].learningContext,'school_assessment');
slice.hydrateQuestionAttempts([{questionId:'q',selectedOptionIndex:1,activityType:'quiz',quizId:'directed',learningContext:'school_assessment',schoolId:'school',classId:'class'}]);
assert.equal(sliceState.questionAttempts[0].schoolId,'school'); assert.equal(sliceState.questionAttempts[0].classId,'class');
slice.recordQuestionAttempt({questionId:'q',selectedOptionIndex:0,isCorrect:false,date:'later',timeSpentSeconds:0,activityType:'quiz',quizId:'other'});
sliceState={...sliceState,user:{id:'independent'},questionAttempts:[]};
completeSave({questionId:'q',activityType:'quiz',learningContext:'school_assessment',schoolId:'school'}); await Promise.resolve();
assert.deepEqual(sliceState.questionAttempts,[], 'old actor activity response is ignored');

const adapterBundle=await build({entryPoints:['server/src/modules/quizzes/application/assessmentResultReadAdapter.ts'],bundle:true,write:false,platform:'node',format:'esm'});
const {resolveAssessmentResultRead,projectQuizResultHistory}=await import('data:text/javascript;base64,'+Buffer.from(adapterBundle.outputFiles[0].text).toString('base64'));
const projection={userId:'other',learningContext:'platform_self_study',schoolId:'other-school',classId:'other-class',score:67};
const resolved=resolveAssessmentResultRead({_id:'saved',userId:'learner',learningContext:'school_assessment',schoolId:'school',classId:'class'}, {compatibilityProjection:projection});
assert.equal(resolved.userId,'learner'); assert.equal(resolved.learningContext,'school_assessment');
assert.equal(resolved.schoolId,'school'); assert.equal(resolved.classId,'class'); assert.equal(resolved.score,67);
const unknown=resolveAssessmentResultRead({_id:'old',userId:'learner'}, {compatibilityProjection:projection});
assert.equal(unknown.learningContext,'legacy_unknown'); assert.equal(unknown.schoolId,undefined);
const light=projectQuizResultHistory({...resolved,questionReview:[{questionText:'heavy'}],quizSnapshot:{title:'saved',quizKind:'mock',targetUserIds:['other-student'],targetGroupIds:['roster']}});
assert.equal(light.questionReview,undefined); assert.equal(light.quizSnapshot.targetUserIds,undefined);
assert.equal(light.quizSnapshot.quizKind,'mock'); assert.equal(light.score,67);

// Real reports, history hook, controls and attempts page; only transport/store are fixtures.
const bundle = await build({ stdin: { resolveDir: process.cwd(), loader: 'tsx', contents: `
import React from 'react';
import {createRoot} from 'react-dom/client';
import {MemoryRouter} from 'react-router-dom';
import {StudentJourneySourcesPanel} from './pages/Reports/StudentJourneySourcesPanel';
import {StudentResultHistoryControls} from './components/StudentResultHistoryControls';
import {useStudentResultHistory} from './hooks/useStudentResultHistory';
import {useStudentResultDetail} from './hooks/useStudentResultDetail';
import Quizzes, {SchoolTestsPanel, AttemptGroupCard, QuizSection, LockedQuizSection} from './pages/Quizzes';
const root=createRoot(document.getElementById('root'));
window.requests=[]; window.pending=[]; window.detailRequests=[]; window.detailPending=[]; window.actor='enrolled';
const result=(id,context,score,kind='test')=>({id,userId:window.actor,quizId:id,quizTitle:id,score,date:'2026-10-10T12:00:00Z',learningContext:context,source:id==='school-regular'?'mock-exam':'tests',quizSnapshot:{quizKind:kind},totalQuestions:5,skillsAnalysis:[{skill:'التناسب',skillId:'ratio',pathId:'quant',subjectId:'math',mastery:score,questionCount:5,correctCount:score/20}]});
window.result=result;
window.fixture={user:{id:'enrolled',role:'student',schoolId:'school'},examResults:[],quizzes:[],subjects:[],paths:[],lessons:[],libraryItems:[],checkAccess:()=>true,hasScopedPackageAccess:()=>true,getMatchingPackage:()=>null,hydrateQuizzes:()=>{}};
function Harness({mode='panel',actor='enrolled',requested='abcdef1234567890abcdef12'}) {
 window.actor=actor; window.fixture.user={id:actor,role:'student',...(actor==='enrolled'?{schoolId:'school'}:{})};
 const [context,setContext]=React.useState('platform_self_study');
 const history=useStudentResultHistory(actor,mode==='hook',context);
 const detail=useStudentResultDetail(undefined,'',mode==='detail'?requested:null,actor);
 return <MemoryRouter><main dir="rtl">{mode==='panel'?<StudentJourneySourcesPanel
 results={[result('منصة 80','platform_self_study',80),result('مدرسة 20','school_assessment',20),result('قديم 40',undefined,40)]}
 attempts={[{selectedOptionIndex:-1,evidenceType:'mastery_review'},{selectedOptionIndex:0,evidenceType:'remediation'},{selectedOptionIndex:1,evidenceType:'mastery_review'},{selectedOptionIndex:0,evidenceType:'assessment'},{selectedOptionIndex:1},
 {selectedOptionIndex:0,activityType:'practice',learningContext:'platform_self_study'},
 {selectedOptionIndex:1,activityType:'quiz',learningContext:'platform_self_study',evidenceType:'remediation'},
 {selectedOptionIndex:0,activityType:'quiz',learningContext:'school_assessment'},
 {selectedOptionIndex:-1,activityType:'practice'}]} completedLessons={['lesson','lesson','second']} periodLabel="كل الوقت"/>
 :mode==='hook'?<><StudentResultHistoryControls context={context} onContextChange={setContext} history={history}/><pre data-testid="rows">{history.results.map(r=>r.id).join(',')}</pre></>
 :mode==='locked'?<LockedQuizSection items={Array.from({length:22},(_,i)=>({id:'locked-'+i,title:'باقة '+i,questionIds:['q'],createdAt:1,subjectId:'math',access:{price:1}}))} subjects={[]} onOpenPayment={()=>{}}/>:mode==='catalog'?<QuizSection title='اختبارات متاحة' emptyMessage='لا يوجد' items={Array.from({length:22},(_,i)=>({id:'available-'+i,title:'متاح '+i,questionIds:['q'],createdAt:1,subjectId:'math'}))} subjects={[]} paths={[]} badgeClassName='' badgeLabel='اختياري'/>:mode==='school'?<SchoolTestsPanel quizzes={Array.from({length:22},(_,i)=>({id:'school-'+i,title:'واجب '+i,questionIds:['q'],pathId:'quant'}))} examResults={Array.from({length:2},(_,i)=>result('school-'+i,'school_assessment',80))} getPathName={()=>'القدرات'} formatQuizDate={date=>String(date)}/>:mode==='detail'?<><pre data-testid="detail">{detail.result?.score ?? ''}</pre>{detail.error?<button onClick={detail.retry}>إعادة فتح النتيجة</button>:null}</>:<Quizzes view="attempts"/>}</main></MemoryRouter>;
}
window.renderFixture=props=>root.render(<Harness {...props}/>);
window.renderFixture({});
` }, bundle: true, write: false, plugins: [{ name: 'isolated-transport', setup(build) {
  build.onResolve({ filter: /services\/api$/ }, () => ({ path: 'api', namespace: 'fixture' }));
  build.onResolve({ filter: /store\/useStore$/ }, () => ({ path: 'store', namespace: 'fixture' }));
  build.onResolve({ filter: /components\/(PaymentModal|StudentNextActionStrip)$/ }, () => ({ path: 'ui', namespace: 'fixture' }));
  build.onLoad({ filter: /.*/, namespace: 'fixture' }, ({path}) => ({ contents: path==='api'
    ? `export const api={getQuizzes:async()=>[],getQuizResultDetails:id=>{window.detailRequests.push({id,actor:window.actor});return new Promise((resolve,reject)=>window.detailPending.push({resolve,reject}))},getMyQuizResultsPage:options=>{window.requests.push({actor:window.actor,...options});return new Promise((resolve,reject)=>window.pending.push({resolve,reject}))}};`
    : path==='store' ? 'export const useStore=()=>window.fixture;' : 'export const PaymentModal=()=>null; export const StudentNextActionStrip=()=>null;', loader: 'js' }));
} }] });
const server=createServer((_req,res)=>res.end('<html><body><div id="root"></div></body></html>'));
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await chromium.launch({headless:true});
try {
 const page=await browser.newPage(); page.setDefaultTimeout(8000);
 const errors=[]; page.on('pageerror',error=>errors.push(error.message));
 await page.goto(`http://127.0.0.1:${server.address().port}`);
 for(const file of readdirSync('dist/assets').filter(file=>file.endsWith('.css'))) await page.addStyleTag({content:readFileSync(`dist/assets/${file}`,'utf8')});
 await page.addScriptTag({content:bundle.outputFiles[0].text});
 const render=async props=>{await page.evaluate(props=>window.renderFixture(props),props);await page.waitForTimeout(100);};
 const resolve=async (index,ids,total=ids.length,hasNext=false,context='platform_self_study')=>{
  await page.waitForFunction(index=>Boolean(window.pending[index]),index);
  return page.evaluate(({index,ids,total,hasNext,context})=>window.pending[index].resolve({data:ids.map(id=>window.result(id,context,80,id.includes('mock')?'mock':'test')),pagination:{total,hasNext}}),{index,ids,total,hasNext,context});
 };
 for(const actor of ['enrolled','independent']) {
  await render({mode:'panel',actor});
  const summary=page.getByTestId('student-source-summary');
  await summary.getByText('منصة 80',{exact:true}).waitFor();
  assert.match(await summary.innerText(),/متوسط درجاتها 80%/);
  assert.match(await summary.innerText(),/التناسب: 80%/);
  assert.doesNotMatch(await summary.innerText(),/مدرسة 20|قديم 40/);
  assert.equal(await page.getByRole('link',{name:'خطتي',exact:true}).getAttribute('href'),'/plan');
  await page.getByRole('button',{name:'اختبارات المدرسة الموجهة',exact:true}).click();
  assert.match(await summary.innerText(),/متوسط درجاتها 20%/);
  assert.match(await summary.innerText(),/التناسب: 20%/);
  assert.doesNotMatch(await summary.innerText(),/منصة 80/);
  assert.match(await summary.getByRole('link',{name:/فتح سجل/}).getAttribute('href'),/context=school_assessment/);
  await page.getByRole('button',{name:'سجل سابق غير مصنف',exact:true}).click();
  assert.match(await summary.innerText(),/قديم 40/);
  assert.match(await summary.innerText(),/مصدرها لم يُسجل/);
  assert.match(await page.getByText(/دروس أنجزتها:/).innerText(),/2/);
  assert.match(await page.getByTestId('student-review-activity').innerText(),/2/);
  assert.match(await page.getByTestId('student-practice-activity').innerText(),/إجابات التدريب: 1/);
  assert.match(await page.getByTestId('student-quiz-question-activity').innerText(),/المنصة 1، المدرسة 1/);
  assert.match(await page.getByTestId('student-unclassified-question-activity').innerText(),/^2 إجابة سؤال/);
  await page.getByRole('button',{name:'اختبارات المنصة',exact:true}).click();
  for(const width of [1280,390]) {
   await page.setViewportSize({width,height:900});
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`panel overflow ${actor}/${width}`);
  }
 }
 await render({mode:'hook',actor:'enrolled'});
 assert.equal(await page.evaluate(()=>window.requests.length),1,'Only one initial history page');
 assert.equal(await page.evaluate(()=>window.requests[0].limit),50);
 await resolve(0,['first'],101,true);
 await page.getByText('عرض 1 من 101 محاولة. ملخص الدرجات للمحاولات المحملة.',{exact:true}).waitFor();
 assert.equal(await page.evaluate(()=>window.requests.length),1,'No eager history traversal');
 await page.getByRole('button',{name:'تحميل محاولات أقدم'}).click();
 assert.equal(await page.evaluate(()=>window.requests[1].page),2);
 await page.evaluate(()=>window.pending[1].reject(new Error('offline')));
 await page.getByRole('alert').waitFor();
 assert.equal(await page.getByTestId('rows').innerText(),'first');
 await page.getByRole('button',{name:'إعادة المحاولة'}).click();
 assert.equal(await page.evaluate(()=>window.requests[2].page),2);
 await resolve(2,['first','second'],101,true);
 await page.getByText('عرض 2 من 101 محاولة. ملخص الدرجات للمحاولات المحملة.',{exact:true}).waitFor();
 await page.getByRole('button',{name:'تحميل محاولات أقدم'}).click();
 await page.getByRole('button',{name:'اختبارات المدرسة الموجهة',exact:true}).click();
 await resolve(4,['school'],1,false,'school_assessment');
 await page.getByText('عرض 1 من 1 محاولة. ملخص الدرجات للمحاولات المحملة.',{exact:true}).waitFor();
 await resolve(3,['stale-platform']);
 assert.equal(await page.getByTestId('rows').innerText(),'school','Discard stale source page');
 await page.getByRole('button',{name:'اختبارات المنصة',exact:true}).click();
 await page.waitForFunction(()=>Boolean(window.pending[5]));
 await render({mode:'hook',actor:'independent'});
 assert.equal(await page.getByTestId('rows').innerText(),'','Discard actor data immediately');
 await resolve(6,['independent']); await page.getByTestId('rows').getByText('independent',{exact:true}).waitFor();
 await resolve(5,['other-actor']);
 assert.equal(await page.getByTestId('rows').innerText(),'independent');
 await render({mode:'quizzes',actor:'independent'});
 await resolve(7,[],0,false);
 await page.getByTestId('student-result-history-context').waitFor();
 await page.getByRole('button',{name:'اختبارات المدرسة الموجهة',exact:true}).click();
 await resolve(8,['school-regular','school-mock'],2,false,'school_assessment');
 await page.getByText('school-regular',{exact:true}).first().waitFor();
 // The deleted live quiz is still classified from its frozen attempt snapshot.
 await page.getByRole('button',{name:/اختبارات محاكية/}).click();
 await page.getByText('school-mock',{exact:true}).first().waitFor();
 assert.equal(await page.getByText('school-regular',{exact:true}).count(),0);
 for(const width of [1280,390]) {
  await page.setViewportSize({width,height:900});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`history overflow ${width}`);
 }
 await render({mode:'detail',actor:'enrolled'});
 assert.equal(await page.evaluate(()=>window.detailRequests.length),1,'Uncached older attempt gets one direct detail request');
 await page.evaluate(()=>window.detailPending[0].reject(new Error('offline')));
 await page.getByRole('button',{name:'إعادة فتح النتيجة'}).click();
 await page.evaluate(()=>window.detailPending[1].resolve({result:{score:67}}));
 await page.getByTestId('detail').getByText('67',{exact:true}).waitFor();
 await render({mode:'detail',actor:'enrolled',requested:'bbbbbbbbbbbbbbbbbbbbbbbb'});
 await render({mode:'detail',actor:'independent',requested:'bbbbbbbbbbbbbbbbbbbbbbbb'});
 assert.equal(await page.getByTestId('detail').innerText(),'','Old actor detail is not rendered');
 await page.evaluate(()=>window.detailPending[3].resolve({result:{score:40}}));
 await page.getByTestId('detail').getByText('40',{exact:true}).waitFor();
 await page.evaluate(()=>window.detailPending[2].resolve({result:{score:99}}));
 assert.equal(await page.getByTestId('detail').innerText(),'40','Old actor response is discarded');
 await render({mode:'locked',actor:'independent'});
 assert.equal(await page.getByRole('button',{name:'افتح الباقة المناسبة'}).count(),4);
 await page.getByRole('button',{name:'عرض المزيد',exact:true}).click();
 assert.equal(await page.getByRole('button',{name:'افتح الباقة المناسبة'}).count(),8);
 await page.getByRole('button',{name:'عرض أقل',exact:true}).click();
 assert.equal(await page.getByRole('button',{name:'افتح الباقة المناسبة'}).count(),4);
 await render({mode:'catalog',actor:'independent'});
 assert.equal(await page.getByRole('link',{name:'دخول الاختبار',exact:true}).count(),4);
 await page.getByRole('button',{name:'عرض المزيد',exact:true}).click();
 assert.equal(await page.getByRole('link',{name:'دخول الاختبار',exact:true}).count(),8);
 await page.getByRole('button',{name:'عرض أقل',exact:true}).click();
 assert.equal(await page.getByRole('link',{name:'دخول الاختبار',exact:true}).count(),4);
 await render({mode:'school',actor:'enrolled'});
 assert.equal(await page.locator('article').count(),4,'School list is bounded initially');
 assert.equal(await page.getByRole('heading',{name:'واجب 0',exact:true}).count(),0,'Completed work is excluded from pending');
 await page.getByRole('button',{name:'عرض المزيد',exact:true}).click();
 assert.equal(await page.locator('article').count(),8);
 await page.getByRole('button',{name:/تم حلها/}).click();
 assert.equal(await page.locator('article').count(),2);
 assert.equal(await page.getByRole('heading',{name:'واجب 0',exact:true}).count(),1);
 assert.equal(await page.getByRole('link',{name:/عرض التقرير الكامل/}).count(),2,'Saved reports remain linked');
 assert.equal(await page.getByRole('link',{name:'كل نتائج المدرسة السابقة'}).getAttribute('href'),'/my-quizzes?context=school_assessment');
 await page.getByRole('button',{name:/المطلوب مني/}).click();
 assert.equal(await page.locator('article').count(),4,'Switching status resets visible count');
 await page.getByRole('textbox',{name:'ابحث عن اختبار'}).fill('واجب 21');
 assert.equal(await page.locator('article').count(),1);
 await page.getByRole('textbox',{name:'ابحث عن اختبار'}).fill('لا يوجد');
 await page.getByRole('heading',{name:'لا يوجد اختبار بهذا الاسم'}).waitFor();
 assert.equal(await page.locator('article').count(),0);
 await page.getByRole('textbox',{name:'ابحث عن اختبار'}).fill('');
 for(const width of [1280,390]){await page.setViewportSize({width,height:900});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);}
 await page.screenshot({path:'scratch/student-tests-school-fixture-after.png',fullPage:true});
 await render({mode:'quizzes',actor:'independent'});
 const pendingIndex=await page.evaluate(()=>window.pending.length-1);
 await page.evaluate(index=>window.pending[index].resolve({data:Array.from({length:22},(_,i)=>window.result('platform-'+i,'platform_self_study',80)),pagination:{total:22,totalPages:1,page:1,limit:50}}),pendingIndex);
 await page.getByRole('heading',{name:'platform-0',exact:true}).waitFor();
 assert.equal(await page.locator('article').count(),4,'Growing independent result list is bounded');
 await page.getByRole('button',{name:'عرض المزيد',exact:true}).click();
 assert.equal(await page.locator('article').count(),8);
 await page.getByRole('button',{name:'عرض أقل',exact:true}).click();
 assert.equal(await page.locator('article').count(),4);
 await page.getByText('ملخص تقدمي',{exact:true}).click();
 assert.ok(await page.getByText('أعلى درجة',{exact:true}).isVisible());
 await page.getByText('ملخص تقدمي',{exact:true}).click();
 assert.equal(await page.getByText('أعلى درجة',{exact:true}).isVisible(),false);
 assert.deepEqual(errors,[]);
 console.log('PASS enrolled/independent reports: source scores and skills, activity and plan links; bounded history, retry, pagination, stale actor/context isolation; real attempts page empty tabs and frozen mock; 1280/390 CSS.');
} finally { await browser.close(); server.close(); }
