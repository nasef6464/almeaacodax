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

const failed = checks.filter((item) => !item.pass);
if (failed.length) {
  console.error("Course file access contract failed:");
  for (const item of failed) console.error(`- ${item.name}`);
  process.exit(1);
}

console.log(`Course file access contract passed (${checks.length}/${checks.length})`);
