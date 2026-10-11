import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { chromium } from 'playwright';

// Exercise the real page: a manual click races its automatic join, then retry.
const fixtures = {
  api: `export const api={instantJoinClassroomSession:id=>new Promise((resolve,reject)=>window.requests.push({id,resolve,reject})),getClassroomCurrentQuestion:async id=>{window.reads.push(id);return {questions:[]}},get:async()=>({})};`,
  auth: `export const useAuth=()=>({user:window.student,loading:false});`,
  realtime: `export const useClassroomRealtime=()=>{};`,
  router: `export const useParams=()=>({sessionId:window.sessionId});export const Navigate=()=>null;`,
};
const bundle = await build({
  stdin: { resolveDir: process.cwd(), loader: 'tsx', contents: `
    import React from 'react';import {createRoot} from 'react-dom/client';
    import {ClassroomStudentLive} from './pages/ClassroomStudentLive';
    window.requests=[];window.reads=[];window.student={role:'student',id:'trial'};window.sessionId='first';
    const root=createRoot(document.getElementById('root'));window.render=()=>root.render(<ClassroomStudentLive/>);window.render();
  ` }, bundle: true, write: false,
  plugins: [{ name: 'join-fixtures', setup(b) {
    b.onResolve({ filter: /services\/api$/ }, () => ({ path: 'api', namespace: 'fixture' }));
    b.onResolve({ filter: /contexts\/AuthContext$/ }, () => ({ path: 'auth', namespace: 'fixture' }));
    b.onResolve({ filter: /hooks\/useClassroomRealtime$/ }, () => ({ path: 'realtime', namespace: 'fixture' }));
    b.onResolve({ filter: /^react-router-dom$/ }, () => ({ path: 'router', namespace: 'fixture' }));
    b.onLoad({ filter: /.*/, namespace: 'fixture' }, args => ({ contents: fixtures[args.path] }));
  } }],
});
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('http://fixture.local/**',route=>route.fulfill({contentType:'text/html',body:'<div id="root"></div>'}));
  await page.goto('http://fixture.local/');await page.addScriptTag({content:bundle.outputFiles[0].text});
  await page.waitForFunction(()=>requests.length===1);
  await page.getByRole('button',{name:'انضمام فوري بدون رمز',exact:true}).click();
  assert.equal(await page.evaluate(()=>requests.length),1,'Automatic join and explicit click share one request');
  await page.evaluate(()=>requests[0].reject(new Error('retry allowed')));
  await page.getByRole('button',{name:'انضمام فوري بدون رمز',exact:true}).waitFor({state:'visible'});
  await page.waitForFunction(()=>!document.querySelector('button.mt-3')?.disabled);
  await page.getByRole('button',{name:'انضمام فوري بدون رمز',exact:true}).click();
  assert.equal(await page.evaluate(()=>requests.length),2,'A failed join can be retried');
  await page.evaluate(()=>requests[1].resolve({joined:true}));
  await page.getByRole('heading',{name:'تابع الشرح مع المعلم'}).waitFor();
  assert.deepEqual(await page.evaluate(()=>reads),['first'],'Joined state performs one initial question read');
  assert.equal(await page.evaluate(()=>sessionStorage.getItem('classroom_session_id')),'first');
  assert.equal(await page.evaluate(()=>sessionStorage.getItem('classroom_joined')),'true');
  assert.deepEqual(errors,[]);
  console.log('PASS real classroom page: one in-flight automatic/manual join, failed retry, joined waiting UI and storage');
} finally { await browser.close(); }
