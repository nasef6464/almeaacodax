#!/usr/bin/env node
// Offline, READ-ONLY checkpoint test. Does NOT contact Atlas or modify production.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const base = "ops/quant-skill-redesign/";
const read = (name) => JSON.parse(readFileSync(base + name, "utf8"));

const snapshot = read("LIVE_25_95_SKILL_TOPIC_ID_SNAPSHOT_20261014.json");
const pending = read("QUANT_ATLAS_LIVE_GAPS_20261015.json");
const ledger = read("COL2627_REPAIR_81_STALE_SKILLIDS_20261015.json");
const drillQueue = read("QUANT_76_DRILL_SKILL_QA_QUEUE_20261015.json");
const hour = read("COL2627_SOURCE_14_MATH_RECLASS_CANDIDATE_20261015.json");
const frac = read("COL2627_FRACTIONS_5_SOURCE_RECLASS_CANDIDATE_20261015.json");

assert.equal(snapshot.skills.length, 25);
assert.equal(snapshot.topic_skill_links.filter((x) => !x.parentId).length, 25);
assert.equal(snapshot.topic_skill_links.filter((x) => Boolean(x.parentId)).length, 95);
const parentBySub = new Map(snapshot.skills.flatMap((skill) =>
  skill.subSkills.map((sub) => [sub.id, skill.id]),
));
assert.equal(parentBySub.size, 95);

assert.equal(ledger.items.length, 81);
assert.equal(pending.postRepair.skillIdsArraysSynced, 38);
assert.equal(pending.postRepair.skillIdsArraysPending, 43);
assert.equal(pending.postRepair.pendingCodesAndExpectedPairs.length, 43);
assert.equal(drillQueue.review_queue.length, 76);
assert.equal(drillQueue.scan.actual_mismatches, 76);
assert.equal(drillQueue.scan.drills_affected, 32);
assert.equal(drillQueue.scan.total_refs, 1200);

const proposed = [
  ...hour.items.map((x) => ({
    code: x.code,
    from: x.from,
    to: x.to,
    applied: x.execution_status !== "NOT_APPLIED_SECURITY_WRITE_HOLD",
  })),
  ...frac.items.map((x) => ({
    code: x.questionCode,
    from: x.old,
    to: x.proposed,
    applied: x.status !== "PENDING_APPROVED_WRITE_ROUTE",
  })),
];
assert.equal(hour.items.length, 14);
assert.equal(frac.items.length, 5);
assert.equal(proposed.length, 19);
assert.equal(new Set(proposed.map((x) => x.code)).size, 19);
for (const p of proposed) {
  assert.match(p.code, /^QDR-QNT-COL2627-P\d{3}-Q\d{2}$/);
  assert.ok(parentBySub.get(p.to.subSkillId) === p.to.skillId, p.code + " invalid target");
  assert.deepEqual(p.to.skillIds, [p.to.skillId, p.to.subSkillId], p.code + " inconsistent tags");
  assert.notDeepEqual([p.from.skillId, p.from.subSkillId], [p.to.skillId, p.to.subSkillId]);
  assert.equal(p.applied, false, p.code + " must NOT claim production write");
}

const resolvedAfterProposedChanges = drillQueue.review_queue.filter((x) =>
  proposed.some((p) => p.code === x.questionCode && p.to.subSkillId === x.drillSubSkillId)
);
const remaining = 76 - resolvedAfterProposedChanges.length;
assert.equal(resolvedAfterProposedChanges.length, 17);
assert.equal(remaining, 59);

const result = {
  audit_status: "PASS_READ_ONLY_MANIFEST_STRUCTURE",
  release_status: "BLOCKED",
  production_writes: 0,
  foundation_main_topics: 25,
  foundation_child_topics: 95,
  existing_main_and_subskills: "25/95",
  stale_skillIds_in_live_checkpoint: 43,
  mismatched_quiz_question_links: 76,
  new_source_verified_reclass_proposals: 19,
  estimated_resolved_drill_mismatches_if_authorized: 17,
  estimated_remaining_drill_mismatches_if_authorized: 59,
  required_before_release: [
    "approved production write route (current direct writes blocked)",
    "isolated migration test and integrity check",
    "independent question image/rule review on remaining mismatches",
    "student / teacher / admin browser UAT, exact-head CI",
  ],
};
console.log(JSON.stringify(result, null, 2));
