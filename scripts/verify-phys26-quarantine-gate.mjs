#!/usr/bin/env node
// PHYS26 metadata-only quarantine fail-closed gate. Never connects to production.
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=f=>JSON.parse(readFileSync(f,"utf8"));
const reg=read("ops/phys26/PHYS26_RUN012_QUARANTINE_REGISTER.json");
const src=read("ops/phys26/PHYS26_SOURCE_INVENTORY.json");
const audit=read("ops/phys26/PHYS26_SOURCE_NUMBER_AUDIT_2064.json");
assert.equal(reg.project,"PHYS26");
assert.equal(reg.collectionSourceSHA256,src.sources.find(s=>s.role==="question_bank").sha256);
assert.equal(reg.collectionSourceSHA256,audit.sourceSha256);
assert.equal(reg.rightsToRedistribute,"UNVERIFIED");
assert.equal(reg.importAllowed,false);
assert.equal(reg.approvedQuestions,0);
const known=new Map(audit.lessons.map(x=>[x.lesson,x]));
const ids=new Set();
for(const q of reg.records){
 assert.match(q.sourceId,/^PHYS26-COL26-L\d{2}-Q\d{3}$/);
 assert.ok(!ids.has(q.sourceId),"Duplicate quarantine key");
 ids.add(q.sourceId);
 const l=known.get(q.lessonNumber);
 assert.ok(l && q.pdfPage>=l.pageStart && q.pdfPage<=l.pageEnd,"Quarantine source outside lesson");
 assert.equal(q.importAllowed,false);
 assert.ok(q.reason && q.evidence && q.nextAction && q.reviewedAt);
 if(q.reason.includes("DIAGRAM")) assert.equal(q.allowSourceReconstruction,false);
}
assert.equal(ids.size,4,"Four publisher-source quarantines must not disappear silently");
for(const k of ["PHYS26-COL26-L14-Q039","PHYS26-COL26-L15-Q013","PHYS26-COL26-L27-Q024","PHYS26-COL26-L22-Q057"]){
 assert.ok(ids.has(k),`Unresolved source quarantine missing: ${k}`);
}
console.log(JSON.stringify({gate:"PHYS26_SOURCE_QUARANTINES_PASS",active:ids.size,importAllowed:false,productionWrites:false}));
