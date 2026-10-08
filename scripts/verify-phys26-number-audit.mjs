#!/usr/bin/env node
// PHYS26 static source-number audit; this does not validate answers or touch production.
import assert from "node:assert/strict";
import fs from "node:fs";
const path="ops/phys26/PHYS26_SOURCE_NUMBER_AUDIT_2064.json";
const a=JSON.parse(fs.readFileSync(path,"utf8"));
assert.equal(a.project,"PHYS26");
assert.equal(a.status,"NUMBERED_SOURCE_INDEX_ONLY_NOT_QA_APPROVED");
assert.match(a.sourceSha256,/^[0-9a-f]{64}$/);
assert.equal(a.totalPdfPages,162);
assert.equal(a.lessons.length,31);
assert.equal(a.chapters,31);
assert.equal(a.actualSectionHeaders,61);
assert.equal(a.numberedQuestionOccurrences,2064);
assert.equal(a.firstSectionOccurrences+a.secondSectionOccurrences,a.numberedQuestionOccurrences);
assert.equal(a.footerAnswerKeyCandidateLabelsLocated,a.numberedQuestionOccurrences);
assert.equal(a.footerAnswerKeyUnmatchedNumberLabels,0);
assert.equal(a.footerAnswerKeyVerifiedCorrectAnswers,0);
assert.equal(a.verifiedAnswers,0);
assert.equal(a.verifiedQuestionContent,0);
assert.equal(a.approvedCrops,0);
assert.equal(a.safeToImport,false);
assert.equal(a.rightsToRepublish,"UNVERIFIED");
let total=0,expectedStart=5,secondSections=0;
for(const [i,row] of a.lessons.entries()){
  assert.equal(row.lesson,i+1);
  assert.equal(row.pageStart,expectedStart);
  assert.ok(row.pageEnd>=row.pageStart);
  assert.ok(Number.isInteger(row.numberedQuestionOccurrences)&&row.numberedQuestionOccurrences>=1);
  if(row.secondSectionPage!==null){
    assert.ok(row.secondSectionPage>=row.pageStart&&row.secondSectionPage<=row.pageEnd);
    secondSections++;
  }
  expectedStart=row.pageEnd+1;
  total+=row.numberedQuestionOccurrences;
}
assert.equal(expectedStart,162);
assert.equal(secondSections,30);
assert.equal(total,2064);
console.log(JSON.stringify({gate:"PHYS26_NUMBER_AUDIT_PASS",lessons:31,numberedOccurrences:total,answerKeyCandidates:a.footerAnswerKeyCandidateLabelsLocated,approvedAnswers:0,productionWrites:false}));
