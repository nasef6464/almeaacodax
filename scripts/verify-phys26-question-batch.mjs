#!/usr/bin/env node
// Offline PHYS26 candidate-question integrity check; never accesses production.
import fs from "node:fs";
import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import path from "node:path";
const load=p=>JSON.parse(fs.readFileSync(p,"utf8"));
const input=process.argv[2];
if(!input) throw new Error("Usage: node scripts/verify-phys26-question-batch.mjs <batch.json>");
const tax=load("ops/phys26/PHYS26_TAXONOMY_CANDIDATE.json");
const src=load("ops/phys26/PHYS26_SOURCE_INVENTORY.json");
const batch=load(input);
const numberAudit=load("ops/phys26/PHYS26_SOURCE_NUMBER_AUDIT_2064.json");
assert.equal(numberAudit.project,"PHYS26");
assert.equal(numberAudit.sourceSha256,batch.sourceSha256);
assert.equal(numberAudit.safeToImport,false,"Number audit is metadata only, never import approval");
const lessonBounds=new Map(numberAudit.lessons.map(l=>[l.lesson,l]));
const norm=v=>String(v??"").normalize("NFKC").replace(/[\u064B-\u065F\u0670]/g,"").replace(/\s+/g," ").trim().toLowerCase();
const keyOptionToIndex={"A":0,"B":1,"C":2,"D":3,"أ":0,"ا":0,"ب":1,"ج":2,"د":3};
const seenFullTexts=new Set(),seenImages=new Set();
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
 const lesson=lessonBounds.get(meta.collectionLessonNumber);
 check(!!lesson&&Number.isInteger(meta.pdfPageIndex)&&meta.pdfPageIndex>=lesson.pageStart&&meta.pdfPageIndex<=lesson.pageEnd,"page outside lesson bounds");
 check(!!lesson&&(meta.sourceSection!==2||lesson.secondSectionPage!==null),"nonexistent source section");
 check(!!lesson&&(meta.sourceSection!==2||meta.pdfPageIndex>=lesson.secondSectionPage),"second section located before header");
 check(subMap.get(q.subSkillId)===q.skillId,"subskill mismatch");
 check(Array.isArray(q.skillIds)&&q.skillIds.includes(q.skillId)&&q.skillIds.includes(q.subSkillId),"skillIds incomplete");
 check(q.subjectId===src.productionBaseline.subjectId&&q.pathId===src.productionBaseline.pathId,"foreign subject/path");
 check(/^PHYS26-PDF\d{3}-L\d{2}-S[12]-Q\d{2,}$/.test(meta.sourceItemId||""),"source identity invalid");
 check(/^TAH-PHYS-PHYS26-/.test(code),"question code invalid");
 check(Number.isInteger(meta.printedQuestionNumber)&&meta.printedQuestionNumber>0,"printed question number missing");
 const expectedId=Number.isInteger(meta.pdfPageIndex)&&Number.isInteger(meta.collectionLessonNumber)&&[1,2].includes(meta.sourceSection)&&Number.isInteger(meta.printedQuestionNumber)
 ? `PHYS26-PDF${String(meta.pdfPageIndex).padStart(3,"0")}-L${String(meta.collectionLessonNumber).padStart(2,"0")}-S${meta.sourceSection}-Q${String(meta.printedQuestionNumber).padStart(2,"0")}` : "";
 check(meta.sourceItemId===expectedId,"source identity does not match location");
 check(!ids.has(meta.sourceItemId),"duplicate source identity");ids.add(meta.sourceItemId);
 check(!codes.has(code),"duplicate question code");codes.add(code);
 check(String(q.questionText||"").trim().length>=12,"question text missing");
 check(Array.isArray(q.options)&&q.options.length===4&&q.options.every(v=>String(v||"").trim().length>1),"actual four options missing");
 const optionLabels=new Set(["A","B","C","D","أ","ب","ج","د"]);
 check(Array.isArray(q.options)&&q.options.every(v=>!optionLabels.has(String(v).trim())),"placeholder option label detected");
 if(Array.isArray(q.options)){
   const optionTexts=q.options.map(norm);
   check(new Set(optionTexts).size===4,"duplicate option text");
 }
 const signature=norm(q.questionText)+"|"+(Array.isArray(q.options)?q.options.map(norm).join("|"):"");
 check(!seenFullTexts.has(signature),"duplicate normalized question/options signature");
 seenFullTexts.add(signature);
 check(Array.isArray(q.aiContext?.optionTexts)&&q.aiContext.optionTexts.length===4&&q.aiContext.optionTexts.every((v,j)=>String(v).trim()===String(q.options?.[j]||"").trim()),"AI optionTexts must match actual choices");
 check(q.aiContext?.optionTextsSource==="SOURCE_PDF"&&q.aiContext?.optionTextsVerified===true,"AI option provenance missing");
 check(String(q.aiContext?.readableText||"").trim().length>=12,"AI readable text missing");
 check(Number.isInteger(q.correctOptionIndex)&&q.correctOptionIndex>=0&&q.correctOptionIndex<=3,"answer index invalid");
 check(q.answerEvidence?.verified===true&&["SOURCE_KEY","INDEPENDENT_VERIFIED_SOLUTION"].includes(q.answerEvidence?.method)&&Number.isInteger(q.answerEvidence?.pdfPageIndex)&&String(q.answerEvidence?.reviewerNotes||"").trim().length>=12,"answer provenance missing");
 const keyPage=q.answerEvidence?.pdfPageIndex;
 check(Number.isInteger(keyPage)&&!!lesson&&keyPage>=lesson.pageStart&&keyPage<=lesson.pageEnd,"answer evidence page outside lesson");
 if(q.answerEvidence?.method==="SOURCE_KEY"){
   const key=String(q.answerEvidence?.sourceKeyOptionLabel??"").trim();
   check(Object.hasOwn(keyOptionToIndex,key),"actual source key letter missing");
   if(Object.hasOwn(keyOptionToIndex,key)) check(keyOptionToIndex[key]===q.correctOptionIndex,"source key conflicts with correctOptionIndex");
 }else if(q.answerEvidence?.method==="INDEPENDENT_VERIFIED_SOLUTION"){
   check(String(q.answerEvidence?.solutionSteps??"").trim().length>=24,"independent solution evidence missing");
 }
 check(q.visualQA?.verified===true&&q.visualQA?.oneQuestionOnly===true&&q.visualQA?.optionsVisible===true&&q.visualQA?.notCutOff===true&&String(q.visualQA?.reviewerNotes||"").trim().length>=12,"crop QA missing");
 const imageFile=String(q.imageFileName||"");
 const imageHash=String(meta.imageHash||"").toLowerCase();
 check(/^[\w-]+\.webp$/i.test(imageFile)&&path.basename(imageFile)===imageFile,"image filename invalid");
 check(/^[a-f0-9]{64}$/.test(imageHash),"image SHA256 missing");
 if(/^[a-f0-9]{64}$/.test(imageHash)){
   check(!seenImages.has(imageHash),"duplicate image SHA256");
   seenImages.add(imageHash);
 }
 if(/^[\w-]+\.webp$/i.test(imageFile)){
  const imagePath=path.join(path.dirname(path.resolve(input)),"images",imageFile);
  check(fs.existsSync(imagePath),"image file missing");
  if(fs.existsSync(imagePath)){
    const bytes=fs.readFileSync(imagePath);
    check(createHash("sha256").update(bytes).digest("hex")===imageHash,"image bytes SHA mismatch");
    check(bytes.length>=20&&bytes.toString("ascii",0,4)==="RIFF"&&bytes.toString("ascii",8,12)==="WEBP"&&["VP8 ","VP8L","VP8X"].includes(bytes.toString("ascii",12,16))&&bytes.readUInt32LE(4)+8===bytes.length,"image is not a complete WebP RIFF payload");
  }
 }
 check(q.physicsQA?.unitsAndExponentsVerified===true&&q.physicsQA?.diagramsAndDirectionsVerified===true,"physics QA missing");
 check(q.reviewStatus==="APPROVED"&&String(q.reviewerNotes||"").trim().length>=12,"review evidence missing");
 if(e.length)errors.push({row:index+1,sourceItemId:meta.sourceItemId,errors:e});
}
console.log(JSON.stringify({gate:"PHYS26_OFFLINE_QUESTION_BATCH",items:batch.items.length,accepted:batch.items.length-errors.length,quarantined:errors.length,errors:errors.slice(0,50)}));
if(errors.length)process.exitCode=1;
