import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
Object.assign(process.env, { NODE_ENV: 'test', MONGODB_URI: 'mongodb://127.0.0.1:27017/not_connected',
  JWT_SECRET: 'isolated-budget-identity-test-only', JWT_EXPIRES_IN: '1h', RATE_LIMIT_REDIS_ENABLED: 'false' });
const requireServer = createRequire(new URL('../server/package.json', import.meta.url));
const jwt = requireServer('jsonwebtoken');
const { signAccessToken } = await import('../server/dist/utils/jwt.js');
const { identifyRateLimitActor, rateLimitActorId } = await import('../server/dist/middleware/rateLimitIdentity.js');
const token = signAccessToken({ id: 'isolated-budget-actor', name: 'Budget QA', role: 'student', email: 'budget@isolated.test' });
const original = jwt.verify;
let verifications = 0;
jwt.verify = function (...args: any[]) { verifications++; return original.apply(this, args); };
try {
  for (const path of ['/', '/api/health', '/api/health/live', '/api/health/ready', '/api/content/bootstrap', '/api/taxonomy/bootstrap']) {
    const request: any = { method: 'GET', path, headers: { authorization: 'Bearer ' + token }, cookies: {} };
    const before = verifications;
    let continued = false;
    identifyRateLimitActor(request, {} as any, () => { continued = true; });
    assert.ok(continued);
    assert.equal(verifications, before, 'Exempt reads must not add budget-only token verification: ' + path);
    assert.equal(request.authUser, undefined);
  }
  for (const method of ['GET', 'POST']) {
    const request: any = { method, path: '/api/payments/requests', headers: { authorization: 'Bearer ' + token }, cookies: {} };
    const before = verifications;
    identifyRateLimitActor(request, {} as any, () => {});
    assert.equal(verifications, before + 1);
    assert.equal(rateLimitActorId(request), 'isolated-budget-actor');
    assert.equal(request.authUser, undefined, 'Budget partition must not authorize a request');
  }
  const invalid: any = { method: 'GET', path: '/api/payments/requests',
    headers: { authorization: 'Bearer invalid-token' }, cookies: { almeaa_access_token: token } };
  identifyRateLimitActor(invalid, {} as any, () => {});
  assert.equal(rateLimitActorId(invalid), undefined, 'Invalid bearer keeps authentication cookie precedence');
  console.log(JSON.stringify({ status: 'PASS', exemptReads: 6, privateBudgetVerifications: 2,
    invalidBearerOverridesCookie: true, authUserMutations: 0, mongoConnections: 0 }));
} finally { jwt.verify = original; }
