#!/usr/bin/env node
// MNSF26 QUESTION_MASTERING accounting-only audit. Never changes content or stage gates.
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const folder = path.join(root, "docs/content/mnsf26");
const reportPath = process.argv.find((x) => x.startsWith("--out="))?.slice(6);
const strict = process.argv.includes("--strict");
const read = (name) => JSON.parse(fs.readFileSync(path.join(folder, name), "utf8"));
const normalize = (value) => {
  if (typeof value !== "string") return null;
  const match = /^MNSF26-(AR|GEO)-T0*(\d+)-Q0*(\d+)$/i.exec(value.trim());
  if (!match) return null;
  return "MNSF26-" + match[1].toUpperCase() + "-T" + String(Number(match[2])).padStart(3, "0") +
    "-Q" + String(Number(match[3])).padStart(2, "0");
};
const digest = (v) => typeof v === "string" && /^[a-f0-9]{64}$/i.test(v);
const hasText = (v) => typeof v === "string" && v.trim().length > 0;
const statusOf = (r) => {
  const s = String(r.status || "").toUpperCase();
  if (s === "MASTERED") return "MASTERED";
  if (s.includes("HOLD") || s.includes("REVIEW") || s.includes("QUARANTINE")) return "HOLD";
  if (s.includes("SUPPRESS")) return "SUPPRESSED";
  return "UNKNOWN";
};
const required = ["sourceProvenance", "canonicalMainSkill", "canonicalSubskill", "correctAnswer",
  "stepByStepSolution", "educationalExplanation", "difficulty", "difficultyReason",
  "imageHash", "contentFingerprint", "ideaFingerprint"];
const expectedGeo = new Set(read("MNSF26_GEOMETRY_QUESTION_WORK_QUEUE_V1.json").records.map((r) => normalize(r.sourceId)));
const state = read("MNSF26_EXECUTION_STATE_V1.json");
const files = fs.readdirSync(folder).filter((n) => /^MNSF26_QUESTION_MASTERING_.*\.json$/.test(n)).sort();
const sourceMap = new Map();
const malformed = [];
const ignoredLegacySummary = [];
let rawRecords = 0;
for (const file of files) {
  let data;
  try { data = read(file); } catch (e) { malformed.push({ file, error: "JSON_PARSE: " + e.message }); continue; }
  if (!Array.isArray(data.records)) {
    ignoredLegacySummary.push({ file, reason: "No records array; summary/ID-only evidence is not a master payload" });
    continue;
  }
  for (const rec of data.records) {
    rawRecords++;
    const key = normalize(rec.sourceKey || rec.id || rec.questionCode);
    if (!key) {
      malformed.push({ file, sourceKey: rec.sourceKey || rec.id || null, error: "UNRECOGNIZED_SOURCE_KEY" });
      continue;
    }
    const entry = { file, status: statusOf(rec), imageHash: rec.imageHash || null,
      answer: rec.correctAnswer ?? null, main: rec.canonicalMainSkill ?? null,
      sub: rec.canonicalSubskill ?? null, record: rec };
    if (!sourceMap.has(key)) sourceMap.set(key, []);
    sourceMap.get(key).push(entry);
  }
}
const duplicates = [];
const conflicts = [];
const missingFields = [];
const invalidTaxonomy = [];
const noImageEvidence = [];
const statusCounts = { MASTERED: 0, HOLD: 0, SUPPRESSED: 0, UNKNOWN: 0, CONFLICT: 0 };
const mainRegex = /^(?:main_quant|skill_quant)_(\d{1,2})$/;
const subRegex = /^sub_quant_(\d{1,2})_(\d{1,2})$/;
for (const [key, versions] of sourceMap) {
  if (versions.length > 1) {
    duplicates.push({ sourceKey: key, occurrences: versions.length, files: versions.map((v) => v.file) });
  }
  const statuses = [...new Set(versions.map((v) => v.status))];
  const hashes = [...new Set(versions.map((v) => v.imageHash).filter(Boolean))];
  const answers = [...new Set(versions.filter((v) => v.status === "MASTERED").map((v) => JSON.stringify(v.answer)))];
  const subskills = [...new Set(versions.filter((v) => v.status === "MASTERED").map((v) => String(v.sub)))];
  if (statuses.length > 1 || hashes.length > 1 || answers.length > 1 || subskills.length > 1) {
    conflicts.push({ sourceKey: key, statuses, hashes, answers, subskills, files: versions.map((v) => v.file) });
    statusCounts.CONFLICT++;
    continue;
  }
  const status = statuses[0];
  statusCounts[status] = (statusCounts[status] || 0) + 1;
  const best = versions.find((v) => v.status === "MASTERED" && required.every((field) => v.record[field] !== undefined && v.record[field] !== null)) || versions[0];
  const rec = best.record;
  if (status === "MASTERED") {
    const missing = required.filter((field) => {
      const val = rec[field];
      if (field === "sourceProvenance") return !val || typeof val !== "object" || !Object.keys(val).length;
      return !hasText(val);
    });
    if (!["Easy", "Medium", "Hard"].includes(rec.difficulty)) missing.push("difficultyEnum");
    for (const field of ["imageHash", "contentFingerprint", "ideaFingerprint"]) {
      if (!digest(rec[field])) missing.push(field + "SHA256");
    }
    if (missing.length) missingFields.push({ sourceKey: key, file: best.file, missing });
    const m = mainRegex.exec(String(rec.canonicalMainSkill || ""));
    const s = subRegex.exec(String(rec.canonicalSubskill || ""));
    if (!m || !s || Number(m[1]) < 1 || Number(m[1]) > 25 ||
        Number(s[1]) !== Number(m[1]) || Number(s[2]) < 1) {
      invalidTaxonomy.push({ sourceKey: key, main: rec.canonicalMainSkill, sub: rec.canonicalSubskill });
    }
  } else if (status === "HOLD") {
    if (!hasText(rec.holdReason) && !hasText(rec.reviewReason) &&
        !hasText(rec.difficultyReason) && !hasText(rec.educationalExplanation)) {
      missingFields.push({ sourceKey: key, file: best.file, missing: ["holdReason/reviewReason"] });
    }
  }
  if (!digest(rec.imageHash)) noImageEvidence.push(key);
}
const observedGeo = new Set([...sourceMap.keys()].filter((k) => k.includes("-GEO-")));
const observedAr = new Set([...sourceMap.keys()].filter((k) => k.includes("-AR-")));
const missingGeometry = [...expectedGeo].filter((k) => !sourceMap.has(k)).sort();
const unexpectedGeometry = [...observedGeo].filter((k) => !expectedGeo.has(k)).sort();
const official = {
  mastered: state.activeStage?.masteredComplete ?? null,
  holdReview: state.stages?.find((s) => s.name === "mapping")?.reviewHold ?? null,
  crops: state.totals?.crops ?? null
};
const sourceKeyTotal = sourceMap.size;
const accounted = statusCounts.MASTERED + statusCounts.HOLD + statusCounts.SUPPRESSED;
const gateReady = malformed.length === 0 && conflicts.length === 0 && missingFields.length === 0 &&
  invalidTaxonomy.length === 0 && missingGeometry.length === 0 && unexpectedGeometry.length === 0 &&
  sourceKeyTotal === official.crops && accounted === official.crops;
