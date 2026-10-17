#!/usr/bin/env node
// Offline source-first evidence audit; NO network, NO DB writes, NO production deployment.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const root = "ops/quant-skill-redesign/";
const read = (name) => JSON.parse(readFileSync(root + name, "utf8"));

const baseline = read("LIVE_25_95_SKILL_TOPIC_ID_SNAPSHOT_20261014.json");
const old81 = read("COL2627_REPAIR_81_STALE_SKILLIDS_20261015.json");
const actualGaps = read("QUANT_ATLAS_LIVE_GAPS_20261015.json");
const conflicts = read("QUANT_76_DRILL_SKILL_QA_QUEUE_20261015.json");
const source14 = read("COL2627_SOURCE_14_MATH_RECLASS_CANDIDATE_20261015.json");
const fractions5 = read("COL2627_FRACTIONS_5_SOURCE_RECLASS_CANDIDATE_20261015.json");
const strategies12 = read("COL2627_SOURCE_12_STRATEGY_TO_MATH_CANDIDATE_20261015.json");
const proportion15 = read("COL2627_SOURCE_15_PROPORTION_STATS_GEOMETRY_CANDIDATE_20261015.json");
const placement12 = read("COL2627_DRILL_12_SOURCE_PLACEMENT_REVIEW_20261015.json");

assert.equal(baseline.main_skill_count, 25);
assert.equal(baseline.subskill_count, 95);
assert.equal(baseline.main_topic_count, 25);
assert.equal(baseline.subtopic_count, 95);
assert.equal(old81.items.length, 81);
assert.equal(actualGaps.postRepair.skillIdsArraysPending, 43);
assert.equal(actualGaps.postRepair.skillIdsArraysSynced, 38);
assert.equal(conflicts.review_queue.length, 76);
assert.equal(conflicts.scan.total_refs, 1200);
assert.equal(placement12.items.length, 12);

const canonical = new Map(baseline.skills.flatMap((main) =>
  main.subSkills.map((sub) => [sub.id, main.id])
));
assert.equal(canonical.size, 95);

const proposed = [
  ...source14.items.map((x) => ({ code: x.code, to: x.to, old: x.from, proof: x.proof })),
  ...fractions5.items.map((x) => ({ code: x.questionCode, to: x.proposed, old: x.old, proof: x.source_page_visual_reviewed })),
  ...strategies12.entries.map((x) => ({ code: x.questionCode, to: x.proposed, old: x.previous, proof: x.sourceImageViewed })),
  ...proportion15.changes.map((x) => ({ code: x.code, to: x.proposed, old: x.previous, proof: x.imagePageDirectlyInspected }))
];

assert.deepEqual([source14.items.length, fractions5.items.length, strategies12.entries.length, proportion15.changes.length], [14, 5, 12, 15]);
assert.equal(proposed.length, 46);
const newByCode = new Map(proposed.map((x) => [x.code, x.to.subSkillId]));
assert.equal(newByCode.size, 46, "duplicate source proposal question IDs");
for (const item of proposed) {
  assert.match(item.code, /^QDR-QNT-COL2627-P\d{3}-Q\d{2}$/);
  assert.equal(canonical.get(item.to.subSkillId), item.to.skillId, "invalid canonical proposed target: " + item.code);
  assert.deepEqual(item.to.skillIds, [item.to.skillId, item.to.subSkillId], "triple fields not in sync: " + item.code);
  assert.notDeepEqual([item.old.skillId, item.old.subSkillId], [item.to.skillId, item.to.subSkillId]);
  assert.ok(item.proof, "missing real source provenance " + item.code);
}

const resolved = conflicts.review_queue.filter((conflict) => newByCode.get(conflict.questionCode) === conflict.drillSubSkillId);
const still = conflicts.review_queue.filter((conflict) => newByCode.get(conflict.questionCode) !== conflict.drillSubSkillId);
assert.equal(resolved.length, 32);
assert.equal(still.length, 44);
assert.ok(placement12.items.every((x) => x.productionChanged === false && x.sourceImageChecked));

const report = {
  audit_status: "PASS",
  release_status: "BLOCKED_PENDING_APPROVED_WRITES_AND_CI",
  production_writes_by_this_script: 0,
  foundation_topics: "25 main + 95 child = 120",
  live_skills: "25 main + 95 sub",
  previous_corrected_questions: 81,
  historical_skillIds_remaining_out_of_sync: 43,
  drill_question_references: 1200,
  drill_question_conflicts_before: 76,
  new_source_reviewed_classification_proposals: 46,
  drill_conflicts_resolvable_by_question_skill_fixes: resolved.length,
  drill_conflicts_remaining_if_proposals_applied: still.length,
  source_reviewed_drill_membership_placements: placement12.items.length,
  no_prod_skill_expansion_applied: true
};
console.log(JSON.stringify(report, null, 2));
