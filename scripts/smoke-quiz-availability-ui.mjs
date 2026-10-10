import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { createServer } from 'node:http';
import { chromium } from 'playwright';
import { readFileSync, readdirSync } from 'node:fs';

const policyBundle = await build({ entryPoints: ['server/src/modules/quizzes/application/quizAvailability.ts'], bundle: true, write: false, platform: 'node', format: 'esm' });
const policy = await import('data:text/javascript;base64,' + Buffer.from(policyBundle.outputFiles[0].text).toString('base64'));
const clientBundle = await build({ entryPoints: ['utils/quizAvailability.ts'], bundle: true, write: false, format: 'esm' });
const client = await import('data:text/javascript;base64,' + Buffer.from(clientBundle.outputFiles[0].text).toString('base64'));
const now = Date.now();
for (const quiz of [{}, { dueDate: '2000-01-01' }, { opensAt: new Date(now + 60000).toISOString() }, { closesAt: new Date(now - 1).toISOString() }, { opensAt: new Date(now).toISOString(), closesAt: new Date(now).toISOString() }]) {
  assert.equal(client.getQuizAvailability(quiz, now), policy.getQuizAvailability(quiz, now));
}
assert.throws(() => policy.validateQuizWindow({ opensAt: '2026-10-10T12:00:00Z', closesAt: '2026-10-10T11:00:00Z' }));
const timestamp = '2026-10-10T12:00:00Z';
assert.equal(client.fromLocalDateTimeInput(client.toLocalDateTimeInput(timestamp)), timestamp.replace('Z', '.000Z'));

const bundle = await build({ stdin: { loader: 'tsx', resolveDir: process.cwd(), contents: `
import React from 'react'; import {createRoot} from 'react-dom/client'; import {MemoryRouter} from 'react-router-dom';
import {SchoolTestsPanel} from './components/SchoolTestsPanel'; import {QuizAssignWidget} from './dashboards/admin/QuizAssignWidget'; import {QuizRetakeDialog} from './dashboards/admin/QuizRetakeDialog';
const root=createRoot(document.getElementById('root')); window.calls=[];
const quiz={id:'q',title:'اختبار المهارة',settings:{maxAttempts:1},questionIds:['q1'],targetUserIds:['s']};
window.renderFixture=(mode='school',extra={})=>root.render(<MemoryRouter><main dir="rtl">{mode==='assign'?<QuizAssignWidget quizId="q" quizTitle="اختبار" scopedGroups={[]} scopedStudents={[{id:'s',name:'طالب التجربة'}]} existingConfig={{targetUserIds:['s'],opensAt:'2030-01-01T12:00:00Z',closesAt:'2030-01-02T12:00:00Z'}} onAssign={async config=>{window.calls.push(config)}}/>:mode==='retake'?<QuizRetakeDialog quizId="q" title="اختبار" students={[{id:'s',name:'طالب التجربة'}]} onClose={()=>{}}/>:<SchoolTestsPanel quizzes={[{...quiz,...extra}]} examResults={extra.viewerRetakeGranted?[{quizId:'q',date:'2026-10-09',score:20}]:[]} getPathName={()=>'رياضيات'} formatQuizDate={v=>v||''}/>}</main></MemoryRouter>); window.renderFixture();
` }, bundle: true, write: false, plugins: [{ name: 'api-fixture', setup(b) {
  b.onResolve({ filter: /services\/api$/ }, () => ({ path: 'api', namespace: 'fixture' }));
  b.onLoad({ filter: /.*/, namespace: 'fixture' }, () => ({ contents: `export const api={grantQuizRetakes:async(id,body)=>{window.calls.push({id,...body}); if(window.fail)throw new Error('تعذر الحفظ'); return {grantedStudentIds:body.studentIds}}};` }));
} }] });
const css = readdirSync('dist/assets').find(n => /^index-.*\.css$/.test(n));
const server = createServer((req, res) => {
  if (req.url === '/fixture.js') { res.setHeader('Content-Type', 'text/javascript'); return res.end(bundle.outputFiles[0].text); }
  if (req.url === '/style.css') { res.setHeader('Content-Type', 'text/css'); return res.end(readFileSync('dist/assets/' + css)); }
  res.end('<html><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/style.css"></head><body><div id="root"></div><script src="/fixture.js"></script></body></html>');
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const browser = await chromium.launch();
const errors = [];
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('http://127.0.0.1:' + server.address().port);
  await page.getByRole('link', { name: /دخول الاختبار الآن/ }).waitFor();
  await page.evaluate(() => window.renderFixture('school', { opensAt: new Date(Date.now() + 2500).toISOString() }));
  await page.getByRole('button', { name: /قادمة \(1\)/ }).click();
  await page.getByText('يفتح في موعده').waitFor();
  await page.getByRole('link', { name: /دخول الاختبار الآن/ }).waitFor(); // local boundary timer, no polling
  await page.evaluate(() => window.renderFixture('school', { closesAt: '2000-01-01T00:00:00Z' }));
  await page.getByRole('button', { name: /انتهت إتاحتها \(1\)/ }).click();
  await page.getByText('انتهت الإتاحة').first().waitFor();
  assert.equal(await page.getByRole('link', { name: /دخول الاختبار الآن/ }).count(), 0);
  await page.evaluate(() => window.renderFixture('school', { viewerRetakeGranted: true, settings: { maxAttempts: 2 } }));
  await page.getByRole('button', { name: /المطلوب مني \(1\)/ }).click();
  await page.getByRole('link', { name: /محاولة أخرى/ }).waitFor();
  await page.getByRole('link', { name: /عرض التقرير الكامل/ }).waitFor();
  assert.equal(await page.getByRole('button', { name: /المطلوب مني \(1\)/ }).count(), 1);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await page.evaluate(() => window.renderFixture('assign'));
  await page.getByLabel('بداية الإتاحة').waitFor();
  assert.ok((await page.getByLabel('بداية الإتاحة').inputValue()).includes('2030-01-01'));
  await page.getByLabel('بداية الإتاحة').fill(''); await page.getByLabel('نهاية الإتاحة').fill('');
  await page.getByRole('button', { name: 'توجيه الاختبار', exact: true }).click();
  await page.getByText('تم التوجيه بنجاح!').waitFor();
  const cleared = await page.evaluate(() => window.calls.at(-1));
  assert.equal(cleared.opensAt, null); assert.equal(cleared.closesAt, null); assert.equal(cleared.dueDate, '');
  await page.evaluate(() => { window.calls = []; window.fail = true; window.renderFixture('retake'); });
  await page.getByRole('dialog').waitFor();
  await page.getByRole('checkbox').check();
  await page.getByLabel('نهاية الإعادة').fill('2030-01-02T12:00');
  await page.getByRole('button', { name: 'حفظ إتاحة المختارين' }).click();
  await page.getByRole('alert').waitFor();
  await page.evaluate(() => { window.fail = false; });
  await page.getByRole('button', { name: 'حفظ إتاحة المختارين' }).click();
  await page.getByRole('status').waitFor();
  assert.deepEqual((await page.evaluate(() => window.calls.at(-1))).studentIds, ['s']);
  assert.deepEqual(errors, []);
  console.log('Quiz window parity, local boundary timer, preserved reports, ISO editor clearing and selective retake retry UI: PASS');
} finally { await browser.close(); await new Promise(r => server.close(r)); }
