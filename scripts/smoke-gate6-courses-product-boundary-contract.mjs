import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

const [courseModel, b2bModel, route, client, manager, pathsManager, kindHelper] = await Promise.all([
  read('server/src/models/Course.ts'),
  read('server/src/models/B2BPackage.ts'),
  read('server/src/routes/course.routes.ts'),
  read('services/apiGroups/coursesApi.ts'),
  read('dashboards/admin/CoursesManager.tsx'),
  read('dashboards/admin/PathsManager.tsx'),
  read('utils/courseProductKind.ts'),
]);

const check = (name, fn) => {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
};

check('legacy Course storage keeps an explicit compatibility discriminator instead of an unsafe migration', () => {
  assert.ok(courseModel.includes('isPackage: { type: Boolean, default: false }'));
  assert.ok(kindHelper.includes("'learning' | 'package'"));
  assert.ok(kindHelper.includes("course.isPackage === true ? 'package' : 'learning'"));
});

check('course list API exposes an additive product-kind boundary while preserving default compatibility', () => {
  assert.ok(route.includes("kind: z.enum(['learning', 'package', 'all']).default('all')"));
  assert.ok(route.includes("if (query.kind === 'learning') scopedFilter.isPackage = { $ne: true };"));
  assert.ok(route.includes("if (query.kind === 'package') scopedFilter.isPackage = true;"));
  assert.ok(client.includes("getLearningCourses"));
  assert.ok(client.includes("getPublicPackageCourses"));
  assert.ok(client.includes("kind: 'all' as const"));
});

check('LMS CoursesManager owns learning courses only', () => {
  assert.ok(manager.includes("import { isLearningCourse } from '../../utils/courseProductKind';"));
  assert.ok(manager.includes('if (!isLearningCourse(course)) return false;'));
  assert.ok(!manager.includes("{ label: 'باقة بيع'"));
  assert.ok(!manager.includes("previewCourse.isPackage ? 'باقة' : 'دورة'"));
  assert.ok(manager.includes('دورة تعليمية'));
});

check('public package configuration remains in the contextual path/package surface', () => {
  assert.ok(pathsManager.includes('const pathPackages = courses.filter((course: any) => {'));
  assert.ok(pathsManager.includes('if (!course.isPackage) return false;'));
  assert.ok(pathsManager.includes('packageContentTypes'));
  assert.ok(pathsManager.includes('setIsPackageModalOpen'));
});

check('school commercial packages remain a separate B2B persistence product', () => {
  assert.ok(b2bModel.includes('schoolId: { type: String, required: true, index: true }'));
  assert.ok(b2bModel.includes('courseIds: { type: [String], default: [] }'));
  assert.ok(b2bModel.includes('contentTypes:'));
  assert.ok(b2bModel.includes('mongoose.model("B2BPackage", b2bPackageSchema)'));
  assert.ok(!b2bModel.includes('modules:'));
  assert.ok(!b2bModel.includes('assessments:'));
});

check('the boundary does not introduce tenant or microservice ownership', () => {
  for (const source of [route, client, kindHelper]) {
    assert.ok(!source.includes('tenantId'));
  }
});

console.log('Gate 6 Courses product-boundary contract passed.');
