/**
 * Controlled Smart Classroom Pilot runner.
 * It has no default API, account, PIN, or output path and therefore fails closed.
 * Scenario JSON contains only environment-variable names, never credentials.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { performance } from 'node:perf_hooks';
import { io } from 'socket.io-client';

const required = (name) => {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
};
const apiBase = required('PILOT_API_BASE').replace(/\/$/, '');
if (process.env.PILOT_ALLOW_EXTERNAL_RUN !== 'YES' || process.env.PILOT_WRITE_AUTHORIZATION !== 'YES') {
  throw new Error('Pilot is fail-closed: set PILOT_ALLOW_EXTERNAL_RUN=YES and PILOT_WRITE_AUTHORIZATION=YES only after owner authorization.');
}
const scenarioFile = required('PILOT_SCENARIO_FILE');
const outputFile = required('PILOT_OUTPUT_FILE');
const scenario = JSON.parse(await readFile(scenarioFile, 'utf8'));
if (!Array.isArray(scenario.scenarios) || scenario.scenarios.length < 2) throw new Error('Pilot scenario requires at least two class scenarios.');

const request = async (label, path, token, options = {}) => {
  const start = performance.now();
  const response = await fetch(`${apiBase}${path}`, {
    ...options,
    headers: { accept: 'application/json', authorization: `Bearer ${token}`, ...(options.body ? { 'content-type': 'application/json' } : {}), ...(options.headers || {}) },
    body: options.body ? JSON.stringify(options.body) : undefined,
    signal: AbortSignal.timeout(20_000),
  });
  const durationMs = Math.round(performance.now() - start);
  const text = await response.text();
  let body = null; try { body = text ? JSON.parse(text) : null; } catch { body = { nonJson: true }; }
  return { label, path, status: response.status, durationMs, body };
};

const once = (socket, event) => new Promise((resolve, reject) => {
  const timeout = setTimeout(() => reject(new Error(`Timed out waiting for ${event}`)), 15_000);
  socket.once(event, (...args) => { clearTimeout(timeout); resolve(args); });
});
const joinRoom = (socket, sessionId) => new Promise((resolve, reject) => socket.emit('workspace:join', `classroom:${sessionId}`, (result) => result?.ok ? resolve() : reject(new Error(result?.error || 'room join rejected'))));

const runScenario = async (item) => {
  for (const field of ['label', 'sessionId', 'studentTokenEnv']) if (!item[field]) throw new Error(`Scenario field ${field} is required`);
  const studentToken = required(item.studentTokenEnv);
  const records = [];
  if (item.pinEnv) records.push(await request('join', `/classroom/sessions/${encodeURIComponent(item.sessionId)}/join`, studentToken, { method: 'POST', body: { pin: required(item.pinEnv) } }));
  records.push(await request('current', `/classroom/sessions/${encodeURIComponent(item.sessionId)}/current`, studentToken));
  if (item.answer) records.push(await request('answer', `/classroom/sessions/${encodeURIComponent(item.sessionId)}/answers/${encodeURIComponent(item.answer.questionId)}`, studentToken, { method: 'PUT', body: { selectedOptionIndex: item.answer.selectedOptionIndex } }));
  records.push(await request('aggregate', `/classroom/sessions/${encodeURIComponent(item.sessionId)}/aggregate`, studentToken));
  const socketBase = apiBase.replace(/\/api$/, ''); const socket = io(socketBase, { auth: { token: studentToken }, transports: ['websocket'], reconnectionDelay: 100, reconnectionDelayMax: 500 });
  const reconnect = { attempted: true, recovered: false, durationMs: null, error: null };
  try {
    await once(socket, 'connect'); await joinRoom(socket, item.sessionId);
    const start = performance.now(); socket.io.engine?.close(); await once(socket.io, 'reconnect'); await joinRoom(socket, item.sessionId);
    reconnect.recovered = true; reconnect.durationMs = Math.round(performance.now() - start);
  } catch (error) { reconnect.error = error instanceof Error ? error.message : String(error); } finally { socket.disconnect(); }
  return { label: item.label, schoolId: item.schoolId || null, classId: item.classId || null, weakNetworkMethod: item.weakNetworkMethod || 'not-specified', records: records.map(({ body, ...safe }) => safe), reconnect };
};

const percentile = (values, percentileValue) => {
  if (!values.length) return null;
  const ordered = [...values].sort((left, right) => left - right); return ordered[Math.min(ordered.length - 1, Math.ceil((percentileValue / 100) * ordered.length) - 1)];
};
const startedAt = new Date().toISOString();
const results = await Promise.all(scenario.scenarios.map(runScenario));
const metrics = results.flatMap((result) => result.records);
const report = {
  pilotRunId: scenario.pilotRunId || `pilot-${Date.now()}`,
  startedAt,
  completedAt: new Date().toISOString(),
  apiBase,
  gitSha: process.env.GIT_COMMIT_SHA || 'not-supplied',
  scenarioCount: results.length,
  results,
  summary: {
    requests: metrics.length,
    successfulRequests: metrics.filter((item) => item.status >= 200 && item.status < 300).length,
    latencyMs: { p50: percentile(metrics.map((item) => item.durationMs), 50), p95: percentile(metrics.map((item) => item.durationMs), 95) },
    reconnect: { attempted: results.length, recovered: results.filter((item) => item.reconnect.recovered).length, p95Ms: percentile(results.filter((item) => item.reconnect.recovered).map((item) => item.reconnect.durationMs), 95) },
    writeRequests: metrics.filter((item) => item.label === 'join' || item.label === 'answer').length,
  },
  limits: 'observations_only_owner_decision_required',
};
await writeFile(outputFile, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ pilotRunId: report.pilotRunId, outputFile, summary: report.summary }, null, 2));
