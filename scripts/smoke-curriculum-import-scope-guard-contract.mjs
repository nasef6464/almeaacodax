import fs from "node:fs";
import path from "node:path";

const source = fs.readFileSync(path.join(process.cwd(), "server/src/routes/course.routes.ts"), "utf8");

const checks = [];
const check = (name, fn) => checks.push({ name, fn });
const assertIncludes = (snippet, label = snippet) => {
  if (!source.includes(snippet)) throw new Error(`Missing: ${label}`);
};

check("scope guard helper exists", () => {
  assertIncludes("const assertCurriculumImportScope", "guard helper");
  assertIncludes("Lesson scope mismatch", "lesson mismatch error");
  assertIncludes("Quiz scope mismatch", "quiz mismatch error");
  assertIncludes("Lesson import scope mismatch", "imported lesson mismatch error");
});

check("create route normalizes curriculum before enforcing scope", () => {
  assertIncludes("modules: normalizeCourseModules(payload.modules)", "normalized course modules");
  assertIncludes("assessments: normalizeCourseAssessments(payload.assessments)", "normalized course assessments");
  assertIncludes("await assertCurriculumImportScope({\n      coursePathId: normalizedPayload.pathId", "post scope guard");
  assertIncludes("courseSubjectId: normalizedPayload.subjectId", "post subject scope");
  assertIncludes("modules: normalizedPayload.modules as CurriculumModule[]", "post normalized modules scope");
});

check("update route derives effective scope before enforcing imported curriculum", () => {
  assertIncludes("const nextPathId = String(normalizedPayload.pathId", "patch path scope derivation");
  assertIncludes("const nextSubjectId = String(normalizedPayload.subjectId", "patch subject scope derivation");
  assertIncludes("const nextModules = Array.isArray(normalizedPayload.modules)", "patch module scope derivation");
  assertIncludes("await assertCurriculumImportScope({\n    coursePathId: nextPathId", "patch scope guard");
  assertIncludes("courseSubjectId: nextSubjectId", "patch subject guard");
  assertIncludes("modules: nextModules", "patch modules guard");
});

let failed = 0;
for (const item of checks) {
  try {
    item.fn();
    console.log(`PASS ${item.name}`);
  } catch (error) {
    failed += 1;
    console.error(`FAIL ${item.name}`);
    console.error(error.message);
  }
}

if (failed) {
  console.error(`\n${failed}/${checks.length} curriculum scope guard checks failed.`);
  process.exit(1);
}

console.log(`\nAll ${checks.length} curriculum scope guard checks passed.`);
