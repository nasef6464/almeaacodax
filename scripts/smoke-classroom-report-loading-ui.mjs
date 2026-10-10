import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { build } from 'esbuild';
import { chromium } from 'playwright';

const server = createServer((_req, res) => { res.setHeader('content-type', 'text/html'); res.end('<div id="root"></div>'); });
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const bundled = await build({ stdin: { contents: `
import React,{useState} from 'react';import{createRoot}from'react-dom/client';
import{MemoryRouter}from'react-router-dom';
import{useClassroomTeacherReports}from'./hooks/useClassroomTeacherReports';
import{SmartClassroomReportsSection}from'./components/classroom/SmartClassroomReportsSection';
import{ClassSkillGapsRadar}from'./components/classroom/ClassSkillGapsRadar';
function Harness(){const[school,setSchool]=useState('school-a');const state=useClassroomTeacherReports(school,window.mode==='hook');
return <MemoryRouter><button onClick={()=>setSchool('school-b')}>Change school</button>{window.mode==='hook'?<><pre>{JSON.stringify(state.reports.map(r=>r.sessionId))}</pre><p role="alert">{state.error}</p><button onClick={()=>void state.reload()}>Reload</button></>:window.mode==='radar'?<ClassSkillGapsRadar schoolId={school} assignments={[]}/>:<SmartClassroomReportsSection schoolId={school} assignments={[]} smartClassroomEnabled/>}</MemoryRouter>}
createRoot(document.getElementById('root')).render(<Harness/>);`, resolveDir: process.cwd(), loader: 'tsx' }, bundle: true, write: false, plugins: [{ name: 'mail-free-api-fixture', setup(builder) {
  builder.onResolve({ filter: /services\/api$/ }, () => ({ path: 'api', namespace: 'fixture' }));
  builder.onLoad({ filter: /.*/, namespace: 'fixture' }, () => ({ contents: `export const api={getClassroomTeacherHistory:(schoolId,token,view)=>new Promise((resolve,reject)=>window.historyRequests.push({schoolId,view,resolve,reject})),get:(path)=>new Promise((resolve,reject)=>window.detailRequests.push({path,resolve,reject}))};`, loader: 'js' }));
} }] });
const browser = await chromium.launch({ headless: true });
const fixture = { sessionId: 'saved-session', schoolId: 'school-b', classId: 'class', className: 'الفصل التجريبي', status: 'ended', endedAt: '2026-10-10T10:00:00Z', roster: { expected: 24, joined: 24, absentFromSession: 0 }, totals: { responses: 10, correct: 6 }, questions: [{ questionId: 'q', text: 'سؤال محفوظ', skillIds: ['skill'], pathId: 'path', subject: 'رياضيات', answered: 10, correct: 6 }] };
const open = async mode => { const page = await browser.newPage(); await page.goto('http://127.0.0.1:' + server.address().port); await page.evaluate(mode => { window.mode = mode; window.historyRequests = []; window.detailRequests = []; }, mode); await page.addScriptTag({ content: bundled.outputFiles[0].text }); await page.waitForFunction(() => window.historyRequests.length === 1); return page; };
try {
  const hook = await open('hook');
  assert.deepEqual(await hook.evaluate(() => window.historyRequests.map(r => [r.schoolId, r.view])), [['school-a', 'summary']]);
  await hook.getByRole('button', { name: 'Reload', exact: true }).click();
  assert.equal(await hook.evaluate(() => window.historyRequests.length), 1, 'pending request must not duplicate');
  await hook.getByRole('button', { name: 'Change school' }).click();
  await hook.waitForFunction(() => window.historyRequests.length === 2);
  await hook.evaluate(fixture => window.historyRequests[0].resolve({ sessions: [{ ...fixture, sessionId: 'old-school' }] }), fixture);
  assert.equal(await hook.locator('pre').innerText(), '[]', 'old school response must not appear');
  await hook.evaluate(() => window.historyRequests[1].reject(Error('gateway 502')));
  await hook.getByRole('alert').filter({ hasText: 'تعذر تحميل' }).waitFor();
  await hook.getByRole('button', { name: 'Reload', exact: true }).click();
  await hook.waitForFunction(() => window.historyRequests.length === 3);
  await hook.evaluate(fixture => window.historyRequests[2].resolve({ sessions: [fixture] }), fixture);
  await hook.waitForFunction(() => document.querySelector('pre').textContent === '["saved-session"]');
  assert.equal(await hook.getByRole('alert').innerText(), '');
  await hook.close();

  const report = await open('report');
  await report.evaluate(fixture => window.historyRequests[0].resolve({ sessions: [fixture] }), fixture);
  await report.getByRole('button').filter({ hasText: 'الفصل التجريبي' }).click();
  await report.waitForFunction(() => window.detailRequests.length === 1);
  await report.evaluate(() => window.detailRequests[0].reject(Error('gateway 502')));
  await report.getByRole('button', { name: 'إعادة تحميل تفاصيل الطلاب' }).click();
  await report.waitForFunction(() => window.detailRequests.length === 2);
  assert.equal(await report.evaluate(() => window.historyRequests.length), 1, 'detail retry must not reload history');
  await report.evaluate(() => window.detailRequests[1].resolve({ report: { studentEvidenceComplete: true, students: [] } }));
  await report.waitForFunction(() => !document.querySelector('[role="status"]'));
  assert.equal(await report.getByRole('button', { name: 'إعادة تحميل تفاصيل الطلاب' }).count(), 0);
  assert.equal(await report.evaluate(() => window.detailRequests.every(r => r.path.endsWith('/aggregate?view=report'))), true);
  await report.close();

  const radar = await open('radar');
  await radar.evaluate(() => window.historyRequests[0].reject(Error('offline')));
  await radar.getByRole('alert').waitFor();
  assert.equal(await radar.getByText('لا توجد أدلة مهارية مطابقة للنطاق المحدد حتى الآن.').count(), 0, 'failure must not masquerade as no evidence');
  await radar.getByRole('button', { name: 'إعادة تحميل المهارات' }).click();
  await radar.waitForFunction(() => window.historyRequests.length === 2);
  await radar.evaluate(fixture => window.historyRequests[1].resolve({ sessions: [fixture] }), fixture);
  await radar.getByRole('heading', { name: 'skill' }).waitFor();
  assert.equal(await radar.evaluate(() => window.historyRequests.every(r => r.view === 'summary')), true);
  assert.equal(await radar.evaluate(() => window.detailRequests.length), 0, 'radar must not fetch student detail');
  assert.equal(await radar.getByText('60%', { exact: true }).count() > 0, true);
  await radar.setViewportSize({ width: 390, height: 844 });
  assert.equal(await radar.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  await radar.close();
  console.log('PASS classroom report loading: summary reads, pending deduplication, school response isolation, explicit errors/retry, detail-only retry, preserved skill accuracy, mobile width');
} finally { await browser.close(); server.close(); }
