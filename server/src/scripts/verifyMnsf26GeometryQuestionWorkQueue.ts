import fs from "fs";
import path from "path";

const root = path.resolve(process.cwd(), "../docs/content/mnsf26");
const queue = JSON.parse(fs.readFileSync(path.join(root, "MNSF26_GEOMETRY_QUESTION_WORK_QUEUE_V1.json"), "utf8"));
const coverage = JSON.parse(fs.readFileSync(path.join(root, "MNSF26_GEOMETRY_FULLBOOK_VISIBLE_COVERAGE_V1.json"), "utf8"));
const failures: Array<{gate:string;detail:unknown}> = [];
const expectedPolicy = "SOURCE_SKILL_FIRST_THEN_QUESTION_MATH_TO_CANONICAL_25_95";

if (queue.bank !== "MNSF26" || queue.sourcePart !== "الهندسة" || queue.pages !== 97) {
  failures.push({gate:"identity", detail:{bank:queue.bank, sourcePart:queue.sourcePart, pages:queue.pages}});
}
if (
  queue.constraints?.sourceLessonLabelFirst !== true ||
  queue.constraints?.canonicalMainSkills !== 25 ||
  queue.constraints?.canonicalSubSkills !== 95 ||
  queue.constraints?.newSkillsAllowed !== false ||
  queue.constraints?.hiddenXObjectOnlyQuestionAllowed !== false
) {
  failures.push({gate:"policy", detail:queue.constraints});
}

const expected: Array<{sourceId:string;testNumber:number;questionNumber:number;lessonNumber:number;sourceLessonLabel:string}> = [];
for (const test of coverage.tests) {
  for (const questionNumber of test.observedQuestionNumbers) {
    const sourceId = "MNSF26-GEO-T" + String(test.testNumber).padStart(3, "0") + "-Q" + String(questionNumber).padStart(2, "0");
    expected.push({sourceId, testNumber:test.testNumber, questionNumber, lessonNumber:test.lessonNumber, sourceLessonLabel:test.lessonName});
  }
}
if (
  expected.length !== 931 ||
  queue.records.length !== 931 ||
  queue.counts?.questions !== 931 ||
  queue.counts?.tests !== 50 ||
  queue.counts?.lessons !== 11 ||
  queue.counts?.pages !== 97
) {
  failures.push({gate:"counts", detail:{expected:expected.length, actual:queue.records.length, declared:queue.counts}});
}

const byId = new Map(queue.records.map((record:any) => [record.sourceId, record]));
const mismatches = expected.filter((item) => {
  const record:any = byId.get(item.sourceId);
  return !record ||
    record.testNumber !== item.testNumber ||
    record.questionNumber !== item.questionNumber ||
    record.lessonNumber !== item.lessonNumber ||
    record.sourceLessonLabel !== item.sourceLessonLabel ||
    record.mappingPolicy !== expectedPolicy;
});
if (mismatches.length) failures.push({gate:"coverage-parity", detail:mismatches});

const seen = new Set<string>();
const duplicateIds:string[] = [];
for (const record of queue.records) {
  if (seen.has(record.sourceId)) duplicateIds.push(record.sourceId);
  seen.add(record.sourceId);
}
if (duplicateIds.length) failures.push({gate:"source-id-uniqueness", detail:[...new Set(duplicateIds)]});
if (byId.has("MNSF26-GEO-T024-Q18")) failures.push({gate:"source-absent-not-materialized", detail:"MNSF26-GEO-T024-Q18"});

const premature = queue.records.filter((record:any) =>
  record.cropStatus !== "PENDING_EXACT_EMBEDDED_PIXEL_EXTRACTION" ||
  record.canonicalSkillId !== null ||
  record.canonicalSubSkillId !== null ||
  record.dedupeStatus !== "PENDING" ||
  record.imageSha256 !== null ||
  record.imageUrl !== null
);
if (premature.length) failures.push({gate:"fail-closed-pending-state", detail:premature.map((record:any) => record.sourceId)});

console.log(JSON.stringify({ok:failures.length===0, counts:{questions:queue.records.length, tests:queue.counts.tests, lessons:queue.counts.lessons, pages:queue.counts.pages}, failures}, null, 2));
if (failures.length) process.exitCode = 1;
