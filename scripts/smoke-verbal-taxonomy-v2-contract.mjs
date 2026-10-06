import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");

const taxonomy = read("server/src/scripts/deployVerbalTaxonomy22.ts");
const migration = read("server/src/scripts/migrateVerbalTaxonomy22.ts");
const legacy = read("server/src/scripts/deployVerbalTaxonomy13.ts");
const ecosystem = read("server/src/scripts/deployVerbalEcosystem.ts");
const taxonomyRoutes = read("server/src/routes/taxonomy.routes.ts");

const mainIds = [...taxonomy.matchAll(/id:\s*"skill_verbal_(\d{2})"/g)].map((m) => m[0]);
const subIds = [...taxonomy.matchAll(/id:\s*"(sub_verbal_\d{2}_\d+)"/g)].map((m) => m[1]);

assert.equal(mainIds.length, 22, "taxonomy must define exactly 22 main skills");
assert.equal(subIds.length, 76, "taxonomy must keep exactly 76 subskills");
assert.equal(new Set(subIds).size, 76, "every subskill ID must be unique");

for (const id of ["sub_verbal_01_1", "sub_verbal_08_7", "sub_verbal_13_7"]) {
  assert.ok(subIds.includes(id), `missing stable legacy subskill ${id}`);
}

assert.ok(migration.includes("beforeQuestions"), "migration must retain question-count safety");
assert.ok(migration.includes("afterQuestions !== beforeQuestions"), "migration must reject question-count drift");
assert.ok(!migration.includes("foundationDrills"), "must not generate foundation drills");
assert.ok(!migration.includes("trainingDrills"), "must not generate training drills");
assert.ok(!migration.includes("mockExams"), "must not generate mock exams");
assert.ok(!migration.includes("bank_verbal_skill_"), "must not synthesize generated skill banks");
assert.ok(!migration.includes("quizCol"), "taxonomy migration must not mutate quiz collections");
assert.ok(!taxonomy.includes("sections.deleteMany"), "taxonomy deploy must not delete verbal sections");
assert.ok(!taxonomy.includes("skills.deleteMany"), "taxonomy deploy must not delete verbal skills");
assert.ok(!taxonomy.includes("topics.deleteMany"), "taxonomy deploy must not delete verbal topics");
assert.ok(!migration.includes('db.collection("skillprogresses")'), "migration must not rewrite SkillProgress");
assert.ok(!migration.includes('db.collection("quizresults")'), "migration must not rewrite historical QuizResult");
assert.ok(legacy.includes("./deployVerbalTaxonomy22.js"), "legacy entrypoint must route to V2");
assert.ok(ecosystem.includes("VERBAL26_DRY_RUN"), "VERBAL26 deployment must default to dry-run");
assert.ok(ecosystem.includes("ALLOW_VERBAL26_APPLY"), "VERBAL26 writes must require explicit apply authorization");
assert.ok(ecosystem.includes("VERBAL26_BACKUP_REFERENCE"), "VERBAL26 writes must require rollback/backup evidence");
assert.ok(ecosystem.includes("verbal_approved_bank_v2.json"), "VERBAL26 deployment must consume the approved canonical bank");
assert.ok(!ecosystem.includes("questionsCol.deleteMany"), "VERBAL26 deployment must never wipe verbal questions");
assert.ok(!ecosystem.includes("quizzesCol.deleteMany"), "VERBAL26 ecosystem wrapper must not wipe verbal quizzes");
assert.ok(!ecosystem.includes("selected40"), "legacy 40-question cross-skill top-up logic must stay removed");
assert.ok(ecosystem.includes("skillIds: [q.mainSkillId, q.subSkillId]"), "imported questions must carry exact main/subskill lineage");
assert.ok(ecosystem.includes("migrateVerbalTaxonomy22"), "canonical 22/76 taxonomy migration must remain wired");
assert.ok(migration.includes('path.join(process.cwd(), "data", "verbal26_source_ledger.json")'), "migration must support Render server cwd for ledger lookup");
assert.ok(ecosystem.includes('path.join(process.cwd(), "data", "verbal_approved_bank_v2.json")'), "ecosystem deploy must support Render server cwd for approved bank lookup");
assert.ok(taxonomyRoutes.includes("const canonicalTaxonomyId"), "taxonomy bootstrap must resolve canonical id before _id");
assert.ok(taxonomyRoutes.includes("sections.map(canonicalTaxonomyId)"), "staff taxonomy bootstrap must join skills through canonical section ids");
assert.ok(taxonomyRoutes.includes("const visibleSectionIds = sections.map(canonicalTaxonomyId)"), "public taxonomy bootstrap must join skills through canonical section ids");

console.log("PASS: verbal taxonomy V2 contract — 22 main / 76 stable taxonomy / source-only non-destructive migration guards.");
