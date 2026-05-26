import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const pricingSource = read('pages/Pricing.tsx');
const pathsManagerSource = read('dashboards/admin/PathsManager.tsx');

const checks = [];
const check = (name, fn) => checks.push({ name, fn });
const includes = (source, needle) => {
  if (!source.includes(needle)) throw new Error(`Missing: ${needle}`);
};
const notIncludes = (source, needle) => {
  if (source.includes(needle)) throw new Error(`Must not include: ${needle}`);
};

check('pricing page treats platform memberships separately from learning packages', () => {
  includes(pricingSource, 'عضويات المنصة');
  includes(pricingSource, 'العضويات هنا اشتراك عام للمنصة');
  includes(pricingSource, 'ليست باقات ساحة التعلم داخل المسارات');
  notIncludes(pricingSource, "ctaLink: '/courses'");
  notIncludes(pricingSource, 'to={plan.ctaLink}');
});

check('paid membership CTAs do not route users into courses', () => {
  includes(pricingSource, "action: 'whatsapp'");
  includes(pricingSource, 'https://wa.me/');
  includes(pricingSource, 'هذه عضوية عامة للمنصة وليست باقة مسار تعلم.');
});

check('free membership CTA keeps the user in account flow', () => {
  includes(pricingSource, "const freeMembershipLink = user ? '/dashboard' : '/login';");
  includes(pricingSource, 'to={freeMembershipLink}');
});

check('admin has a clear membership management entry point', () => {
  includes(pricingSource, 'إدارة العضويات العامة للمدير');
  includes(pricingSource, 'to="/admin-dashboard?tab=paths"');
  includes(pathsManagerSource, 'إدارة العضويات العامة وباقات المسارات');
  includes(pathsManagerSource, 'عضوية عامة تفتح كل المنصة');
  includes(pathsManagerSource, "packageType: packageAppliesGlobally ? 'membership' : 'courses'");
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
  console.error(`\n${failed}/${checks.length} membership pricing contract checks failed.`);
  process.exit(1);
}

console.log(`\nAll ${checks.length} membership pricing contract smoke checks passed.`);
