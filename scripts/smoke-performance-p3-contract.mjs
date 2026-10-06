import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (file) => readFileSync(join(root, file), 'utf8');
const aggregate = read('server/src/routes/classroom/registerClassroomAggregateRoutes.ts');
const teacher = read('pages/ClassroomTeacherConsole.tsx');
const panel = read('components/classroom/ClassroomActiveSessionPanel.tsx');
const radar = read('components/classroom/ClassroomTeacherLiveRadar.tsx');
const hook = read('hooks/useClassroomRealtime.ts');
const checks = [];
const check = (name, assertion) => {
  try { assertion(); checks.push({ name, status: 'PASS' }); }
  catch (error) { checks.push({ name, status: 'FAIL', details: error instanceof Error ? error.message : String(error) }); }
};

check('staff live-state route projects only active-question metrics', () => {
  assert.ok(aggregate.includes('if (req.query.view === "live")'));
  assert.ok(aggregate.includes('$group: { _id: "$selectedOptionIndex"'));
  assert.ok(aggregate.includes('responseCount,'));
  assert.ok(aggregate.includes('distribution,'));
});
check('teacher response storms are coalesced into one lightweight live-state read', () => {
  assert.ok(teacher.includes("if (event !== 'response:updated' || !sessionId) return false;"));
  assert.ok(teacher.includes('}, 250);'));
  assert.ok(teacher.includes('aggregate?view=live'));
  assert.equal(teacher.includes('useClassroomRealtime(sessionId, load)'), false);
});
check('challenge state and teacher radar no longer use network polling', () => {
  assert.equal(panel.includes('setInterval(() => void loadChallengeState()'), false);
  assert.equal(radar.includes('setInterval(() => void load()'), false);
  assert.ok(panel.includes("event === 'competition:updated'"));
  assert.ok(radar.includes("event === 'competition:updated'"));
});
check('realtime hook exposes scoped event handling without forcing a full reload', () => {
  assert.ok(hook.includes('onEvent?: (event: ClassroomRealtimeEvent'));
  assert.ok(hook.includes("subscriber.onEvent?.(event, payload) === true"));
});

const failed = checks.filter((item) => item.status === 'FAIL');
console.log(JSON.stringify({ phase: 'performance-p3', status: failed.length ? 'FAIL' : 'PASS', checks }, null, 2));
if (failed.length) process.exit(1);
