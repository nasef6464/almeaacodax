import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const dashboard = await read("dashboards/admin/SupervisorDashboard.tsx");
const supervisorSmoke = await read("scripts/smoke-supervisor-dashboard-contract.mjs");

const requiredDashboardFragments = [
  "groupSnapshots", "bestClass", "weakestClass", "weakestSkills",
  "studentsNeedingFollowUp", "visibleWeakStudents", "sendStudentFollowUpAlert",
  "sendWeeklyFollowUpAlert", "pendingFollowUpCount", "improvedStudentsCount",
  "openStudentReport", "openStudentQuiz", "QuizAssignWidget",
  'data-testid="supervisor-quick-decision-board"',
];
const requiredSmokeFragments = [
  "scopedStudentIdSet", "scopedResults", "studentsNeedingFollowUp", "weakestSkills",
  "groupSnapshots", "sendStudentFollowUpAlert", "sendWeeklyFollowUpAlert",
  "useSupervisorAssessmentScope", "targetStudentIds", "needsSupportStudents",
  "إعادة توجيه", "لم يؤدوا", "onAssignToStudent",
];

const checks = [];
for (const fragment of requiredDashboardFragments) {
  checks.push({ name: `dashboard:${fragment}`, pass: dashboard.includes(fragment) });
}
for (const fragment of requiredSmokeFragments) {
  checks.push({ name: `smoke:${fragment}`, pass: supervisorSmoke.includes(fragment) });
}
const failed = checks.filter((check) => !check.pass);
console.log(JSON.stringify({
  phase: "teacher-supervisor-assessment-phase4",
  status: failed.length ? "FAIL" : "PASS",
  total: checks.length,
  passed: checks.length - failed.length,
  failed,
}, null, 2));
if (failed.length) process.exit(1);
