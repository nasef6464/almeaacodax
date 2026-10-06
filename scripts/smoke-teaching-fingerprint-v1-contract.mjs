import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";

const root = process.cwd();
const read = (relativePath) =>
  fs.readFileSync(path.join(root, relativePath), "utf8").replace(/\r\n/g, "\n");

const validator = read("server/src/scripts/validateTeachingFingerprintV1.ts");
const docs = read("docs/architecture/TEACHING_FINGERPRINT_V1_AR.md");

const checks = [];
const check = (name, assertion) => {
  try {
    assertion();
    checks.push({ name, status: "PASS" });
  } catch (error) {
    checks.push({ name, status: "FAIL", details: error instanceof Error ? error.message : String(error) });
  }
};

const includes = (source, fragment) => {
  assert.ok(source.includes(fragment), `Missing fragment: ${fragment}`);
};

check("fingerprint contract is exactly 95 canonical subskills", () => {
  includes(validator, "EXPECTED_MAIN_COUNT = 25");
  includes(validator, "EXPECTED_SUBSKILL_COUNT = 95");
  includes(validator, 'contract: "TEACHING_FINGERPRINT_V1"');
});

check("fingerprint schema uses the actual 16-field contract", () => {
  for (const field of [
    "mainSkillId",
    "subSkillId",
    "subSkillName",
    "conceptSummary",
    "coreLawOrIdea",
    "standardMethod",
    "quduratFastMethod",
    "mentalMathMethod",
    "eliminationMethod",
    "optionTestingMethod",
    "commonMistakes",
    "hintStyle1",
    "hintStyle2",
    "explanationStyle",
    "speechStyle",
    "representativePatterns",
  ]) includes(validator, field);
  includes(validator, "schemaFieldCount: 16");
  includes(docs, "16 حقلاً");
});

check("unsupported methods are nullable but not fabricated", () => {
  includes(validator, "nullableMethodSchema");
  includes(validator, "z.null()");
});

check("validator is taxonomy-bound and read-only", () => {
  includes(validator, 'db.collection("skills").find({');
  includes(validator, "canonicalSubskills");
  assert.ok(!/insertOne|insertMany|updateOne|updateMany|deleteOne|deleteMany|bulkWrite/.test(validator));
});

check("validator rejects missing, duplicate and mis-parented subskills", () => {
  includes(validator, "Duplicate subSkillId");
  includes(validator, "Missing canonical subskill");
  includes(validator, "belongs to");
  includes(validator, "subSkillName mismatch");
});

const failed = checks.filter((item) => item.status === "FAIL");
console.log(JSON.stringify({
  phase: "teaching-fingerprint-v1-contract",
  status: failed.length ? "FAIL" : "PASS",
  total: checks.length,
  passed: checks.length - failed.length,
  failed: failed.length,
  checks,
}, null, 2));

if (failed.length) process.exit(1);
