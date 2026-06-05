import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const checks = [];
const assertIncludes = (file, needle, label) => {
  const content = read(file);
  checks.push({ label, pass: content.includes(needle) });
};
const assertNotIncludes = (file, needle, label) => {
  const content = read(file);
  checks.push({ label, pass: !content.includes(needle) });
};

assertIncludes(
  'utils/courseStats.ts',
  'export const getCourseContentStats',
  'Course details are computed from real course modules and assessments.',
);
assertIncludes(
  'components/CourseOverview.tsx',
  'getCourseContentStats(course)',
  'Course overview uses shared real content stats.',
);
assertIncludes(
  'components/CourseLanding.tsx',
  'getCourseContentStats(course)',
  'Course landing purchase card uses shared real content stats.',
);
assertNotIncludes(
  'components/CourseOverview.tsx',
  '|| 42',
  'Course overview no longer falls back to a fake lesson count.',
);
assertNotIncludes(
  'components/CourseLanding.tsx',
  "|| '73 درس'",
  'Course landing no longer falls back to a fake lesson label.',
);
assertIncludes(
  'pages/SubjectLearningPage.tsx',
  'parentTopic?.isLocked === true',
  'Student subject page inherits foundation lock from the parent topic.',
);
assertIncludes(
  'pages/SubjectLearningPage.tsx',
  'lockFoundationForSubject || topic.isLocked === true || parentTopic?.isLocked === true',
  'Student subject page honors subject-level foundation package lock.',
);
assertIncludes(
  'components/LearningSection.tsx',
  'isFoundationTopicLockedForStudent(topic)',
  'Learning section maps foundation cards with inherited lock state.',
);
assertIncludes(
  'components/LearningSection.tsx',
  'isFoundationTopicLockedForStudent(requestedTopic) || isFoundationTopicLockedForStudent(parentTopic)',
  'Learning section blocks direct deep links into locked foundation subtopics.',
);
assertIncludes(
  'components/CourseOverview.tsx',
  'هذه المساحة مخصصة للاستفسار عن محتوى الدورة',
  'Course Q&A clearly says it is for content inquiries, not session booking.',
);
assertIncludes(
  'components/CourseOverview.tsx',
  'needsPathEnrollmentBeforePurchase',
  'Paid course purchase is blocked until the student is enrolled in the course path.',
);
assertIncludes(
  'components/CourseOverview.tsx',
  "/dashboard?tab=paths",
  'Course purchase path-registration block sends students to My Paths.',
);
assertIncludes(
  'components/CourseOverview.tsx',
  'data-testid="course-path-registration-notice"',
  'Course purchase path-registration block shows a visible alert inside the course page.',
);
assertIncludes(
  'components/CourseOverview.tsx',
  'data-testid="course-path-registration-link"',
  'Course purchase path-registration block includes a direct My Paths action.',
);
assertIncludes(
  'components/CourseOverview.tsx',
  'اذهب لمساراتي',
  'Course path-registration action uses clear student-facing wording.',
);
assertIncludes(
  'components/PaymentModal.tsx',
  'actionErrorRef.current?.scrollIntoView',
  'Payment errors scroll into view instead of staying hidden above the form.',
);
assertIncludes(
  'components/PaymentModal.tsx',
  'role="alert"',
  'Payment errors are announced and visible near the current action.',
);
assertIncludes(
  'pages/Dashboard.tsx',
  'هل تريد إلغاء التسجيل في مسار',
  'Path unenrollment requires a confirmation message.',
);
assertIncludes(
  'dashboards/admin/QuizzesManager.tsx',
  "useState<'all' | 'visible' | 'hidden'>(filterType ? 'visible' : 'all')",
  'Training and tests managers default to selected visible items for the current learning slot.',
);
assertIncludes(
  'dashboards/admin/QuizzesManager.tsx',
  'handleToggleLearningSlotVisibility',
  'Training and tests managers toggle visibility for the current slot instead of duplicating quiz records.',
);

const failed = checks.filter((check) => !check.pass);
for (const check of checks) {
  console.log(`${check.pass ? 'PASS' : 'FAIL'} ${check.label}`);
}

if (failed.length > 0) {
  console.error(`\n${failed.length} foundation/course details contract check(s) failed.`);
  process.exit(1);
}

console.log('\nFoundation package inheritance and course details contract passed.');
