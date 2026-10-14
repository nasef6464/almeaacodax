import assert from 'node:assert/strict';
import fs from 'node:fs';
import { isolatedMongo, mongoose } from './live-session-test-fixture.js';

assert.ok(fs.existsSync('server/dist/app.js'), 'Build server before HTTP behavior checks');
const close = await isolatedMongo();
let server: any;
try {
  Object.assign(process.env, { AI_PROVIDER: 'none', SENTRY_DSN: '', REDIS_URL: '',
    NOTIFICATION_QUEUE_ENABLED: 'false', RATE_LIMIT_REDIS_ENABLED: 'false', JWT_EXPIRES_IN: '1h',
    RATE_LIMIT_GLOBAL_LIMIT: '50', RATE_LIMIT_SENSITIVE_LIMIT: '10', RATE_LIMIT_SHARED_SOURCE_LIMIT: '300',
    RATE_LIMIT_SENSITIVE_SOURCE_LIMIT: '120',
    RATE_LIMIT_AUTH_LIMIT: '3', RATE_LIMIT_LOGIN_BURST_LIMIT: '40',
    RATE_LIMIT_LOGIN_SOURCE_FAILURE_LIMIT: '500', RATE_LIMIT_LOGIN_ACCOUNT_LIMIT: '20',
  });
  const { UserModel } = await import('../server/dist/models/User.js');
  const users = await UserModel.insertMany(Array.from({ length: 50 }, (_, i) => ({
    name: 'isolated network learner ' + i, email: 'network-' + i + '@isolated.test',
    passwordHash: 'not-a-real-login', role: 'student', isActive: true,
  })));
  const { createApp } = await import('../server/dist/app.js');
  const { signAccessToken } = await import('../server/dist/utils/jwt.js');
  const tokens = users.map(user => signAccessToken({ id: String(user._id), role: 'student', name: user.name, email: user.email }));
  server = createApp().listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  let requests = 0;
  const get = async (token: string | undefined, ip: string, path = '/api/payments/requests', extra: Record<string, string> = {}, payload?: unknown) => {
    requests++;
    const response = await fetch('http://127.0.0.1:' + server.address().port + path, {
      method: payload === undefined ? 'GET' : 'POST',
      headers: { 'x-forwarded-for': ip, ...(token ? { authorization: 'Bearer ' + token } : {}), ...extra,
        ...(payload === undefined ? {} : { 'content-type': 'application/json', cookie: 'almeaa_csrf_token=isolated-network', 'x-csrf-token': 'isolated-network' }) },
      ...(payload === undefined ? {} : { body: JSON.stringify(payload) }),
      signal: AbortSignal.timeout(30000),
    });
    return { status: response.status, body: await response.json(),
      limit: Number(response.headers.get('ratelimit-limit')), retryAfter: Number(response.headers.get('retry-after')) };
  };
  let successfulSchoolReads = 0;
  for (const token of tokens) {
    for (let i = 0; i < 2; i++) {
      const response = await get(token, '192.0.2.10');
      if (response.status === 200) successfulSchoolReads++;
    }
  }
  console.log(JSON.stringify({ case: '50signed accounts/one IP/two private reads each', successfulSchoolReads, expected: 100 }));
  assert.equal(successfulSchoolReads, 100, 'Legitimate accounts must not consume one shared sensitive/global allowance');
  // Heavy operations also retain a tighter aggregate network ceiling.
  for (let i = 0; i < 20; i++) assert.equal((await get(tokens[5 + i % 5], '192.0.2.10')).status, 200);
  assert.equal((await get(tokens[5], '192.0.2.10')).status, 429, 'many valid accounts must not bypass the heavy-operation source ceiling');
  // A malformed forwarded address must never collide with a real account key.
  const accountShapedAddress = 'user:' + String(users[43]._id);
  for (let i = 0; i < 10; i++) assert.equal((await get(undefined, accountShapedAddress)).status, 401);
  assert.equal((await get(undefined, accountShapedAddress)).status, 429);
  assert.equal((await get(tokens[43], '192.0.2.44')).status, 200, 'source strings cannot spend an authenticated account budget');
  // Same account keeps one sensitive budget across IP changes and a refreshed JWT.
  const refreshed = signAccessToken({ id: String(users[0]._id), role: 'student', name: 'refreshed claims', email: users[0].email });
  for (let i = 0; i < 8; i++) assert.equal((await get(i % 2 ? refreshed : tokens[0], '192.0.2.' + (20 + i))).status, 200);
  const personalBlock = await get(refreshed, '192.0.2.29');
  assert.equal(personalBlock.status, 429);
  assert.ok(personalBlock.retryAfter > 0);
  assert.equal((await get(tokens[1], '192.0.2.29')).status, 200, 'one learner cannot spend another learner budget');
  // Browser cookies and bearer tokens share the canonical account bucket.
  for (let i = 0; i < 8; i++) assert.equal((await get(undefined, '192.0.2.30', undefined,
    { cookie: 'almeaa_access_token=' + tokens[2] })).status, 200);
  assert.equal((await get(tokens[2], '192.0.2.31')).status, 429);
  // Forging a payload/header cannot create new account buckets. Invalid bearer
  // takes precedence over a valid cookie, exactly as authentication does.
  for (let i = 0; i < 10; i++) {
    const [header, encoded, signature] = tokens[i].split('.');
    const claims = JSON.parse(Buffer.from(encoded, 'base64url').toString());
    claims.id = String(users[(i + 1) % users.length]._id);
    const forged = header + '.' + Buffer.from(JSON.stringify(claims)).toString('base64url') + '.' + signature;
    assert.equal((await get(forged, '192.0.2.40', undefined,
      { 'x-user-id': String(users[i]._id), cookie: 'almeaa_access_token=' + tokens[3] })).status, 401);
  }
  assert.equal((await get('forged.new.token', '192.0.2.40')).status, 429);
  for (let i = 0; i < 10; i++) {
    const expired = signAccessToken({ id: String(users[i]._id), role: 'student', name: 'expired', email: users[i].email, iat: 1 });
    assert.equal((await get(expired, '192.0.2.41')).status, 401);
  }
  assert.equal((await get(undefined, '192.0.2.41')).status, 429);
  // Global per-account budget applies across source addresses, even to 404s.
  for (let i = 0; i < 48; i++) assert.equal((await get(tokens[4], '192.0.2.50', '/api/isolated-no-such-route')).status, 404);
  assert.equal((await get(tokens[4], '192.0.2.51', '/api/isolated-no-such-route')).status, 429);
  // Anonymous requests remain source-bound; changing a claimed identity is inert.
  for (let i = 0; i < 50; i++) assert.equal((await get(undefined, '192.0.2.60', '/api/isolated-no-such-route', { 'x-user-id': String(i) })).status, 404);
  assert.equal((await get(undefined, '192.0.2.60', '/api/isolated-no-such-route')).status, 429);
  // Coarse source ceiling still applies when many signed accounts rotate.
  for (let i = 0; i < 300; i++) {
    const response = await get(tokens[10 + i % 20], '192.0.2.70', '/api/isolated-no-such-route');
    assert.equal(response.status, 404);
  }
  const sourceBlock = await get(tokens[40], '192.0.2.70', '/api/isolated-no-such-route');
  assert.equal(sourceBlock.status, 429);
  assert.ok(sourceBlock.retryAfter > 0);
  assert.equal((await get(tokens[40], '192.0.2.71', '/api/isolated-no-such-route')).status, 404);
  assert.equal((await get(undefined, '192.0.2.70', '/api/health/live')).status, 200, 'health remains available after a source block');
  // Reserved documentation IPv6 addresses from one /56 share the IP budget.
  for (let i = 0; i < 50; i++) assert.equal((await get(undefined, '2001:db8:abcd:1200::' + (i + 1).toString(16), '/api/isolated-no-such-route')).status, 404);
  assert.equal((await get(undefined, '2001:db8:abcd:1201::ffff', '/api/isolated-no-such-route')).status, 429);
  // Authentication attempts stay IP-bound even when valid signed accounts rotate.
  for (let i = 0; i < 3; i++) assert.equal((await get(tokens[i], '192.0.2.80', '/api/auth/register', {}, {})).status, 400);
  assert.equal((await get(tokens[3], '192.0.2.80', '/auth/register', {}, {})).status, 429);
  for (let i = 0; i < 40; i++) assert.equal((await get(tokens[10 + i], '192.0.2.81', '/api/auth/login', {},
    { email: 'nonexistent-login-' + i + '@isolated.test', password: 'IsolatedTestOnly1!' })).status, 401);
  assert.equal((await get(tokens[0], '192.0.2.81', '/auth/login', {},
    { email: 'nonexistent-login-41@isolated.test', password: 'IsolatedTestOnly1!' })).status, 429);
  for (let i = 0; i < 20; i++) assert.equal((await get(tokens[47], '198.51.100.' + (i + 1), '/api/auth/login', {},
    { email: 'same-nonexistent-account@isolated.test', password: 'IsolatedTestOnly1!' })).status, 401);
  assert.equal((await get(tokens[47], '198.51.100.21', '/api/auth/login', {},
    { email: 'same-nonexistent-account@isolated.test', password: 'IsolatedTestOnly1!' })).status, 429);
  await UserModel.updateOne({ _id: users[49]._id }, { $set: { isActive: false } });
  assert.equal((await get(tokens[49], '192.0.2.90', '/api/quizzes/results?noTotal=true')).status, 401);
  const staleAdmin = signAccessToken({ id: String(users[48]._id), role: 'admin', name: 'old admin claims', email: users[48].email });
  assert.equal((await get(staleAdmin, '192.0.2.91', '/api/auth/admin/users?role=student')).status, 403);
  // Four real graded submissions remain correct and frozen in isolated Mongo.
  const [{ PathModel }, { SubjectModel }, { SectionModel }, { SkillModel }, { QuestionModel }, { QuizModel }, { QuizResultModel }] = await Promise.all([
    import('../server/dist/models/Path.js'), import('../server/dist/models/Subject.js'), import('../server/dist/models/Section.js'), import('../server/dist/models/Skill.js'),
    import('../server/dist/models/Question.js'), import('../server/dist/models/Quiz.js'), import('../server/dist/models/QuizResult.js'),
  ]);
  await PathModel.create({ _id: 'network-math', name: 'Isolated Math QA', isActive: true });
  await SubjectModel.create({ _id: 'network-subject', pathId: 'network-math', name: 'Math QA' });
  await SectionModel.create({ _id: 'network-section', subjectId: 'network-subject', name: 'Addition QA' });
  await SkillModel.create({ _id: 'network-skill', id: 'network-skill', pathId: 'network-math', subjectId: 'network-subject', sectionId: 'network-section', name: 'Addition' });
  const question = await QuestionModel.create({ id: 'network-question', subject: 'network-subject', text: '1 + 1 = ?',
    options: ['2', '3'], correctOptionIndex: 0, pathId: 'network-math', subjectId: 'network-subject', sectionId: 'network-section', skillIds: ['network-skill'] });
  await QuizModel.create({ _id: 'network-quiz', id: 'network-quiz', title: 'Network QA', mode: 'regular', isPublished: true,
    approvalStatus: 'approved', pathId: 'network-math', subjectId: 'network-subject', sectionId: 'network-section', questionIds: [question.id],
    access: { type: 'free' }, settings: { maxAttempts: 3, randomizeQuestions: false } });
  for (const i of [45, 46]) for (let attempt = 0; attempt < 2; attempt++) {
    const result = await get(tokens[i], '192.0.2.100', '/api/quizzes/network-quiz/submit', {},
      { answers: { [String(question.id)]: 0 }, timeSpentSeconds: 5, source: 'tests' });
    assert.equal(result.status, 201, JSON.stringify(result.body).slice(0, 150));
    assert.equal(result.body.score, 100);
    const stored = await QuizResultModel.findById(result.body.id || result.body._id).lean();
    assert.ok(stored);
    assert.equal(stored.score, 100);
    assert.deepEqual(JSON.parse(JSON.stringify(stored.skillsAnalysis)), result.body.skillsAnalysis);
  }
  assert.equal(await QuizResultModel.countDocuments({ quizId: 'network-quiz' }), 4);
  const evidence = { signedAccounts: 50, successfulSchoolReads, expectedSchoolReads: 100, requests,
    isolatedLimits: { actorGlobal: 50, actorSensitive: 10, source: 300, sensitiveSource: 120 },
    checks: 'shared NAT, per-actor/IP rotation/renewal, cookie precedence, forgery/expired/claimed header, source ceiling, IPv6, auth/login source guards, fresh role/disabled account, four frozen grades',
    gradedSubmissions: 4, frozenScores: [100, 100, 100, 100],
    productionPressure: false, productionWrites: 0 };
  fs.writeFileSync('scratch/shared-network-rate-limits.json', JSON.stringify(evidence, null, 2));
  console.log(JSON.stringify(evidence));
} finally {
  if (server) await new Promise<void>(resolve => server.close(() => resolve()));
  await close();
}
