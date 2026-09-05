import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

const [ownership, pathsManager, skillsManager, store, api, taxonomyRoutes, skillProgress] = await Promise.all([
  read("scripts/smoke-gate6-curriculum-ownership-contract.mjs"),
  read("dashboards/admin/PathsManager.tsx"),
  read("dashboards/admin/SkillsManager.tsx"),
  read("store/useStore.ts"),
  read("services/apiGroups/taxonomyContentApi.ts"),
  read("server/src/routes/taxonomy.routes.ts"),
  read("server/src/models/SkillProgress.ts"),
]);

const check = (name, fn) => {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
};

check("admin has explicit path/subject learning-space and taxonomy management surfaces", () => {
  assert.ok(pathsManager.includes("export const PathsManager"));
  assert.ok(pathsManager.includes("SkillsTreeManager"));
  assert.ok(skillsManager.includes("export const SkillsManager"));
  for (const action of ["addPath", "addSubject", "addSection", "createSkill", "updateSkill", "deleteSkill"]) {
    assert.ok(skillsManager.includes(action), `missing taxonomy UI action ${action}`);
  }
});

check("frontend taxonomy actions persist through one taxonomy API boundary", () => {
  for (const action of ["api.createPath", "api.createSubject", "api.createSection", "api.createSkill", "api.updateSkill", "api.deleteSkill"]) {
    assert.ok(store.includes(action), `store missing persisted action ${action}`);
  }
  for (const endpoint of ["/taxonomy/paths", "/taxonomy/subjects", "/taxonomy/sections", "/taxonomy/skills"]) {
    assert.ok(api.includes(endpoint), `taxonomy API missing ${endpoint}`);
  }
});

check("server taxonomy mutations remain admin-owned definitions", () => {
  for (const route of ["/paths", "/levels", "/subjects", "/sections", "/skills"]) {
    assert.ok(taxonomyRoutes.includes(`\"${route}\"`), `missing taxonomy route ${route}`);
  }
  assert.ok(taxonomyRoutes.includes('requireRole(["admin"])'));
  assert.ok(!taxonomyRoutes.includes("SkillProgressModel"));
});

check("learner progress remains separately user-scoped", () => {
  assert.ok(skillProgress.includes("userId:"));
  assert.ok(skillProgress.includes("skillId:"));
  assert.ok(skillProgress.includes("mastery:"));
  assert.ok(skillProgress.includes("attempts:"));
  assert.ok(skillProgress.includes('skillProgressSchema.index({ userId: 1, skillId: 1 }, { unique: true })'));
});

check("existing ownership contract covers taxonomy definition/progress separation", () => {
  assert.ok(ownership.includes("taxonomy definitions do not persist learner progress state"));
  assert.ok(ownership.includes("taxonomy hierarchy keeps definition ownership explicit"));
  assert.ok(ownership.includes("taxonomy mutations stay admin-owned"));
});

check("learning-space composition reuses owned content centers instead of duplicating curriculum persistence", () => {
  for (const manager of ["CoursesManager", "QuestionBankManager", "FoundationManager", "QuizzesManager", "LibraryManager"]) {
    assert.ok(pathsManager.includes(manager), `PathsManager missing contextual composition ${manager}`);
  }
  assert.ok(!pathsManager.includes("mongoose"));
  assert.ok(!pathsManager.includes("SkillProgressModel"));
});

console.log("Gate 6 Curriculum commercial closure contract passed.");
