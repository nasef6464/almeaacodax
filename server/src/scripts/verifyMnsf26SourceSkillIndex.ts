import fs from "fs";
import path from "path";

type SourceGroup = {
  sourcePart: "الحساب/الجبر" | "الهندسة";
  sourceSkillLabel: string;
  lessonNumber?: number;
  tests: number[];
};

const root = path.resolve(process.cwd(), "../docs/content/mnsf26");
const sourceSkillIndex = JSON.parse(
  fs.readFileSync(path.join(root, "MNSF26_SOURCE_SKILL_INDEX_V1.json"), "utf8"),
) as {
  bank: string;
  mappingPolicy: string;
  constraints: {
    canonicalMainSkills: number;
    canonicalSubSkills: number;
    newSkillsAllowed: boolean;
    unrelatedCrossTopicMappingRequiresReview: boolean;
    sourceLabelMustBePreserved: boolean;
  };
  sourceGroups: SourceGroup[];
};

const arithmetic = JSON.parse(
  fs.readFileSync(path.join(root, "MNSF26_ARITHMETIC_SOURCE_INDEX_V1.json"), "utf8"),
) as {
  tests: Array<{ testNumber: number; topic: string | null }>;
};

const geometry = JSON.parse(
  fs.readFileSync(path.join(root, "MNSF26_GEOMETRY_SOURCE_INDEX_V1.json"), "utf8"),
) as {
  lessons: Array<{ lessonNumber: number; name: string; tests: number[] }>;
};

const failures: Array<{ gate: string; detail: unknown }> = [];
const expectedPolicy = "SOURCE_SKILL_FIRST_THEN_QUESTION_MATH_TO_CANONICAL_25_95";

if (
  sourceSkillIndex.bank !== "MNSF26" ||
  sourceSkillIndex.mappingPolicy !== expectedPolicy ||
  sourceSkillIndex.constraints?.canonicalMainSkills !== 25 ||
  sourceSkillIndex.constraints?.canonicalSubSkills !== 95 ||
  sourceSkillIndex.constraints?.newSkillsAllowed !== false ||
  sourceSkillIndex.constraints?.unrelatedCrossTopicMappingRequiresReview !== true ||
  sourceSkillIndex.constraints?.sourceLabelMustBePreserved !== true
) {
  failures.push({
    gate: "source-skill-policy",
    detail: {
      bank: sourceSkillIndex.bank,
      mappingPolicy: sourceSkillIndex.mappingPolicy,
      constraints: sourceSkillIndex.constraints,
    },
  });
}

const actualArithmetic = new Map<string, number[]>();
for (const test of arithmetic.tests) {
  const label = String(test.topic || "").trim();
  if (!label) {
    failures.push({
      gate: "arithmetic-source-label-required",
      detail: { testNumber: test.testNumber, topic: test.topic },
    });
    continue;
  }
  if (!actualArithmetic.has(label)) actualArithmetic.set(label, []);
  actualArithmetic.get(label)!.push(test.testNumber);
}

const declaredArithmetic = new Map(
  sourceSkillIndex.sourceGroups
    .filter((group) => group.sourcePart === "الحساب/الجبر")
    .map((group) => [
      group.sourceSkillLabel,
      group.tests.slice().sort((a, b) => a - b),
    ]),
);

const arithmeticLabels = new Set([
  ...actualArithmetic.keys(),
  ...declaredArithmetic.keys(),
]);
const arithmeticMismatches = [...arithmeticLabels]
  .map((label) => {
    const actual = (actualArithmetic.get(label) || []).slice().sort((a, b) => a - b);
    const declared = (declaredArithmetic.get(label) || []).slice().sort((a, b) => a - b);
    return JSON.stringify(actual) === JSON.stringify(declared)
      ? null
      : { label, actual, declared };
  })
  .filter(Boolean);
if (arithmeticMismatches.length) {
  failures.push({
    gate: "arithmetic-source-skill-group-parity",
    detail: arithmeticMismatches,
  });
}

const declaredGeometry = sourceSkillIndex.sourceGroups
  .filter((group) => group.sourcePart === "الهندسة")
  .slice()
  .sort((a, b) => Number(a.lessonNumber) - Number(b.lessonNumber));
const expectedGeometry = geometry.lessons
  .map((lesson) => ({
    sourcePart: "الهندسة" as const,
    sourceSkillLabel: lesson.name,
    lessonNumber: lesson.lessonNumber,
    tests: lesson.tests.slice().sort((a, b) => a - b),
  }))
  .sort((a, b) => a.lessonNumber - b.lessonNumber);

if (JSON.stringify(declaredGeometry) !== JSON.stringify(expectedGeometry)) {
  failures.push({
    gate: "geometry-source-skill-group-parity",
    detail: { declared: declaredGeometry, expected: expectedGeometry },
  });
}

const arithmeticTests = sourceSkillIndex.sourceGroups
  .filter((group) => group.sourcePart === "الحساب/الجبر")
  .flatMap((group) => group.tests);
const geometryTests = sourceSkillIndex.sourceGroups
  .filter((group) => group.sourcePart === "الهندسة")
  .flatMap((group) => group.tests);

const arithmeticUnique = new Set(arithmeticTests);
const geometryUnique = new Set(geometryTests);
if (
  arithmeticTests.length !== 63 ||
  arithmeticUnique.size !== 63 ||
  Math.min(...arithmeticUnique) !== 1 ||
  Math.max(...arithmeticUnique) !== 63
) {
  failures.push({
    gate: "arithmetic-source-skill-test-coverage",
    detail: {
      count: arithmeticTests.length,
      unique: arithmeticUnique.size,
      tests: [...arithmeticUnique].sort((a, b) => a - b),
    },
  });
}
if (
  geometryTests.length !== 50 ||
  geometryUnique.size !== 50 ||
  Math.min(...geometryUnique) !== 1 ||
  Math.max(...geometryUnique) !== 50
) {
  failures.push({
    gate: "geometry-source-skill-test-coverage",
    detail: {
      count: geometryTests.length,
      unique: geometryUnique.size,
      tests: [...geometryUnique].sort((a, b) => a - b),
    },
  });
}

const report = {
  ok: failures.length === 0,
  counts: {
    sourceGroups: sourceSkillIndex.sourceGroups.length,
    arithmeticGroups: declaredArithmetic.size,
    geometryGroups: declaredGeometry.length,
    arithmeticTests: arithmeticUnique.size,
    geometryTests: geometryUnique.size,
  },
  failures,
};

console.log(JSON.stringify(report, null, 2));
if (!report.ok) process.exitCode = 1;
