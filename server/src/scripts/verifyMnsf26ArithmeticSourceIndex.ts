import fs from "fs";
import path from "path";

type ArithmeticTest = {
  testNumber: number;
  startPdfPage: number | null;
  startPageEvidence: string;
  cropAllowed: boolean;
};

const sourcePath = path.resolve(
  process.cwd(),
  "../docs/content/mnsf26/MNSF26_ARITHMETIC_SOURCE_INDEX_V1.json",
);
const data = JSON.parse(fs.readFileSync(sourcePath, "utf8")) as {
  bank: string;
  sourcePart: string;
  discoveredStructure: {
    tests: number;
    resolvedTestStartPages: number;
    unresolvedTestStartPages: number[];
  };
  tests: ArithmeticTest[];
};

const failures: Array<{ gate: string; detail: unknown }> = [];
const numbers = data.tests.map((test) => test.testNumber).sort((a, b) => a - b);
const expectedNumbers = Array.from({ length: 63 }, (_, i) => i + 1);
const unresolved = data.tests
  .filter((test) => test.startPdfPage === null)
  .map((test) => test.testNumber)
  .sort((a, b) => a - b);
const resolved = data.tests.filter((test) => test.startPdfPage !== null);

if (data.bank !== "MNSF26" || data.sourcePart !== "الحساب/الجبر") {
  failures.push({
    gate: "identity",
    detail: { bank: data.bank, sourcePart: data.sourcePart },
  });
}
if (JSON.stringify(numbers) !== JSON.stringify(expectedNumbers)) {
  failures.push({ gate: "tests-1-through-63", detail: numbers });
}
if (
  data.discoveredStructure.tests !== 63 ||
  data.tests.length !== 63 ||
  resolved.length !== 62 ||
  JSON.stringify(unresolved) !== JSON.stringify([33])
) {
  failures.push({
    gate: "structure-counts",
    detail: {
      declared: data.discoveredStructure,
      tests: data.tests.length,
      resolved: resolved.length,
      unresolved,
    },
  });
}
const unsafeUnresolved = data.tests.filter(
  (test) => test.startPdfPage === null && test.cropAllowed,
);
if (unsafeUnresolved.length) {
  failures.push({
    gate: "no-crop-from-unresolved-page",
    detail: unsafeUnresolved.map((test) => test.testNumber),
  });
}
const unresolvedTest33 = data.tests.find((test) => test.testNumber === 33);
if (
  !unresolvedTest33 ||
  unresolvedTest33.startPdfPage !== null ||
  unresolvedTest33.cropAllowed !== false ||
  unresolvedTest33.startPageEvidence !== "RAW_PDF_TEXT_HEADER_ABSENT"
) {
  failures.push({
    gate: "test-33-source-gap-fail-closed",
    detail: unresolvedTest33 || null,
  });
}

const missingEvidence = resolved.filter(
  (test) => !["SEARCH_INDEX", "FILES_READ_BOUNDARY_DEDUCTION", "RAW_PDF_TEXT_HEADER"].includes(test.startPageEvidence) || !test.cropAllowed,
);
if (missingEvidence.length) {
  failures.push({
    gate: "resolved-page-evidence",
    detail: missingEvidence.map((test) => test.testNumber),
  });
}

const declaredResolved = data.discoveredStructure.resolvedTestStartPages;
const declaredUnresolved = [...data.discoveredStructure.unresolvedTestStartPages].sort(
  (a, b) => a - b,
);
if (
  declaredResolved !== resolved.length ||
  JSON.stringify(declaredUnresolved) !== JSON.stringify(unresolved)
) {
  failures.push({
    gate: "declared-source-index-parity",
    detail: {
      declaredResolved,
      actualResolved: resolved.length,
      declaredUnresolved,
      actualUnresolved: unresolved,
    },
  });
}

const nonMonotonic = data.tests
  .slice()
  .sort((a, b) => a.testNumber - b.testNumber)
  .filter((test, index, all) =>
    index > 0 &&
    test.startPdfPage !== null &&
    all[index - 1].startPdfPage !== null &&
    test.startPdfPage! <= all[index - 1].startPdfPage!,
  );
if (nonMonotonic.length) {
  failures.push({
    gate: "start-pages-strictly-increasing",
    detail: nonMonotonic.map((test) => ({
      testNumber: test.testNumber,
      startPdfPage: test.startPdfPage,
    })),
  });
}

const missingSourceSkillLabels = data.tests.filter(
  (test) =>
    test.cropAllowed === true &&
    (!test.topic || String(test.topic).trim().length === 0),
);
if (missingSourceSkillLabels.length) {
  failures.push({
    gate: "source-skill-label-required",
    detail: missingSourceSkillLabels.map((test) => ({
      testNumber: test.testNumber,
      startPdfPage: test.startPdfPage,
      topic: test.topic,
    })),
  });
}

const duplicatePages = [...new Set(
  resolved
    .filter((test, index, all) =>
      all.findIndex((candidate) => candidate.startPdfPage === test.startPdfPage) !== index,
    )
    .map((test) => test.startPdfPage),
)];
if (duplicatePages.length) {
  failures.push({ gate: "start-page-uniqueness", detail: duplicatePages });
}

const report = {
  ok: failures.length === 0,
  counts: {
    tests: data.tests.length,
    resolvedStartPages: resolved.length,
    unresolvedStartPages: unresolved,
  },
  failures,
};
console.log(JSON.stringify(report, null, 2));
if (!report.ok) process.exitCode = 1;
