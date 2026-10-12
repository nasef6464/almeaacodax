import crypto from 'node:crypto';

const decimals: Record<string, number> = { SAR: 2, USD: 2, AED: 2, QAR: 2, EGP: 2, EUR: 2, GBP: 2, KWD: 3, BHD: 3, OMR: 3, JOD: 3 };
/** Reject ambiguous monetary precision; never round a mismatch into acceptance. */
export const paymentMinorUnits = (amount: unknown, currency: unknown): number | null => {
  const places = decimals[String(currency)];
  if (places === undefined || (typeof amount !== 'number' && typeof amount !== 'string')) return null;
  if (typeof amount === 'string' && !/^\d+(\.\d+)?$/.test(amount)) return null;
  const value = Number(amount);
  if (!Number.isFinite(value) || value < 0) return null;
  const scaled = value * 10 ** places;
  const integer = Math.round(scaled);
  return Number.isSafeInteger(integer) && Math.abs(scaled - integer) < 1e-7 ? integer : null;
};

export const verifyTapChargeSignature = (payload: any, signature: unknown, secret: string) => {
  const provided = typeof signature === 'string' ? signature.trim() : '';
  if (!secret || !/^[a-fA-F0-9]{64}$/.test(provided)) return false;
  if (payload?.object !== 'charge' || typeof payload.id !== 'string' || !payload.id
      || typeof payload.status !== 'string' || !payload.status || typeof payload.currency !== 'string'
      || payload?.transaction?.created == null || payload?.reference?.payment == null) return false;
  const minor = paymentMinorUnits(payload.amount, payload.currency);
  if (minor === null) return false;
  const amount = (minor / 10 ** decimals[payload.currency]).toFixed(decimals[payload.currency]);
  const raw = `x_id${payload.id}x_amount${amount}x_currency${payload.currency}x_gateway_reference${payload.reference.gateway ?? ''}x_payment_reference${payload.reference.payment}x_status${payload.status}x_created${payload.transaction.created}`;
  const expected = crypto.createHmac('sha256', secret).update(raw).digest();
  const actual = Buffer.from(provided, 'hex');
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
};

export const tapChargeBindingError = (request: any, payload: any): string | null => {
  if (request.gatewayProvider !== 'tap' || request.gatewayTransactionId !== payload.id) return 'Tap charge identity mismatch';
  if (request.currency !== payload.currency) return 'Payment currency mismatch';
  const expected = paymentMinorUnits(request.amount, request.currency);
  const actual = paymentMinorUnits(payload.amount, payload.currency);
  if (expected === null || actual === null || expected !== actual) return 'Payment amount mismatch';
  for (const reference of [payload.reference?.order, payload.reference?.transaction]) {
    if (reference && String(reference) !== String(request.id)) return 'Payment request reference mismatch';
  }
  return null;
};
