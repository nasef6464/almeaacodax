import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (file) => readFile(new URL(`../${file}`, import.meta.url), 'utf8');
const [dashboard, trainerCourses, builder, courseRoute] = await Promise.all([
  read('dashboards/admin/AdminDashboard.tsx'),
  read('dashboards/admin/TrainerCoursesManager.tsx'),
  read('dashboards/admin/AdvancedCourseBuilder.tsx'),
  read('server/src/routes/course.routes.ts'),
]);

assert.match(dashboard, /id: 'courses', label: 'إدارة الدورات'/, 'admin has no independent course-center entry');
assert.match(dashboard, /label: 'دوراتي'/, 'platform trainer has no My Courses entry');
assert.match(dashboard, /<TrainerCoursesManager\s*\/>/, 'trainer course entry does not load its workspace');
assert.match(dashboard, /<CoursesManager\s*\/>/, 'admin course-center entry does not load its workspace');
assert.match(trainerCourses, /إرسال للمراجعة/, 'trainer cannot submit a draft for review');
assert.match(trainerCourses, /ملاحظة المراجع/, 'trainer cannot read reviewer notes');
assert.match(trainerCourses, /canControlPublication=\{false\}/, 'trainer builder can still control publication');
assert.doesNotMatch(trainerCourses, /revenueSharePercentage/, 'trainer workspace exposes revenue share');
assert.match(builder, /const canPublishCourse/, 'builder has no publication capability boundary');
assert.match(courseRoute, /buildTrainerCourseListFilter/, 'course collection does not enforce trainer ownership');
assert.match(courseRoute, /normalizedPayload\.approvalStatus === "draft"/, 'trainer drafts are not persisted server-side');
assert.match(courseRoute, /changesCourseContent/, 'editing an approved trainer course does not return it to review');
console.log('G15 trainer course center contract: PASS');
