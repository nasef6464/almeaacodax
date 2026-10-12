import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const source = fs.readFileSync(path.join(root, "server", "src", "routes", "certificates.routes.ts"), "utf8");
const courseViewSource = fs.readFileSync(path.join(root, "pages", "CourseView.tsx"), "utf8");
const policy = fs.readFileSync(path.join(root, "server", "src", "services", "entitlementPolicy.ts"), "utf8");

// Keep certificate visibility aligned with the server-authoritative learner completion source.
const checks = [
  ["certificate generation is student-only", source.includes('requireRole(["student"])')],
  ["certificate requires course opt-in", source.includes('course.certificateEnabled !== true')],
  ["certificate rejects empty courses", source.includes('if (totalLessons === 0)') && source.includes('Course has no certifiable lessons')],
  ["certificate reads effective enrollment and purchased courses through shared policy", source.includes('hasCourseEntitlementFromState(user, course, entitlementState.grants)') && policy.includes('getEffectivePurchaseIds(user, grants, now)')],
  ["certificate checks all grant provenance and active expiry", source.includes('loadEntitlementState(userId)') && policy.includes('AccessGrantModel.find({ userId })') && policy.includes('isActiveGrant(grant, now)')],
  ["certificate grant scope checks course/path/subject", policy.includes('courseIds.some(id => identities.includes(id))') && policy.includes('grantMatchesContent(grant, "courses"')],
  ["certificate requires entitlement", source.includes('if (!hasCourseEntitlement)') && source.includes('Course access is required before issuing a certificate')],
  ["certificate requires exact lesson completion before rounding can authorize", source.includes('if (completedInCourse !== totalLessons)')],
  ["course certificate CTA reads confirmed learner lesson completion", courseViewSource.includes('getCourseCompletion(course, completedLessons)')],
  ["course certificate CTA requires exact completion", courseViewSource.includes('course.certificateEnabled && courseCompletion.isComplete') && !courseViewSource.includes('course.certificateEnabled && courseCompletionProgress >= 100')],
];

const failed = checks.filter(([, pass]) => !pass);
for (const [name, pass] of checks) console.log(`${pass ? "PASS" : "FAIL"} ${name}`);
if (failed.length) {
  console.error(`Certificate integrity contract failed: ${failed.length} check(s).`);
  process.exit(1);
}
console.log(`Certificate integrity contract passed: ${checks.length} checks.`);
