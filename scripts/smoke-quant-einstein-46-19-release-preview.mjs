#!/usr/bin/env node
// No DB connection, file writes or deployment. Fails closed on invalid taxonomy plans.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const root = "ops/quant-skill-redesign/";
const read = (name) => JSON.parse(readFileSync(root + name, "utf8"));
const snapshot = read("LIVE_25_95_SKILL_TOPIC_ID_SNAPSHOT_20261014.json");
const ledger81 = read("COL2627_REPAIR_81_STALE_SKILLIDS_20261015.json");
const gaps = read("QUANT_ATLAS_LIVE_GAPS_20261015.json");
const queue76 = read("QUANT_76_DRILL_SKILL_QA_QUEUE_20261015.json");
const q14 = read("COL2627_SOURCE_14_MATH_RECLASS_CANDIDATE_20261015.json");
const q5 = read("COL2627_FRACTIONS_5_SOURCE_RECLASS_CANDIDATE_20261015.json");
const q12 = read("COL2627_SOURCE_12_STRATEGY_TO_MATH_CANDIDATE_20261015.json");
const q15 = read("COL2627_SOURCE_15_PROPORTION_STATS_GEOMETRY_CANDIDATE_20261015.json");
const drill12 = read("COL2627_DRILL_12_SOURCE_PLACEMENT_REVIEW_20261015.json");
const drill7 = read("COL2627_STRATEGY_7_DRILL_PLACEMENTS_REVIEW_20261015.json");
const preview = read("QUANT_46_PLUS_19_SIMULATED_REMEDIATION_20261015.json");

assert.deepEqual([snapshot.main_skill_count,snapshot.subskill_count,snapshot.main_topic_count,snapshot.subtopic_count], [25,95,25,95]);
assert.equal(ledger81.items.length,81);
assert.equal(gaps.postRepair.skillIdsArraysSynced,38);
assert.equal(gaps.postRepair.skillIdsArraysPending,43);
assert.equal(queue76.review_queue.length,76);
const parentBySub=new Map(snapshot.skills.flatMap(main=>main.subSkills.map(sub=>[sub.id,main.id])));
assert.equal(parentBySub.size,95);

const updates=[
 ...q14.items.map(r=>({code:r.code,before:r.from,after:r.to})),
 ...q5.items.map(r=>({code:r.questionCode,before:r.old,after:r.proposed})),
 ...q12.entries.map(r=>({code:r.questionCode,before:r.previous,after:r.proposed})),
 ...q15.changes.map(r=>({code:r.code,before:r.previous,after:r.proposed}))
];
assert.equal(updates.length,46);
const byCode=new Map();
for(const u of updates){
 assert.match(u.code,/^QDR-QNT-COL2627-P\d{3}-Q\d{2}$/);
 assert.ok(!byCode.has(u.code),"duplicate proposal "+u.code);
 assert.equal(parentBySub.get(u.after.subSkillId),u.after.skillId,"orphan target "+u.code);
 assert.deepEqual(u.after.skillIds,[u.after.skillId,u.after.subSkillId],"tags diverge for "+u.code);
 assert.notDeepEqual([u.before.skillId,u.before.subSkillId],[u.after.skillId,u.after.subSkillId],"no-op "+u.code);
 byCode.set(u.code,u.after.subSkillId);
}
const placements=[
 ...drill12.items.map(x=>({code:x.code,fromQuiz:x.fromQuiz,toQuiz:x.targetQuiz,toSize:x.toQuizCurrentCount,already:x.targetAlreadyHasQuestion})),
 ...drill7.changes.map(x=>({code:x.questionCode,fromQuiz:x.fromQuiz,toQuiz:x.toQuiz,toSize:x.toQuizSize,already:x.targetHasQuestion}))
];
assert.equal(placements.length,19);
const placementByCode=new Map(placements.map(x=>[x.code,x]));
assert.equal(placementByCode.size,19);
for(const p of placements){
 assert.match(p.fromQuiz,/^drill_sub_quant_/);
 assert.match(p.toQuiz,/^drill_sub_quant_/);
 assert.notEqual(p.fromQuiz,p.toQuiz);
 assert.equal(p.already,false,"proposed double-insert "+p.code);
 assert.ok(p.toSize>=0);
 // No append operation is authorized, particularly if the target is full.
}

const problems=queue76.review_queue;
const autoResolved=problems.filter(x=>byCode.get(x.questionCode)===x.drillSubSkillId);
const afterTags=problems.filter(x=>byCode.get(x.questionCode)!==x.drillSubSkillId);
const placementReviewed=afterTags.filter(x=>placementByCode.has(x.questionCode));
const stillNeedsSource=afterTags.filter(x=>!placementByCode.has(x.questionCode));
assert.equal(autoResolved.length,32);
assert.equal(placementReviewed.length,19);
assert.equal(stillNeedsSource.length,25);
assert.equal(preview.candidatePrimaryReclassesWhichWouldResolve,autoResolved.length);
assert.equal(preview.sourceReviewedQuizMembershipChangesNeededAfter,placementReviewed.length);
assert.equal(preview.unreviewedQuizMembershipConflicts,stillNeedsSource.length);

console.log(JSON.stringify({
 status:"PASS_READ_ONLY_PREVIEW",
 production_writes:0,
 live_foundation_topics:120,
 current_main_skills:25,
 current_subskills:95,
 previously_changed_questions:81,
 legacy_skillIds_pending:43,
 actual_drill_conflicts:76,
 new_source_reviewed_question_reclass_candidates:46,
 source_reviewed_drill_placements:19,
 simulated_reclass_resolves:32,
 training_moves_requiring_capacity_and_backfill_review:19,
 still_pending_source_review:25,
 release:"BLOCKED_UNTIL_AUTHORIZED_WRITE_ROUTE_ISOLATED_UAT_EXACT_HEAD_CI"
},null,2));
