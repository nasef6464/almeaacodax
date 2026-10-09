import { build } from 'esbuild';
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import assert from 'node:assert/strict';
const bundle = await build({ stdin: { contents: `import React,{useState}from'react';import{createRoot}from'react-dom/client';import{ClassroomSavedBatchesPanel}from'./components/classroom/ClassroomSavedBatchesPanel';const root=createRoot(document.getElementById('root'));function Host(){const[busy,setBusy]=useState(false);return <ClassroomSavedBatchesPanel sessionId='session' schoolId='school' questions={window.questions||[]} activeBatch={window.active||false} busy={busy} onBusyChange={setBusy} onReload={async()=>{await new Promise(r=>window.reloadDone=r)}}/>}window.mount=()=>root.render(<Host/>);window.mount();`, resolveDir: process.cwd(), loader: 'tsx' }, bundle: true, write: false, plugins: [{ name: 'api', setup(b) { b.onResolve({ filter: /services\/api$/ }, () => ({ path: 'fixture', namespace: 'fixture' })); b.onLoad({ filter: /.*/, namespace: 'fixture' }, () => ({ contents: `window.reads=0;window.posts=[];export const api={get:async()=>{window.reads++;return{templates:[{id:'a',title:'مهارة أولى',questionIds:['1','2','3','4','5']},{id:'b',title:'مهارة ثانية',questionIds:['6','7','8','9','10']},{id:'large',title:'كبيرة',questionIds:Array.from({length:21},(_,i)=>'L'+i)}]}},post:async(url,body)=>{window.posts.push(body);await new Promise(r=>window.sent=r);return{}}};`, loader: 'js' })); } }] });
const server = createServer((req, res) => { res.setHeader('Content-Type', 'text/html'); res.end('<div id="root"></div>'); });
await new Promise(r => server.listen(0, '127.0.0.1', r));
const browser = await chromium.launch({ headless: true });
try {
    const page = await browser.newPage();
    await page.goto('http://127.0.0.1:' + server.address().port);
    await page.addScriptTag({ content: bundle.outputFiles[0].text });
    const toggle = page.getByRole('button', { name: 'دفعاتي المحضرة — اختر دفعة وأرسلها' });
    await toggle.waitFor();
    assert.equal(await page.evaluate(() => window.reads), 0);
    await toggle.click();
    const send = page.getByRole('button', { name: 'إرسال الدفعة الآن' });
    await send.first().waitFor();
    assert.equal(await page.evaluate(() => window.reads), 1);
    assert.equal(await send.nth(2).isDisabled(), true);
    await toggle.click();
    await toggle.click();
    assert.equal(await page.evaluate(() => window.reads), 1);
    await send.first().click();
    await page.getByRole('button', { name: 'جارٍ الإرسال…' }).first().waitFor();
    assert.equal(await page.evaluate(() => window.posts.length), 1);
    await page.evaluate(() => window.sent());
    await page.waitForFunction(() => Boolean(window.reloadDone));
    assert.equal(await page.getByRole('button', { name: 'جارٍ الإرسال…' }).first().isDisabled(), true);
    await page.evaluate(() => { window.questions = [{ questionId: '1' }]; window.active = true; window.mount(); window.reloadDone(); });
    await page.getByRole('button', { name: 'أنه الدفعة الحالية أولًا' }).first().waitFor();
    assert.equal(await page.getByRole('button', { name: 'أنه الدفعة الحالية أولًا' }).first().isDisabled(), true);
    await page.evaluate(() => { window.active = false; window.mount(); });
    await page.getByRole('button', { name: 'سبق استخدامها' }).waitFor();
    assert.equal(await page.getByRole('button', { name: 'سبق استخدامها' }).isDisabled(), true);
    assert.equal(await page.getByRole('button', { name: 'إرسال الدفعة الآن' }).first().isEnabled(), true);
    assert.deepEqual(await page.evaluate(() => window.posts[0]), { questionIds: ['1', '2', '3', '4', '5'], autoPublishFirst: true });
    console.log('PASS saved batches: lazy cached read, whole prepared batch, pending reload lock, active batch gate, used/oversized batch prevention and next batch readiness');
}
finally {
    await browser.close();
    server.close();
}
