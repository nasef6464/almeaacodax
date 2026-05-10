import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const paymentModalSource = fs.readFileSync(path.join(root, 'components/PaymentModal.tsx'), 'utf8');
const learningSectionSource = fs.readFileSync(path.join(root, 'components/LearningSection.tsx'), 'utf8');
const pathPageSource = fs.readFileSync(path.join(root, 'pages/GenericPathPage.tsx'), 'utf8');
const paymentModelSource = fs.readFileSync(path.join(root, 'server/src/models/PaymentRequest.ts'), 'utf8');
const paymentRoutesSource = fs.readFileSync(path.join(root, 'server/src/routes/payment.routes.ts'), 'utf8');
const typesSource = fs.readFileSync(path.join(root, 'types.ts'), 'utf8');

const checks = [];
const check = (name, fn) => checks.push({ name, fn });
const assertIncludes = (source, snippet, message = snippet) => {
  if (!source.includes(snippet)) {
    throw new Error(`Missing: ${message}`);
  }
};

check('payment requests preserve optional discount code for admin review', () => {
  assertIncludes(typesSource, 'discountCode?: string;');
  assertIncludes(paymentModelSource, 'discountCode: { type: String, default: "" }');
  assertIncludes(paymentRoutesSource, 'discountCode: z.string().max(80).optional()');
  assertIncludes(paymentRoutesSource, 'discountCode: payload.discountCode?.trim().toUpperCase() || ""');
  assertIncludes(paymentModalSource, 'placeholder="كود خصم (اختياري)"');
  assertIncludes(paymentModalSource, 'discountCode: discountCode.trim().toUpperCase()');
});

check('locked learning sections can offer multiple matching public packages', () => {
  assertIncludes(learningSectionSource, 'getPublicPackagesForScope');
  assertIncludes(learningSectionSource, 'publicPackageOptions.slice(0, 8).map');
  assertIncludes(learningSectionSource, 'packageOptions: matchedPackage');
  assertIncludes(paymentModalSource, 'packageOptions.length > 1');
  assertIncludes(paymentModalSource, 'اختر الباقة المناسبة');
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
