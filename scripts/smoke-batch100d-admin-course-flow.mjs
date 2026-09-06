import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const read = (relativePath) => fs.readFileSync(path.join(rootDir, relativePath), "utf8");

const assertIncludes = (source, needle, label) => {
  if (!source.includes(needle)) {
    throw new Error(`${label}: missing "${needle}"`);
  }
};

const assertNotIncludes = (source, needle, label) => {
  if (source.includes(needle)) {
    throw new Error(`${label}: unexpected "${needle}"`);
  }
};

const assertPattern = (source, pattern, label) => {
  if (!pattern.test(source)) {
    throw new Error(`${label}: pattern not found ${pattern}`);
  }
};

const api = read("services/api.ts");
assertPattern(api, /const\s+clearPublicCache\s*=/, "homepage public cache invalidator exists");
assertPattern(
  api,
  /updateHomepageSettings:\s*async[\s\S]*clearPublicCache\(["']homepage-settings["']\)/,
  "homepage settings update clears stale public cache",
);

const coursesApi = read("services/apiGroups/coursesApi.ts");
assertIncludes(coursesApi, "enrollCourse: (id: string", "courses API exposes canonical enrollment mutation");
assertIncludes(coursesApi, "`/courses/${id}/enroll`", "courses API uses canonical enrollment route");
assertPattern(coursesApi, /enrollCourse:[\s\S]*method:\s*["']POST["']/, "course enrollment is a POST mutation");

const accessEnrollmentSlice = read("store/slices/accessEnrollmentSlice.ts");
assertIncludes(accessEnrollmentSlice, "api.enrollCourse(normalizedCourseId)", "free enrollment persists through API");
assertIncludes(accessEnrollmentSlice, "shouldSyncUserToApi(currentUser)", "local-only sessions preserve compatibility");
assertIncludes(accessEnrollmentSlice, "pendingCourseEnrollments.has(normalizedCourseId)", "synced enrollment deduplicates in-flight requests");
assertIncludes(accessEnrollmentSlice, "pendingCourseEnrollments.add(normalizedCourseId)", "synced enrollment records in-flight state before mutation");
assertIncludes(accessEnrollmentSlice, "response?.enrolled === false", "server must explicitly confirm synced enrollment");
assertIncludes(accessEnrollmentSlice, "enrolledCourses: Array.from(new Set", "successful server enrollment mirrors authoritative enrollment access");
assertNotIncludes(accessEnrollmentSlice, "purchasedCourses: Array.from(new Set", "free enrollment must not manufacture a purchase entitlement in frontend state");
assertPattern(
  accessEnrollmentSlice,
  /if \(!shouldSyncUserToApi\(currentUser\)\) \{[\s\S]*enrolledCourses: \[\.\.\.current\.enrolledCourses, normalizedCourseId\][\s\S]*return;[\s\S]*pendingCourseEnrollments\.add\(normalizedCourseId\);[\s\S]*api\.enrollCourse\(normalizedCourseId\)/,
  "only local sessions grant immediate enrollment; synced sessions wait for the server",
);
assertIncludes(accessEnrollmentSlice, "pendingCourseEnrollments.delete(normalizedCourseId)", "in-flight enrollment state is always released");

const builder = read("dashboards/admin/AdvancedCourseBuilder.tsx");
assertIncludes(builder, "const [importPathId, setImportPathId]", "course builder has path filter for imports");
assertIncludes(builder, "const [importSubjectId, setImportSubjectId]", "course builder has subject filter for imports");
assertIncludes(builder, "const [lessonSearch, setLessonSearch]", "course builder has lesson search");
assertIncludes(builder, "const [quizSearch, setQuizSearch]", "course builder has quiz search");
assertIncludes(builder, "filteredScopedLessons", "course builder filters imported lessons");
assertIncludes(builder, "filteredScopedQuizzes", "course builder filters imported quizzes");
assertPattern(builder, /lesson\.pathId[\s\S]*lesson\.subjectId/, "lesson imports are scoped by path and subject");
assertPattern(builder, /quiz\.pathId[\s\S]*quiz\.subjectId/, "quiz imports are scoped by path and subject");
assertPattern(builder, /setCourseData\(\(prev\)[\s\S]*subjectId:[\s\S]*skills:\s*\[\]/, "course settings reset skills when scope changes");
assertIncludes(builder, 'className="max-h-[60vh] overflow-y-auto', "import pickers are not artificially tiny");

const coursePlayer = read("components/CoursePlayer.tsx");
assertIncludes(coursePlayer, "export const CoursePlayer", "course player component exists");
assertIncludes(coursePlayer, "resolveEmbeddedQuizId", "course player resolves attached quizzes");
assertIncludes(coursePlayer, "handleOpenLessonQuiz", "course player can open lesson quizzes");
assertIncludes(coursePlayer, "buildQuizRouteWithContext", "course player preserves quiz return context");
assertIncludes(coursePlayer, "markLessonComplete", "course player can mark lesson completion");
assertIncludes(coursePlayer, "activeLesson.type === 'video'", "course player handles video lessons");
assertIncludes(coursePlayer, "activeLesson.type === 'quiz'", "course player handles quiz lessons");
assertIncludes(coursePlayer, "activeLesson.type === 'file'", "course player handles file lessons");
assertIncludes(coursePlayer, "لا توجد دروس منشورة في هذه الدورة بعد", "course player has safe empty state");

const learningSection = read("components/LearningSection.tsx");
assertIncludes(learningSection, "resolveCoursePathId", "learning page resolves course path");
assertIncludes(learningSection, "resolveCourseSubjectId", "learning page resolves course subject");
assertPattern(learningSection, /canStudentSeeCourse\(course\)[\s\S]*matchesScopedContent/, "learning page filters visible scoped courses");

console.log("[batch100d] admin/course/homepage/course-player contract PASS");
