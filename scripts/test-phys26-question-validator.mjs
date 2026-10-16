#!/usr/bin/env node
// PHYS26 offline validator behavior regressions. Synthetic data only; never copies textbook content.
import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import path from "node:path";
import {createHash} from "node:crypto";
const fixture=mkdtempSync(path.join(tmpdir(),"phys26-validator-"));
const imageFolder=path.join(fixture,"images");mkdirSync(imageFolder);
const bytes=Buffer.from("UklGRiYAAABXRUJQVlA4IBoAAAAwAQCdASoCAAIAAMASJaQAA3AA/v7deAAAAA==","base64");
const sha=b=>createHash("sha256").update(b).digest("hex");
const src=JSON.parse((await import("node:fs")).readFileSync("ops/phys26/PHYS26_SOURCE_INVENTORY.json","utf8"));
const sourceSha256=src.sources.find(x=>x.role==="question_bank").sha256;
const notes="synthetic testcase fixture, no source rights assumed";
const mkItem=()=>({
 questionCode:"TAH-PHYS-PHYS26-TEST-01",subjectId:src.productionBaseline.subjectId,pathId:src.productionBaseline.pathId,
 skillId:"PHYS26-M01",subSkillId:"PHYS26-S01-01",skillIds:["PHYS26-M01","PHYS26-S01-01"],
 questionText:"Synthetic PHYS26 sample question with four options.",
 options:["Option example alpha","Option example beta","Option example gamma","Option example delta"],
 correctOptionIndex:1,
 sourceMeta:{documentCode:"PHYS26",pdfPageIndex:5,sourceSection:1,collectionLessonNumber:1,printedQuestionNumber:1,sourceItemId:"PHYS26-PDF005-L01-S1-Q01",imageHash:sha(bytes)},
 aiContext:{optionTexts:["Option example alpha","Option example beta","Option example gamma","Option example delta"],optionTextsSource:"SOURCE_PDF",optionTextsVerified:true,readableText:"Synthetic PHYS26 sample readable question"},
 answerEvidence:{verified:true,method:"SOURCE_KEY",pdfPageIndex:5,sourceKeyOptionLabel:"B",reviewerNotes:notes},
 visualQA:{verified:true,oneQuestionOnly:true,optionsVisible:true,notCutOff:true,reviewerNotes:notes},
 physicsQA:{unitsAndExponentsVerified:true,diagramsAndDirectionsVerified:true},reviewStatus:"APPROVED",reviewerNotes:notes,
 imageFileName:"sample.webp"
});
const run=(name,build,expectPass,expectedReason)=>{
 const q=mkItem();build?.(q);
 const file=path.join(fixture,name+".json");
 writeFileSync(file,JSON.stringify({project:"PHYS26",sourceSha256,items:[q]}));
 const r=spawnSync(process.execPath,["scripts/verify-phys26-question-batch.mjs",file],{encoding:"utf8"});
 const out=(r.stdout||"")+(r.stderr||"");
 assert.equal(r.status===0,expectPass,name+" unexpected result: "+out);
 if(expectedReason)assert.ok(out.includes(expectedReason),name+" missing error reason "+expectedReason+": "+out);
 console.log("PHYS26_TEST",name,expectPass?"ACCEPTED":"REJECTED_AS_EXPECTED");
};
try{
 writeFileSync(path.join(imageFolder,"sample.webp"),bytes);
 run("valid-synthetic",null,true);
 run("answer-key-disagrees",q=>{q.answerEvidence.sourceKeyOptionLabel="C"},false,"source key conflicts");
 run("answer-evidence-outside-chapter",q=>{q.answerEvidence.pdfPageIndex=130},false,"answer evidence page outside lesson");
 run("question-page-outside-chapter",q=>{q.sourceMeta.pdfPageIndex=130;q.sourceMeta.sourceItemId="PHYS26-PDF130-L01-S1-Q01"},false,"page outside lesson bounds");
 run("duplicate-options",q=>{q.options[3]=q.options[2];q.aiContext.optionTexts=[...q.options]},false,"duplicate option text");
 writeFileSync(path.join(imageFolder,"sample.webp"),Buffer.from("RIFF\u0000\u0000\u0000\u0000WEBPnot-a-webp"));
 run("invalid-webp-header",q=>{q.sourceMeta.imageHash=sha(Buffer.from("RIFF\u0000\u0000\u0000\u0000WEBPnot-a-webp"))},false,"not a complete WebP");
}finally{rmSync(fixture,{recursive:true,force:true});}
console.log("PHYS26_VALIDATOR_BEHAVIOR_TESTS_PASS: 1 accepted + 5 rejected");
