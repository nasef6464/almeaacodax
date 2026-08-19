import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const typeSource = fs.readFileSync(path.join(root, 'types.ts'), 'utf8');
const packageModelSource = fs.readFileSync(path.join(root, 'server/src/models/B2BPackage.ts'), 'utf8');
const contentRoutesSource = fs.readFileSync(path.join(root, 'server/src/routes/content.routes.ts'), 'utf8');
const schoolOperationsSchemaSource = fs.readFileSync(path.join(root, 'server/src/modules/content/http/schoolOperationsSchemas.ts'), 'utf8');
const schoolsManagerParentSource = fs.readFileSync(path.join(root, 'dashboards/admin/SchoolsManager.tsx'), 'utf8');
const schoolPackagesPanelSource = fs.readFileSync(path.join(root, 'dashboards/admin/SchoolsManager/SchoolPackagesPanel.tsx'), 'utf8');
const schoolPackageCardSource = fs.readFileSync(path.join(root, 'dashboards/admin/SchoolsManager/SchoolPackageCard.tsx'), 'utf8');
const schoolsManagerSource = [schoolsManagerParentSource, schoolPackagesPanelSource, schoolPackageCardSource].join('\n');
const financialManagerSource = fs.readFileSync(path.join(root, 'dashboards/admin/FinancialManager.tsx'), 'utf8');

const checks = [];
const check = (name, fn) => checks.push({ name, fn });
const assertIncludes = (source, snippet, message = snippet) => {
  if (!source.includes(snippet)) {
    throw new Error(`Missing: ${message}`);
  }
};

check('B2B package contract stores teacher and revenue share metadata', () => {
  assertIncludes(typeSource, 'assignedTeacherId?: string;');
  assertIncludes(typeSource, 'revenueSharePercentage?: number;');
  assertIncludes(packageModelSource, 'assignedTeacherId: { type: String');
  assertIncludes(packageModelSource, 'revenueSharePercentage: { type: Number');
  assertIncludes(schoolOperationsSchemaSource, 'assignedTeacherId: z.string().optional()');
  assertIncludes(schoolOperationsSchemaSource, 'revenueSharePercentage: z.number().nullable().optional()');
  assertIncludes(contentRoutesSource, 'const payload = b2bPackageSchema.parse(req.body);');
});

check('school package manager lets admin assign trainer and share percentage', () => {
  assertIncludes(schoolPackageCardSource, 'المعلم/المدرب المرتبط');
  assertIncludes(schoolPackageCardSource, 'نسبة المعلم من دخل الباقة');
  assertIncludes(schoolPackageCardSource, 'handleUpdateSchoolPackage(pkg.id, { revenueSharePercentage: value })');
  assertIncludes(schoolPackageCardSource, 'assignedTeacherId: event.target.value');
  assertIncludes(schoolPackagesPanelSource, '<SchoolPackageCard');
  assertIncludes(schoolPackagesPanelSource, 'handleUpdateSchoolPackage={handleUpdateSchoolPackage}');
  assertIncludes(schoolsManagerParentSource, 'handleUpdateSchoolPackage={handleUpdateSchoolPackage}');
  assertIncludes(schoolsManagerParentSource, 'await updateB2BPackageAsync(packageId, data);');
});

check('school package exports include trainer revenue fields', () => {
  assertIncludes(schoolsManagerSource, 'المعلم/المدرب');
  assertIncludes(schoolsManagerSource, 'نسبة المعلم');
  assertIncludes(schoolsManagerSource, "packageTeacher?.name || 'غير محدد'");
});

check('financial dashboard summarizes teacher shares for school packages', () => {
  assertIncludes(financialManagerSource, 'teacherShare');
  assertIncludes(financialManagerSource, 'schoolPackagesSummary.teacherShares');
  assertIncludes(financialManagerSource, 'حصة المعلمين التقديرية');
  assertIncludes(financialManagerSource, 'assignedTeacherName');
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
  console.error(`\n${failed}/${checks.length} package revenue contract checks failed.`);
  process.exit(1);
}

console.log(`\nAll ${checks.length} package revenue contract smoke checks passed.`);