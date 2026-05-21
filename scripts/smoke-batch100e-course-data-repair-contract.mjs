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

const repairScript = read("server/src/scripts/repairMissingCurrentCourseVisibility.ts");

assertIncludes(repairScript, "repairMissingCurrentCourseVisibility", "repair script has explicit batch-safe name");
assertIncludes(repairScript, "LessonModel.findOne", "repair script reads existing lesson");
assertIncludes(repairScript, "if (!lesson)", "repair script skips subjects without an existing lesson");
assertIncludes(repairScript, "CourseModel.updateOne", "repair script can upsert missing current course");
assertIncludes(repairScript, "TopicModel.updateOne", "repair script can upsert missing topic link");
assertIncludes(repairScript, "QuizModel.updateOne", "repair script can upsert missing quiz shell");
assertIncludes(repairScript, "isPublished: true", "repair script makes course visible to learners");
assertIncludes(repairScript, "showOnPlatform: true", "repair script makes course visible on platform");
assertIncludes(repairScript, 'approvalStatus: "approved"', "repair script sets approved status");
assertPattern(
  repairScript,
  /lessons:\s*\[\{\s*id:\s*lessonId,\s*title:\s*String\(lesson\.title/,
  "course module preserves existing lesson title",
);
assertPattern(
  repairScript,
  /description:\s*existingCourse\?\.description\s*\|\|/,
  "repair script preserves existing course description when present",
);
assertPattern(
  repairScript,
  /title:\s*existingCourse\?\.title\s*\|\|/,
  "repair script preserves existing course title when present",
);

const packageJson = read("package.json");
assertIncludes(packageJson, '"smoke:batch100e-course-data-repair"', "root package exposes batch100e smoke");

console.log("[batch100e] course data repair contract PASS");
