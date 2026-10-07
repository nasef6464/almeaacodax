import fs from "fs";
import path from "path";

const root = path.resolve(process.cwd(), "../docs/content/mnsf26");
const coverage = JSON.parse(fs.readFileSync(path.join(root, "MNSF26_GEOMETRY_FULLBOOK_VISIBLE_COVERAGE_V1.json"), "utf8")) as {
  bank: string;
  sourcePart: string;
  pages: number;
  tests: Array<{ testNumber:number; lessonNumber:number; lessonName:string; startPdfPage:number; endPdfPage:number; observedQuestionNumbers:number[]; maxObservedQuestionNumber:number; missingWithinObservedRange:number[] }>;
  summary: { tests:number; lessons:number; pagesCovered:number; testsWithInternalNumberGaps:number[]; visualRepair?: { recoveredGapTests:number[]; sourceAbsentFailClosedTests:number[]; remainingUnresolvedVisualGaps:number[] } };
};
const index = JSON.parse(fs.readFileSync(path.join(root, "MNSF26_GEOMETRY_SOURCE_INDEX_V1.json"), "utf8")) as {
  tests: Array<{ testNumber:number; lessonNumber:number; lessonName:string; startPdfPage:number|null }>;
};
const failures:Array<{gate:string;detail:unknown}>=[];
if (coverage.bank!=="MNSF26" || coverage.sourcePart!=="الهندسة" || coverage.pages!==97) failures.push({gate:"identity",detail:{bank:coverage.bank,sourcePart:coverage.sourcePart,pages:coverage.pages}});
if (coverage.tests.length!==50 || coverage.summary.tests!==50 || coverage.summary.lessons!==11 || coverage.summary.pagesCovered!==97) failures.push({gate:"fullbook-structure",detail:coverage.summary});
const byTest=new Map(coverage.tests.map(t=>[t.testNumber,t]));
for(let i=0;i<index.tests.length;i++){
 const src=index.tests[i], got=byTest.get(src.testNumber), expectedEnd=(index.tests[i+1]?.startPdfPage ?? 98)-1;
 if(!got || got.lessonNumber!==src.lessonNumber || got.lessonName!==src.lessonName || got.startPdfPage!==src.startPdfPage || got.endPdfPage!==expectedEnd) failures.push({gate:"source-index-parity",detail:{testNumber:src.testNumber,expected:{lessonNumber:src.lessonNumber,lessonName:src.lessonName,startPdfPage:src.startPdfPage,endPdfPage:expectedEnd},actual:got}});
 if(got && (!got.observedQuestionNumbers.length || got.maxObservedQuestionNumber<1 || got.maxObservedQuestionNumber>20)) failures.push({gate:"visible-question-evidence",detail:{testNumber:src.testNumber,observed:got.observedQuestionNumbers}});
}
const declared=coverage.tests.filter(t=>t.missingWithinObservedRange.length).map(t=>t.testNumber).sort((a,b)=>a-b);
const summary=coverage.summary.testsWithInternalNumberGaps.slice().sort((a,b)=>a-b);
if(JSON.stringify(declared)!==JSON.stringify(summary)) failures.push({gate:"gap-summary-parity",detail:{declared,summary}});
const visualRepair=coverage.summary.visualRepair;
if(!visualRepair || JSON.stringify(visualRepair.recoveredGapTests)!==JSON.stringify([6,25,31,43]) || JSON.stringify(visualRepair.sourceAbsentFailClosedTests)!==JSON.stringify([24]) || visualRepair.remainingUnresolvedVisualGaps.length!==0) failures.push({gate:"visual-gap-repair-contract",detail:visualRepair});
const t24=byTest.get(24);
if(!t24 || JSON.stringify(t24.missingWithinObservedRange)!==JSON.stringify([18])) failures.push({gate:"source-absent-fail-closed",detail:t24});
console.log(JSON.stringify({ok:failures.length===0,counts:{tests:coverage.tests.length,lessons:coverage.summary.lessons,pages:coverage.summary.pagesCovered,internalGapTests:summary},failures},null,2));
if(failures.length) process.exitCode=1;
