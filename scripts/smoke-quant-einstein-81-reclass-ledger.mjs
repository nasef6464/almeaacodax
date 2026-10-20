#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const root = "ops/quant-skill-redesign/";
const read = (name) => JSON.parse(readFileSync(root + name, "utf8"));
const id = (x) => x.questionCode;
const asRow = (x, old, next) => ({ questionCode:id(x), before:old, after:next });
const six = read("COL2627_SOURCE_VERIFIED_SIX_FIXES_20261014.json").changes.map(x => asRow(x,x.old,x.new));
const two = read("COL2627_P008_UNITS_DIGIT_TWO_FIXES_20261014.json").changes.map(x => asRow(x,x.before,x.after));
const finance = read("COL2627_FINANCIAL_28_SOURCE_RECLASS_20261014.json").exact_paired_rollback_records.map(x => asRow(x,x.before,x.after));
const percentages = read("COL2627_PERCENT_44_SOURCE_RECLASS_20261014.json").changes.map(x => asRow(x,{skillId:x.oldMain,subSkillId:x.oldSub},{skillId:x.newMain,subSkillId:x.newSub}));
const single = read("COL2627_P007_Q08_DIVISIBILITY_FIX_20261014.json").fix;
const rows = [...six,...two,...finance,...percentages,asRow(single,single.before,single.after)];
assert.deepEqual([six.length,two.length,finance.length,percentages.length,1], [6,2,28,44,1]);
assert.equal(rows.length,81);
assert.equal(new Set(rows.map(x=>x.questionCode)).size,81, "duplicate question fix");
const snap = read("LIVE_25_95_SKILL_TOPIC_ID_SNAPSHOT_20261014.json");
const byMain = new Map(snap.skills.map(x => [x.id,new Set(x.subSkills.map(y=>y.id))]));
assert.equal(byMain.size,25);
for (const x of rows) {
  assert.match(x.questionCode,/^QDR-QNT-COL2627-P\d{3}-Q\d{2}$/);
  assert.ok(byMain.get(x.after.skillId)?.has(x.after.subSkillId), "invalid target skill: "+x.questionCode);
  assert.notDeepEqual(x.before,x.after,"not a real classification change: "+x.questionCode);
}
const splits = read("QUANT_TWO_SUBSKILL_SPLITS_SOURCE_CASE_20261014.json");
assert.equal(splits.current_subskills,95);
assert.equal(splits.proposed_subskills_after_two_splits,97);
const candidateCodes = splits.splits.flatMap(x=>[...x.keepExistingQuestionCodes,...x.newConceptQuestionCodes]);
assert.equal(candidateCodes.length,42);
assert.equal(new Set(candidateCodes).size,42);
assert.deepEqual(splits.splits.map(x=>x.newConceptQuestionCodes.length),[17,8]);
console.log("PASS: 81 unique source-verified change records, all targets valid, and two unmerged 25→97 skill proposals.");
