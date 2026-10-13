import assert from 'node:assert/strict';
import http from 'node:http';
import mongoose from 'mongoose';
import { randomUUID } from 'node:crypto';
import { env } from '../config/env.js';
import { createApp } from '../app.js';
import { UserModel } from '../models/User.js';
import { PathModel } from '../models/Path.js';
import { LevelModel } from '../models/Level.js';
import { signAccessToken } from '../utils/jwt.js';
import { prepareStudentPathPreferenceWrite } from '../modules/auth/application/studentPathPreferences.js';

// Always use a new, task-owned database on a loopback Mongo. No production override.
const mongo = new URL(env.MONGODB_URI);
assert.equal(env.NODE_ENV, 'test');
assert.ok(['127.0.0.1', 'localhost'].includes(mongo.hostname), 'Only isolated loopback Mongo is permitted');
assert.equal(mongo.protocol, 'mongodb:');
mongo.pathname = `/student_path_test_${randomUUID().replaceAll('-', '')}`;
const server = http.createServer(createApp());
let groups = 0;
const pass = (label: string) => { groups++; console.log(`PASS ${label}`); };
try {
  await mongoose.connect(mongo.toString());
  await PathModel.create([
    { _id: 'future', name: 'Future' }, { _id: 'zero', name: 'No levels' },
    { _id: 'none', name: 'No stage prompt', settings: { stageSelection: 'none', legacyFlag: true } },
    { _id: 'hidden', name: 'Hidden', showInHome: false, showInNavbar: false },
    { _id: 'inactive', name: 'Inactive', isActive: false },
  ]);
  await LevelModel.create([{ _id: 'stage', name: 'Stage', pathId: 'future' }, { _id: 'foreign', name: 'Foreign', pathId: 'none' }]);
  const user = await UserModel.create({ name: 'Student fixture', email: 'student@example.invalid', passwordHash: 'unused', enrolledPaths: ['legacy'], completedLessons: ['retained-history'], points: 91 });
  const admin = await UserModel.create({ name: 'Admin fixture', email: 'admin@example.invalid', passwordHash: 'unused', role: 'admin' });
  const token = (actor: any) => signAccessToken({ id: String(actor._id), name: actor.name, email: actor.email, role: actor.role });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address() as { port: number };
  const base = `http://127.0.0.1:${address.port}/api`;
  const request = async (path: string, body?: unknown, actor = user) => {
    const csrf = 'fixture-csrf';
    const response = await fetch(`${base}${path}`, { method: body === undefined ? 'GET' : 'PATCH', headers: { Authorization: `Bearer ${token(actor)}`, 'content-type': 'application/json', cookie: `almeaa_csrf_token=${csrf}`, 'x-csrf-token': csrf }, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) });
    return { status: response.status, body: await response.json() as any };
  };
  const prefs = (body: unknown) => request('/auth/me/preferences', body);
  assert.equal((await prefs({ enrolledPaths: ['legacy', 'future'] })).status, 400);
  assert.equal((await prefs({ enrolledPaths: ['legacy', 'future'], pathStageSelections: [{ pathId: 'future', levelId: 'foreign' }] })).status, 400);
  for (const id of ['hidden', 'inactive', 'missing']) assert.equal((await prefs({ enrolledPaths: [id] })).status, 400);
  pass('HTTP rejects missing stage, foreign stage and unavailable new paths');
  assert.equal((await prefs({ enrolledPaths: ['legacy', 'future', 'zero', 'none'], pathStageSelections: [{ pathId: 'future', levelId: 'stage' }] })).status, 200);
  const persisted = await UserModel.findById(user._id).lean();
  assert.deepEqual(persisted?.pathStageSelections, [{ pathId: 'future', levelId: 'stage' }]);
  assert.deepEqual(persisted?.completedLessons, ['retained-history']);
  assert.equal(persisted?.points, 91);
  assert.equal(persisted?.subscription?.plan, 'free');
  assert.deepEqual(persisted?.subscription?.purchasedCourses, []);
  pass('HTTP enrollment persists additive stages without history/scoring/paid grants');
  assert.equal((await prefs({ favorites: ['saved'] })).status, 200);
  assert.equal((await prefs({ enrolledPaths: ['legacy', 'future', 'zero', 'none'] })).status, 200);
  assert.equal((await prefs({ pathStageSelections: [{ pathId: 'none', levelId: 'foreign' }] })).status, 200);
  assert.equal((await UserModel.findById(user._id).lean())?.pathStageSelections.length, 2);
  assert.equal((await prefs({ enrolledPaths: ['legacy', 'none'] })).status, 200);
  assert.deepEqual((await UserModel.findById(user._id).lean())?.pathStageSelections, [{ pathId: 'none', levelId: 'foreign' }]);
  const me = await request('/auth/me');
  assert.equal(me.status, 200);
  assert.deepEqual(me.body.user.pathStageSelections, [{ pathId: 'none', levelId: 'foreign' }]);
  pass('Legacy saves, partial merge, own removal and fresh authenticated read preserve semantics');
  const first = await prepareStudentPathPreferenceWrite(String(user._id), { pathStageSelections: [] });
  const stale = await prepareStudentPathPreferenceWrite(String(user._id), { enrolledPaths: ['legacy'] });
  await UserModel.findOneAndUpdate(first.filter, { $set: { ...first.update, enrolledPaths: ['legacy', 'none', 'zero'] } });
  assert.equal(await UserModel.findOneAndUpdate(stale.filter, stale.update), null);
  pass('Actual Mongo optimistic guard rejects stale enrollment/stage snapshots');
  assert.equal((await request('/content/homepage-settings', { studentExperience: { visibilityMode: 'enrolled', promptEnrollment: false } }, admin)).status, 200);
  assert.equal((await request('/content/homepage-settings')).body.studentExperience.visibilityMode, 'enrolled');
  assert.equal((await request('/content/homepage-settings', { studentExperience: { visibilityMode: 'all', promptEnrollment: true } })).status, 403);
  assert.equal((await request('/content/homepage-settings', { studentExperience: { visibilityMode: 'invalid', promptEnrollment: true } }, admin)).status, 400);
  assert.equal((await request('/taxonomy/paths/none', { name: 'No stage prompt', settings: { stageSelection: 'none', studentTemplate: 'simple', legacyFlag: true } }, admin)).status, 200);
  assert.equal((await PathModel.findById('none').lean())?.settings.legacyFlag, true);
  assert.equal((await request('/taxonomy/paths/none', { name: 'No stage prompt', settings: { stageSelection: 'invalid' } }, admin)).status, 400);
  pass('Actual admin presentation/path settings persist; learner RBAC and enum guards hold');
  await UserModel.updateOne({ _id: user._id }, { $set: { enrolledPaths: ['legacy'], pathStageSelections: [{ pathId: 'legacy', levelId: 'deleted-stage' }] } });
  assert.equal((await prefs({ enrolledPaths: ['legacy', 'zero'], pathStageSelections: [{ pathId: 'legacy', levelId: 'deleted-stage' }] })).status, 200);
  assert.deepEqual((await UserModel.findById(user._id).lean())?.pathStageSelections, [{ pathId: 'legacy', levelId: 'deleted-stage' }]);
  assert.equal((await prefs({ pathStageSelections: [{ pathId: 'legacy', levelId: 'changed-invalid-stage' }] })).status, 400);
  assert.equal((await prefs({ enrolledPaths: ['zero'] })).status, 200);
  assert.deepEqual((await UserModel.findById(user._id).lean())?.pathStageSelections, []);
  pass('Deleted taxonomy legacy stage roundtrip survives; changed invalid rows reject and explicit removal prunes');
  console.log(`Student path HTTP/Mongo groups: ${groups} PASS`);
} finally {
  if (server.listening) await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  await mongoose.disconnect();
}
