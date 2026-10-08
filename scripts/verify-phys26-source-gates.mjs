#!/usr/bin/env node
// PHYS26 source/taxonomy preflight. Static only: never connects to Mongo, R2 or Render.
import assert from "node:assert/strict";
import fs from "node:fs";
const load = (f) => JSON.parse(fs.readFileSync(f, "utf8"));
const base = "ops/phys26/";
const src = load(base + "PHYS26_SOURCE_INVENTORY.json");
const tax = load(base + "PHYS26_TAXONOMY_CANDIDATE.json");
const ledger = load(base + "PHYS26_EXECUTION_LEDGER.json");
const check = (condition, why) => assert.ok(condition, why);
check(src.project === "PHYS26" && tax.track === "PHYS26" && ledger.project === "PHYS26", "scope drift");
check(src.sources.length === 3, "requires 3 source PDFs");
const byRole = new Map(src.sources.map(x => [x.role,x]));
for (const row of src.sources) {
 check(/^[a-f0-9]{64}$/.test(row.sha256), "invalid PDF SHA: "+row.filename);
 check(Number.isInteger(row.pages) && row.pages > 0 && Number.isInteger(row.bytes) && row.bytes > 0, "invalid source properties");
}
check(byRole.get("foundation")?.pages===37, "foundation pages mismatch");
check(byRole.get("question_bank")?.pages===162, "question PDF pages mismatch");
check(byRole.get("supplemental_reference")?.pages===77, "summary pages mismatch");
check(tax.status === "PROPOSED_NOT_IMPORTED", "candidate must remain unimported");
check(tax.mainSkills.length===25, "expected proposed 25 main skills");
check(tax.mainSkills.reduce((n,m)=>n+m.subSkills.length,0)===90, "expected proposed 90 subskills");
const mainIds=new Set(),subIds=new Set(),lessons=[];
for (const [i,m] of tax.mainSkills.entries()) {
 check(m.order===i+1 && m.id===`PHYS26-M${String(i+1).padStart(2,"0")}`, "wrong main id/order");
 check(!mainIds.has(m.id),"duplicate main skill"); mainIds.add(m.id);
 check(m.proposedFree === (i<5),"initial free scope drift");
 check(Array.isArray(m.source?.foundationLessonNumbers),"missing foundation trace");
 if(i>=10)check(m.source.foundationLessonNumbers.length===0,"unsupported third-secondary foundation claim");
 lessons.push(...m.source.collectionLessonNumbers);
 for(const [j,s] of m.subSkills.entries()) {
   check(s.id===`PHYS26-S${String(i+1).padStart(2,"0")}-${String(j+1).padStart(2,"0")}`, "subskill identity/order drift");
   check(s.nameAr?.trim().length>3,"missing subskill name");
   check(!subIds.has(s.id),"duplicate subskill");subIds.add(s.id);
 }
}
lessons.sort((a,b)=>a-b);
check(lessons.length===31 && lessons.every((n,i)=>n===i+1),"collection 1..31 coverage gap/duplication");
check(src.productionBaseline.subjectId==="sub_1784980706034" && src.productionBaseline.questions===0, "verified Physics subject baseline drift");
check(src.productionBaseline.genericSkillRows===9 && src.productionBaseline.skillprogressRowsReferencingLegacySkillsOrSubject===36 && src.productionBaseline.protectLegacySkillIds===true, "legacy Physics skill/progress protection drift");
check(src.safety==="NO_PRODUCTION_WRITES","production safety policy changed");
check(ledger.currentPhase===1 && ledger.cumulative.canonicalQuestionsVerified===0,"phase 1 evidence overstated");
console.log(JSON.stringify({gate:"PHYS26_STATIC_CANDIDATE_PASS",main:mainIds.size,sub:subIds.size,collectionLessons:lessons.length,sourcePDFs:src.sources.length,foundationMissingGrade3:true,productionWrites:false}));
