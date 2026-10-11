import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { chromium } from 'playwright';

// Real React lifecycle with controllable EventSource errors and browser clock.
const bundle = await build({
  stdin: { resolveDir: process.cwd(), loader: 'tsx', contents: `
    import React from 'react';import {createRoot} from 'react-dom/client';
    import {useNotificationStream} from './contexts/useNotificationStream';
    window.streams=[]; window.networkOnline=true;
    Object.defineProperty(navigator,'onLine',{get:()=>window.networkOnline});
    window.EventSource=class {
      constructor(url,options){this.url=url;this.options=options;this.listeners={};this.closed=false;window.streams.push(this)}
      addEventListener(name,fn){this.listeners[name]=fn}
      close(){this.closed=true}
      emit(name,data){this.listeners[name]?.({data:JSON.stringify(data)})}
      fail(){this.onerror?.()}
    };
    function View(props){window.state=useNotificationStream(props);return null}
    const root=createRoot(document.getElementById('root'));
    window.render=(props)=>root.render(<View {...props}/>);window.dispose=()=>root.unmount();window.render({apiBase:'/api',enabled:true});
  ` },
  bundle: true, write: false,
  plugins: [{ name: 'api-fixture', setup(b) {
    b.onResolve({ filter: /services\/api$/ }, () => ({ path: 'api', namespace: 'fixture' }));
    b.onLoad({ filter: /.*/, namespace: 'fixture' }, () => ({ contents: `export const API_BASE_URL='/api';` }));
  } }],
});
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  await page.setContent('<div id="root"></div>');
  await page.clock.install();
  await page.addScriptTag({ content: bundle.outputFiles[0].text });
  await page.waitForFunction(() => window.streams.length === 1);
  assert.deepEqual(await page.evaluate(() => ({ url: streams[0].url, credentials: streams[0].options.withCredentials })), { url: '/api/notifications/stream', credentials: true });
  await page.evaluate(() => { streams[0].emit('connected', {}); streams[0].emit('unread_count', { count: 3 }); streams[0].emit('notification', { id: 'first', title: 'test' }); });
  await page.waitForFunction(() => state.isConnected && state.unreadCount === 3 && state.latestNotification.id === 'first');
  await page.evaluate(() => { streams[0].fail(); render({apiBase:'/other/api',enabled:true}); });
  await page.waitForFunction(() => streams.length === 2);
  await page.evaluate(() => { streams[0].fail(); streams[0].emit('unread_count',{count:999}); streams[1].emit('connected',{}); });
  await page.clock.fastForward(60_000);
  assert.equal(await page.evaluate(() => streams.length), 2, 'Old callback/timer cannot reconnect the old endpoint');
  assert.equal(await page.evaluate(() => state.unreadCount), 3, 'Old stream cannot overwrite current state');
  await page.evaluate(() => { streams[1].fail(); render({enabled:false}); });
  await page.waitForFunction(() => !state.isConnected && streams[1].closed);
  await page.clock.fastForward(60_000);
  assert.equal(await page.evaluate(() => streams.length), 2, 'Disabled stream leaves no reconnect timer');
  await page.evaluate(() => { networkOnline=false; render({enabled:true}); });
  await page.clock.fastForward(60_000);
  assert.equal(await page.evaluate(() => streams.length), 2, 'Offline browser makes no connection');
  await page.evaluate(() => { networkOnline=true; dispatchEvent(new Event('online')); });
  await page.waitForFunction(() => streams.length === 3);
  await page.evaluate(() => { networkOnline=false; dispatchEvent(new Event('offline')); });
  assert.equal(await page.evaluate(() => streams[2].closed), true);
  await page.evaluate(() => { networkOnline=true; dispatchEvent(new Event('online')); });
  await page.waitForFunction(() => streams.length === 4);
  for (let attempt = 1; attempt <= 10; attempt++) {
    await page.evaluate(() => streams.at(-1).fail());
    await page.clock.fastForward(5_000 * attempt);
    await page.waitForFunction(count => streams.length === count, 4 + attempt);
  }
  await page.evaluate(() => streams.at(-1).fail());
  await page.clock.fastForward(120_000);
  assert.equal(await page.evaluate(() => streams.length), 14, 'Ten failed reconnects retain the existing attempt cap');
  await page.evaluate(() => dispose());
  await page.evaluate(() => dispatchEvent(new Event('online')));
  await page.clock.fastForward(120_000);
  assert.equal(await page.evaluate(() => streams.length), 14, 'Unmount removes network listeners and reconnect work');
  assert.equal(await page.evaluate(() => streams.every(stream => stream.closed)), true);
  console.log('PASS notification SSE lifecycle: credentials, delivery, stale callbacks, endpoint changes, disabled/offline cleanup, online recovery, bounded retries and unmount');
} finally { await browser.close(); }
