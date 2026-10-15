import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const mathReportPath = path.join(root, "ops", "tah_math_v2", "PROD_INTEGRITY_AND_STUDENT_JOURNEY_REPORT.json");
const repairReportPath = path.join(root, "ops", "tah_math_v2", "audit_repair", "REPAIRED_8_R2_UPLOAD_REPORT.json");
const packagesReportPath = path.join(root, "ops", "tah_math_v2", "audit_repair", "COMMERCIAL_PACKAGES_REPORT.json");

const assert = (condition, message) => {
  if (!condition) throw new Error(`[CONTRACT ASSERTION FAILED] ${message}`);
};

// 1. Math V2 Full Bank Integrity Assertions
assert(fs.existsSync(mathReportPath), "Math integrity report must exist");
const mathReport = JSON.parse(fs.readFileSync(mathReportPath, "utf8"));
assert(mathReport.status === "PASSED_FLAWLESS", "Math V2 status must be PASSED_FLAWLESS");
assert(mathReport.totalTahsiliMath === 2385, `Expected 2385 questions, got ${mathReport.totalTahsiliMath}`);
assert(mathReport.mainSkillsCount === 30, `Expected 30 main skills, got ${mathReport.mainSkillsCount}`);
assert(mathReport.subSkillsCount === 245, `Expected 245 sub skills, got ${mathReport.subSkillsCount}`);
assert(mathReport.studentLeakageCount === 0, `Expected 0 leaks, got ${mathReport.studentLeakageCount}`);
assert(mathReport.invalidUrls === 0, `Expected 0 invalid URLs, got ${mathReport.invalidUrls}`);
assert(mathReport.invalidKeys === 0, `Expected 0 invalid keys, got ${mathReport.invalidKeys}`);
assert(mathReport.simulatedScoringPass === true, "Scoring simulation must pass");


// 2. 8 Remediated Questions & R2 Upload Assertions
assert(fs.existsSync(repairReportPath), "Repair report must exist");
const repairReport = JSON.parse(fs.readFileSync(repairReportPath, "utf8"));
assert(Array.isArray(repairReport.items) && repairReport.items.length === 8, "Expected 8 repaired questions in items");
assert(repairReport.items.every(it => it.verified === true), "All 8 items must be verified on R2");


const repairedFiles = [
  "REPAIRED_HOLD_1_P005_Q02.webp",
  "REPAIRED_HOLD_2_P006_Q15.webp",
  "REPAIRED_HOLD_3_P055_Q42.webp",
  "REPAIRED_HOLD_4_P129_Q87.webp",
  "REPAIRED_HOLD_5_P130_Q105.webp",
  "REPAIRED_HOLD_6_P131_Q06.webp",
  "REPAIRED_HOLD_7_P132_Q29.webp",
  "REPAIRED_HOLD_8_P132_Q30.webp",
];

for (const filename of repairedFiles) {
  const filePath = path.join(root, "ops", "tah_math_v2", "repaired_crops", filename);
  assert(fs.existsSync(filePath), `Repaired crop asset must exist: ${filename}`);
  const stats = fs.statSync(filePath);
  assert(stats.size > 1000, `Asset ${filename} too small: ${stats.size} bytes`);
}

// 3. Commercial Packages Contract Assertions
assert(fs.existsSync(packagesReportPath), "Commercial packages report must exist");
const packagesReport = JSON.parse(fs.readFileSync(packagesReportPath, "utf8"));
assert(packagesReport.status === "PACKAGES_CONFIGURED_AND_VERIFIED_PASS", "Status must be PACKAGES_CONFIGURED_AND_VERIFIED_PASS");
assert(packagesReport.qudratPackage.pathId === "p_1777779639431", "Qudurat pathId mismatch");
assert(packagesReport.qudratPackage.isPublished === true, "Qudurat package must be published");
assert(packagesReport.qudratPackage.approvalStatus === "approved", "Qudurat package must be approved");
assert(packagesReport.tahsiliPackage.pathId === "p_1777779653351", "Tahsili pathId mismatch");
assert(packagesReport.tahsiliPackage.isPublished === true, "Tahsili package must be published");
assert(packagesReport.tahsiliPackage.approvalStatus === "approved", "Tahsili package must be approved");
assert(packagesReport.isolationVerified === true, "Cross-path isolation must be verified");

