import fs from 'node:fs';
import path from 'node:path';

const targetPath = path.resolve('components/CourseOverview.tsx');
let source = fs.readFileSync(targetPath, 'utf8');

const oldStoreLine = "    const { user, enrolledCourses, enrolledPaths, enrollCourse, completedLessons, quizzes, hasScopedPackageAccess, getMatchingPackage } = useStore();";
const newStoreLine = "    const { user, enrolledCourses, enrolledPaths, enrollCourse, completedLessons, quizzes, hasScopedPackageAccess } = useStore();";
const matchedPackageLine = "    const matchedCoursePackage = getMatchingPackage('courses', course.pathId || course.category, course.subjectId || course.subject);\n";
const oldModal = `            <PaymentModal\n                isOpen={showPaymentModal}\n                onClose={() => setShowPaymentModal(false)}\n                item={\n                    matchedCoursePackage\n                        ? {\n                            id: matchedCoursePackage.id,\n                            packageId: matchedCoursePackage.id,\n                            purchaseType: 'package',\n                            title: matchedCoursePackage.name,\n                            description: \`هذه الباقة تفتح الدورات والاختبارات المرتبطة بـ \${course.subject || course.category}.\`,\n                            contentTypes: matchedCoursePackage.contentTypes,\n                            pathIds: matchedCoursePackage.pathIds,\n                            subjectIds: matchedCoursePackage.subjectIds,\n                            includedCourseIds: matchedCoursePackage.courseIds,\n                            courseIds: matchedCoursePackage.courseIds,\n                            price: course.price,\n                            currency: course.currency,\n                        }\n                        : course\n                }\n                type={matchedCoursePackage ? 'package' : 'course'}\n            />`;
const newModal = `            <PaymentModal\n                isOpen={showPaymentModal}\n                onClose={() => setShowPaymentModal(false)}\n                item={{ ...course, purchaseType: 'course' }}\n                type="course"\n            />`;

if (source.includes(newModal) && !source.includes('matchedCoursePackage')) {
  console.log('Direct course purchase repair already applied; no changes needed.');
  process.exit(0);
}

if ((source.split(oldStoreLine).length - 1) !== 1) {
  throw new Error('Expected exactly one legacy CourseOverview store destructuring line. Refusing to edit.');
}
if ((source.split(matchedPackageLine).length - 1) !== 1) {
  throw new Error('Expected exactly one matchedCoursePackage declaration. Refusing to edit.');
}
if ((source.split(oldModal).length - 1) !== 1) {
  throw new Error('Expected exactly one legacy package-substituting payment modal. Refusing to edit.');
}
if (!source.includes("searchParams.get('buy') !== '1'")) {
  throw new Error('Expected direct ?buy=1 route bridge is missing. Refusing to edit.');
}

source = source
  .replace(oldStoreLine, newStoreLine)
  .replace(matchedPackageLine, '')
  .replace(oldModal, newModal);

if (source.includes('matchedCoursePackage')) {
  throw new Error('matchedCoursePackage still exists after repair.');
}
if (!source.includes("item={{ ...course, purchaseType: 'course' }}")) {
  throw new Error('Direct course purchase item was not installed.');
}
if (!source.includes('type="course"')) {
  throw new Error('Payment modal is not pinned to course purchase type.');
}

fs.writeFileSync(targetPath, source, 'utf8');
console.log('Applied guarded direct-course purchase repair.');