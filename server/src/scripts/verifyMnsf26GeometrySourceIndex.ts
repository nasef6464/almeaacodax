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
  (test) => !["SEARCH_INDEX", "FILES_READ_PARSED_PAGE_HEADER"].includes(test.evidence) || !test.cropAllowed,
);
if (missingEvidence.length) {
  failures.push({
    gate: "resolved-page-evidence",
    detail: missingEvidence.map((test) => test.testNumber),
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
