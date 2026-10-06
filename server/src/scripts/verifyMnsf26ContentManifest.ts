import fs from "fs";
import path from "path";
import { QUANT_TAXONOMY } from "./deployQuantTaxonomy25.js";

type SourceClassification = {
  sourcePart: string;
  testNumber: number;
  testTitle: string;
  sourceSkillLabel: string | null;
  evidence: string;
  mappingPolicy: string;
};

type ManifestRecord = {
  questionCode: string;
  pdfPage: number;
  status:
    | "CONTENT_READY_CROP_PENDING"
    | "HOLD_SOURCE"
    | "QUARANTINE_SOURCE_DEFECT"
    | "SUPPRESS_DUPLICATE"
    | "SUPPRESS_CROSS_BANK_DUPLICATE";
  skillId: string | null;
  subSkillId: string | null;
  correct: string | null;
  difficulty: string | null;
  questionFingerprint: string | null;
  explanationFingerprint: string | null;
  speechText: string | null;
  sourceText?: string | null;
  educationalExplanation?: string | null;
  sourceClassification?: SourceClassification | null;
};

const manifestPath = path.resolve(
  process.cwd(),
  "../docs/content/mnsf26/MNSF26_CONTENT_ENRICHMENT_V1.json",
);
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8")) as {
  bank: string;
  taxonomyContract: {
    main: number;
    sub: number;
    newSkillsAllowed: boolean;
    sourceSkillClassificationRequired?: boolean;
    sourceSkillMappingPolicy?: string;
    unrelatedCrossTopicMappingRequiresReview?: boolean;
  };
  coverage: Record<string, number>;
  records: ManifestRecord[];
};

const arithmeticIndexPath = path.resolve(
  process.cwd(),
  "../docs/content/mnsf26/MNSF26_ARITHMETIC_SOURCE_INDEX_V1.json",
);
const arithmeticIndex = JSON.parse(fs.readFileSync(arithmeticIndexPath, "utf8")) as {
  sourcePart: string;
  tests: Array<{
    testNumber: number;
    testTitle: string;
    topic: string | null;
    startPdfPage: number | null;
    startPageEvidence: string;
    cropAllowed: boolean;
  }>;
};

const resolvedArithmeticTests = arithmeticIndex.tests
  .filter((test) => Number.isInteger(test.startPdfPage))
  .slice()
  .sort((a, b) => Number(a.startPdfPage) - Number(b.startPdfPage));

const expectedSourceClassificationForPage = (pdfPage: number) => {
  let matched: (typeof resolvedArithmeticTests)[number] | null = null;
  for (const test of resolvedArithmeticTests) {
    if (Number(test.startPdfPage) <= pdfPage) matched = test;
    else break;
  }
  return matched;
};

const mainIds = new Set(QUANT_TAXONOMY.map((item) => item.id));
const subIds = new Set(
  QUANT_TAXONOMY.flatMap((item) => item.subSkills.map((sub) => sub.id)),
);

const ready = manifest.records.filter(
  (record) => record.status === "CONTENT_READY_CROP_PENDING",
);
const holds = manifest.records.filter((record) => record.status === "HOLD_SOURCE");
const quarantined = manifest.records.filter(
  (record) => record.status === "QUARANTINE_SOURCE_DEFECT",
);
const suppressed = manifest.records.filter(
  (record) => record.status.startsWith("SUPPRESS_"),
);

const failures: Array<{ gate: string; detail: unknown }> = [];

if (manifest.bank !== "MNSF26") {
  failures.push({ gate: "bank-code", detail: manifest.bank });
}

const expectedMappingPolicy = "SOURCE_SKILL_FIRST_THEN_QUESTION_MATH_TO_CANONICAL_25_95";
if (
  manifest.taxonomyContract?.sourceSkillClassificationRequired !== true ||
  manifest.taxonomyContract?.sourceSkillMappingPolicy !== expectedMappingPolicy ||
  manifest.taxonomyContract?.unrelatedCrossTopicMappingRequiresReview !== true
) {
  failures.push({
    gate: "source-skill-mapping-policy",
    detail: manifest.taxonomyContract,
  });
}

