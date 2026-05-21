import { readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const schoolsManager = readFileSync(path.join(root, "dashboards", "admin", "SchoolsManager.tsx"), "utf8");

const checks = [];

function check(name, assertion) {
  try {
    assertion();
    checks.push({ name, status: "PASS" });
  } catch (error) {
    checks.push({
      name,
      status: "FAIL",
      details: error instanceof Error ? error.message : String(error),
    });
  }
}

function assertIncludes(source, fragment, message) {
  if (!source.includes(fragment)) {
    throw new Error(message || `Missing fragment: ${fragment}`);
  }
}

function assertNotIncludes(source, fragment, message) {
  if (source.includes(fragment)) {
    throw new Error(message || `Forbidden fragment found: ${fragment}`);
  }
}

check("school student table no longer hard-caps results at the first 80 records", () => {
  assertNotIncludes(
    schoolsManager,
    "visibleSchoolStudents.slice(0, 80)",
    "School student list still hides records beyond the first 80.",
  );
});

check("school student table has explicit pagination state and derived page rows", () => {
  assertIncludes(schoolsManager, "schoolStudentPageSize");
  assertIncludes(schoolsManager, "schoolStudentPage");
  assertIncludes(schoolsManager, "pagedVisibleSchoolStudents");
  assertIncludes(schoolsManager, "schoolStudentTotalPages");
  assertIncludes(schoolsManager, "setSchoolStudentPage");
});

check("student search and class filters reset the page safely", () => {
  assertIncludes(schoolsManager, "setSchoolStudentPage(1)");
  assertIncludes(schoolsManager, "studentSearch");
  assertIncludes(schoolsManager, "selectedClassFilter");
});

check("pagination UI communicates visible range and provides previous/next controls", () => {
  assertIncludes(schoolsManager, "schoolStudentStartIndex");
  assertIncludes(schoolsManager, "schoolStudentEndIndex");
  assertIncludes(schoolsManager, "schoolStudentTotalPages > 1");
  assertIncludes(schoolsManager, "السابق");
  assertIncludes(schoolsManager, "التالي");
});

const failed = checks.filter((item) => item.status === "FAIL");

console.log(
  JSON.stringify(
    {
      batch: "BATCH_100G_SCHOOL_RELATIONSHIP_UI_PAGINATION_E2E_2026-05-21_AR",
      total: checks.length,
      passed: checks.length - failed.length,
      failed: failed.length,
      checks,
    },
    null,
    2,
  ),
);

if (failed.length > 0) {
  process.exit(1);
}
