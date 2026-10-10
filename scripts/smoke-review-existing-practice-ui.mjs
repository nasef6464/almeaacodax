import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { createServer } from 'node:http';
import { chromium } from 'playwright';
import { readFileSync, readdirSync } from 'node:fs';

// Render the real review screens; only network and unrelated tutor/media panels are replaced.
const bundle = await build({ stdin: { loader: 'tsx', resolveDir: process.cwd(), contents: `
import React from 'react'; import {createRoot} from 'react-dom/client';
import {MemoryRouter, Routes, Route, useNavigate} from 'react-router-dom';
import Favorites from './pages/Favorites'; import ReviewSession from './pages/ReviewSession';
const q=(id,text,correct=1)=>({cardId:'card-'+id,questionId:id,reasons:{saved:true,mistake:true},question:{id,text,options:['<b>اختيار أول</b>','<b>اختيار ثان</b>'],correctOptionIndex:correct,explanation:'<p>شرح '+id+'</p>'}});
window.batch=[q('existing-21','<p>سؤال موجود 21</p><script>window.unsafe=true</script>'),q('existing-22','<p>سؤال موجود 22</p>')];
window.calls=[]; window.saves=[]; window.failSave=false; window.failLoad=false;
window.library=async(scope)=>{window.calls.push(scope); if(window.failLoad)throw Error('fixture load failure'); if(window.deferPage===scope.page||window.deferTab===scope.tab)return new Promise(r=>window.resolveOld=r); return {items:scope.page===2?window.batch:[q('first-page','الصفحة الأولى')],page:scope.page,hasMore:scope.page===1,total:22,counts:{saved:22,mistakes:22}}};
window.answer=async(id,body)=>{window.saves.push({id,...body});if(window.failSave)throw Error('fixture save failure');if(window.deferSave)return new Promise(r=>window.resolveSave=r);return {isCorrect:body.selectedOptionIndex===1}};
function App(){const navigate=useNavigate();window.navigate=navigate;return <Routes><Route path="/favorites" element={<Favorites/>}/><Route path="/review" element={<ReviewSession/>}/></Routes>}
createRoot(document.getElementById('root')).render(<MemoryRouter initialEntries={['/favorites']}><App/></MemoryRouter>);
` }, bundle: true, write: false, plugins: [{ name: 'review-fixture', setup(b) {
  b.onResolve({ filter: /services\/api$/ }, () => ({ path: 'api', namespace: 'fixture' }));
  b.onResolve({ filter: /results\/Question(AssistantPanel|VoiceExplanationPlayer)$/ }, a => ({ path: a.path, namespace: 'panel' }));
  b.onLoad({ filter: /.*/, namespace: 'fixture' }, () => ({ contents: `export const api={getStudentReviewLibrary:s=>window.library(s),getReviewDue:s=>window.library({...s,page:1}),answerReviewCard:(id,b)=>window.answer(id,b)};` }));
  b.onLoad({ filter: /.*/, namespace: 'panel' }, () => ({ contents: `export const QuestionAssistantPanel=()=>null;export const QuestionVoiceExplanationPlayer=()=>null;` }));
} }] });
const css = readdirSync('dist/assets').find(n => /^index-.*\.css$/.test(n));
const server = createServer((req, res) => {
  if (req.url === '/fixture.js') { res.setHeader('Content-Type', 'text/javascript'); return res.end(bundle.outputFiles[0].text); }
  if (req.url === '/fixture.css') { res.setHeader('Content-Type', 'text/css'); return res.end(readFileSync('dist/assets/' + css)); }
  res.end('<html lang="ar" dir="rtl"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="/fixture.css"><div id="root"></div><script src="/fixture.js"></script></html>');
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage(); const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('http://127.0.0.1:' + server.address().port);
  await page.getByRole('button', { name: /الصفحة التالية/ }).click();
  const practice = page.getByRole('link', { name: /تدرّب على هذه الأسئلة/ });
  await practice.waitFor();
  assert.equal(await practice.getAttribute('href'), '/review?mode=saved&page=2');
  await practice.click();
  await page.getByRole('heading', { name: 'سؤال موجود 21' }).waitFor();
  assert.equal(await page.evaluate(() => window.unsafe), undefined);
  assert.equal(await page.getByText('الصفحة الأولى', { exact: true }).count(), 0);
  await page.getByRole('button', { name: 'اختيار ثان', exact: true }).click();
  await page.evaluate(() => { window.failSave = true; });
  await page.getByRole('button', { name: 'تحقق وسجّل المراجعة' }).click();
  await page.getByText('تعذر حفظ نتيجة المراجعة. حاول مرة أخرى.').waitFor();
  assert.equal(await page.getByText(/إجابة صحيحة!/).count(), 0);
  await page.evaluate(() => { window.failSave = false; });
  await page.getByRole('button', { name: 'تحقق وسجّل المراجعة' }).click();
  await page.getByText('شرح existing-21', { exact: true }).waitFor();
  assert.equal(await page.evaluate(() => window.saves[0].eventId === window.saves[1].eventId), true);
  await page.getByRole('button', { name: /السؤال التالي/ }).click();
  await page.getByRole('heading', { name: 'سؤال موجود 22' }).waitFor();
  await page.getByRole('button', { name: 'اختيار أول', exact: true }).click();
  await page.getByRole('button', { name: 'تحقق وسجّل المراجعة' }).click();
  await page.getByText('شرح existing-22', { exact: true }).waitFor();
  await page.getByText('إجابة غير صحيحة', { exact: true }).waitFor();
  // Last answer must keep feedback visible until the student requests the summary.
  assert.equal(await page.getByRole('button', { name: 'أعد التدريب على نفس الأسئلة' }).count(), 0);
  await page.getByRole('button', { name: /عرض ملخص الاختبار التدريبي/ }).click();
  await page.getByText('50%', { exact: true }).waitFor();
  assert.deepEqual(await page.evaluate(() => window.saves.map(s=>[s.id,s.selectedOptionIndex])), [['card-existing-21',1],['card-existing-21',1],['card-existing-22',0]]);
  const calls = await page.evaluate(() => window.calls.length);
  await page.evaluate(() => { window.batch = []; });
  await page.getByRole('button', { name: 'أعد التدريب على نفس الأسئلة' }).click();
  await page.getByRole('heading', { name: 'سؤال موجود 21' }).waitFor();
  assert.equal(await page.evaluate(() => window.calls.length), calls);
  for (const width of [1280, 390]) {
    await page.setViewportSize({ width, height: 850 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  }
  await page.evaluate(() => { window.failLoad = true; window.navigate('/review?mode=mistakes&page=2'); });
  await page.getByRole('alert').waitFor();
  await page.evaluate(() => { window.failLoad = false; window.batch = [{cardId:'new-card',questionId:'new-question',question:{id:'new-question',text:'دفعة جديدة',options:['أ','ب'],correctOptionIndex:1}}]; });
  await page.getByRole('button', { name: 'إعادة المحاولة', exact: true }).click();
  await page.getByRole('heading', { name: 'دفعة جديدة' }).waitFor();
  // A late response from a previous route cannot overwrite the active batch.
  await page.evaluate(() => { window.deferPage = 3; window.navigate('/review?mode=saved&page=3'); });
  await page.waitForFunction(() => Boolean(window.resolveOld));
  await page.evaluate(() => { window.navigate('/review?mode=saved&page=2'); });
  await page.getByRole('heading', { name: 'دفعة جديدة' }).waitFor();
  await page.evaluate(() => { window.resolveOld({items:[{cardId:'stale',questionId:'stale',question:{id:'stale',text:'دفعة قديمة',options:[]}}]}); });
  await page.waitForTimeout(50);
  assert.equal(await page.getByRole('heading', { name: 'دفعة قديمة' }).count(), 0);
  await page.evaluate(() => { window.deferSave = true; });
  await page.getByRole('button', { name: 'ب', exact: true }).click();
  await page.getByRole('button', { name: 'تحقق وسجّل المراجعة' }).click();
  await page.waitForFunction(() => Boolean(window.resolveSave));
  await page.evaluate(() => { window.navigate('/review?mode=mistakes&page=2'); });
  await page.getByRole('heading', { name: 'دفعة جديدة' }).waitFor();
  await page.evaluate(() => { window.resolveSave({isCorrect:true}); });
  await page.waitForTimeout(50);
  assert.equal(await page.getByText(/إجابة صحيحة!/).count(), 0);
  assert.equal(await page.getByRole('button', { name: 'ب', exact: true }).isEnabled(), true);
  await page.evaluate(() => {
    window.deferSave = false;
    window.batch = [{cardId:'image-card',questionId:'image-question',question:{id:'image-question',text:'سؤال الصورة',imageUrl:'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="100"></svg>',imageAlt:'صورة السؤال الأصلي',optionsEmbeddedInImage:true,options:['نص أول','نص ثان','نص ثالث','نص رابع'],correctOptionIndex:1}}];
    window.navigate('/review?mode=saved&page=2');
  });
  await page.getByAltText('صورة السؤال الأصلي').waitFor();
  await page.getByRole('button', { name: 'أ', exact: true }).click();
  await page.getByRole('button', { name: 'تحقق وسجّل المراجعة' }).click();
  await page.getByText('الإجابة الصحيحة هي: ب').waitFor();
  assert.equal(await page.evaluate(() => window.saves.at(-1).selectedOptionIndex), 0);
  await page.evaluate(() => { window.deferTab = 'saved'; window.resolveOld = undefined; window.navigate('/favorites'); });
  await page.waitForFunction(() => Boolean(window.resolveOld));
  await page.getByRole('button', { name: /أخطأت فيها/ }).click();
  await page.getByText('الصفحة الأولى', { exact: true }).waitFor();
  await page.evaluate(() => { window.resolveOld({items:[{question:{id:'stale',text:'محفوظات قديمة',options:[]}}],page:2,total:1}); });
  await page.waitForTimeout(50);
  assert.equal(await page.getByText('محفوظات قديمة', { exact: true }).count(), 0);
  assert.equal(await page.getByRole('link', { name: /تدرّب على هذه الأسئلة/ }).getAttribute('href'), '/review?mode=mistakes&page=1');
  assert.deepEqual(errors, []);
  console.log('Existing review page, canonical answer indices, idempotent save retry, last feedback, same-batch restart without reads, load recovery, stale response and responsive UI: PASS');
} finally { await browser.close(); await new Promise(r => server.close(r)); }
