import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import mongoose from 'mongoose';
import express from 'express';
import dotenv from 'dotenv';

// Never load any workspace credentials. Only this disposable localhost database is used.
dotenv.config = (() => ({})) as typeof dotenv.config;
const dbName = 'almeaa_platform_v3_ci_courses_repair_payment';
process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = `mongodb://127.0.0.1:27017/${dbName}`;
process.env.JWT_SECRET = 'payment-repair-isolated-test-secret';
process.env.TAP_API_KEY = 'isolated-fixture-secret';
process.env.TAP_SECRET_KEY = '';
process.env.PAYMENT_WEBHOOK_SECRET = 'isolated-generic-secret';
console.log('isolated payment harness importing');
const { PaymentRequestModel: P } = await import('../models/PaymentRequest.js');
const { UserModel: U } = await import('../models/User.js');
const { DiscountCodeModel: D } = await import('../models/DiscountCode.js');
const { AccessGrantModel: G } = await import('../models/AccessGrant.js');
const { PaymentGatewayEventGuardModel: E } = await import('../models/PaymentGatewayEventGuard.js');
const { paymentRouter } = await import('../routes/payment.routes.js');
const { signAccessToken } = await import('../utils/jwt.js');
console.log('isolated payment harness connecting');
await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 5000, autoIndex: false });
assert.equal(mongoose.connection.name, dbName);
console.log('isolated payment database connected');
await mongoose.connection.dropDatabase();
console.log('isolated payment database reset');
await Promise.all([P.createIndexes(), U.createIndexes(), D.createIndexes(), G.createIndexes(), E.createIndexes()]);
console.log('isolated payment indexes ready');
const app = express(); app.use(express.json()); app.use('/payments', paymentRouter);
app.use((err: any, _req: any, res: any, _next: any) => res.status(500).json({ message: err.message }));
const server = app.listen(0, '127.0.0.1');
await new Promise<void>(resolve => server.once('listening', resolve));
const port = (server.address() as any).port;
const user = await U.create({ name: 'Buyer', email: 'buyer@isolated.invalid', passwordHash: 'not-a-password' });
const admin = await U.create({ name: 'Admin', email: 'admin@isolated.invalid', passwordHash: 'not-a-password', role: 'admin' });
const token = signAccessToken({ id: String(admin._id), name: 'Admin', email: admin.email, role: 'admin' } as any);
let serial = 0; let passed = 0; let failed = 0;
const make = async (extra: any = {}) => P.create({ id: `order-${++serial}`, userId: String(user._id), itemType: 'course', itemId: `course-${serial}`, itemName: 'Course', amount: 10, originalAmount: 10, currency: 'SAR', paymentMethod: 'transfer', transferReference: 'proof', ...extra });
const call = async (path: string, body: any, headers: any = {}, method = 'POST') => {
  const response = await fetch(`http://127.0.0.1:${port}/payments${path}`, { method, headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) });
  return { status: response.status, body: await response.json() as any };
};
const approve = (p: any) => call(`/requests/${p.id}/review`, { status: 'approved' }, { authorization: `Bearer ${token}` }, 'PATCH');
// Independently concatenate the provider's documented charge fields, never use production signing helpers.
const signedTap = (p: any, extra: any = {}) => {
  const payload = { object: 'charge', id: p.gatewayTransactionId, amount: 10, currency: 'SAR', status: 'CAPTURED', reference: { gateway: 'gw', payment: 'pay', order: p.id }, transaction: { created: '1600000000000' }, ...extra };
  const raw = `x_id${payload.id}x_amount${Number(payload.amount).toFixed(payload.currency === 'KWD' ? 3 : 2)}x_currency${payload.currency}x_gateway_reference${payload.reference.gateway || ''}x_payment_reference${payload.reference.payment || ''}x_status${payload.status}x_created${payload.transaction.created}`;
  return { payload, signature: crypto.createHmac('sha256', 'isolated-fixture-secret').update(raw).digest('hex') };
};
const tap = (fixture: any) => call('/webhooks/tap', fixture.payload, { hashstring: fixture.signature });
const test = async (name: string, fn: () => Promise<void>) => { try { await fn(); passed++; console.log(`PASS ${name}`); } catch (e: any) { failed++; console.log(`FAIL ${name}: ${e.message}`); } };
const failOne = async (model: any, method: string, predicate: (args: any[]) => boolean, after: boolean, action: () => Promise<void>) => {
  const original = model[method]; let injected = false;
  model[method] = async function (...args: any[]) {
    if (!injected && predicate(args)) {
      injected = true;
      if (after) await original.apply(this, args);
      throw new Error('injected durable boundary failure');
    }
    return original.apply(this, args);
  };
  try { await action(); assert.ok(injected, 'fault boundary was exercised'); } finally { model[method] = original; }
};
try {
  await test('approved replay returns completed delivery, one stable grant', async () => {
    const p = await make(); assert.equal((await approve(p)).status, 200);
    const replay = await approve(p); assert.equal(replay.status, 200); assert.equal(replay.body.request.fulfillment.state, 'completed');
    assert.equal(await G.countDocuments({ 'metadata.paymentRequestId': p.id }), 1);
  });
  await test('official Tap charge signature delivers bound purchase', async () => {
    const p = await make({ gatewayProvider: 'tap', gatewayTransactionId: 'chg-fixture' });
    const result = await tap(signedTap(p)); assert.equal(result.status, 200); assert.equal((await P.findById(p._id))?.status, 'approved');
  });
  await test('failure after discount reservation replays without charging counter twice', async () => {
    const discount = await D.create({ code: 'RETRY', value: 1, maxRedemptions: 1 });
    const p = await make({ discountCode: 'RETRY', discountCodeId: String(discount._id), discountAmount: 1, originalAmount: 11 });
    const original = G.create;
    (G as any).create = async () => { throw new Error('injected grant failure'); };
    try { assert.equal((await approve(p)).status, 500); } finally { G.create = original; }
    assert.equal((await D.findById(discount._id))?.currentRedemptions, 1);
    assert.equal((await approve(p)).status, 200);
    assert.equal((await D.findById(discount._id))?.currentRedemptions, 1);
    assert.equal(await G.countDocuments({ 'metadata.paymentRequestId': p.id }), 1);
  });
  await test('concurrent subscription orders plus retries extend exactly two months', async () => {
    const baseline = new Date('2040-01-01T00:00:00.000Z');
    await U.updateOne({ _id: user._id }, { $set: { 'subscription.expiresAt': baseline } });
    const a = await make({ itemType: 'subscription', itemId: 'subscription_basic' });
    const b = await make({ itemType: 'subscription', itemId: 'subscription_premium' });
    const responses = await Promise.all([approve(a), approve(b)]); assert.ok(responses.every(r => r.status === 200));
    await Promise.all(Array.from({ length: 10 }, () => approve(a)));
    assert.equal((await U.findById(user._id))?.subscription?.expiresAt?.toISOString(), '2040-03-01T00:00:00.000Z');
  });
  await test('legacy subscription replay preserves historical expiry and requires reconciliation', async () => {
    const before = (await U.findById(user._id))?.subscription?.expiresAt?.getTime();
    const p = await make({ itemType: 'subscription', itemId: 'subscription_annual', status: 'approved' });
    const response = await approve(p); assert.equal(response.status, 409);
    assert.equal(response.body.request.fulfillment.state, 'reconciliation_required');
    assert.equal((await U.findById(user._id))?.subscription?.expiresAt?.getTime(), before);
  });
  await test('valid signature wrong captured amount cannot approve', async () => {
    const p = await make({ gatewayProvider: 'tap', gatewayTransactionId: 'chg-wrong-amount' });
    assert.equal((await tap(signedTap(p, { amount: 11 }))).status, 400);
    assert.equal((await P.findById(p._id))?.status, 'pending');
  });
  await test('Tap intermediate status does not reject pending order', async () => {
    const p = await make({ gatewayProvider: 'tap', gatewayTransactionId: 'chg-intermediate' });
    assert.equal((await tap(signedTap(p, { status: 'INITIATED' }))).status, 200);
    assert.equal((await P.findById(p._id))?.status, 'pending');
  });
  await test('unsigned order reference cannot redirect captured charge', async () => {
    const a = await make({ gatewayProvider: 'tap', gatewayTransactionId: 'chg-unsigned' }); const b = await make();
    const fixture = signedTap(a); fixture.payload.reference.order = b.id;
    assert.equal((await tap(fixture)).status, 400);
    assert.equal((await P.findById(a._id))?.status, 'pending'); assert.equal((await P.findById(b._id))?.status, 'pending');
  });
  await test('new signed failure never downgrades approved charge', async () => {
    const p = await make({ gatewayProvider: 'tap', gatewayTransactionId: 'chg-failure-late' });
    assert.equal((await tap(signedTap(p))).status, 200);
    assert.equal((await tap(signedTap(p, { status: 'FAILED' }))).status, 200);
    assert.equal((await P.findById(p._id))?.status, 'approved');
  });
  await test('same generic event resumes failed delivery; cross-order reuse is rejected', async () => {
    const p = await make(); const body = { provider: 'fixture', eventId: 'generic-recover', paymentRequestId: p.id, status: 'paid', paidAmount: 10, currency: 'SAR' };
    const generic = (body: any) => call('/webhooks/payment', body, { 'x-payment-signature': crypto.createHmac('sha256', 'isolated-generic-secret').update(JSON.stringify(body)).digest('hex') });
    const original = G.create; (G as any).create = async () => { throw new Error('injected grant failure'); };
    try { assert.equal((await generic(body)).status, 500); } finally { G.create = original; }
    const retry = await generic(body); assert.equal(retry.status, 200); assert.equal(retry.body.request.fulfillment.state, 'completed');
    const another = await make(); assert.equal((await generic({ ...body, paymentRequestId: another.id })).status, 409);
    assert.equal((await P.findById(another._id))?.status, 'pending');
  });
  for (const boundary of ['approval', 'discount', 'grant', 'mirror', 'completion'] as const) {
    await test(`crash at ${boundary} boundary resumes all actual effects exactly once`, async () => {
      const discount = await D.create({ code: `FAULT${serial}`, value: 1, maxRedemptions: 1 });
      const p = await make({ discountCode: discount.code, discountCodeId: String(discount._id), originalAmount: 11, discountAmount: 1 });
      const target: any = boundary === 'approval' || boundary === 'completion' ? P : boundary === 'discount' ? D : boundary === 'grant' ? G : U;
      const method = boundary === 'grant' ? 'create' : boundary === 'mirror' ? 'findByIdAndUpdate' : 'findOneAndUpdate';
      const predicate = boundary === 'approval' ? (a: any[]) => a[1]?.$set?.status === 'approved'
        : boundary === 'completion' ? (a: any[]) => a[1]?.$set?.['fulfillment.state'] === 'completed' : () => true;
      await failOne(target, method, predicate, boundary !== 'mirror' && boundary !== 'completion', async () => {
        assert.equal((await approve(p)).status, 500);
      });
      const first = await P.findById(p._id); assert.equal(first?.status, 'approved'); assert.equal(first?.fulfillment?.state, 'failed');
      const retry = await approve(p); assert.equal(retry.status, 200); assert.equal(retry.body.request.fulfillment.state, 'completed');
      assert.equal((await D.findById(discount._id))?.currentRedemptions, 1);
      assert.equal(await G.countDocuments({ 'metadata.paymentRequestId': p.id }), 1);
      const updatedUser = await U.findById(user._id);
      assert.ok(updatedUser?.subscription?.purchasedCourses.includes(p.itemId)); assert.ok(updatedUser?.enrolledCourses.includes(p.itemId));
      assert.equal(retry.body.user.passwordHash, undefined); assert.equal(retry.body.user.passwordResetTokenHash, undefined);
    });
  }
  await test('crash after atomic subscription update never extends twice', async () => {
    await U.updateOne({ _id: user._id }, { $set: { 'subscription.expiresAt': new Date('2040-01-01T00:00:00.000Z') } });
    const p = await make({ itemType: 'subscription', itemId: 'subscription_basic' });
    await failOne(U, 'findOneAndUpdate', a => Array.isArray(a[1]), true, async () => { assert.equal((await approve(p)).status, 500); });
    assert.equal((await approve(p)).status, 200);
    const updatedUser = await U.findById(user._id);
    assert.equal(updatedUser?.subscription?.expiresAt?.toISOString(), '2040-01-31T00:00:00.000Z');
    assert.equal(updatedUser?.subscription?.appliedPaymentRequestIds.filter(id => id === p.id).length, 1);
    assert.ok(updatedUser?.subscription?.purchasedCourses.length);
  });
  await test('concurrent approvals converge on one grant and one last discount slot', async () => {
    const discount = await D.create({ code: 'LASTSLOT', value: 1, maxRedemptions: 1 });
    const extra = { discountCode: discount.code, discountCodeId: String(discount._id), originalAmount: 11, discountAmount: 1 };
    const p = await make(extra); const other = await make(extra);
    const results = await Promise.all([approve(p), approve(p), approve(other)]);
    assert.ok(results.some(result => result.status === 200)); assert.ok(results.some(result => result.status === 409));
    assert.equal((await D.findById(discount._id))?.currentRedemptions, 1);
    assert.equal(await G.countDocuments({ 'metadata.paymentRequestId': { $in: [p.id, other.id] } }), 1);
    const winner = await G.findOne({ 'metadata.paymentRequestId': { $in: [p.id, other.id] } });
    const order = await P.findOne({ id: winner?.metadata?.paymentRequestId });
    await D.updateOne({ _id: discount._id }, { $set: { status: 'expired', expiresAt: 1 } });
    assert.equal((await approve(order)).status, 200); assert.equal((await D.findById(discount._id))?.currentRedemptions, 1);
  });
  await test('legacy webhook grant repairs mirror while preserving discount count', async () => {
    const discount = await D.create({ code: 'LEGACY', value: 1, currentRedemptions: 7 });
    const p = await make({ status: 'approved', gatewayEventId: 'legacy-event', discountCode: discount.code, discountCodeId: String(discount._id), originalAmount: 11, discountAmount: 1 });
    await G.create({ id: `legacy-${p.id}`, userId: p.userId, sourceType: 'payment_webhook', sourceId: `${p.id}:legacy-event`,
      idempotencyKey: `payment_webhook:${p.id}:legacy-event`, courseIds: [p.itemId], contentTypes: ['all'], metadata: { paymentRequestId: p.id } });
    assert.equal((await approve(p)).status, 200); assert.equal((await D.findById(discount._id))?.currentRedemptions, 7);
    assert.equal(await G.countDocuments({ 'metadata.paymentRequestId': p.id }), 1);
    assert.ok((await U.findById(user._id))?.subscription?.purchasedCourses.includes(p.itemId));
  });
  await test('ambiguous legacy discount stays blocked without counting or granting', async () => {
    const discount = await D.create({ code: 'AMBIGUOUS', value: 1, currentRedemptions: 7 });
    const p = await make({ status: 'approved', discountCode: discount.code, discountCodeId: String(discount._id), originalAmount: 11, discountAmount: 1 });
    const result = await approve(p); assert.equal(result.status, 409); assert.equal(result.body.request.fulfillment.state, 'reconciliation_required');
    assert.equal((await D.findById(discount._id))?.currentRedemptions, 7); assert.equal(await G.countDocuments({ sourceId: p.id }), 0);
  });
  await test('revoked legacy grant is never revived or mirrored', async () => {
    const p = await make({ status: 'approved' });
    await G.create({ id: `revoked-${p.id}`, userId: p.userId, sourceType: 'payment_request', sourceId: p.id,
      idempotencyKey: `payment_request:${p.id}`, courseIds: [p.itemId], contentTypes: ['all'], status: 'revoked' });
    assert.equal((await approve(p)).status, 409);
    assert.equal((await G.findOne({ sourceId: p.id }))?.status, 'revoked');
    assert.ok(!(await U.findById(user._id))?.subscription?.purchasedCourses.includes(p.itemId));
  });
  await test('signed currency mismatch rejects without monetary or grant effects', async () => {
    const p = await make({ gatewayProvider: 'tap', gatewayTransactionId: 'chg-currency' });
    assert.equal((await tap(signedTap(p, { currency: 'USD' }))).status, 400);
    assert.equal((await P.findById(p._id))?.status, 'pending'); assert.equal(await G.countDocuments({ sourceId: p.id }), 0);
  });
  await test('callback before charge persistence is retryable and cannot bind unsigned reference', async () => {
    const p = await make({ gatewayProvider: 'tap', gatewayTransactionId: '' });
    const fixture = signedTap({ ...p.toObject(), gatewayTransactionId: 'chg-binding-race' });
    assert.equal((await tap(fixture)).status, 409); assert.equal((await P.findById(p._id))?.status, 'pending');
    await P.updateOne({ _id: p._id }, { $set: { gatewayTransactionId: 'chg-binding-race' } });
    assert.equal((await tap(fixture)).status, 200);
  });
  await test('JSON HMAC and tampered signed fields never authenticate as Tap', async () => {
    const p = await make({ gatewayProvider: 'tap', gatewayTransactionId: 'chg-tamper' });
    const fixture = signedTap(p);
    const jsonHash = crypto.createHmac('sha256', 'isolated-fixture-secret').update(JSON.stringify(fixture.payload)).digest('hex');
    assert.equal((await tap({ ...fixture, signature: jsonHash })).status, 401);
    fixture.payload.status = 'FAILED'; assert.equal((await tap(fixture)).status, 401);
    assert.equal((await P.findById(p._id))?.status, 'pending');
  });
  await test('KWD three decimals and empty gateway reference authenticate exactly', async () => {
    const p = await make({ gatewayProvider: 'tap', gatewayTransactionId: 'chg-kwd', amount: 1.234, originalAmount: 1.234, currency: 'KWD' });
    const fixture = signedTap(p, { amount: 1.234, currency: 'KWD', reference: { payment: 'pay', order: p.id } });
    assert.equal((await tap(fixture)).status, 200); assert.equal((await P.findById(p._id))?.fulfillment?.state, 'completed');
  });
  for (const amount of [10.001, -10, 'NaN']) {
    await test(`malformed or ambiguous SAR amount ${amount} cannot approve`, async () => {
      const p = await make({ gatewayProvider: 'tap', gatewayTransactionId: `chg-precision-${serial}` });
      assert.equal((await tap(signedTap(p, { amount }))).status, 401); assert.equal((await P.findById(p._id))?.status, 'pending');
    });
  }
  await test('verified failure winner blocks later capture with explicit conflict', async () => {
    const p = await make({ gatewayProvider: 'tap', gatewayTransactionId: 'chg-failure-winner' });
    assert.equal((await tap(signedTap(p, { status: 'DECLINED' }))).status, 200);
    assert.equal((await tap(signedTap(p))).status, 409);
    assert.equal((await P.findById(p._id))?.status, 'rejected'); assert.equal(await G.countDocuments({ sourceId: p.id }), 0);
  });
  await test('delayed verified failure write cannot overwrite winning approval', async () => {
    const p = await make({ gatewayProvider: 'tap', gatewayTransactionId: 'chg-delayed-failure' });
    const original = P.findOneAndUpdate;
    let release!: () => void; let entered!: () => void;
    const barrier = new Promise<void>(resolve => { release = resolve; });
    const waiting = new Promise<void>(resolve => { entered = resolve; });
    (P as any).findOneAndUpdate = async function (...args: any[]) {
      if (args[1]?.$set?.status === 'rejected') { entered(); await barrier; }
      return (original as any).apply(this, args);
    };
    try {
      const failure = tap(signedTap(p, { status: 'FAILED' })); await waiting;
      assert.equal((await tap(signedTap(p))).status, 200); release(); assert.equal((await failure).status, 200);
      assert.equal((await P.findById(p._id))?.status, 'approved');
    } finally { release(); P.findOneAndUpdate = original; }
  });
  await test('package delivery uses immutable purchase snapshot and scoped access', async () => {
    const buyer = await U.create({ name: 'Package buyer', email: 'package@isolated.invalid', passwordHash: 'none', enrolledCourses: ['free-existing'] });
    const p = await make({ userId: String(buyer._id), itemType: 'package', itemId: 'package-snapshot', includedCourseIds: ['included-a', 'included-b'], contentTypes: ['courses'], pathIds: ['path-a'] });
    const result = await approve(p); assert.equal(result.status, 200);
    assert.deepEqual(result.body.accessGrant.courseIds.sort(), ['included-a', 'included-b']);
    assert.equal(result.body.user.subscription.plan, 'free'); assert.ok(result.body.user.enrolledCourses.includes('free-existing'));
    assert.deepEqual(result.body.accessGrant.pathIds, ['path-a']);
  });
  await test('missing purchase user cannot be marked financially approved', async () => {
    const p = await make({ userId: '000000000000000000000001' });
    assert.equal((await approve(p)).status, 404); assert.equal((await P.findById(p._id))?.status, 'pending');
  });
  for (const status of ['RESTRICTED', 'VOID']) {
    await test(`documented Tap terminal ${status} rejects only pending payment`, async () => {
      const p = await make({ gatewayProvider: 'tap', gatewayTransactionId: `chg-final-${status}` });
      assert.equal((await tap(signedTap(p, { status }))).status, 200); assert.equal((await P.findById(p._id))?.status, 'rejected');
    });
  }
} finally {
  console.log(`RESULT ${passed} PASS ${failed} FAIL`);
  await new Promise<void>(resolve => server.close(() => resolve()));
  await mongoose.disconnect();
}
if (failed) process.exitCode = 1;
