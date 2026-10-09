import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const taxonomy = JSON.parse(readFileSync(path.join(root, "ops/chem26/CHEM26_TAXONOMY_FINAL.json"), "utf8"));
const dir = path.join(root, "data/chem26-zubda/v1");
const files = readdirSync(dir).filter((name) => /^[a-z][a-z0-9-]*-\d{2}\.json$/.test(name)).sort();
assert.equal(taxonomy.status, "FROZEN", "Never mutate CHEM26 taxonomy");
assert.equal(taxonomy.items.length, 27, "Canonical main skills count");
assert.equal(taxonomy.items.reduce((n, x) => n + x.subSkills.length, 0), 99, "Canonical subskills count");
assert.ok(files.length >= 3, "At least three editorial batches are expected");
const seenMain = new Set();
const seenQuestions = new Set();
let maps = 0, subskills = 0, questions = 0;
function checkMap(map, label) {
  assert.ok(Array.isArray(map?.nodes) && map.nodes.length >= 4, label + ": nodes");
  assert.ok(Array.isArray(map.edges) && map.edges.length >= 3, label + ": edges");
  const hasNode = (id) => typeof id === "number"
    ? map.nodes[id] !== undefined
    : map.nodes.some((n) => n && typeof n === "object" && n.id === id);
  for (const [a, b] of map.edges) assert.ok(hasNode(a) && hasNode(b), label + ": dangling edge");
  maps += 1;
}
for (const file of files) {
  const module = JSON.parse(readFileSync(path.join(dir, file), "utf8"));
  assert.equal(module.project, "CHEM26_ZUBDA", file + ": project");
  assert.equal(module.status, "EDITORIAL_DRAFT", file + ": remains unpublished");
  assert.equal(module.quality?.deployment, "No automatic production import", file + ": no production importer");
  assert.equal(module.taxonomyRef, "ops/chem26/CHEM26_TAXONOMY_FINAL.json");
  assert.ok(Array.isArray(module.provenance?.referencePdfPages) && module.provenance.referencePdfPages.length, file + ": cited pages");
  const canonical = taxonomy.items.find((item) => item.id === module.mainSkillId);
  assert.ok(canonical, file + ": main skill identity");
  assert.ok(!seenMain.has(module.mainSkillId), file + ": duplicate main skill");
  seenMain.add(module.mainSkillId);
  assert.equal(module.mainSkillTitle, canonical.name, file + ": main skill title");
  assert.deepEqual(module.subSkills.map((s) => s.id), canonical.subSkills.map((s) => s.id), file + ": subskills");
  assert.deepEqual(module.subSkills.map((s) => s.code), canonical.subSkills.map((s) => s.code), file + ": subskill codes");
  checkMap(module.mainMap, file + " main map");
  let moduleQuestions = 0;
  for (const [i, sub] of module.subSkills.entries()) {
    assert.equal(sub.title, canonical.subSkills[i].name, sub.code + ": taxonomy title");
    assert.ok(sub.goal?.length > 35 && sub.essence?.length > 35, sub.code + ": goal and essence");
    assert.ok(sub.explanation?.length >= 3 && sub.explanation.every((s) => s.length > 35), sub.code + ": explanation");
    assert.ok(sub.highYield?.length >= 4 && sub.pitfalls?.length >= 2, sub.code + ": pedagogical notes");
    assert.ok(sub.workedExample?.prompt && sub.workedExample?.steps?.length >= 2 && sub.workedExample?.answer, sub.code + ": original example");
    assert.ok(Array.isArray(sub.referencePdfPages) && sub.referencePdfPages.every((p) => module.provenance.referencePdfPages.includes(p)), sub.code + ": page provenance");
    checkMap(sub.map, sub.code);
    assert.equal(sub.questions?.length, 3, sub.code + ": review questions");
    for (const q of sub.questions) {
      assert.ok(q.stem?.length > 25 && q.explanation?.length > 30, sub.code + ": question explanatory detail");
      assert.equal(q.options?.length, 4, sub.code + ": answer options");
      assert.equal(new Set(q.options).size, 4, sub.code + ": distinct options");
      assert.ok(Number.isInteger(q.correctOptionIndex) && q.correctOptionIndex >= 0 && q.correctOptionIndex < 4, sub.code + ": answer index");
      assert.ok(!seenQuestions.has(q.stem), sub.code + ": repeated question");
      seenQuestions.add(q.stem);
      moduleQuestions++;
    }
    subskills++;
  }
  assert.equal(module.quality?.questionCount, moduleQuestions, file + ": question QA metadata");
  questions += moduleQuestions;
}
assert.equal(seenQuestions.size, questions, "No duplicate stems across modules");
console.log(`CHEM26_ZUBDA_EDITORIAL_PASS files=${files.length} main=${seenMain.size} subskills=${subskills} maps=${maps} questions=${questions} taxonomy=27/99`);
