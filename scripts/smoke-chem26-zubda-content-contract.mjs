import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const taxonomy = JSON.parse(readFileSync(path.join(root, "ops/chem26/CHEM26_TAXONOMY_FINAL.json"), "utf8"));
const module = JSON.parse(readFileSync(path.join(root, "data/chem26-zubda/v1/intro-01.json"), "utf8"));

assert.equal(taxonomy.status, "FROZEN", "Do not alter canonical chemistry taxonomy");
assert.equal(taxonomy.items.length, 27, "27 canonical main skills");
assert.equal(taxonomy.items.reduce((s, item) => s + item.subSkills.length, 0), 99, "99 canonical subskills");
assert.equal(module.project, "CHEM26_ZUBDA");
assert.equal(module.status, "EDITORIAL_DRAFT", "No content should auto-publish as reviewed");
assert.equal(module.mainSkillId, taxonomy.items[0].id);
assert.equal(module.mainSkillTitle, taxonomy.items[0].name);
assert.deepEqual(module.subSkills.map((item) => item.id), taxonomy.items[0].subSkills.map((item) => item.id));
assert.deepEqual(module.subSkills.map((item) => item.code), taxonomy.items[0].subSkills.map((item) => item.code));
assert.equal(module.subSkills.length, 4);
assert.ok(module.provenance.referencePdfPages.includes(5) && module.provenance.referencePdfPages.includes(6));

function checkMap(map, context) {
  assert.ok(Array.isArray(map.nodes) && map.nodes.length >= 4, context + " map nodes");
  assert.ok(Array.isArray(map.edges) && map.edges.length >= 3, context + " map edges");
  for (const [from, to] of map.edges) {
    if (typeof from === "number") {
      assert.ok(map.nodes[from] != null && map.nodes[to] != null, context + " map edge");
    } else {
      assert.ok(map.nodes.some((n) => n.id === from), context + " map source");
      assert.ok(map.nodes.some((n) => n.id === to), context + " map target");
    }
  }
}

checkMap(module.mainMap, "main");
const seen = new Set();
for (const sub of module.subSkills) {
  assert.ok(sub.goal.length > 35 && sub.essence.length > 35, sub.code + " goal/essence");
  assert.ok(sub.explanation.length >= 3 && sub.explanation.every((line) => line.length > 35), sub.code + " explanation");
  assert.ok(sub.highYield.length >= 4 && sub.pitfalls.length >= 2, sub.code + " pedagogical support");
  assert.ok(sub.workedExample?.prompt && sub.workedExample.steps.length >= 2 && sub.workedExample.answer, sub.code + " worked example");
  assert.ok(Array.isArray(sub.referencePdfPages) && sub.referencePdfPages.every((page) => [5, 6].includes(page)), sub.code + " provenance");
  checkMap(sub.map, sub.code);
  assert.equal(sub.questions.length, 3, sub.code + " initial self-check count");
  for (const q of sub.questions) {
    assert.ok(q.stem.length > 25 && q.explanation.length > 30, "question content");
    assert.equal(q.options.length, 4, "four options");
    assert.equal(new Set(q.options).size, 4, "distinct options");
    assert.ok(Number.isInteger(q.correctOptionIndex) && q.correctOptionIndex >= 0 && q.correctOptionIndex < 4, "valid answer");
    assert.ok(!seen.has(q.stem), "unique questions");
    seen.add(q.stem);
  }
}
assert.equal(seen.size, 12, "initial module has 12 original checks");
assert.equal(module.quality.questionCount, seen.size, "QA metadata count");
assert.equal(module.quality.deployment, "No automatic production import", "No silent production writes");
console.log("CHEM26_ZUBDA_BATCH01_PASS main=1 subskills=4 questions=12 taxonomy=27/99 maps=5");
