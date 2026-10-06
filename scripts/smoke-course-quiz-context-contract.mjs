import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

const checks = [];
const check = (name, ok) => checks.push({ name, ok });

const quizLinks = read("utils/quizLinks.ts");
const courseOverview = read("components/CourseOverview.tsx");
const coursePlayer = read("components/CoursePlayer.tsx");
const quizPage = read("pages/QuizPage.tsx");

check("quiz links support course context", quizLinks.includes("courseId?: string") && quizLinks.includes("courseLessonId?: string"));
check("course overview passes course id for official and suggested tests", (courseOverview.match(/courseId: course\.id/g) || []).length >= 4);
check("course player passes course lesson id for embedded quizzes", coursePlayer.includes("courseLessonId: activeLesson.id"));
check("quiz page resolves source course from query or return path", quizPage.includes("const sourceCourseId") && quizPage.includes("safeReturnTo.match"));
check("quiz page applies course lesson and assessment access", quizPage.includes("findCourseQuizContext") && quizPage.includes("assessment.access === 'free_preview'"));
check("paid course quizzes open for purchased course access", quizPage.includes("sourceParam === 'course' && courseHasAccess"));

const failed = checks.filter((item) => !item.ok);
for (const item of checks) {
  console.log(`${item.ok ? "PASS" : "FAIL"} ${item.name}`);
}

if (failed.length) {
  console.error(`\n${failed.length} course quiz context checks failed.`);
  process.exit(1);
}

console.log("\nCourse quiz context contract passed.");