const sourceClassificationMismatches = manifest.records
  .map((record) => {
    const expected = expectedSourceClassificationForPage(Number(record.pdfPage));
    const actual = record.sourceClassification;
    if (!expected || !actual) {
      return {
        questionCode: record.questionCode,
        pdfPage: record.pdfPage,
        reason: !expected ? "NO_SOURCE_TEST_FOR_PAGE" : "MISSING_SOURCE_CLASSIFICATION",
      };
    }

    const ok =
      actual.sourcePart === arithmeticIndex.sourcePart &&
      actual.testNumber === expected.testNumber &&
      actual.testTitle === expected.testTitle &&
      actual.sourceSkillLabel === expected.topic &&
      actual.evidence === expected.startPageEvidence &&
      actual.mappingPolicy === expectedMappingPolicy;

    return ok
      ? null
      : {
          questionCode: record.questionCode,
          pdfPage: record.pdfPage,
          expected: {
            sourcePart: arithmeticIndex.sourcePart,
            testNumber: expected.testNumber,
            testTitle: expected.testTitle,
            sourceSkillLabel: expected.topic,
            evidence: expected.startPageEvidence,
            mappingPolicy: expectedMappingPolicy,
          },
          actual,
        };
  })
  .filter(Boolean);

if (sourceClassificationMismatches.length) {
  failures.push({
    gate: "source-skill-classification-parity",
    detail: sourceClassificationMismatches,
  });
}
if (manifest.records.length !== 138) {
  failures.push({ gate: "record-count", detail: manifest.records.length });
}
if (
  ready.length !== 130 ||
  holds.length !== 2 ||
  quarantined.length !== 1 ||
  suppressed.length !== 5
) {
  failures.push({
    gate: "status-counts",
    detail: {
      ready: ready.length,
      holds: holds.length,
      quarantined: quarantined.length,
      suppressed: suppressed.length,
    },
  });
}

const declaredCoverage = {
  total: manifest.coverage.total,
  ready: manifest.coverage.ready,
  holds: manifest.coverage.holds,
  quarantined: manifest.coverage.quarantined,
  suppressed: manifest.coverage.suppressed,
  readyMapping: manifest.coverage.readyMapping,
  readyCorrect: manifest.coverage.readyCorrect,
  readyDifficulty: manifest.coverage.readyDifficulty,
  readyQuestionFingerprint: manifest.coverage.readyQuestionFingerprint,
  readyExplanationFingerprint: manifest.coverage.readyExplanationFingerprint,
  readySpeechText: manifest.coverage.readySpeechText,
};
const actualCoverage = {
  total: manifest.records.length,
  ready: ready.length,
  holds: holds.length,
  quarantined: quarantined.length,
  suppressed: suppressed.length,
  readyMapping: ready.filter((r) => r.skillId && r.subSkillId).length,
  readyCorrect: ready.filter((r) => r.correct).length,
  readyDifficulty: ready.filter((r) => r.difficulty).length,
  readyQuestionFingerprint: ready.filter((r) => r.questionFingerprint).length,
  readyExplanationFingerprint: ready.filter((r) => r.explanationFingerprint).length,
  readySpeechText: ready.filter((r) => r.speechText).length,
};
if (JSON.stringify(declaredCoverage) !== JSON.stringify(actualCoverage)) {
  failures.push({
    gate: "declared-coverage-parity",
    detail: { declared: declaredCoverage, actual: actualCoverage },
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

const expectedHoldCodes = new Set([
  "QDR-QNT-MNSF26-P001-Q10",
  "QDR-QNT-MNSF26-P013-Q15",
]);
const actualHoldCodes = new Set(holds.map((record) => record.questionCode));
if (
  actualHoldCodes.size !== expectedHoldCodes.size ||
  [...expectedHoldCodes].some((code) => !actualHoldCodes.has(code))
) {
  failures.push({
    gate: "source-hold-allowlist",
    detail: {
      expected: [...expectedHoldCodes],
      actual: [...actualHoldCodes],
    },
  });
}

const invalidHolds = holds.filter(
  (record) =>
    record.sourceText !== null ||
    !record.questionFingerprint ||
    !record.speechText,
);
if (invalidHolds.length) {
  failures.push({
    gate: "source-hold-fail-closed",
    detail: invalidHolds.map((record) => record.questionCode),
  });
}

const expectedQuarantineCode = "QDR-QNT-MNSF26-P014-Q08";
if (
  quarantined.length !== 1 ||
  quarantined[0]?.questionCode !== expectedQuarantineCode ||
  quarantined[0]?.sourceText !== null ||
  quarantined[0]?.correct !== null ||
  quarantined[0]?.skillId !== null ||
  quarantined[0]?.subSkillId !== null
) {
  failures.push({
    gate: "source-defect-quarantine-contract",
    detail: quarantined.map((record) => ({
      questionCode: record.questionCode,
      sourceText: record.sourceText,
      correct: record.correct,
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
    quarantined: quarantined.length,
    suppressed: suppressed.length,
  },
  failures,
};

console.log(JSON.stringify(report, null, 2));
if (!report.ok) process.exitCode = 1;
