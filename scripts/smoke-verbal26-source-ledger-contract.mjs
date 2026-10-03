import fs from "node:fs";
import assert from "node:assert/strict";

const ledgerPath = new URL("../server/data/verbal26_source_ledger.json", import.meta.url);
const ledger = JSON.parse(fs.readFileSync(ledgerPath, "utf8"));

assert.equal(ledger?.schemaVersion, 1, "ledger schemaVersion must remain 1");
assert.equal(ledger?.canonicalTaxonomy?.mainSkills, 22, "VERBAL26 must use 22 main skills");
assert.equal(ledger?.canonicalTaxonomy?.subSkills, 76, "VERBAL26 must use 76 subskills");
assert.equal(ledger?.sourcePolicy?.recoveryRawIsAuthoritative, false, "recovery raw text must never be authoritative");

const inventory = Array.isArray(ledger?.sourceInventory) ? ledger.sourceInventory : [];
assert.equal(inventory.length, 2, "exactly two approved source books are expected");
assert.deepEqual(
  new Set(inventory.map((x) => x.documentCode)),
  new Set(["VERBAL26-ANAS", "VERBAL26-AMER"]),
  "source inventory must contain only Anas and Amer",
);

const anas = inventory.find((x) => x.documentCode === "VERBAL26-ANAS");
const amer = inventory.find((x) => x.documentCode === "VERBAL26-AMER");
assert.equal(anas?.pdfPages, 43, "Anas source page count changed");
assert.equal(amer?.pdfPages, 98, "Amer source page count changed");

const batches = Array.isArray(ledger?.batches) ? ledger.batches : [];
const conflict = batches.filter((b) => String(b?.status || "").includes("CONFLICT"));
const conflictRecords = conflict.flatMap((b) => b.records || []);
assert.equal(
  conflictRecords.length,
  Number(ledger?.metrics?.anasConflictQuestions || 0),
  "conflict metric must match quarantined records",
);
for (const row of conflictRecords) {
  assert.match(String(row?.status || ""), /CONFLICT/, "conflict rows must remain quarantined");
  assert.equal(row?.answerLetter, undefined, "conflict rows must not expose an approved answerLetter");
}

const verified = batches
  .filter((b) => !String(b?.status || "").includes("CONFLICT"))
  .flatMap((b) => b.records || [])
  .filter((r) => {
    const status = String(r?.status || "");
    return status.includes("SOURCE_KEY_VERIFIED") || /APPROVED_.*SOURCE_KEY/.test(status);
  });
assert.equal(
  verified.length,
  Number(ledger?.metrics?.sourceKeyVerifiedRecords || 0),
  "source-key verified metric must match ledger rows",
);

const amerPlan = Array.isArray(amer?.trainingPlan) ? amer.trainingPlan : [];
assert.equal(amerPlan.length, 33, "Amer table-of-contents inventory must retain trainings 1-33");
assert.deepEqual(
  amerPlan.map((x) => x.training),
  Array.from({ length: 33 }, (_, i) => i + 1),
  "Amer training plan must be continuous 1-33",
);

const amerBatches = Array.isArray(ledger?.amerBatches) ? ledger.amerBatches : [];
const amerObserved = ledger?.metrics?.amerObservedQuestionCounts || {};
for (const batch of amerBatches) {
  const key = String(batch.training);
  assert.equal(
    Number(amerObserved[key]),
    Number(batch.observedQuestionCount),
    `Amer training ${key} metric must match source-verified batch count`,
  );
  assert.match(
    String(batch.status || ""),
    /QA_PENDING/,
    `Amer training ${key} must remain pending until a source-backed answer key is verified`,
  );
}
const approvedBankPath = new URL("../server/data/verbal_approved_bank_v2.json", import.meta.url);
const approvedBank = fs.existsSync(approvedBankPath)
  ? JSON.parse(fs.readFileSync(approvedBankPath, "utf8"))
  : [];
const approvedAmer = Array.isArray(approvedBank) ? approvedBank.filter((q) => q?.sourceBook === "abdelbaset").length : 0;
assert.equal(
  Number(ledger?.metrics?.amerApprovedRecords || 0),
  approvedAmer,
  "Amer approved metric must match canonical records that passed source-text plus trusted answer adjudication",
);
assert.equal(ledger?.metrics?.amerDerivedReportIsAuthority, false, "derived 938 report must not be authoritative");
assert.equal(
  Number(ledger?.metrics?.approvedBankRecords || 0),
  Array.isArray(approvedBank) ? approvedBank.length : 0,
  "approved-bank metric must match the canonical approved-bank file",
);

console.log(JSON.stringify({
  status: "PASS",
  taxonomy: "22/76",
  sources: inventory.map((x) => x.documentCode),
  anas: {
    observed: ledger?.metrics?.anasObservedQuestions,
    keyVerified: ledger?.metrics?.anasKeyVerifiedQuestions,
    conflict: ledger?.metrics?.anasConflictQuestions,
  },
  amer: {
    trainingsIndexed: amerPlan.length,
    observedCounts: ledger?.metrics?.amerObservedQuestionCounts || {},
  },
}, null, 2));
