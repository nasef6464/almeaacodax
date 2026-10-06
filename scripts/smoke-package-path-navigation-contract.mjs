import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const genericPathPage = read('pages/GenericPathPage.tsx');
const learningSection = read('components/LearningSection.tsx');
const courseView = read('pages/CourseView.tsx');
const courseLanding = read('components/CourseLanding.tsx');

const checks = [];
const check = (name, fn) => checks.push({ name, fn });

const includes = (source, snippet, message = snippet) => {
  if (!source.includes(snippet)) throw new Error(`Missing: ${message}`);
};

const notIncludes = (source, snippet, message = snippet) => {
  if (source.includes(snippet)) throw new Error(`Unexpected: ${message}`);
};

check('active packages never fall back to course player route', () => {
  notIncludes(genericPathPage, 'navigate(`/course/${pkg.id}`)', 'package buttons must not navigate to /course/${pkg.id}');
  notIncludes(genericPathPage, 'to={`/course/${pkg.id}`}', 'package links must not point to /course/${pkg.id}');
});

check('package preview stays in package/path context', () => {
  includes(genericPathPage, 'navigate(`/category/${path.id}?tab=packages&subject=${packageSubjectId}&package=${pkg.id}`)');
  includes(genericPathPage, 'navigate(`/category/${path.id}?tab=packages&package=${pkg.id}`)');
});

check('active package CTA opens learning content instead of staying in marketplace', () => {
  includes(genericPathPage, 'const buildPackageContentRoute = (pkg: any, contentTypes = resolvePackageContentTypes(pkg))');
  includes(genericPathPage, "params.set('tab', preferredTab);");
  includes(genericPathPage, 'navigate(buildPackageContentRoute(pkg, contentTypes));');
});

check('suggested package CTA stays in package/path context', () => {
  includes(genericPathPage, 'navigate(`/category/${path.id}?tab=packages&subject=${subjectId}&package=${suggestedPackage.id}`)');
  includes(genericPathPage, 'navigate(`/category/${path.id}?tab=packages`)');
});

check('real courses still navigate to real course routes', () => {
  includes(learningSection, 'to={`/course/${course.id}`}');
  includes(learningSection, 'if (course.isPackage) return false;');
});

check('CoursePlayer remains attached to course view, not package marketplace', () => {
  includes(courseView, '<CoursePlayer');
  includes(courseView, 'adapter.getCourseById(courseId)');
  includes(courseView, "courses.find((item: any) => String(item.id || item._id || '') === String(courseId || ''))");
  notIncludes(genericPathPage, '<CoursePlayer');
});

check('package purchase context preserves package semantics', () => {
  includes(genericPathPage, "purchaseType: 'package'");
  includes(genericPathPage, 'packageId: pkg.id');
  includes(genericPathPage, 'packageContentTypes: contentTypes');
  includes(genericPathPage, 'pathIds: [path.id]');
  includes(genericPathPage, 'subjectIds: packageSubjectId ? [packageSubjectId] : []');
});

check('course landing can sell a package but does not make path packages the default route target', () => {
  includes(courseLanding, 'course.isPackage');
  includes(courseLanding, 'purchaseType:');
  notIncludes(courseLanding, 'navigate(`/course/${pkg.id}`)');
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
  console.error(`\n${failed}/${checks.length} package path navigation checks failed.`);
  process.exit(1);
}

console.log(`\nAll ${checks.length} package path navigation checks passed.`);
