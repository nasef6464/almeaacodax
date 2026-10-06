import { readFile } from "node:fs/promises";

const estimator = await readFile(new URL("../server/src/modules/quizzes/analytics/examReadinessEstimate.ts", import.meta.url), "utf8");
const routes = await readFile(new URL("../server/src/modules/quizzes/http/adaptiveMasteryRoutes.ts", import.meta.url), "utf8");
const report = await readFile(new URL("../pages/Reports.tsx", import.meta.url), "utf8");
const viewModel = await readFile(new URL("../pages/Reports/studentReadinessViewModel.ts", import.meta.url), "utf8");

const checks = [];
const check = (name, pass) => checks.push({ name, status: pass ? "PASS" : "FAIL" });

check("exam estimate is deterministic and does not call an LLM",
  estimator.includes("buildExamReadinessEstimate") &&
  !estimator.includes("callAi") &&
  !estimator.includes("fetch("));

check("estimate is withheld until enough evidence exists",
  estimator.includes("recentAssessments >= 3") &&
  estimator.includes("totalQuestions >= 30") &&
  estimator.includes("reliableSkills >= 3") &&
  estimator.includes('status: "insufficient_evidence"'));

check("Qiyas score remains explicitly uncalibrated",
  estimator.includes("calibratedToQiyas: false") &&
  estimator.includes("qiyasScoreEstimate: null") &&
  estimator.includes("ليس توقعًا رسميًا لدرجة قياس"));

check("mastery readiness endpoint reuses existing deterministic mastery evidence",
  routes.includes("buildScopedMasteryReadiness") &&
  routes.includes("buildExamReadinessEstimate") &&
  routes.includes('"quizSnapshot.pathId": pathId'));

check("student report shows the estimate with a non-official disclaimer",
  report.includes('data-testid="student-exam-estimate"') &&
  report.includes("ليس درجة قياس رسمية") &&
  viewModel.includes("examEstimate"));

const failed = checks.filter((item) => item.status === "FAIL");
console.log(JSON.stringify({ phase: "AI-7-readiness-estimate", status: failed.length ? "FAIL" : "PASS", checks }, null, 2));
if (failed.length) process.exit(1);
