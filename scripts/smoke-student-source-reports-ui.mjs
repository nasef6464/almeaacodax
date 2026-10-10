import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFileSync, readdirSync } from 'node:fs';
import { build } from 'esbuild';
import { chromium } from 'playwright';

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
import Quizzes from './pages/Quizzes';
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
 attempts={[{selectedOptionIndex:-1,evidenceType:'mastery_review'},{selectedOptionIndex:0,evidenceType:'remediation'},{selectedOptionIndex:1,evidenceType:'mastery_review'},{selectedOptionIndex:0,evidenceType:'assessment'},{selectedOptionIndex:1}]} completedLessons={['lesson','lesson','second']} periodLabel="كل الوقت"/>
 :mode==='hook'?<><StudentResultHistoryControls context={context} onContextChange={setContext} history={history}/><pre data-testid="rows">{history.results.map(r=>r.id).join(',')}</pre></>
 :mode==='detail'?<><pre data-testid="detail">{detail.result?.score ?? ''}</pre>{detail.error?<button onClick={detail.retry}>إعادة فتح النتيجة</button>:null}</>:<Quizzes view="attempts"/>}</main></MemoryRouter>;
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
 const resolve=async (index,ids,total=ids.length,hasNext=false,context='platform_self_study')=>page.evaluate(({index,ids,total,hasNext,context})=>window.pending[index].resolve({data:ids.map(id=>window.result(id,context,80,id.includes('mock')?'mock':'test')),pagination:{total,hasNext}}),{index,ids,total,hasNext,context});
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
 assert.deepEqual(errors,[]);
 console.log('PASS enrolled/independent reports: source scores and skills, activity and plan links; bounded history, retry, pagination, stale actor/context isolation; real attempts page empty tabs and frozen mock; 1280/390 CSS.');
} finally { await browser.close(); server.close(); }
