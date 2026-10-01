import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");

const taxonomy = read("server/src/scripts/deployVerbalTaxonomy22.ts");
const migration = read("server/src/scripts/migrateVerbalTaxonomy22.ts");
const legacy = read("server/src/scripts/deployVerbalTaxonomy13.ts");
const ecosystem = read("server/src/scripts/deployVerbalEcosystem.ts");

const mainIds = [...taxonomy.matchAll(/id:\s*"skill_verbal_(\d{2})"/g)].map((m) => m[0]);
const subIds = [...taxonomy.matchAll(/id:\s*"(sub_verbal_\d{2}_\d+)"/g)].map((m) => m[1]);

assert.equal(mainIds.length, 22, "taxonomy must define exactly 22 main skills");
assert.equal(subIds.length, 76, "taxonomy must keep exactly 76 subskills");
assert.equal(new Set(subIds).size, 76, "every subskill ID must be unique");

for (const id of ["sub_verbal_01_1", "sub_verbal_08_7", "sub_verbal_13_7"]) {
  assert.ok(subIds.includes(id), `missing stable legacy subskill ${id}`);
}

assert.ok(migration.includes("beforeQuestions"));
assert.ok(migration.includes("afterQuestions !== beforeQuestions"));
assert.ok(migration.includes("foundationDrills !== 76"));
assert.ok(migration.includes("foundation drills without questions"));
assert.ok(migration.includes("{ upsert: true }"), "migration must recover missing generated quizzes");
assert.ok(migration.includes("trainingDrills !== 22"));
assert.ok(migration.includes("mockExams !== 5"));
assert.ok(migration.includes("skillIds: [mainSkillId, subSkillId]"));
assert.ok(!migration.includes('db.collection("skillprogresses")'), "migration must not rewrite SkillProgress");
assert.ok(!migration.includes('db.collection("quizresults")'), "migration must not rewrite historical QuizResult");
assert.ok(legacy.includes("./deployVerbalTaxonomy22.js"), "legacy entrypoint must route to V2");
assert.ok(ecosystem.includes("ALLOW_DESTRUCTIVE_VERBAL_REBUILD"), "legacy rebuild must be guarded");

console.log("PASS: verbal taxonomy V2 contract — 22 main / 76 stable subskills / non-destructive migration guards.");
