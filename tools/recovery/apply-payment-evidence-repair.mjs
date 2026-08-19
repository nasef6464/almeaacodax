import fs from 'node:fs';
import path from 'node:path';

const targetPath = path.resolve('dashboards/admin/FinancialManager.tsx');
const source = fs.readFileSync(targetPath, 'utf8');

const oldBlock = `            await api.reviewPaymentRequest(request.id, { status, reviewerNotes: '' });`;
const newBlock = `            const approvalEvidence = status === 'approved' ? buildApprovalEvidence(request) : undefined;\n            await api.reviewPaymentRequest(request.id, {\n                status,\n                reviewerNotes: '',\n                ...(approvalEvidence ? { approvalEvidence } : {}),\n            });`;

if (source.includes(newBlock)) {
  console.log('Payment approval evidence repair already applied; no changes needed.');
  process.exit(0);
}

const occurrences = source.split(oldBlock).length - 1;
if (occurrences !== 1) {
  throw new Error(`Expected exactly one legacy reviewPaymentRequest call, found ${occurrences}. Refusing to edit.`);
}

const next = source.replace(oldBlock, newBlock);

if (!next.includes('const buildApprovalEvidence = (request: PaymentRequest) =>')) {
  throw new Error('Expected buildApprovalEvidence helper is missing. Refusing to edit.');
}
if (!next.includes("status === 'approved' ? buildApprovalEvidence(request) : undefined")) {
  throw new Error('Approval-only evidence guard was not installed.');
}
if (next.includes("await api.reviewPaymentRequest(request.id, { status, reviewerNotes: '' });")) {
  throw new Error('Legacy evidence-free approval call still exists.');
}

fs.writeFileSync(targetPath, next, 'utf8');
console.log('Applied guarded manual-payment approval evidence repair.');