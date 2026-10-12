import { PaymentRequestModel } from '../models/PaymentRequest.js';
import { DiscountCodeModel } from '../models/DiscountCode.js';
import { UserModel } from '../models/User.js';
import { AccessGrantModel } from '../models/AccessGrant.js';
import { grantAccessToUser, mirrorGrantToUserSubscription } from './accessGrantService.js';
import { projectEffectiveUserAccess } from './entitlementPolicy.js';
import { paymentMinorUnits } from './tapWebhook.js';

type Evidence = {
  reviewedBy: string; approvalEvidence: string; reviewerNotes?: string;
  gatewayProvider?: string; gatewayTransactionId?: string; gatewayEventId?: string; gatewayPaidAt?: number;
};
const ids = (values: any) => [...new Set<string>((Array.isArray(values) ? values : []).map(String))].sort();
const plans: Record<string, number> = { subscription_basic: 30, subscription_premium: 30, subscription_annual: 365 };
class ReconciliationError extends Error {}
const snapshot = (p: any) => ({
  userId: p.userId, itemType: p.itemType, itemId: p.itemId,
  packageId: p.packageId || (p.itemType === 'package' ? p.itemId : ''),
  courseIds: ids(p.itemType === 'course' ? [p.itemId] : p.includedCourseIds),
  contentTypes: ids(p.contentTypes?.length ? p.contentTypes : (p.packageId || p.itemType === 'package' ? ['courses'] : ['all'])),
  pathIds: ids(p.pathIds), subjectIds: ids(p.subjectIds),
  discountCodeId: p.discountCodeId || '', discountCode: p.discountCode || '',
  amount: p.amount, originalAmount: p.originalAmount ?? p.amount, discountAmount: p.discountAmount || 0,
  currency: p.currency, durationDays: plans[p.itemId],
});
const validateSnapshot = (s: any) => {
  const amount = paymentMinorUnits(s.amount, s.currency);
  const original = paymentMinorUnits(s.originalAmount, s.currency);
  const discount = paymentMinorUnits(s.discountAmount, s.currency);
  if (amount === null || original === null || discount === null || amount !== original - discount)
    throw new ReconciliationError('Invalid purchase price snapshot');
  if (Boolean(s.discountCodeId) !== Boolean(s.discountCode) || (discount > 0 && !s.discountCodeId))
    throw new ReconciliationError('Incomplete discount snapshot');
  if (s.itemType === 'subscription' && !s.durationDays) throw new ReconciliationError('Invalid subscription plan');
};

async function reserveDiscount(p: any, scope: any) {
  if (!scope.discountCodeId) return;
  const key = `payment:${p.id}`;
  const at = p.fulfillment.acceptedAt;
  const result = await DiscountCodeModel.findOneAndUpdate({
    _id: scope.discountCodeId, code: scope.discountCode, status: 'active', redemptionRequestIds: { $ne: key },
    $and: [
      { $or: [{ startsAt: null }, { startsAt: 0 }, { startsAt: { $lte: at } }] },
      { $or: [{ expiresAt: null }, { expiresAt: 0 }, { expiresAt: { $gte: at } }] },
      { $or: [{ maxRedemptions: 0 }, { $expr: { $lt: ['$currentRedemptions', '$maxRedemptions'] } }] },
    ],
  }, { $inc: { currentRedemptions: 1 }, $addToSet: { redemptionRequestIds: key } }, { new: true });
  if (!result && !await DiscountCodeModel.exists({ _id: scope.discountCodeId, code: scope.discountCode, redemptionRequestIds: key }))
    throw new ReconciliationError('Discount reservation unavailable');
}

async function subscriptionUser(p: any, scope: any) {
  const at = new Date(p.fulfillment.acceptedAt);
  // Expiry and the order marker share ONE atomic document update. Independent
  // orders serialize at Mongo, avoiding read/modify/write lost extensions.
  const user = await UserModel.findOneAndUpdate({
    _id: scope.userId, 'subscription.appliedPaymentRequestIds': { $ne: p.id },
  }, [{ $set: {
    'subscription.plan': 'premium',
    'subscription.expiresAt': { $add: [
      { $max: [at, { $convert: { input: '$subscription.expiresAt', to: 'date', onError: at, onNull: at } }] },
      scope.durationDays * 86400000,
    ] },
    'subscription.appliedPaymentRequestIds': { $concatArrays: [
      { $ifNull: ['$subscription.appliedPaymentRequestIds', []] }, { $literal: [p.id] },
    ] },
  } }], { new: true });
  if (user) return user;
  const existing = await UserModel.findById(scope.userId);
  if (!existing?.subscription?.appliedPaymentRequestIds.includes(p.id)) throw new Error('Purchase user missing');
  return existing;
}

