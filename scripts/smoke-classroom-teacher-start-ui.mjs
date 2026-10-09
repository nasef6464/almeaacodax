import { createServer } from 'node:http';
import { build } from 'esbuild';
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
const fixtures = {
    '../services/api': `window.calls={workspace:0,active:0,create:0,activeSchools:[]};export const api={getTeacherActiveClassroomSession:async schoolId=>{window.calls.active++;window.calls.activeSchools.push(schoolId);return window.resumeExisting?{hasActiveSession:true,session:{sessionId:"existing"}}:{hasActiveSession:false}},getSchoolTeacherWorkspace:()=>{window.calls.workspace++;return new Promise((resolve,reject)=>{window.workspaceResolve=resolve;window.workspaceReject=reject})},createClassroomSession:body=>{window.calls.create++;window.createBody=body;return new Promise((resolve,reject)=>{window.createResolve=resolve;window.createReject=reject})}};`,
    '../contexts/AuthContext': `export const useAuth=()=>({user:{role:'teacher'}});`,
    '../hooks/useClassroomRealtime': `export const useClassroomRealtime=()=>{};`,
    '../components/classroom/ClassroomPreparedTemplatesManager': `import React from'react';export const ClassroomPreparedTemplatesManager=({onApplyTemplate})=><button onClick={()=>onApplyTemplate({id:'saved',title:'Prepared',questionIds:['q1','q2','q3','q4','q5'],challengeIds:[]})}>Apply prepared</button>;`,
    '../components/classroom/ClassroomActiveSessionPanel': `export const ClassroomActiveSessionPanel=()=>null;`,
    '../components/classroom/ClassroomQuestionFilterBar': `export const ClassroomQuestionFilterBar=()=>null;`,
    '../components/classroom/QuestionContentRenderer': `export const QuestionContentRenderer=()=>null;`
};
const bundle = await build({ stdin: { contents: `import React from'react';import{createRoot}from'react-dom/client';import{MemoryRouter,Routes,Route}from'react-router-dom';import{ClassroomTeacherConsole}from'./pages/ClassroomTeacherConsole';createRoot(document.getElementById('root')).render(<MemoryRouter initialEntries={['/classroom/teacher?schoolId=s2&classId=c3']}><Routes><Route path='/classroom/teacher' element={<ClassroomTeacherConsole/>}/><Route path='/classroom/:sessionId/teacher' element={<div>Session started</div>}/></Routes></MemoryRouter>);`, resolveDir: process.cwd(), loader: 'tsx' }, bundle: true, write: false, plugins: [{ name: 'fixtures', setup(b) { b.onResolve({ filter: /.*/ }, args => fixtures[args.path] ? { path: args.path, namespace: 'fixture' } : undefined); b.onLoad({ filter: /.*/, namespace: 'fixture' }, args => ({ contents: fixtures[args.path], loader: 'tsx', resolveDir: process.cwd() })); } }] });
const workspace = { schools: [{ schoolId: 's1', schoolName: 'School1', smartClassroomEnabled: true, assignments: [{ assignmentId: 'a1', classId: 'c1', className: 'Class1' }] }, { schoolId: 's2', schoolName: 'School2', smartClassroomEnabled: true, assignments: [{ assignmentId: 'a2', classId: 'c2', className: 'Class2' }, { assignmentId: 'a3', classId: 'c3', className: 'Class3' }] }] };
const server = createServer((req, res) => { res.setHeader('Content-Type', 'text/html'); res.end('<div id="root"></div>'); });
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const browser = await chromium.launch({ headless: true });
try {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto('http://127.0.0.1:' + server.address().port);
    await page.addScriptTag({ content: bundle.outputFiles[0].text });
    await page.getByText('جارٍ تحميل فصولك…').waitFor();
    assert.equal(await page.evaluate(() => window.calls.workspace), 1);
    await page.evaluate(() => window.workspaceReject(Error('offline')));
    await page.getByRole('alert').waitFor();
    await page.getByRole('button', { name: 'إعادة المحاولة' }).click();
    await page.getByText('جارٍ تحميل فصولك…').waitFor();
    await page.evaluate(w => window.workspaceResolve(w), workspace);
    const selects = page.locator('select');
    await selects.first().waitFor();
    assert.equal(await selects.nth(0).inputValue(), 's2');
    assert.equal(await selects.nth(1).inputValue(), 'c3');
    await selects.nth(1).selectOption('c2');
    await selects.first().selectOption('s1');
    assert.equal(await selects.nth(1).inputValue(), 'c1');
    assert.equal(await page.evaluate(() => window.calls.workspace), 2);
    assert.equal(await page.evaluate(() => window.calls.active), 2);
    assert.deepEqual(await page.evaluate(() => window.calls.activeSchools), ['s2', 's1']);
    await page.getByRole('button', { name: 'Apply prepared' }).click();
    assert.equal(await page.getByRole('button', { name: 'ابدأ وأرسل التحديد الآن (5 أسئلة)' }).count(), 1);
    const start = page.getByRole('button', { name: 'ابدأ الحصة — الطلاب في الانتظار' });
    await start.click();
    await page.getByRole('button', { name: 'جارٍ بدء الحصة…' }).waitFor();
    assert.equal(await page.evaluate(() => window.calls.create), 1);
    assert.equal(await page.getByRole('button', { name: 'جارٍ بدء الحصة…' }).isDisabled(), true);
    assert.equal(await selects.first().isDisabled(), true);
    assert.equal(await selects.nth(1).isDisabled(), true);
    assert.deepEqual(await page.evaluate(() => window.createBody), { schoolId: 's1', classId: 'c1', questionIds: [], publishedMode: 'batch', autoStart: true });
    await page.evaluate(() => window.createReject(Error('temporary')));
    await start.waitFor();
    assert.equal(await start.isEnabled(), true);
    await start.click();
    await page.evaluate(() => window.createResolve({ sessionId: 'controlled', pin: '000000' }));
    await page.getByText('Session started').waitFor();
    assert.equal(await page.evaluate(() => window.calls.create), 2);
    assert.deepEqual(errors, []);
    const resumed = await browser.newPage();
    await resumed.goto('http://127.0.0.1:' + server.address().port);
    await resumed.evaluate(() => { window.resumeExisting = true; });
    await resumed.addScriptTag({ content: bundle.outputFiles[0].text });
    await resumed.getByText('جارٍ تحميل فصولك…').waitFor();
    await resumed.evaluate(w => window.workspaceResolve(w), workspace);
    await resumed.getByText('Session started').waitFor();
    assert.deepEqual(await resumed.evaluate(() => window.calls.activeSchools), ['s2']);
    assert.equal(await resumed.evaluate(() => window.calls.create), 0);
    await resumed.close();
    console.log('PASS real teacher component: visible loading/error/retry, URL selection, zero reads on selector changes, one pending create, locked target, retry and navigation');
}
finally {
    await browser.close();
    server.close();
}
