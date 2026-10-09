import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';

const source = fs.readFileSync('utils/coalescedAsyncRefresh.ts', 'utf8');
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } });
const { createCoalescedAsyncRefresh } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
const originalSetTimeout = globalThis.setTimeout;
const originalClearTimeout = globalThis.clearTimeout;
const timers = new Map();
let id = 0;
const flush = () => {
  const [key, callback] = timers.entries().next().value;
  timers.delete(key);
  return callback();
};
globalThis.setTimeout = (callback, ms) => { assert.equal(ms, 250); timers.set(++id, callback); return id; };
globalThis.clearTimeout = (key) => timers.delete(key);
try {
  let calls = 0;
  let release;
  const pending = new Promise((resolve) => { release = resolve; });
  const queue = createCoalescedAsyncRefresh(async () => { calls++; if (calls === 1) await pending; });
  for (let n = 0; n < 25; n++) queue.request();
  assert.equal(timers.size, 1);
  const first = flush();
  assert.equal(calls, 1);
  for (let n = 0; n < 25; n++) queue.request();
  assert.equal(timers.size, 0, 'pending reads must never overlap');
  release();
  await first;
  assert.equal(timers.size, 1, 'new events must produce one trailing read');
  await flush();
  assert.equal(calls, 2);
  assert.equal(timers.size, 0);
  console.log('PASS burst coalescing, single in-flight read and trailing reconciliation');
  queue.request();
  queue.dispose();
  queue.request();
  assert.equal(timers.size, 0, 'unmounted/session-changed queues must stay disposed');
  console.log('PASS pending cleanup and session disposal');

  let retries = 0;
  let errors = 0;
  const retry = createCoalescedAsyncRefresh(async () => { if (++retries === 1) throw Error('temporary'); }, 250, () => errors++);
  retry.request(); await flush();
  retry.request(); await flush();
  assert.equal(errors, 1); assert.equal(retries, 2);
  retry.dispose();
  console.log('PASS failure releases the queue for a later retry');

  let finish;
  const blocking = new Promise((resolve) => { finish = resolve; });
  const stopped = createCoalescedAsyncRefresh(() => blocking);
  stopped.request(); const running = flush();
  stopped.request(); stopped.dispose(); finish(); await running;
  assert.equal(timers.size, 0);
  console.log('PASS disposal suppresses trailing reads after in-flight completion');
} finally {
  globalThis.setTimeout = originalSetTimeout;
  globalThis.clearTimeout = originalClearTimeout;
}
for (const file of ['pages/ClassroomTeacherConsole.tsx', 'pages/ClassroomProjectorView.tsx']) {
  const surface = fs.readFileSync(file, 'utf8');
  assert.ok(surface.includes('createCoalescedAsyncRefresh'));
  assert.ok(surface.includes("event !== 'response:updated'"));
  assert.ok(surface.includes('refresh.dispose()'));
  assert.ok(surface.includes('useClassroomRealtime(sessionId, load, undefined, applyRealtimeEvent)'));
}
console.log('PASS both surfaces coalesce answer events while lifecycle/publish changes remain immediate');
