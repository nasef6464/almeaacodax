import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {build} from 'esbuild';
import {chromium} from 'playwright';
import fs from 'node:fs';
import ts from 'typescript';
const source=fs.readFileSync('dashboards/admin/supervisorTests/assessmentReportEvidence.ts','utf8');
const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const {assessmentReportStudentIds,latestAssessmentResults}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
const groups=[{id:'class',studentIds:['a','outside']}];
const users=[{id:'a',name:'مشارك',groupIds:['class'],schoolId:'school'},{id:'b',name:'منتظر',groupIds:['class'],schoolId:'school'},{id:'c',name:'غير مستهدف',groupIds:['other'],schoolId:'school'}];
assert.deepEqual(assessmentReportStudentIds([{targetUserIds:['a','outside']}],['a','b','c'],groups,users),['a']);
assert.deepEqual(assessmentReportStudentIds([{targetGroupIds:['class']}],['a','b','c'],groups,users),['a','b']);
assert.deepEqual(assessmentReportStudentIds([{targetGroupIds:['school']}],['a','b','c'],groups,users),['a','b','c']);
assert.deepEqual(assessmentReportStudentIds([{targetUserIds:['a']},{targetUserIds:['b']}],['a','b'],groups,users),['a','b']);
assert.deepEqual(assessmentReportStudentIds([{}],['a','b'],groups,users),['a','b']);
assert.deepEqual(assessmentReportStudentIds([{targetUserIds:['outside']}],['a','b'],groups,users),[]);
const result=(quizId,userId,score,date)=>({quizId,userId,score,date,skillsAnalysis:[{skill:'الجبر',mastery:score,status:score<60?'weak':'strong'}],questionReview:[]});
const rows=[result('q','a',20,'2026-01-01'),result('q','a',80,'2026-01-02'),result('other','a',50,'2026-01-01'),result('q','c',10,'2026-01-02')];
assert.deepEqual(latestAssessmentResults(rows).map(r=>r.score),[80,50,10]);
assert.deepEqual(latestAssessmentResults([...rows].reverse()).map(r=>r.score).sort(),[10,50,80]);
const fixture={users,groups,examResults:rows};
const fixtures={
 '../../store/useStore':`export const useStore=()=>window.reportFixture;`,
 '../../services/api':`export const api={sendStudentAlert:body=>{window.alertBodies.push(body);return new Promise((resolve,reject)=>{window.alertResolve=resolve;window.alertReject=reject})}};`,
 '../../../services/api':`export const api={getScopedQuizResults:query=>{window.resultQueries.push(query);return new Promise((resolve,reject)=>window.resultRequests.push({resolve,reject}))}};`,
};
const bundle=await build({stdin:{contents:`import React from'react';import{createRoot}from'react-dom/client';import{TestAnalyticsReport}from'./dashboards/admin/TestAnalyticsReport';createRoot(document.getElementById('root')).render(<TestAnalyticsReport quiz={{id:'q',title:'اختبار موجّه',targetGroupIds:['class']}} studentIds={['a','b','c']}/>);`,resolveDir:process.cwd(),loader:'tsx'},bundle:true,write:false,plugins:[{name:'fixtures',setup(b){b.onResolve({filter:/.*/},a=>fixtures[a.path]?{path:a.path,namespace:'fixture'}:undefined);b.onLoad({filter:/.*/,namespace:'fixture'},a=>({contents:fixtures[a.path],loader:'tsx',resolveDir:process.cwd()}));}}]});
const server=createServer((req,res)=>res.end('<div id="root"></div>'));
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:'+server.address().port);
 await page.evaluate(f=>{window.reportFixture=f;window.alertBodies=[];},fixture);await page.addScriptTag({content:bundle.outputFiles[0].text});
 await page.getByRole('heading',{name:'اختبار موجّه'}).first().waitFor();
 assert.equal(await page.getByText('1 من أصل 2 طالب',{exact:true}).count(),1);
 assert.match(await page.getByText('نسبة المشاركة',{exact:true}).locator('../..').innerText(),/50%/);
 assert.match(await page.getByText('متوسط الدرجات',{exact:true}).locator('../..').innerText(),/80%/);
 assert.equal(await page.getByText('غير مستهدف',{exact:true}).count(),0);
 assert.equal(await page.getByText('20%',{exact:true}).count(),0);
 const alert=page.getByRole('button',{name:'تنبيه غير المشاركين',exact:true});await alert.click();
 const pending=page.getByRole('button',{name:'جارٍ إرسال التنبيه…'});assert.equal(await pending.isDisabled(),true);
 assert.deepEqual(await page.evaluate(()=>window.alertBodies.map(b=>b.studentIds)),[['b']]);
 await page.evaluate(()=>window.alertReject(Error('offline')));await page.getByText('حدث خطأ أثناء إرسال التنبيهات.').waitFor();
 await alert.click();await page.evaluate(()=>window.alertResolve({success:true}));await page.getByText('تم إرسال التنبيهات بنجاح!').waitFor();
 assert.equal(await page.evaluate(()=>window.alertBodies.length),2);assert.deepEqual(errors,[]);
 console.log('PASS 8 report evidence cases + actual report UI: targeted participation, latest attempts, scoped reminder pending/failure/retry, zero page errors');
 const hookBundle=await build({stdin:{contents:`import React from'react';import{createRoot}from'react-dom/client';import{useScopedAssessmentResults}from'./dashboards/admin/supervisorTests/useScopedAssessmentResults';import{ScopedAssessmentResultsStatus}from'./dashboards/admin/supervisorTests/ScopedAssessmentResultsStatus';function Harness(){const[actor,setActor]=React.useState('sup-a');const state=useScopedAssessmentResults(actor,'q',true);return <><ScopedAssessmentResultsStatus {...state}/><pre>{JSON.stringify(state.results)}</pre><button onClick={()=>setActor('sup-b')}>Change actor</button></>};createRoot(document.getElementById('root')).render(<Harness/>);`,resolveDir:process.cwd(),loader:'tsx'},bundle:true,write:false,plugins:[{name:'fixtures',setup(b){b.onResolve({filter:/.*/},a=>fixtures[a.path]?{path:a.path,namespace:'fixture'}:undefined);b.onLoad({filter:/.*/,namespace:'fixture'},a=>({contents:fixtures[a.path],loader:'tsx',resolveDir:process.cwd()}));}}]});
 const scoped=await browser.newPage();await scoped.goto('http://127.0.0.1:'+server.address().port);await scoped.evaluate(()=>{window.resultQueries=[];window.resultRequests=[]});await scoped.addScriptTag({content:hookBundle.outputFiles[0].text});
 await scoped.getByRole('status').waitFor();assert.equal(await scoped.evaluate(()=>window.resultQueries.length),1);
 await scoped.evaluate(()=>window.resultRequests[0].reject(Error('offline')));await scoped.getByRole('alert').waitFor();await scoped.getByRole('button',{name:'تحديث النتائج'}).click();
 await scoped.evaluate(()=>window.resultRequests[1].resolve({results:[{id:'r1'}],pagination:{hasNext:true},scope:{sampledStudentCount:2,studentCount:2}}));await scoped.getByText('التحليل للبيانات المحملة حاليًا؛ لم تكتمل تغطية جميع النتائج.').waitFor();
 await scoped.getByRole('button',{name:'تحميل نتائج إضافية'}).click();assert.deepEqual(await scoped.evaluate(()=>window.resultQueries.map(q=>[q.page,q.limit,q.quizId,q.includeReview])),[[1,100,'q',true],[1,100,'q',true],[2,100,'q',true]]);
 await scoped.getByRole('button',{name:'Change actor'}).click();await scoped.getByRole('status').waitFor();assert.equal(await scoped.locator('pre').innerText(),'[]');
 await scoped.evaluate(()=>window.resultRequests[2].resolve({results:[{id:'stale'}],pagination:{hasNext:false}}));assert.equal(await scoped.locator('pre').innerText(),'[]');
 await scoped.evaluate(()=>window.resultRequests[3].resolve({results:[{id:'r2'}],pagination:{hasNext:false},scope:{sampledStudentCount:1,studentCount:1}}));await scoped.getByRole('button',{name:'تحديث النتائج'}).waitFor();assert.equal(await scoped.locator('pre').innerText(),'[{"id":"r2"}]');
 const parent=fs.readFileSync('dashboards/admin/SupervisorDashboard.tsx','utf8');assert.ok(parent.includes('const examResults = resultEvidence.results;'));assert.ok(parent.includes('<SupervisorTestsManager resultEvidence={examResults}/>'));
 console.log('PASS scoped results hook: one initial bounded read, error/retry, opt-in pagination, review only by request, stale actor response discarded, supervisor parent wiring');
}finally{await browser.close();server.close();}
