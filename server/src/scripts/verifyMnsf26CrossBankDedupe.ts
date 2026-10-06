import fs from "fs";
import path from "path";

type ManifestRecord = {
  questionCode: string;
  status: string;
  duplicate?: {
    keep?: string;
    source?: string;
    reason?: string;
    similarity?: number;
  } | null;
};

type DedupeMatch = {
  decision: string;
  mnsfQuestionCode: string;
  existingQuestionCode: string;
  existingSource: string;
  similarity: number;
};

const root = path.resolve(process.cwd(), "../docs/content/mnsf26");
const manifest = JSON.parse(
  fs.readFileSync(path.join(root, "MNSF26_CONTENT_ENRICHMENT_V1.json"), "utf8"),
) as { records: ManifestRecord[] };
const dedupe = JSON.parse(
  fs.readFileSync(path.join(root, "MNSF26_CROSS_BANK_DEDUPE_V1.json"), "utf8"),
) as {
  bank: string;
  productionComparedAgainst: string[];
  productionRowsScanned: number;
  matches: DedupeMatch[];
  highConfidenceMatches: number;
};

const failures: Array<{ gate: string; detail: unknown }> = [];
const suppressed = manifest.records.filter((r) =>
  r.status.startsWith("SUPPRESS_"),
);
const crossBank = manifest.records.filter(
  (r) => r.status === "SUPPRESS_CROSS_BANK_DUPLICATE",
);

if (dedupe.bank !== "MNSF26") {
  failures.push({ gate: "bank", detail: dedupe.bank });
}
if (
  dedupe.productionRowsScanned !== 1804 ||
  !dedupe.productionComparedAgainst.includes("FND26") ||
  !dedupe.productionComparedAgainst.includes("COL2627")
) {
  failures.push({
    gate: "baseline-scan-contract",
    detail: {
      productionRowsScanned: dedupe.productionRowsScanned,
      productionComparedAgainst: dedupe.productionComparedAgainst,
    },
  });
}
if (
  suppressed.length !== 5 ||
  crossBank.length !== 1 ||
  dedupe.matches.length !== 1 ||
  dedupe.highConfidenceMatches !== 1
) {
  failures.push({
    gate: "suppression-counts",
    detail: {
      allSuppressed: suppressed.length,
      crossBankManifest: crossBank.length,
      crossBankFile: dedupe.matches.length,
      highConfidenceMatches: dedupe.highConfidenceMatches,
    },
  });
}

const match = dedupe.matches[0];
const manifestCross = crossBank[0];
if (
  !match ||
  !manifestCross ||
  match.decision !== "SUPPRESS_CROSS_BANK_DUPLICATE" ||
  match.mnsfQuestionCode !== "QDR-QNT-MNSF26-P005-Q20" ||
  match.existingQuestionCode !== "QDR-QNT-COL2627-P037-Q28" ||
  match.existingSource !== "COL2627" ||
  match.similarity !== 1 ||
  manifestCross.questionCode !== match.mnsfQuestionCode ||
  manifestCross.duplicate?.keep !== match.existingQuestionCode ||
  manifestCross.duplicate?.source !== match.existingSource
) {
  failures.push({
    gate: "known-cross-bank-duplicate-contract",
    detail: { match, manifestCross },
  });
}

const report = {
  ok: failures.length === 0,
  counts: {
    suppressed: suppressed.length,
    crossBankManifest: crossBank.length,
    crossBankEvidence: dedupe.matches.length,
  },
  knownSuppression: match ?? null,
  failures,
};
console.log(JSON.stringify(report, null, 2));
if (!report.ok) process.exitCode = 1;
