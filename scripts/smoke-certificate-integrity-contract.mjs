import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const source = fs.readFileSync(path.join(root, "server", "src", "routes", "certificates.routes.ts"), "utf8");
const courseViewSource = fs.readFileSync(path.join(root, "pages", "CourseView.tsx"), "utf8");

const checks = [
  ["certificate generation is student-only", source.includes('requireRole(["student"])')],
  ["certificate requires course opt-in", source.includes('course.certificateEnabled !== true')],
  ["certificate rejects empty courses", source.includes('if (totalLessons === 0)') && source.includes('Course has no certifiable lessons')],
  ["certificate reads direct enrollment and purchased courses", source.includes('user.enrolledCourses') && source.includes('subscription?.purchasedCourses')],
  ["certificate checks active access grants", source.includes('AccessGrantModel.find({ userId, status: "active" })') && source.includes('grantAllowsCourse')],
  ["certificate grant scope checks course/path/subject", source.includes('courseIds.includes(courseId)') && source.includes('matchesPath && matchesSubject')],
  ["certificate requires entitlement", source.includes('if (!hasCourseEntitlement)') && source.includes('Course access is required before issuing a certificate')],
  ["certificate still requires full completion", source.includes('if (completionPercentage < 100)')],
  ["course certificate CTA reads confirmed learner lesson completion", courseViewSource.includes('const { user, enrolledCourses, completedLessons, hasScopedPackageAccess, courses } = useStore()') && courseViewSource.includes('const courseCompletionProgress = courseLessons.length > 0')],
  ["course certificate CTA does not trust catalog progress", courseViewSource.includes('course.certificateEnabled && courseCompletionProgress >= 100') && !courseViewSource.includes('course.certificateEnabled && Number(course.progress || 0) >= 100')],
];

const failed = checks.filter(([, pass]) => !pass);
for (const [name, pass] of checks) console.log(`${pass ? "PASS" : "FAIL"} ${name}`);
if (failed.length) {
  console.error(`Certificate integrity contract failed: ${failed.length} check(s).`);
  process.exit(1);
}
console.log(`Certificate integrity contract passed: ${checks.length} checks.`);
