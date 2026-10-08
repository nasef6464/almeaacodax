#!/usr/bin/env node
// Offline PHYS26 candidate-question integrity check; never accesses production.
import fs from "node:fs";
import assert from "node:assert/strict";
const load=p=>JSON.parse(fs.readFileSync(p,"utf8"));
const input=process.argv[2];
if(!input) throw new Error("Usage: node scripts/verify-phys26-question-batch.mjs <batch.json>");
const tax=load("ops/phys26/PHYS26_TAXONOMY_CANDIDATE.json");
const src=load("ops/phys26/PHYS26_SOURCE_INVENTORY.json");
const batch=load(input);
assert.equal(batch.project,"PHYS26");
assert.equal(batch.sourceSha256,src.sources.find(s=>s.role==="question_bank").sha256);
assert.ok(Array.isArray(batch.items)&&batch.items.length>0,"No source-reviewed questions");
const mainMap=new Map(tax.mainSkills.map(m=>[m.id,m]));
const subMap=new Map(tax.mainSkills.flatMap(m=>m.subSkills.map(s=>[s.id,m.id])));
const ids=new Set(),codes=new Set(),errors=[];
for(const [index,q] of batch.items.entries()){
 const e=[],meta=q.sourceMeta||{},code=String(q.questionCode||"");
 const check=(ok,why)=>{if(!ok)e.push(why)};
 const main=mainMap.get(q.skillId);
 check(meta.documentCode==="PHYS26","wrong document code");
 check(Number.isInteger(meta.pdfPageIndex)&&meta.pdfPageIndex>=1&&meta.pdfPageIndex<=162,"page invalid");
 check([1,2].includes(meta.sourceSection),"section invalid");
 check(Number.isInteger(meta.collectionLessonNumber)&&meta.collectionLessonNumber>=1&&meta.collectionLessonNumber<=31,"lesson invalid");
 check(!!main&&main.source.collectionLessonNumbers.includes(meta.collectionLessonNumber),"main skill/lesson mismatch");
 check(subMap.get(q.subSkillId)===q.skillId,"subskill mismatch");
 check(Array.isArray(q.skillIds)&&q.skillIds.includes(q.skillId)&&q.skillIds.includes(q.subSkillId),"skillIds incomplete");
 check(q.subjectId===src.productionBaseline.subjectId&&q.pathId===src.productionBaseline.pathId,"foreign subject/path");
 check(/^PHYS26-PDF\d{3}-L\d{2}-S[12]-Q\d{2,}$/.test(meta.sourceItemId||""),"source identity invalid");
 check(/^TAH-PHYS-PHYS26-/.test(code),"question code invalid");
 check(!ids.has(meta.sourceItemId),"duplicate source identity");ids.add(meta.sourceItemId);
 check(!codes.has(code),"duplicate question code");codes.add(code);
 check(String(q.questionText||"").trim().length>=12,"question text missing");
 check(Array.isArray(q.options)&&q.options.length===4&&q.options.every(v=>String(v||"").trim().length>1),"actual four options missing");
 check(Number.isInteger(q.correctOptionIndex)&&q.correctOptionIndex>=0&&q.correctOptionIndex<=3,"answer index invalid");
 check(q.answerEvidence?.verified===true&&!!q.answerEvidence?.method&&Number.isInteger(q.answerEvidence?.pdfPageIndex),"answer provenance missing");
 check(q.visualQA?.verified===true&&q.visualQA?.oneQuestionOnly===true&&q.visualQA?.optionsVisible===true&&q.visualQA?.notCutOff===true,"crop QA missing");
 check(q.physicsQA?.unitsAndExponentsVerified===true&&q.physicsQA?.diagramsAndDirectionsVerified===true,"physics QA missing");
 check(q.reviewStatus==="APPROVED"&&String(q.reviewerNotes||"").trim().length>=12,"review evidence missing");
 if(e.length)errors.push({row:index+1,sourceItemId:meta.sourceItemId,errors:e});
}
console.log(JSON.stringify({gate:"PHYS26_OFFLINE_QUESTION_BATCH",items:batch.items.length,accepted:batch.items.length-errors.length,quarantined:errors.length,errors:errors.slice(0,50)}));
if(errors.length)process.exitCode=1;
