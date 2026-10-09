import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createServer, request } from 'node:http';
import { createRequire } from 'node:module';
import { build } from 'esbuild';
import { chromium } from 'playwright';
const { Server } = createRequire(new URL('../server/package.json', import.meta.url))('socket.io');
const config = JSON.parse(fs.readFileSync('vercel.json', 'utf8'));
const socketRoute = config.rewrites.findIndex(r => r.source === '/socket.io/:path*');
assert.ok(socketRoute >= 0 && socketRoute < config.rewrites.findIndex(r => r.source === '/:path*'));
assert.equal(config.rewrites[socketRoute].destination, config.rewrites.find(r => r.source === '/api/:path*').destination.replace('/api/:path*', '/socket.io/:path*'));
assert.ok(config.headers.some(r => r.source === '/socket.io/:path*' && r.headers.some(h => h.key === 'Cache-Control' && h.value === 'no-store')));
const backend = createServer();
const io = new Server(backend, { cors: { origin: true, credentials: true } });
let accepted = 0, denied = 0;
io.use((socket, next) => socket.handshake.headers.cookie?.includes('fixture_auth=allowed') ? next() : (denied++, next(new Error('Authentication required'))));
io.on('connection', socket => { accepted++; socket.on('workspace:join', (room, ack) => { socket.join(room); ack?.({ ok: true }); }); });
await new Promise(r => backend.listen(0, '127.0.0.1', r));
const proxy = createServer((req, res) => {
  const parsed = new URL(req.url, 'http://proxy');
  if (parsed.pathname === '/socket.io/') { res.writeHead(404); res.end(); return; }
  if (parsed.pathname !== '/socket.io') { res.setHeader('Content-Type', 'text/html'); res.end('<div id="root"></div>'); return; }
  const upstream = request({ hostname: '127.0.0.1', port: backend.address().port, path: '/socket.io/' + parsed.search, method: req.method, headers: req.headers }, source => { res.writeHead(source.statusCode, { ...source.headers, 'cache-control': 'no-store' }); source.pipe(res); });
  upstream.on('error', () => { res.writeHead(502); res.end(); }); req.pipe(upstream);
});
await new Promise(r => proxy.listen(0, '127.0.0.1', r));
const makeBundle = apiBase => build({ stdin: { contents: `import React from'react';import{createRoot}from'react-dom/client';import{useClassroomRealtime}from'./hooks/useClassroomRealtime';window.changes=[0,0];function Subscriber({index}){useClassroomRealtime('session',()=>{window.changes[index]++});return null}const root=createRoot(document.getElementById('root'));window.dispose=()=>root.unmount();root.render(<><Subscriber index={0}/><Subscriber index={1}/></>);`, resolveDir: process.cwd(), loader: 'tsx' }, bundle: true, write: false, plugins: [{ name: 'relative-api', setup(b) { b.onResolve({ filter: /services\/api$/ }, () => ({ path: 'fixture', namespace: 'fixture' })); b.onLoad({ filter: /.*/, namespace: 'fixture' }, () => ({ contents: `export const API_BASE_URL=${JSON.stringify(apiBase)};`, loader: 'js' })); } }] });
const bundle = await makeBundle('/api');
const browser = await chromium.launch({ headless: true });
try {
  const origin = 'http://127.0.0.1:' + proxy.address().port;
  const context = await browser.newContext();
  await context.addCookies([{ name: 'fixture_auth', value: 'allowed', url: origin, httpOnly: true }]);
  const page = await context.newPage(); await page.goto(origin); await page.addScriptTag({ content: bundle.outputFiles[0].text });
  await page.waitForFunction(() => window.changes.every(n => n > 0));
  assert.equal(accepted, 1, 'Two subscribers share one authenticated transport');
  for (const event of ['question:published', 'batch:ended', 'session:ended']) {
    const before = await page.evaluate(() => window.changes);
    io.to('classroom:session').emit(event, { sessionId: 'session' });
    await page.waitForFunction(before => window.changes.every((n, i) => n > before[i]), before);
  }
  const anonymous = await browser.newPage(); await anonymous.goto(origin); await anonymous.addScriptTag({ content: bundle.outputFiles[0].text });
  await assertEventually(() => denied > 0);
  assert.deepEqual(await anonymous.evaluate(() => window.changes), [0, 0]);
  await anonymous.evaluate(() => window.dispose()); await anonymous.close();
  await page.evaluate(() => window.dispose()); await assertEventually(() => io.engine.clientsCount === 0);
  const directContext = await browser.newContext(); await directContext.addCookies([{ name: 'fixture_auth', value: 'allowed', url: origin, httpOnly: true }]);
  const direct = await directContext.newPage(); await direct.goto(origin); const directBundle = await makeBundle('http://127.0.0.1:' + backend.address().port + '/api'); await direct.addScriptTag({ content: directBundle.outputFiles[0].text }); await direct.waitForFunction(() => window.changes.every(n => n > 0)); assert.equal(accepted, 2, 'Direct API connection preserves the Engine.IO trailing slash'); await direct.evaluate(() => window.dispose()); await assertEventually(() => io.engine.clientsCount === 0); await directContext.close();
  console.log('PASS proxy classroom transport: ordered socket rewrite, no-store, credential forwarding, shared connection, publish/batch/end events, anonymous denial and disconnect cleanup');
} finally { await browser.close(); await new Promise(r => io.close(r)); proxy.closeAllConnections(); await new Promise(r => proxy.close(r)); }
async function assertEventually(condition) { const end = Date.now() + 10000; while (!condition() && Date.now() < end) await new Promise(r => setTimeout(r, 50)); assert.ok(condition()); }
