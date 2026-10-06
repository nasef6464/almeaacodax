import fs from "fs";
import path from "path";

type GeometryTest = {
  testNumber: number;
  lessonNumber: number;
  startPdfPage: number | null;
  evidence: string;
  cropAllowed: boolean;
};

const sourcePath = path.resolve(
  process.cwd(),
  "../docs/content/mnsf26/MNSF26_GEOMETRY_SOURCE_INDEX_V1.json",
);
const data = JSON.parse(fs.readFileSync(sourcePath, "utf8")) as {
  bank: string;
  sourcePart: string;
  discoveredStructure: {
    tests: number;
    lessons: number;
    resolvedTestStartPages: number;
    unresolvedTestStartPages: number[];
  };
  lessons: Array<{ lessonNumber: number; tests: number[] }>;
  tests: GeometryTest[];
};

const failures: Array<{ gate: string; detail: unknown }> = [];
const numbers = data.tests.map((test) => test.testNumber).sort((a, b) => a - b);
const expectedNumbers = Array.from({ length: 50 }, (_, i) => i + 1);
const unresolved = data.tests
  .filter((test) => test.startPdfPage === null)
  .map((test) => test.testNumber)
  .sort((a, b) => a - b);
const resolved = data.tests.filter((test) => test.startPdfPage !== null);
const lessonCoverage = [...new Set(data.tests.map((test) => test.lessonNumber))].sort(
  (a, b) => a - b,
);

if (data.bank !== "MNSF26" || data.sourcePart !== "الهندسة") {
  failures.push({
    gate: "identity",
    detail: { bank: data.bank, sourcePart: data.sourcePart },
  });
}
if (JSON.stringify(numbers) !== JSON.stringify(expectedNumbers)) {
  failures.push({ gate: "tests-1-through-50", detail: numbers });
}
if (
  data.discoveredStructure.tests !== 50 ||
  data.tests.length !== 50 ||
  data.discoveredStructure.lessons !== 11 ||
  lessonCoverage.length !== 11
) {
  failures.push({
    gate: "structure-counts",
    detail: {
      declared: data.discoveredStructure,
      tests: data.tests.length,
      lessonCoverage,
    },
  });
}
if (resolved.length !== 50 || unresolved.length !== 0) {
  failures.push({
    gate: "resolved-start-pages",
    detail: { resolved: resolved.length, unresolved },
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

const lessonDeclarations = new Map(
  data.lessons.map((lesson) => [lesson.lessonNumber, lesson.tests.slice().sort((a, b) => a - b)]),
);
const lessonMismatches = [...lessonDeclarations.entries()].filter(([lessonNumber, declaredTests]) => {
  const actualTests = data.tests
    .filter((test) => test.lessonNumber === lessonNumber)
    .map((test) => test.testNumber)
    .sort((a, b) => a - b);
  return JSON.stringify(declaredTests) !== JSON.stringify(actualTests);
});
if (lessonDeclarations.size !== 11 || lessonMismatches.length) {
  failures.push({
    gate: "lesson-test-membership-parity",
    detail: {
      declaredLessons: lessonDeclarations.size,
      mismatches: lessonMismatches.map(([lessonNumber, declaredTests]) => ({
        lessonNumber,
        declaredTests,
        actualTests: data.tests
          .filter((test) => test.lessonNumber === lessonNumber)
          .map((test) => test.testNumber)
          .sort((a, b) => a - b),
      })),
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
const missingEvidence = resolved.filter(
  (test) => !["SEARCH_INDEX", "FILES_READ_PARSED_PAGE_HEADER", "RAW_PDF_TEXT_HEADER"].includes(test.evidence) || !test.cropAllowed,
);
if (missingEvidence.length) {
  failures.push({
    gate: "resolved-page-evidence",
    detail: missingEvidence.map((test) => test.testNumber),
  });
}

const ordered = data.tests.slice().sort((a, b) => a.testNumber - b.testNumber);
const nonMonotonic = ordered.filter((test, index) =>
  index > 0 &&
  test.startPdfPage !== null &&
  ordered[index - 1].startPdfPage !== null &&
  test.startPdfPage! <= ordered[index - 1].startPdfPage!,
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

const report = {
  ok: failures.length === 0,
  counts: {
    tests: data.tests.length,
    lessons: lessonCoverage.length,
    resolvedStartPages: resolved.length,
    unresolvedStartPages: unresolved,
  },
  failures,
};
console.log(JSON.stringify(report, null, 2));
if (!report.ok) process.exitCode = 1;
