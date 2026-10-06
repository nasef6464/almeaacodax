import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const pricingSource = read('pages/Pricing.tsx');
const pathsManagerSource = read('dashboards/admin/PathsManager.tsx');
const membershipsManagerSource = read('dashboards/admin/MembershipsManager.tsx');

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
  includes(pricingSource, 'العضوية هنا اشتراك عام على مستوى المنصة');
  includes(pricingSource, 'باقات المسارات والمدارس تدار بشكل مستقل');
  includes(pricingSource, 'isPublicMembership');
  includes(pricingSource, "course.packageType === 'membership'");
  notIncludes(pricingSource, "ctaLink: '/courses'");
  notIncludes(pricingSource, 'to={plan.ctaLink}');
});

check('paid membership CTAs use the managed payment flow', () => {
  includes(pricingSource, '<PaymentModal');
  includes(pricingSource, 'type="package"');
  includes(pricingSource, "purchaseType: 'package'");
  includes(pricingSource, 'هذه عضوية عامة على مستوى المنصة وليست باقة مسار محددة.');
  notIncludes(pricingSource, 'https://wa.me/');
});

check('free membership CTA keeps the user in account flow', () => {
  includes(pricingSource, "const freeMembershipLink = user?.id && user.id !== 'guest' ? '/dashboard' : '/login';");
  includes(pricingSource, 'to={freeMembershipLink}');
});

check('admin has a clear membership management entry point', () => {
  includes(pricingSource, 'إدارة العضويات العامة');
  includes(pricingSource, 'to="/admin-dashboard?tab=memberships"');
  includes(membershipsManagerSource, 'إدارة العضويات');
  includes(membershipsManagerSource, 'إنشاء عضوية عامة');
  includes(membershipsManagerSource, 'باقات المسارات منفصلة');
  includes(pathsManagerSource, "packageType: packageAppliesGlobally ? 'membership' : 'courses'");
});

check('memberships can include the same content type as other packages', () => {
  includes(membershipsManagerSource, 'contentTypeLabels');
  includes(membershipsManagerSource, 'mockExams');
  includes(membershipsManagerSource, 'toggleContentType');
  includes(membershipsManagerSource, 'يمكن أن يشترك نفس المحتوى في أكثر من باقة أو عضوية');
  includes(membershipsManagerSource, "packageContentTypes: form.packageContentTypes.length ? form.packageContentTypes : ['all']");
});

check('membership files do not contain Arabic mojibake markers', () => {
  for (const source of [pricingSource, membershipsManagerSource]) {
    notIncludes(source, 'Ø');
    notIncludes(source, 'Ù');
    notIncludes(source, 'Ã');
    notIncludes(source, 'Â');
  }
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