async function matchingGrant(p: any, scope: any) {
  const selectors: any[] = [
    { sourceType: 'payment_request', sourceId: p.id },
    { idempotencyKey: `payment_request:${p.id}` },
    { sourceType: { $in: ['payment_request', 'payment_webhook'] }, 'metadata.paymentRequestId': p.id },
  ];
  if (p.gatewayEventId) selectors.push({ idempotencyKey: `payment_webhook:${p.id}:${p.gatewayEventId}` });
  const grants = await AccessGrantModel.find({ $or: selectors });
  if (grants.length > 1) throw new ReconciliationError('Conflicting historical payment grants');
  const grant = grants[0];
  if (grant) assertGrant(grant, scope);
  return grant || null;
}
function assertGrant(g: any, s: any) {
  if (g.userId !== s.userId || g.packageId !== s.packageId || g.status !== 'active'
      || (g.expiresAt != null && g.expiresAt <= Date.now())
      || ['courseIds', 'contentTypes', 'pathIds', 'subjectIds'].some(field => JSON.stringify(ids(g[field])) !== JSON.stringify(ids(s[field]))))
    throw new ReconciliationError('Payment grant requires reconciliation');
}
async function deliverGrant(p: any, scope: any, existing: any) {
  if (existing) {
    // Use the persisted grant's scope for historical mirror recovery.
    const user = await mirrorGrantToUserSubscription({ userId: existing.userId, packageId: existing.packageId, courseIds: existing.courseIds });
    if (!user) throw new Error('Purchase user missing');
    assertGrant(await AccessGrantModel.findById(existing._id), scope);
    return { user, grant: existing };
  }
  const delivered = await grantAccessToUser({
    userId: scope.userId, sourceType: 'payment_request', sourceId: p.id,
    packageId: scope.packageId, courseIds: scope.courseIds, contentTypes: scope.contentTypes,
    pathIds: scope.pathIds, subjectIds: scope.subjectIds, grantedBy: p.reviewedBy,
    idempotencyKey: `payment_request:${p.id}`,
    metadata: { paymentRequestId: p.id, itemType: scope.itemType, itemId: scope.itemId, amount: scope.amount, currency: scope.currency },
  });
  if (!delivered.user || !delivered.grant) throw new Error('Incomplete payment delivery');
  assertGrant(delivered.grant, scope);
  return delivered;
}

/** Financial approval is durable. Every retry resumes document-atomic effects. */
export async function acceptAndFulfillPayment(input: any, evidence: Evidence) {
  let p: any = await PaymentRequestModel.findById(input._id);
  if (!p) return { request: null, statusCode: 404, error: 'Payment request not found' };
  if (!['pending', 'approved'].includes(p.status)) return { request: p, statusCode: 409, error: 'Payment request requires reconciliation' };
  try {
    if (p.status === 'pending') {
      const scope = snapshot(p); validateSnapshot(scope);
      if (!await UserModel.exists({ _id: scope.userId })) throw new Error('Purchase user missing');
      const acceptedAt = Date.now();
      const accepted = await PaymentRequestModel.findOneAndUpdate({
        _id: p._id, status: 'pending', updatedAt: input.updatedAt,
      }, { $set: {
        status: 'approved', ...evidence, reviewedAt: acceptedAt,
        fulfillment: { version: 1, state: 'pending', acceptedAt, scope },
      } }, { new: true });
      p = accepted || await PaymentRequestModel.findById(p._id);
      if (p.status !== 'approved') return { request: p, statusCode: 409, error: 'Payment request changed during approval' };
    }
    if (p.fulfillment?.state === 'completed') return { request: p, duplicate: true, statusCode: 200, user: null, grant: null };
    const isNew = p.fulfillment?.version === 1;
    const scope = isNew ? p.fulfillment.scope : snapshot(p);
    validateSnapshot(scope);
    if (!await UserModel.exists({ _id: scope.userId })) throw new Error('Purchase user missing');
    let access: any;
    if (scope.itemType === 'subscription') {
      if (!isNew) {
        const user = await UserModel.findById(scope.userId);
        if (!user?.subscription?.appliedPaymentRequestIds.includes(p.id))
          throw new ReconciliationError('Historical subscription application is ambiguous');
        access = { user, grant: null };
      } else {
        await reserveDiscount(p, scope);
        access = { user: await subscriptionUser(p, scope), grant: null };
      }
    } else {
      const existing = await matchingGrant(p, scope);
      if (!isNew && scope.discountCodeId && !existing) throw new ReconciliationError('Historical discount redemption is ambiguous');
      if (isNew) await reserveDiscount(p, scope);
      access = await deliverGrant(p, scope, existing);
    }
    p = await PaymentRequestModel.findOneAndUpdate({ _id: p._id, status: 'approved' }, { $set: {
      'fulfillment.state': 'completed', 'fulfillment.completedAt': Date.now(), 'fulfillment.error': '',
    } }, { new: true });
    if (!p) throw new Error('Payment completion could not be recorded');
    const user = await projectEffectiveUserAccess(access.user.toJSON());
    return { request: p, user, grant: access.grant, duplicate: false, statusCode: 200 };
  } catch (error: any) {
    const reconciliation = error instanceof ReconciliationError;
    const state = reconciliation ? 'reconciliation_required' : 'failed';
    // Never let a delayed failure overwrite another worker's completed marker.
    await PaymentRequestModel.updateOne({ _id: p._id, status: 'approved', 'fulfillment.state': { $ne: 'completed' } }, {
      $set: { 'fulfillment.state': state, 'fulfillment.error': reconciliation ? error.message : 'Payment activation can be retried' },
    });
    const current = await PaymentRequestModel.findById(p._id);
    if (current?.fulfillment?.state === 'completed') return { request: current, duplicate: true, statusCode: 200, user: null, grant: null };
    return { request: current, statusCode: reconciliation ? 409 : 500, error: reconciliation ? error.message : 'Payment activation can be retried' };
  }
}
