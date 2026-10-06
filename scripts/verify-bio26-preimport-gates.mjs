#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const readJson = (p) => JSON.parse(fs.readFileSync(path.join(ROOT,p),"utf8"));
const qa = readJson("ops/bio26/BIO26_FINAL_QA.json");
const author = readJson("ops/bio26/BIO26_AI_AUTHORING_QA.json");
const imp = readJson("ops/bio26/BIO26_IMPORT_MANIFEST.json");
const r2 = readJson("ops/bio26/BIO26_R2_UPLOAD_MANIFEST_V2.json");

const failures = [];
const expect = (ok, msg) => { if (!ok) failures.push(msg); };
expect(qa.counts?.canonicalQuestions === 2832, "canonicalQuestions must equal 2832");
expect(qa.gates?.crop?.startsWith("PASS"), "crop gate must PASS");
expect(qa.gates?.dedupe?.startsWith("PASS"), "dedupe gate must PASS");
expect(author.expectedCanonicalItems === 2832, "AI expectedCanonicalItems must equal 2832");
expect(author.authoredCanonicalItems === 2832, `AI context incomplete: ${author.authoredCanonicalItems}/2832`);
expect(author.pendingCanonicalItems === 0, `AI pending must be 0, got ${author.pendingCanonicalItems}`);
expect(author.aggregateQa?.sourceAnswerCrossCheck === "PASS_2832_OF_2832", "AI source-answer QA must PASS 2832/2832");
expect(author.aggregateQa?.skillRangeCrossCheck === "PASS_2832_OF_2832", "AI skill-range QA must PASS 2832/2832");
expect(author.aggregateQa?.requiredFields === "PASS_2832_OF_2832", "AI required-fields QA must PASS 2832/2832");
expect(author.aggregateQa?.duplicateQuestionCodes === 0, "AI duplicateQuestionCodes must be 0");
expect(r2.canonicalImages === 2832 && r2.uniqueQuestionCodes === 2832 && r2.uniqueHashes === 2832, "R2 manifest cardinality/hash uniqueness must be 2832");
expect(/VERIFIED|PASS/i.test(String(r2.upload ?? r2.status)) && !/PENDING|READY_FOR_PRESIGN/i.test(String(r2.upload ?? r2.status)), "R2 upload must be remotely VERIFIED, not merely staged");
expect(imp.finalCanonicalCount === 2832, "import canonical count must equal 2832");

const report = {
  project: "BIO26",
  gate: "PREIMPORT_FAIL_CLOSED",
  pass: failures.length === 0,
  canonicalQuestions: qa.counts?.canonicalQuestions,
  aiAuthored: author.authoredCanonicalItems,
  aiPending: author.pendingCanonicalItems,
  r2State: r2.upload ?? r2.status,
  failures
};
console.log(JSON.stringify(report,null,2));
if (failures.length) process.exit(1);