const report = {
  schemaVersion: 1, bank: "MNSF26", audit: "QUESTION_MASTERING_SOURCEKEY_ACCOUNTING_ONLY",
  stageLockGranted: false, gateReadyForIndependentReview: gateReady,
  source: { masterFiles: files.length, rawRecords, uniqueSourceKeys: sourceKeyTotal,
    arithmeticUnique: observedAr.size, geometryUnique: observedGeo.size, geometryExpected: expectedGeo.size,
    duplicateSourceKeys: duplicates.length, duplicateExcess: rawRecords - sourceKeyTotal - malformed.length },
  statusCounts, official, deltaVsOfficial: {
    mastered: statusCounts.MASTERED - official.mastered,
    holdReview: statusCounts.HOLD - official.holdReview,
    sourceKeyCoverage: sourceKeyTotal - official.crops
  },
  missingGeometry, unexpectedGeometry, missingArithmeticCountVsCropTotal: 1204 - observedAr.size,
  malformed, ignoredLegacySummary, conflicts, missingFields, invalidTaxonomy, noImageEvidence,
  duplicates, preservedExceptions: {
    arithmeticTest33: "SOURCE_ABSENT_UNRESOLVED",
    geometryT24Q18: "SOURCE_ABSENT",
    legacy130: "DO_NOT_REMASTER",
    suppressions: "REQUIRE_SEPARATE_FIVE_KEY_INVENTORY"
  },
  next: "Resolve conflicts/missing keys against Run017 and Run021 source crop manifests, not by adding counters. QA_LOCK remains blocked."
};
const json = JSON.stringify(report, null, 2) + "\n";
if (reportPath) {
  fs.mkdirSync(path.dirname(path.resolve(reportPath)), { recursive: true });
  fs.writeFileSync(reportPath, json);
}
console.log(JSON.stringify({
  gateReady, files: files.length, rawRecords, uniqueSourceKeys: sourceKeyTotal,
  statuses: statusCounts, official, missingGeometry: missingGeometry.length,
  malformed: malformed.length, conflicts: conflicts.length, missingFields: missingFields.length,
  invalidTaxonomy: invalidTaxonomy.length, duplicateSourceKeys: duplicates.length
}, null, 2));
if (strict && !gateReady) process.exitCode = 1;
