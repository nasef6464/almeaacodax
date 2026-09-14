import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (file) => readFileSync(join(root, file), 'utf8');
const hook = read('hooks/useClassroomRealtime.ts');
const student = read('pages/ClassroomStudentLive.tsx');
const widget = read('components/classroom/SmartClassroomFloatingWidget.tsx');
const events = read('server/src/sockets/classroomEvents.ts');
const sockets = read('server/src/sockets/index.ts');
const checks = [];
const check = (name, assertion) => {
  try {
    assertion();
    checks.push({ name, status: 'PASS' });
  } catch (error) {
    checks.push({ name, status: 'FAIL', details: error instanceof Error ? error.message : String(error) });
  }
};

check('all classroom surfaces share one module-level Socket.IO transport', () => {
  assert.ok(hook.includes('let socket: Socket | null = null;'));
  assert.ok(hook.includes('const sessionSubscribers = new Map'));
  assert.ok(hook.includes('const ensureSocket = () =>'));
  assert.equal((hook.match(/io\(socketUrl\(\)/g) || []).length, 1);
});
check('reconnect joins each active session and requests a server-authoritative resync', () => {
  assert.ok(hook.includes("socket.on('connect'"));
  assert.ok(hook.includes('sessionSubscribers.forEach((_, id) => joinSession(id))'));
  assert.ok(hook.includes("if (result?.ok) notifySession(id, 'change')"));
});
check('student live screen has no sustained polling timer', () => {
  assert.equal(student.includes('setInterval('), false);
  assert.ok(student.includes('api.instantJoinClassroomSession(sessionId)'));
});
check('student widget discovers sessions through authorized class-room events, not polling', () => {
  assert.equal(widget.includes('setInterval('), false);
  assert.ok(widget.includes('useClassroomDiscoveryRealtime'));
  assert.ok(widget.includes('api.getStudentActiveClassroomSession()'));
});
check('classroom socket rooms split student and staff audiences', () => {
  assert.ok(events.includes('classroomStudentsRoom'));
  assert.ok(events.includes('classroomStaffRoom'));
  assert.ok(events.includes('if (event === "response:updated")'));
  assert.ok(events.includes('io?.to(classroomStaffRoom(normalizedSessionId)).emit(event, scopedPayload)'));
  assert.ok(sockets.includes('socket.join(audienceRoom)'));
  assert.ok(sockets.includes('socket.on("workspace:leave"'));
});
check('response updates carry session scope, so one session cannot refresh another', () => {
  assert.ok(events.includes('const scopedPayload = { ...payload, sessionId: normalizedSessionId }'));
  assert.ok(hook.includes('if (payload.sessionId) notifySession(String(payload.sessionId), \'change\')'));
});

const failed = checks.filter((item) => item.status === 'FAIL');
console.log(JSON.stringify({ phase: 'performance-p2', status: failed.length ? 'FAIL' : 'PASS', checks }, null, 2));
if (failed.length) process.exit(1);
