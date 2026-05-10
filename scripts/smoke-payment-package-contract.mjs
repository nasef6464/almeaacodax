import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const paymentModalSource = read('components/PaymentModal.tsx');
const learningSectionSource = read('components/LearningSection.tsx');
const pathPageSource = read('pages/GenericPathPage.tsx');
const paymentModelSource = read('server/src/models/PaymentRequest.ts');
const paymentRoutesSource = read('server/src/routes/payment.routes.ts');
const typesSource = read('types.ts');
const financialManagerSource = read('dashboards/admin/FinancialManager.tsx');
const apiSource = read('services/api.ts');
const discountModelSource = read('server/src/models/DiscountCode.ts');
const backupSource = read('server/src/services/learningBackup.ts');

const checks = [];
const check = (name, fn) => checks.push({ name, fn });
const assertIncludes = (source, snippet, message = snippet) => {
  if (!source.includes(snippet)) {
    throw new Error(`Missing: ${message}`);
  }
};

check('payment requests preserve discount data and calculate final amount server-side', () => {
  assertIncludes(typesSource, 'discountCode?: string;');
  assertIncludes(typesSource, 'discountAmount?: number;');
  assertIncludes(paymentModelSource, 'discountCode: { type: String, default: "" }');
  assertIncludes(paymentModelSource, 'discountAmount: { type: Number, default: 0 }');
  assertIncludes(paymentRoutesSource, 'discountCode: z.string().max(80).optional()');
  assertIncludes(paymentRoutesSource, 'normalizeDiscountCode(payload.discountCode)');
  assertIncludes(paymentRoutesSource, 'calculateDiscountAmount');
  assertIncludes(paymentRoutesSource, 'amount: finalAmount');
  assertIncludes(paymentModalSource, 'discountCode: discountCode.trim().toUpperCase()');
});

check('discount codes are admin-managed and included in backups', () => {
  assertIncludes(discountModelSource, 'DiscountCodeModel');
  assertIncludes(paymentRoutesSource, '"/discount-codes"');
  assertIncludes(paymentRoutesSource, 'currentRedemptions');
  assertIncludes(paymentRoutesSource, 'payment.discount-code.upsert');
  assertIncludes(financialManagerSource, "label: 'أكواد الخصم'");
  assertIncludes(financialManagerSource, 'saveDiscountCode');
  assertIncludes(apiSource, 'getDiscountCodes');
  assertIncludes(apiSource, 'createDiscountCode');
  assertIncludes(apiSource, 'updateDiscountCode');
  assertIncludes(backupSource, 'discountCodes');
});

check('locked learning sections can offer multiple matching public packages', () => {
  assertIncludes(learningSectionSource, 'getPublicPackagesForScope');
  assertIncludes(learningSectionSource, 'publicPackageOptions.slice(0, 8).map');
  assertIncludes(learningSectionSource, 'packageOptions: matchedPackage');
  assertIncludes(paymentModalSource, 'packageOptions.length > 1');
});

check('path package tab includes global memberships without path binding', () => {
  assertIncludes(pathPageSource, 'const packagePathId = c.pathId || c.category;');
  assertIncludes(pathPageSource, 'return !packagePathId || packagePathId === path.id;');
});

let failed = 0;
for (const item of checks) {
  try {
    item.fn();
    console.log(`PASS ${item.name}`);
  } catch (error) {
    failed += 1;
    console.error(`FAIL ${item.name}`);
    console.error(error.message);
  }
}

if (failed) {
  console.error(`\n${failed}/${checks.length} payment/package contract checks failed.`);
  process.exit(1);
}

console.log(`\nAll ${checks.length} payment/package contract smoke checks passed.`);
