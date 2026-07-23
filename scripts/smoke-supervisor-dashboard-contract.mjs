import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

const dashboard = await read("dashboards/admin/SupervisorDashboard.tsx");

const checks = [];

function check(name, assertion) {
  try {
    assertion();
    checks.push({ name, status: "PASS" });
  } catch (error) {
    checks.push({ name, status: "FAIL", details: error instanceof Error ? error.message : String(error) });
  }
}

function assertIncludes(source, fragment, message) {
  if (!source.includes(fragment)) {
    throw new Error(message || `Missing fragment: ${fragment}`);
  }
}

check("supervisor overview has a compact command center", () => {
  assertIncludes(dashboard, "متوسط الدرجات");
  assertIncludes(dashboard, "متابعة الطلاب");
  assertIncludes(dashboard, "أضعف المهارات");
  assertIncludes(dashboard, "الفصول");
});

check("supervisor command center has quick workflow actions", () => {
  assertIncludes(dashboard, "reports");
  assertIncludes(dashboard, "sendWeeklyFollowUpAlert");
  assertIncludes(dashboard, "school-portal");
});

check("supervisor analytics are scoped and derived from owned groups/students", () => {
  assertIncludes(dashboard, "scopedStudentIdSet");
  assertIncludes(dashboard, "scopedResults");
  assertIncludes(dashboard, "studentsNeedingFollowUp");
  assertIncludes(dashboard, "weakestSkills");
  assertIncludes(dashboard, "groupSnapshots");
});

check("supervisor weak-student center has scoped filters and real actions", () => {
  assertIncludes(dashboard, "schoolFilter");
  assertIncludes(dashboard, "classFilter");
  assertIncludes(dashboard, "statusFilter");
  assertIncludes(dashboard, "visibleWeakStudents");
  assertIncludes(dashboard, "sendStudentFollowUpAlert");
  assertIncludes(dashboard, "api.sendStudentAlert");
  assertIncludes(dashboard, "openStudentReport");
});

check("supervisor quick decision board exposes weekly decision metrics and alert", () => {
  assertIncludes(dashboard, 'data-testid="supervisor-quick-decision-board"');
  assertIncludes(dashboard, "improvedStudentsCount");
  assertIncludes(dashboard, "pendingFollowUpCount");
  assertIncludes(dashboard, "sendWeeklyFollowUpAlert");
  assertIncludes(dashboard, "إرسال تنبيه أسبوعي");
});

const failed = checks.filter((item) => item.status === "FAIL");
console.log(JSON.stringify({ total: checks.length, passed: checks.length - failed.length, failed: failed.length, checks }, null, 2));

if (failed.length > 0) {
  process.exit(1);
}

