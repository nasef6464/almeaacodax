import assert from 'node:assert/strict';
import { test } from 'node:test';
import { resolveStudentPathPreferences } from './studentPathPreferences.js';
import { preferencesSchema } from '../http/authSchemas.js';
import { HomepageSettingsModel } from '../../../models/HomepageSettings.js';
import { UserModel } from '../../../models/User.js';
import { PathModel } from '../../../models/Path.js';
import { homepageSettingsSchema } from '../../content/http/platformPresentationSchemas.js';

const paths = [
  { _id: 'future-with-stage', settings: {} },
  { _id: 'future-no-stage', settings: {} },
  { _id: 'optional', settings: { stageSelection: 'none' } },
  { _id: 'required-empty', settings: { stageSelection: 'required' } },
  { _id: 'inactive', isActive: false },
  { _id: 'hidden', showInHome: false, showInNavbar: false },
];
const levels = [{ _id: 'stage-a', pathId: 'future-with-stage' }, { _id: 'stage-b', pathId: 'optional' }];
const student = { role: 'student', enrolledPaths: ['legacy'], pathStageSelections: [] };
const resolve = (payload: any, current: any = student) => resolveStudentPathPreferences(current, payload, paths, levels);

test('future arbitrary paths use configured stages, never hardcoded IDs', () => {
  assert.throws(() => resolve({ enrolledPaths: ['legacy', 'future-with-stage'] }), /stage/i);
  assert.deepEqual(resolve({ enrolledPaths: ['legacy', 'future-no-stage'] }).enrolledPaths, ['legacy', 'future-no-stage']);
  const result = resolve({ enrolledPaths: ['legacy', 'future-with-stage'], pathStageSelections: [{ pathId: 'future-with-stage', levelId: 'stage-a' }] });
  assert.deepEqual(result.pathStageSelections, [{ pathId: 'future-with-stage', levelId: 'stage-a' }]);
  assert.throws(() => resolve({ enrolledPaths: ['required-empty'] }), /stage/i);
  assert.deepEqual(resolve({ enrolledPaths: ['optional'] }).pathStageSelections, []);
});
test('new inactive, hidden, missing paths and cross-path stage assignments reject', () => {
  for (const id of ['inactive', 'hidden', 'missing']) assert.throws(() => resolve({ enrolledPaths: [id] }), /path/i);
  assert.throws(() => resolve({ enrolledPaths: ['future-with-stage'], pathStageSelections: [{ pathId: 'future-with-stage', levelId: 'stage-b' }] }), /stage/i);
  assert.throws(() => resolve({ pathStageSelections: [{ pathId: 'optional', levelId: 'stage-b' }] }), /enrolled/i);
  assert.throws(() => resolve({ enrolledPaths: ['future-with-stage'] }, { ...student, pathStageSelections: [{ pathId: 'future-with-stage', levelId: 'stage-b' }] }), /stage/i);
});
test('legacy stage-less enrollments survive repeated saves; partial rows merge and own removals prune', () => {
  assert.deepEqual(resolve({ enrolledPaths: ['legacy', 'legacy'] }).enrolledPaths, ['legacy']);
  assert.deepEqual(resolve({}), {});
  const current = { ...student, enrolledPaths: ['legacy', 'optional', 'future-with-stage'], pathStageSelections: [{ pathId: 'optional', levelId: 'stage-b' }, { pathId: 'future-with-stage', levelId: 'stage-a' }] };
  assert.equal(resolve({ pathStageSelections: [{ pathId: 'future-with-stage', levelId: 'stage-a' }] }, current).pathStageSelections?.length, 2);
  assert.deepEqual(resolve({ enrolledPaths: ['legacy', 'future-with-stage'] }, current).pathStageSelections, [{ pathId: 'future-with-stage', levelId: 'stage-a' }]);
  assert.deepEqual(Object.keys(resolve({ enrolledPaths: ['legacy'] }, current)).sort(), ['enrolledPaths', 'pathStageSelections']);
});
test('request/model stage rows are bounded; settings preserve old defaults and reject invalid modes', () => {
  const rows = Array.from({ length: 101 }, (_, i) => ({ pathId: `p${i}`, levelId: `l${i}` }));
  assert.equal(preferencesSchema.safeParse({ pathStageSelections: rows }).success, false);
  const user = new UserModel({ name: 'Test', email: 'test@example.invalid', passwordHash: 'test', pathStageSelections: rows });
  assert.ok(user.validateSync()?.errors.pathStageSelections);
  assert.equal(homepageSettingsSchema.safeParse({ studentExperience: { visibilityMode: 'invalid', promptEnrollment: true } }).success, false);
  const settings = new HomepageSettingsModel();
  assert.equal(settings.studentExperience?.visibilityMode, 'all');
  assert.equal(settings.studentExperience?.promptEnrollment, true);
});
test('unchanged enrolled legacy stage rows survive taxonomy deletion on full roundtrip', () => {
  const rows = [{ pathId: 'deleted-path', levelId: 'deleted-level' }, { pathId: 'future-with-stage', levelId: 'removed-stage' }];
  const current = { ...student, enrolledPaths: ['deleted-path', 'future-with-stage'], pathStageSelections: rows };
  const result = resolve({ enrolledPaths: [...current.enrolledPaths, 'future-no-stage'], pathStageSelections: rows }, current);
  assert.deepEqual(result.pathStageSelections, rows);
  assert.throws(() => resolve({ pathStageSelections: [{ pathId: 'future-with-stage', levelId: 'stage-b' }] }, current), /stage/i);
  assert.throws(() => resolve({ pathStageSelections: [{ pathId: 'deleted-path', levelId: 'new-level' }] }, current), /stage/i);
  assert.throws(() => resolve({ enrolledPaths: ['future-with-stage'], pathStageSelections: [{ pathId: 'future-with-stage', levelId: 'stage-b' }] }, { ...student, pathStageSelections: [{ pathId: 'future-with-stage', levelId: 'stage-b' }] }), /stage/i);
});
test('path settings validate known presentation enums and retain unrelated legacy keys', () => {
  assert.ok(new PathModel({ _id: 'bad', name: 'Bad', settings: { stageSelection: 'invalid' } }).validateSync()?.errors.settings);
  assert.ok(new PathModel({ _id: 'bad', name: 'Bad', settings: { studentTemplate: 'invalid' } }).validateSync()?.errors.settings);
  const valid = new PathModel({ _id: 'legacy', name: 'Legacy', settings: { otherKey: { enabled: true }, stageSelection: 'none' } });
  assert.equal(valid.validateSync(), undefined);
  assert.deepEqual(valid.settings.otherKey, { enabled: true });
});
