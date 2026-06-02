import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

const checks = [];
const check = (name, pass) => checks.push({ name, pass: Boolean(pass) });
const includes = (source, needle) => source.includes(needle);
const matches = (source, pattern) => pattern.test(source);

const types = read("types.ts");
const serverRoutes = read("server/src/routes/course.routes.ts");
const courseModel = read("server/src/models/Course.ts");
const builder = read("dashboards/admin/AdvancedCourseBuilder.tsx");
const overview = read("components/CourseOverview.tsx");
const player = read("components/CoursePlayer.tsx");
const courseView = read("pages/CourseView.tsx");
const learningSection = read("components/LearningSection.tsx");
const courseLanding = read("components/CourseLanding.tsx");
const simulatedTestExperienceSource = read("components/SimulatedTestExperience.tsx");

check(
  "CourseFile has per-course access control",
  matches(types, /interface CourseFile[\s\S]*access\?: CourseAssessmentAccess/),
);
check(
  "Backend accepts and defaults course file access",
  matches(serverRoutes, /courseFileSchema[\s\S]*access:\s*z\.enum\(\["free_preview",\s*"enrolled_paid"\]\)\.default\("enrolled_paid"\)/),
);
check(
  "Database model persists course file access",
  matches(courseModel, /courseFileSchema[\s\S]*access:\s*\{\s*type:\s*String,\s*enum:\s*\["free_preview",\s*"enrolled_paid"\],\s*default:\s*"enrolled_paid"\s*\}/),
);
check(
  "Admin course builder defaults new files to purchase-only",
  includes(builder, "access: 'enrolled_paid'"),
);
check(
  "Admin course builder exposes course file access selector",
  includes(builder, "CourseFile['access']") && includes(builder, "free_preview") && includes(builder, "enrolled_paid"),
);
check(
  "Course overview separates visible and locked files",
  includes(overview, "visibleCourseFiles") && includes(overview, "lockedCourseFiles"),
);
check(
  "Course overview never treats guests as staff viewers",
  matches(overview, /const isGuestUser = !user\?\.email \|\| user\.id === 'guest';[\s\S]*const isStaffViewer = !isGuestUser && \['admin', 'teacher', 'supervisor'\]\.includes\(user\.role\)/),
);
check(
  "Course overview does not open locked paid files from preview",
  includes(overview, "handleLockedCourseFileClick") && includes(overview, "lockedCourseFiles.map"),
);
check(
  "Course overview shows curriculum quiz lessons in the course tests tab",
  includes(overview, "courseCurriculumQuizTests") &&
    includes(overview, "resolveEmbeddedQuizId(lesson)") &&
    includes(overview, "courseTabTests") &&
    includes(overview, "courseLessonId: test.courseLessonId"),
);
check(
  "Course overview keeps per-course quiz preview access separate from the reusable quiz",
  includes(overview, "lesson.accessControl === 'public'") &&
    includes(overview, "isLocked: isUnavailable || (!isPreview && !isEnrolled)") &&
    includes(overview, "assessmentQuizIds.has(linkedQuizId)"),
);
check(
  "Course overview surfaces missing course quiz links instead of hiding them",
  includes(overview, "رابط الاختبار يحتاج مراجعة") &&
    includes(overview, "isUnavailable") &&
    includes(overview, "questions: quiz?.questionIds.length || 0"),
);
check(
  "Simulated tests disable unavailable linked course tests",
  includes(simulatedTestExperienceSource, "test.isUnavailable") &&
    includes(simulatedTestExperienceSource, "disabled={Boolean(test.isUnavailable)}") &&
    includes(simulatedTestExperienceSource, "غير جاهز"),
);
check(
  "Course player never treats guests as staff viewers",
  matches(player, /const isGuestUser = !user\?\.email \|\| user\.id === 'guest';[\s\S]*const isStaffViewer = !isGuestUser && \['admin', 'teacher', 'supervisor'\]\.includes\(user\.role\)/),
);
check(
  "Course player filters paid course files during preview lessons",
  includes(player, "canUsePaidCourseFiles") && includes(player, "file.access === 'enrolled_paid' && !canUsePaidCourseFiles"),
);
check(
  "Course view never unlocks course playback for guests as staff",
  matches(courseView, /const isGuestUser = !user\?\.email \|\| user\.id === 'guest';[\s\S]*const isStaffViewer = !isGuestUser && \['admin', 'teacher', 'supervisor'\]\.includes\(user\.role\)/),
);
check(
  "Course view does not open an empty player for guests without preview lessons",
  includes(courseView, "hasPlayablePreviewLesson") &&
    matches(courseView, /if \(isPlaying && \(isEnrolled \|\| isStaffViewer \|\| isFreeCourse \|\| hasPlayablePreviewLesson\)\)/),
);
check(
  "Course cards ignore global purchase flags for guests",
  matches(learningSection, /const isRegisteredViewer = !\(!user\?\.email \|\| user\.id === 'guest'\);[\s\S]*const isPurchasedByViewer =[\s\S]*\(isRegisteredViewer && Boolean\(baseCourse\.isPurchased\)\);[\s\S]*isPurchased: isPurchasedByViewer/),
);
check(
  "Course landing ignores global purchase flags for guests",
  matches(courseLanding, /const isRegisteredViewer = !\(!user\?\.email \|\| user\.id === 'guest'\);[\s\S]*const isPurchasedByViewer =[\s\S]*\(isRegisteredViewer && Boolean\(course\.isPurchased\)\);[\s\S]*const hasAccess =/),
);

const failed = checks.filter((item) => !item.pass);
if (failed.length) {
  console.error("Course file access contract failed:");
  for (const item of failed) console.error(`- ${item.name}`);
  process.exit(1);
}

console.log(`Course file access contract passed (${checks.length}/${checks.length})`);