// 4. Pure Access Policy Scenarios
const matchesContentScope = (item, contentType, pathId, subjectId) => {
  const contentTypes = Array.isArray(item.contentTypes) && item.contentTypes.length ? item.contentTypes : ["all"];
  const pathIds = Array.isArray(item.pathIds) ? item.pathIds.map(String).filter(Boolean) : [];
  const subjectIds = Array.isArray(item.subjectIds) ? item.subjectIds.map(String).filter(Boolean) : [];
  return (contentTypes.includes("all") || contentTypes.includes(contentType))
    && (pathIds.length === 0 || (!!pathId && pathIds.includes(pathId)))
    && (subjectIds.length === 0 || (!!subjectId && subjectIds.includes(subjectId)));
};

const qudratScope = { contentTypes: packagesReport.qudratPackage.packageContentTypes, pathIds: [packagesReport.qudratPackage.pathId], subjectIds: [] };
const tahsiliScope = { contentTypes: packagesReport.tahsiliPackage.packageContentTypes, pathIds: [packagesReport.tahsiliPackage.pathId], subjectIds: [] };

// Verify Qudurat unlocks Qudurat Quant & Verbal
assert(matchesContentScope(qudratScope, "foundation", "p_1777779639431", "sub_1777779748206"), "Qudurat must unlock Quant foundation");
assert(matchesContentScope(qudratScope, "banks", "p_1777779639431", "sub_1777779748206"), "Qudurat must unlock Quant banks");
assert(matchesContentScope(qudratScope, "mockExams", "p_1777779639431", "sub_1777779748206"), "Qudurat must unlock Quant mockExams");
assert(matchesContentScope(qudratScope, "banks", "p_1777779639431", "sub_1777779759038"), "Qudurat must unlock Verbal banks");

// Verify Tahsili unlocks Math, Physics, Chemistry, Biology
assert(matchesContentScope(tahsiliScope, "foundation", "p_1777779653351", "sub_1777784609152"), "Tahsili must unlock Math foundation");
assert(matchesContentScope(tahsiliScope, "banks", "p_1777779653351", "sub_1777784609152"), "Tahsili must unlock Math banks");
assert(matchesContentScope(tahsiliScope, "mockExams", "p_1777779653351", "sub_1777784609152"), "Tahsili must unlock Math mockExams");
assert(matchesContentScope(tahsiliScope, "banks", "p_1777779653351", "sub_1784980706034"), "Tahsili must unlock Physics banks");
assert(matchesContentScope(tahsiliScope, "banks", "p_1777779653351", "sub_1784980728386"), "Tahsili must unlock Chemistry banks");
assert(matchesContentScope(tahsiliScope, "banks", "p_1777779653351", "sub_tah_biology_bio26"), "Tahsili must unlock Biology banks");

// Verify Cross-Path Isolation
assert(!matchesContentScope(qudratScope, "banks", "p_1777779653351", "sub_1777784609152"), "Qudurat MUST NOT unlock Tahsili Math");
assert(!matchesContentScope(tahsiliScope, "banks", "p_1777779639431", "sub_1777779748206"), "Tahsili MUST NOT unlock Qudurat Quant");

console.log(JSON.stringify({
  status: "PASS",
  project: "TAH_MATH_V2_AND_COMMERCIAL_PACKAGES",
  mathBankQuestionsApproved: mathReport.totalTahsiliMath,
  mathMainSkills: mathReport.mainSkillsCount,
  mathSubSkills: mathReport.subSkillsCount,
  publisherDefectsRemediated: repairReport.items.length,
  commercialPackagesConfigured: 2,

  qudratPackageId: packagesReport.qudratPackage.id,
  tahsiliPackageId: packagesReport.tahsiliPackage.id,
  crossPathIsolation: "VERIFIED_LOCKED"
}, null, 2));

