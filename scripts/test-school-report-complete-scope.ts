import assert from 'node:assert/strict';
import fs from 'node:fs';
import { isolatedMongo, mongoose } from './live-session-test-fixture.js';

assert.ok(fs.existsSync('server/dist/app.js'), 'Build server before HTTP verification');
const close = await isolatedMongo();
let server: any;
try {
  Object.assign(process.env, { AI_PROVIDER: 'none', SENTRY_DSN: '', REDIS_URL: '',
    NOTIFICATION_QUEUE_ENABLED: 'false', RATE_LIMIT_REDIS_ENABLED: 'false' });
  const [{ UserModel }, { GroupModel }, { SchoolSkillAggregateModel }, { buildSchoolSkillAggregateView },
    { buildSchoolSkillReportJoin }] = await Promise.all([
    import('../server/dist/models/User.js'), import('../server/dist/models/Group.js'),
    import('../server/dist/models/SchoolSkillAggregate.js'),
    import('../server/dist/modules/quizzes/application/schoolSkillAggregateView.js'),
    import('../server/dist/modules/quizzes/application/schoolSkillReportJoin.js'),
  ]);
  await SchoolSkillAggregateModel.init();
  const actor = (name: string, role: string, extra = {}) => UserModel.create({ name, role,
    email: name + '@isolated.test', passwordHash: 'test-only', isActive: true, ...extra });
  const admin = await actor('complete-admin', 'admin');
  const school = await GroupModel.create({ name: 'isolated school', type: 'SCHOOL', ownerId: String(admin._id) });
  const a = await GroupModel.create({ name: 'old class', type: 'CLASS', parentId: String(school._id), ownerId: String(admin._id) });
  const b = await GroupModel.create({ name: 'new class', type: 'CLASS', parentId: String(school._id), ownerId: String(admin._id) });
  const ids = Array.from({ length: 10000 }, () => new mongoose.Types.ObjectId());
  for (let start = 0; start < ids.length; start += 1000) {
    await UserModel.collection.insertMany(ids.slice(start, start + 1000).map((_id, j) => ({
      _id, name: 'learner ' + (start + j), role: 'student', email: 'learner-' + (start + j) + '@isolated.test',
      schoolId: String(school._id), groupIds: [String(start + j < 1000 ? a._id : b._id)],
      isActive: true, createdAt: new Date(1700000000000 + start + j),
    })));
    await SchoolSkillAggregateModel.collection.insertMany(ids.slice(start, start + 1000).map((_id, j) => ({
      schoolId: String(school._id), classId: String(start + j < 1000 ? a._id : b._id), userId: String(_id),
      pathId: 'math', subjectId: 'math', skillId: 'fraction', skill: 'fraction',
      totalEvidence: 10, totalCorrect: 8, mastery: start + j === 0 ? 10 : 80,
      recentMastery: 60, confidence: 80, trend: 'stable', lastEvidenceAt: new Date(1700000000000),
    })));
  }
  await SchoolSkillAggregateModel.collection.insertMany(ids.slice(0, 1000).map(_id => ({
    schoolId: String(school._id), classId: String(a._id), userId: String(_id), pathId: 'math', subjectId: 'math',
    skillId: 'old-only', skill: 'older learners skill', totalEvidence: 2, totalCorrect: 1, mastery: 50,
    recentMastery: 50, confidence: 50, trend: 'improving',
  })));
  await SchoolSkillAggregateModel.collection.insertMany([
    { schoolId: String(school._id), classId: 'historic-class', userId: String(ids[0]), pathId: 'math', subjectId: 'math',
      skillId: 'fraction', totalEvidence: 5, totalCorrect: 2, mastery: 40, recentMastery: null, confidence: null, trend: 'declining' },
    { schoolId: 'outside', userId: 'not-an-authorized-user', pathId: 'math', subjectId: 'math', skillId: 'fraction',
      totalEvidence: 999999, totalCorrect: 0, mastery: 0 },
  ]);
  console.log('Seeded10000 learners /11002 aggregate rows in isolated Mongo');
  const base = { groupBy: 'skill' as const, pathId: 'math', subjectId: 'math', limit: 50 };
  const run = async (id: unknown, query = {}) => {
    const result = await buildSchoolSkillAggregateView(String(id), { ...base, ...query });
    assert.equal(result.status, 'ok');
    return result as Extract<typeof result, { status: 'ok' }>;
  };
  const started = performance.now();
  const full = await run(admin._id);
  assert.equal(full.scope.totalStudents, 10000);
  assert.equal(full.scope.sampledStudents, 10000);
  assert.equal(full.scope.isTruncated, false);
  assert.equal(full.rows.length, 2);
  const fraction = full.rows.find((row: any) => row.skillId === 'fraction')!;
  assert.equal(fraction.evidenceCount, 100005);
  assert.equal(fraction.studentCount, 10000);
  assert.equal(fraction.supportStudents, 2, 'historical rows retain existing support-count semantics');
  assert.equal(fraction.mastery, 80);
  assert.equal(fraction.recentMastery, 60, 'null values must not be averaged as zero');
  assert.equal(fraction.confidence, 80);
  assert.equal(fraction.coverage, 100);
  assert.deepEqual(fraction.trendBreakdown, { improving: 0, stable: 10000, declining: 1 });
  assert.equal(JSON.stringify(full).includes('studentIds'), false, 'complete identity sets stay inside Mongo');
  const ms = Math.round(performance.now() - started);
  console.log('PASS complete totals/null averages/historical rows; report ms=' + ms);
  const top = await run(admin._id, { limit: 1 });
  assert.equal(top.rows[0].skillId, 'old-only', 'global ranking must include older users before limit');
  const classes = await run(admin._id, { groupBy: 'class', skillId: 'fraction' });
  assert.equal(classes.rows.length, 3);
  assert.equal(classes.rows.find((row: any) => row.classId === String(a._id))?.studentCount, 1000);
  assert.equal(classes.rows.find((row: any) => row.classId === String(b._id))?.studentCount, 9000);
  const student = await run(admin._id, { groupBy: 'student', skillId: 'fraction', limit: 1 });
  assert.equal(student.rows[0].userId, String(ids[0]));
  assert.equal(student.rows[0].studentName, 'learner 0');
  const supervisor = await actor('complete-supervisor', 'supervisor', { groupIds: [String(b._id)] });
  const schoolAdmin = await actor('complete-school-admin', 'school_admin', { schoolId: String(school._id) });
  const teacher = await actor('complete-teacher', 'teacher', { groupIds: [String(a._id)], managedPathIds: ['other-path'] });
  const emptyStaff = await actor('complete-unassigned', 'supervisor');
  const parent = await actor('complete-parent', 'parent');
  const scoped = await run(supervisor._id);
  assert.equal(scoped.scope.totalStudents, 9000);
  assert.equal(scoped.rows.length, 1);
  assert.equal(scoped.rows[0].evidenceCount, 90000);
  assert.equal((await run(schoolAdmin._id)).rows[0].skillId, 'old-only');
  assert.equal((await run(teacher._id)).rows.length, 0, 'managed taxonomy restriction remains enforced');
  assert.equal((await run(emptyStaff._id)).rows.length, 0);
  assert.equal((await run(supervisor._id, { studentId: String(ids[0]) })).scope.totalStudents, 0);
  assert.equal((await run(supervisor._id, { classId: String(a._id) })).rows.length, 0);
  // Duplicate stored aliases were a single $in identity before: never multiply evidence.
  await UserModel.collection.updateOne({ _id: ids[1] }, { $set: { id: 'legacy-shared' } });
  await SchoolSkillAggregateModel.updateMany({ userId: String(ids[1]) }, { $set: { userId: 'legacy-shared' } });
  await UserModel.collection.insertOne({ _id: new mongoose.Types.ObjectId(), id: 'legacy-shared', role: 'student',
    name: 'oldest alias name', email: 'duplicate-alias@isolated.test', schoolId: String(school._id),
    groupIds: [String(a._id)], createdAt: new Date(1600000000000) });
  const alias = await run(admin._id, { groupBy: 'student', studentId: 'legacy-shared', skillId: 'fraction' });
  assert.equal(alias.scope.totalStudents, 2);
  assert.equal(alias.rows.length, 1);
  assert.equal(alias.rows[0].studentName, 'oldest alias name');
  assert.equal((await run(admin._id, { studentId: String(ids[1]) })).rows.length, 0);
  const afterAlias = await run(admin._id, { skillId: 'fraction' });
  assert.equal(afterAlias.rows[0].studentCount, 10000);
  assert.equal(afterAlias.rows[0].evidenceCount, 100005);
  const plan = await UserModel.aggregate([
    ...buildSchoolSkillReportJoin({ role: 'student' }, { pathId: 'math', subjectId: 'math' }),
    { $count: 'rows' },
  ]).allowDiskUse(true).explain('executionStats');
  const lookup = plan.stages?.find((stage: any) => stage.$lookup);
  fs.writeFileSync('scratch/school-report-complete-join-plan.json', JSON.stringify(plan, null, 2));
  console.log(JSON.stringify({ join: lookup }));
  assert.ok(lookup, 'explain must expose the actual joined report pipeline');
  assert.equal(Number(lookup.collectionScans), 0);
  assert.ok(lookup.indexesUsed.includes('userId_1'));
  assert.ok(Number(lookup.totalDocsExamined) <= 11002, 'join work stays bounded by the aggregate inventory');
  const { createApp } = await import('../server/dist/app.js');
  server = createApp().listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const { signAccessToken } = await import('../server/dist/utils/jwt.js');
  const request = async (user?: any) => {
    const token = user && signAccessToken({ id: String(user._id), role: user.role, name: user.name, email: user.email });
    const response = await fetch('http://127.0.0.1:' + server.address().port + '/api/quizzes/analytics/school-skills?pathId=math&subjectId=math&limit=1',
      { headers: token ? { authorization: 'Bearer ' + token } : {}, signal: AbortSignal.timeout(30000) });
    return { status: response.status, body: await response.json() };
  };
  const http = await request(admin);
  assert.equal(http.status, 200);
  assert.equal(http.body.scope.sampledStudents, 10001);
  assert.equal(http.body.scope.isTruncated, false);
  assert.equal(http.body.rows[0].skillId, 'old-only');
  assert.equal((await request(supervisor)).body.scope.totalStudents, 9000);
  assert.equal((await request(schoolAdmin)).status, 200);
  assert.equal((await request(teacher)).body.rows.length, 0);
  assert.equal((await request(parent)).status, 403);
  assert.equal((await request({ _id: ids[0], role: 'student', name: 'learner 0', email: 'learner-0@isolated.test' })).status, 403);
  assert.equal((await request()).status, 401);
  const evidence = { initialLearners: 10000, finalRoster: 10001, aggregateRows: 11002,
    fullReportMs: ms, fullReportBytes: Buffer.byteLength(JSON.stringify(full)),
    returnedRows: full.rows.length, evidenceCount: fraction.evidenceCount,
    join: { docsExamined: lookup.totalDocsExamined, collectionScans: lookup.collectionScans, indexesUsed: lookup.indexesUsed },
    httpRequests: 7, httpRoleCases: 'admin/school_admin/class supervisor/teacher/parent/student/anonymous',
    assertions: 'complete totals, global topN, historical rows/null averages, alias dedup/name, shadowed native ID, authority and bounded output',
    limitation: 'isolated inventory and bounded HTTP correctness; no production concurrency/capacity certification' };
  fs.writeFileSync('scratch/school-report-complete-scope.json', JSON.stringify(evidence, null, 2));
  console.log(JSON.stringify(evidence));
} finally {
  if (server) await new Promise<void>(resolve => server.close(() => resolve()));
  await close();
}
