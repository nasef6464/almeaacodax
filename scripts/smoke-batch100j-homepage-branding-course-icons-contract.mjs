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

const assertPattern = (source, pattern, label) => {
  if (!pattern.test(source)) {
    throw new Error(`${label}: pattern not found ${pattern}`);
  }
};

const types = read("types.ts");
assertIncludes(types, "tertiaryCtaLabel?: string;", "homepage hero supports third button label");
assertIncludes(types, "tertiaryCtaLink?: string;", "homepage hero supports third button link");
assertIncludes(types, "badgeTextColor?: string;", "homepage hero supports configurable badge text color");
assertIncludes(types, "titleHighlightColor?: string;", "homepage hero supports configurable title highlight color");
assertIncludes(types, "primaryCtaColor?: string;", "homepage hero supports configurable primary button color");
assertIncludes(types, "secondaryCtaColor?: string;", "homepage hero supports configurable secondary button color");
assertIncludes(types, "tertiaryCtaColor?: string;", "homepage hero supports configurable tertiary button color");
assertIncludes(types, "lessonStartIcon?: string;", "course supports start lesson icon");
assertIncludes(types, "lessonStartIconColor?: string;", "course supports start lesson icon color");
assertIncludes(types, "lessonEndIcon?: string;", "course supports end lesson icon");
assertIncludes(types, "lessonEndIconColor?: string;", "course supports end lesson icon color");

const homepageModel = read("server/src/models/HomepageSettings.ts");
assertIncludes(homepageModel, 'tertiaryCtaLabel: { type: String, default: "" }', "homepage model stores third button label");
assertIncludes(homepageModel, 'titleHighlightColor: { type: String, default: "" }', "homepage model stores title color");

const contentRoutes = read("server/src/routes/content.routes.ts");
assertIncludes(contentRoutes, "tertiaryCtaLabel: z.string().optional()", "homepage update validates third button label");
assertIncludes(contentRoutes, "titleHighlightColor: z.string().optional()", "homepage update validates title color");

const homepageManager = read("dashboards/admin/HomepageManager.tsx");
assertIncludes(homepageManager, "لون الشارة", "admin can edit homepage badge color");
assertIncludes(homepageManager, "زر ثالث", "admin can edit homepage third button");
assertIncludes(homepageManager, "tertiaryCtaLabel", "admin wires third button label");
assertIncludes(homepageManager, "titleHighlightColor", "admin wires title color");

const landing = read("pages/Landing.tsx");
assertIncludes(landing, "tertiaryCtaLabel", "landing renders optional third button");
assertIncludes(landing, "resolveHeroColor", "landing resolves safe homepage colors");
assertPattern(landing, /style=\{\{[^}]*color:[^}]*titleHighlightColor/s, "landing applies title highlight color");

const courseModel = read("server/src/models/Course.ts");
assertIncludes(courseModel, 'lessonStartIcon: { type: String, default: "" }', "course model stores lesson start icon");
assertIncludes(courseModel, 'lessonEndIconColor: { type: String, default: "" }', "course model stores lesson end icon color");

const courseRoutes = read("server/src/routes/course.routes.ts");
assertIncludes(courseRoutes, "lessonStartIcon: z.string().optional()", "course route validates lesson start icon");
assertIncludes(courseRoutes, "lessonEndIconColor: z.string().optional()", "course route validates lesson end icon color");

const advancedBuilder = read("dashboards/admin/AdvancedCourseBuilder.tsx");
assertIncludes(advancedBuilder, "أيقونة قبل اسم الدرس", "advanced course builder has lesson start icon setting");
assertIncludes(advancedBuilder, "lessonEndIconColor", "advanced course builder wires lesson end icon color");

const simpleBuilder = read("dashboards/admin/CourseBuilder.tsx");
assertIncludes(simpleBuilder, "أيقونة قبل اسم الدرس", "simple course builder has lesson start icon setting");
assertIncludes(simpleBuilder, "lessonEndIconColor", "simple course builder wires lesson end icon color");

const coursePlayer = read("components/CoursePlayer.tsx");
assertIncludes(coursePlayer, "renderLessonEdgeIcon", "course player renders configured lesson edge icons");
assertIncludes(coursePlayer, "course.lessonStartIcon", "course player reads start icon");
assertIncludes(coursePlayer, "course.lessonEndIcon", "course player reads end icon");

const overview = read("components/CourseOverview.tsx");
assertIncludes(overview, "renderCourseLessonEdgeIcon", "course overview renders configured lesson edge icons");
assertIncludes(overview, "course.lessonStartIcon", "course overview reads start icon");

console.log("[batch100j] homepage branding and course lesson icons contract PASS");
