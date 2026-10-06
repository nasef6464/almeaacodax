import fs from "fs";
import path from "path";
import { QUANT_TAXONOMY } from "./deployQuantTaxonomy25.js";

type ManifestRecord = {
  questionCode: string;
  status: "CONTENT_READY_CROP_PENDING" | "HOLD_SOURCE" | "SUPPRESS_DUPLICATE";
  skillId: string | null;
  subSkillId: string | null;
  correct: string | null;
  difficulty: string | null;
  questionFingerprint: string | null;
  explanationFingerprint: string | null;
  speechText: string | null;
};

const manifestPath = path.resolve(
  process.cwd(),
  "docs/content/mnsf26/MNSF26_CONTENT_ENRICHMENT_V1.json",
);
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8")) as {
  bank: string;
  coverage: Record<string, number>;
  records: ManifestRecord[];
};

const mainIds = new Set(QUANT_TAXONOMY.map((item) => item.id));
const subIds = new Set(
  QUANT_TAXONOMY.flatMap((item) => item.subSkills.map((sub) => sub.id)),
);

const ready = manifest.records.filter(
  (record) => record.status === "CONTENT_READY_CROP_PENDING",
);
const holds = manifest.records.filter((record) => record.status === "HOLD_SOURCE");
const suppressed = manifest.records.filter(
  (record) => record.status === "SUPPRESS_DUPLICATE",
);

const failures: Array<{ gate: string; detail: unknown }> = [];

if (manifest.bank !== "MNSF26") {
  failures.push({ gate: "bank-code", detail: manifest.bank });
}
if (manifest.records.length !== 138) {
  failures.push({ gate: "record-count", detail: manifest.records.length });
}
if (ready.length !== 128 || holds.length !== 6 || suppressed.length !== 4) {
  failures.push({
    gate: "status-counts",
    detail: { ready: ready.length, holds: holds.length, suppressed: suppressed.length },
  });
}

const duplicateCodes = [...new Set(
  manifest.records
    .filter((record, index, all) =>
      all.findIndex((candidate) => candidate.questionCode === record.questionCode) !== index,
    )
    .map((record) => record.questionCode),
)];
if (duplicateCodes.length) {
  failures.push({ gate: "question-code-uniqueness", detail: duplicateCodes });
}

const incompleteReady = ready.filter(
  (record) =>
    !record.correct ||
    !record.difficulty ||
    !record.skillId ||
    !record.subSkillId ||
    !record.questionFingerprint ||
    !record.explanationFingerprint ||
    !record.speechText,
);
if (incompleteReady.length) {
  failures.push({
    gate: "ready-required-fields",
    detail: incompleteReady.map((record) => record.questionCode),
  });
}

const invalidTaxonomy = ready.filter(
  (record) =>
    !mainIds.has(String(record.skillId || "")) ||
    !subIds.has(String(record.subSkillId || "")),
);
if (invalidTaxonomy.length) {
  failures.push({
    gate: "ready-taxonomy-membership",
    detail: invalidTaxonomy.map((record) => ({
      questionCode: record.questionCode,
      skillId: record.skillId,
      subSkillId: record.subSkillId,
    })),
  });
}

const report = {
  ok: failures.length === 0,
  canonicalTaxonomy: { main: mainIds.size, sub: subIds.size },
  counts: {
    total: manifest.records.length,
    ready: ready.length,
    holds: holds.length,
    suppressed: suppressed.length,
  },
  failures,
};

console.log(JSON.stringify(report, null, 2));
if (!report.ok) process.exitCode = 1;
