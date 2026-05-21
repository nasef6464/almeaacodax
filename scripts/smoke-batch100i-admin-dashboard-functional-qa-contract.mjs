import fs from "node:fs";
import path from "node:path";

const rootDir = process.cwd();

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

const advancedBuilder = read("dashboards/admin/AdvancedCourseBuilder.tsx");
const simpleBuilder = read("dashboards/admin/CourseBuilder.tsx");
const homepageManager = read("dashboards/admin/HomepageManager.tsx");
const landing = read("pages/Landing.tsx");
const api = read("services/api.ts");
const coursePlayer = read("components/CoursePlayer.tsx");
const courseView = read("pages/CourseView.tsx");
const questionBankManager = read("dashboards/admin/QuestionBankManager.tsx");
const quizRoutes = read("server/src/routes/quiz.routes.ts");

for (const [label, source] of [
  ["AdvancedCourseBuilder", advancedBuilder],
  ["CourseBuilder", simpleBuilder],
  ["HomepageManager", homepageManager],
  ["CoursePlayer", coursePlayer],
  ["CourseView", courseView],
]) {
  assertNotIncludes(source, ">????", `${label} must not render placeholder question marks`);
  assertNotIncludes(source, "????</", `${label} must not render placeholder question marks`);
}

for (const [label, source] of [
  ["AdvancedCourseBuilder", advancedBuilder],
  ["CourseBuilder", simpleBuilder],
]) {
  assertIncludes(source, "const questionMarkOnly =", `${label} has robust placeholder-question label guard`);
  assertIncludes(source, "questionMarkCount", `${label} detects mostly broken question-mark labels`);
  assertPattern(
    source,
    /questionMarkOnly[\s\S]*\/\^\\\?\+\$/,
    `${label} strips spaces before rejecting question-mark-only labels`,
  );
}

assertNotIncludes(simpleBuilder, "{path.name}</option>", "basic course builder must sanitize path option labels");
assertNotIncludes(simpleBuilder, ">- {subSkill.name}</option>", "basic course builder must sanitize sub-skill option labels");
assertIncludes(simpleBuilder, "getSafeLabel(path.name, 'مسار بدون اسم')", "basic course builder sanitizes path labels");
assertIncludes(simpleBuilder, "getSafeLabel(subSkill.name, 'مهارة بدون اسم')", "basic course builder sanitizes sub-skill labels");

assertIncludes(advancedBuilder, "const [lessonSearch, setLessonSearch]", "advanced builder keeps lesson search");
assertIncludes(advancedBuilder, "const [quizSearch, setQuizSearch]", "advanced builder keeps quiz search");
assertIncludes(advancedBuilder, "effectiveImportSubjectId", "advanced builder scopes imports by selected material");
assertIncludes(advancedBuilder, 'className="max-h-[60vh] overflow-y-auto', "advanced builder import list remains tall enough");
assertPattern(advancedBuilder, /filteredScopedLessons[\s\S]*lesson\.subjectId/, "advanced builder filters imported lessons by subject");
assertPattern(advancedBuilder, /filteredScopedQuizzes[\s\S]*quiz\.subjectId/, "advanced builder filters imported quizzes by subject");

assertIncludes(homepageManager, "handleHeroImageUpload", "homepage manager supports hero image upload");
assertIncludes(homepageManager, "hero: { ...settings.hero, imageUrl: withCacheBust(settings.hero.imageUrl) }", "homepage save cache-busts hero image URL");
assertIncludes(homepageManager, "api.updateHomepageSettings(payload)", "homepage manager saves settings through API");
assertPattern(api, /updateHomepageSettings:[\s\S]*clearPublicCache\(["']homepage-settings["']\)/, "homepage settings update clears public cache");
assertIncludes(landing, "resolveHomepageHeroImage(homepageSettings.hero.imageUrl", "public landing reads saved hero image URL");

assertIncludes(coursePlayer, "export const CoursePlayer", "course player exists");
assertIncludes(coursePlayer, "flattenedLessons", "course player flattens course curriculum");
assertIncludes(coursePlayer, "handleOpenLessonQuiz", "course player can open embedded quizzes");
assertIncludes(courseView, "adapter.getCourseById(courseId)", "course view loads latest course from API");
assertIncludes(courseView, "setSearchParams(nextParams", "course view keeps lesson/player state in URL");

assertIncludes(api, "getQuestionsPaginated", "admin question bank uses paginated question API helper");
assertIncludes(api, "paginate: true", "paginated question helper sends paginate=true contract flag");
assertIncludes(quizRoutes, "paginate: z.coerce.boolean().default(false)", "questions API accepts paginate=true query flag");
assertIncludes(quizRoutes, "data: items", "questions API returns data array when paginate=true");
assertIncludes(quizRoutes, "hasNext:", "questions API returns pagination navigation metadata");
assertIncludes(questionBankManager, "const [questionsRefreshKey, setQuestionsRefreshKey]", "question bank can refresh paginated list after mutations");
assertIncludes(questionBankManager, "questionsRefreshKey]", "question bank reload effect depends on refresh key");
assertIncludes(questionBankManager, "refreshPagedQuestions();", "question bank refreshes after create/update/delete/review actions");

console.log("[batch100i] admin dashboard functional QA contract PASS");
