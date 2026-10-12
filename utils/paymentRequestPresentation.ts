import type { PaymentRequest } from '../types';
export const paymentActivationLabel = (request: PaymentRequest) => {
  if (request.status !== 'approved') return '';
  switch (request.fulfillment?.state) {
    case 'completed': return 'الدفع معتمد — تم تفعيل الوصول';
    case 'pending': return 'الدفع معتمد — تفعيل الوصول قيد الانتظار';
    case 'failed': return 'الدفع معتمد — تعذر تفعيل الوصول';
    case 'reconciliation_required': return 'الدفع معتمد — تفعيل الوصول يحتاج مراجعة الإدارة';
    default: return 'الدفع معتمد';
  }
};
export const canRetryFulfillment = (request: PaymentRequest) => request.status === 'approved' &&
  request.fulfillment?.version === 1 && ['pending', 'failed'].includes(request.fulfillment.state) &&
  (request.paymentMethod === 'transfer' || request.paymentMethod === 'wallet' || request.paymentMethod === 'card') &&
  (!request.paymentGatewayMode || request.paymentGatewayMode === 'manual_review') && !request.gatewayTransactionId;
