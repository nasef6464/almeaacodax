import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const paymentModal = read('components/PaymentModal.tsx');
const learningSection = read('components/LearningSection.tsx');
const courseOverview = read('components/CourseOverview.tsx');
const genericPathPage = read('pages/GenericPathPage.tsx');
const coursesPage = read('pages/Courses.tsx');
const qudratPage = read('pages/Qudrat.tsx');
const tahsiliPage = read('pages/Tahsili.tsx');
const stepPage = read('pages/Step.tsx');
const paymentRoutes = read('server/src/routes/payment.routes.ts');
const report = read('docs/archive_reports/PACKAGE_COURSE_SPLIT_REPORT.md');

const checks = [];
const check = (name, fn) => checks.push({ name, fn });
const includes = (source, snippet, message = snippet) => {
  if (!source.includes(snippet)) throw new Error(`Missing: ${message}`);
};
const notIncludes = (source, snippet, message = snippet) => {
  if (source.includes(snippet)) throw new Error(`Unexpected: ${message}`);
};

check('package choices in the floating payment modal only accept package products', () => {
  includes(paymentModal, "option.purchaseType === 'package'");
  includes(paymentModal, 'option.isPackage === true');
  includes(paymentModal, 'Boolean(option.packageId && option.packageId === option.id)');
  includes(paymentModal, "const shouldUsePackageOptions = type !== 'course'");
});

check('paid course cards route to one direct course purchase flow, not a package picker', () => {
  includes(learningSection, "? `/course/${course.id}?learn=1`");
  includes(learningSection, ": `/course/${course.id}?buy=1`");
  includes(learningSection, "'شراء الدورة'");
  includes(learningSection, "'هذه دورة مدفوعة'");
  includes(learningSection, "'عرض الباقات المناسبة'");

  includes(courseOverview, "searchParams.get('buy') !== '1'");
  includes(courseOverview, "nextParams.delete('buy')");
  includes(courseOverview, 'setShowPaymentModal(true)');
  includes(courseOverview, "purchaseType: 'course'");
  includes(courseOverview, 'type="course"');
  notIncludes(courseOverview, 'matchedCoursePackage');
  notIncludes(courseOverview, "purchaseType: 'package'");
});

check('course tab never renders the package marketplace inline', () => {
  includes(learningSection, 'buildPackagesPagePath');
  includes(learningSection, 'navigate(buildPackagesPagePath(contentType');
  includes(learningSection, 'navigate(buildPackagesPagePath(undefined, previewPackageId)');
  includes(learningSection, "searchParams.get('tab') === 'packages'");
  notIncludes(learningSection, 'const showPackagesInsideCourseTab');
  notIncludes(learningSection, 'subjectPublicPackages');
  includes(learningSection, "const isCourseTabNotice = activeTab === 'courses';");
  includes(learningSection, "'هذا القسم فيه دورات مدفوعة'");
  includes(learningSection, "'عرض الباقات المناسبة'");
  includes(genericPathPage, "row.type === 'courses' ? 'يحتاج تفعيل' : 'يحتاج باقة'");
  includes(genericPathPage, "lockedRows.some((row) => row.type === 'courses') ? 'عرض الباقات المناسبة' : 'فتح المحتوى المقفول'");
  notIncludes(learningSection, '{showPackagesInsideCourseTab && subjectPublicPackages.length > 0 && (');
  notIncludes(genericPathPage, 'tab=courses&package');
  notIncludes(genericPathPage, 'subject=${packageSubjectId}&tab=courses');
  includes(genericPathPage, 'navigate(`/category/${path.id}?tab=packages&subject=${subjectId}&package=${suggestedPackage.id}`)');
  notIncludes(genericPathPage, 'setSelectedPackageForPayment(buildPaymentPackage(suggestedPackage');
});

check('path-level package cards only render on packages route', () => {
  const calls = [...genericPathPage.matchAll(/\{renderPackages\(\)\}/g)].length;
  if (calls !== 1) throw new Error(`Expected renderPackages() to be mounted only once on tab=packages route, found ${calls}`);
  includes(genericPathPage, 'if (isPackagesTab)');
});

check('student course listings exclude package products', () => {
  includes(coursesPage, '!course.isPackage');
  includes(qudratPage, '!course.isPackage');
  includes(tahsiliPage, '!course.isPackage');
  includes(stepPage, '!course.isPackage');
});

check('backend rejects package/course type mixing before creating payment requests', () => {
  includes(paymentRoutes, 'validatePaymentTargetKind');
  includes(paymentRoutes, 'purchasableItem.isPackage !== true');
  includes(paymentRoutes, 'purchasableItem.isPackage === true');
  includes(paymentRoutes, 'لا يمكن إرسال دورة على أنها باقة');
  includes(paymentRoutes, 'لا يمكن إرسال باقة على أنها دورة');
});

check('report documents payment providers for Egypt and Saudi Arabia without claiming live gateway activation', () => {
  includes(report, 'Paymob');
  includes(report, 'Fawry');
  includes(report, 'Tap Payments');
  includes(report, 'MyFatoorah');
  includes(report, 'HyperPay');
  includes(report, 'لا توجد مفاتيح إنتاجية');
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
  console.error(`\n${failed}/${checks.length} package/course split checks failed.`);
  process.exit(1);
}

console.log(`\nAll ${checks.length} package/course split checks passed.`);