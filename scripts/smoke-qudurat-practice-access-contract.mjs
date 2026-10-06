import assert from "node:assert/strict";
import fs from "node:fs";

const file = fs.readFileSync("server/src/scripts/reconcileQuduratPracticeAccess.ts", "utf8");

assert.ok(file.includes('const FREE_MAIN_TOPICS = 5;'), "free-main-topic policy must stay exactly five");
assert.ok(file.includes('const SUB_DRILL_TARGET_MIN = 10;'), "subskill target must stay at least ten when source permits");
assert.ok(file.includes('const SUB_DRILL_MAX_QUESTIONS = 15;'), "source-backed subskill drills may use up to fifteen questions");
assert.ok(file.includes('questionIdsForSubskill'), "subskill drills must be built from canonical mapped questions");
assert.ok(file.includes('questionIdsForMain'), "main-skill drills must be built from canonical mapped questions");
assert.ok(!file.includes('QuestionModel.create'), "practice reconciliation must never create canonical questions");
assert.ok(!file.includes('questionsCol.insert'), "practice reconciliation must never insert questions");
assert.ok(file.includes('subskillGaps'), "under-ten source gaps must be reported instead of fabricated");
assert.ok(file.includes('isLocked: !isFreeMainTopic'), "topic entitlement must lock everything after the first five");
assert.ok(file.includes('access: accessForFree(isFreeMainTopic)'), "foundation drill access must follow the parent free-five policy");
assert.ok(file.includes("freeMainSkillIds"), "free main-skill training access must be keyed by the first five canonical skills, not bank-row count");
assert.ok(file.includes("freeMainSkillIds.has(quizMainSkillId)"), "every bank group for the first five canonical main skills must remain free");
assert.ok(file.includes('"settings.lockSkillsForNonSubscribers": false'), "subject-wide foundation hard lock must be disabled for granular free-five policy");
assert.ok(file.includes('"settings.lockBanksForNonSubscribers": false'), "subject-wide bank hard lock must be disabled for granular free-five policy");
assert.ok(file.includes('QUDURAT_PRACTICE_BACKUP_REFERENCE'), "production apply must require rollback evidence");
assert.ok(file.includes('ALLOW_QUDURAT_PRACTICE_APPLY'), "production apply must require explicit authorization");

console.log("PASS: Qudurat practice/free-five contract — source-backed drills, five free main topics, five free main-skill trainings.");
