import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

const files = {
  quizRoutes: await read("server/src/routes/quiz.routes.ts"),
  quizResultsRoutes: await read("server/src/modules/quizzes/http/quizResultsRoutes.ts"),
  quizReportScope: await read("server/src/modules/quizzes/application/quizReportScope.ts"),
  quizAnalyticsRoutes: await read("server/src/modules/quizzes/http/quizAnalyticsRoutes.ts"),
  quizAnalyticsOverview: await read("server/src/modules/quizzes/application/quizAnalyticsOverview.ts"),
  managedContentScope: await read("server/src/modules/quizzes/application/quizManagedContentScope.ts"),
  api: [
    await read("services/api.ts"),
    await read("services/apiGroups/quizzesApi.ts"),
  ].join("\n"),
  dashboard: await read("pages/Dashboard.tsx"),
  reports: await read("pages/Reports.tsx"),
};

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

function assertNotIncludes(source, fragment, message) {
  if (source.includes(fragment)) {
    throw new Error(message || `Unexpected fragment: ${fragment}`);
  }
}

function assertAnyIncludes(source, fragments, message) {
  if (!fragments.some((fragment) => source.includes(fragment))) {
    throw new Error(message || `Missing all expected fragments: ${fragments.join(", ")}`);
  }
}

const analyticsRoute = files.quizAnalyticsRoutes;
const analyticsOverview = files.quizAnalyticsOverview;
const scopedStudentsHelper = files.quizReportScope;

check("dashboard scoped students are queried by role instead of loading every student", () => {
  assertIncludes(files.quizReportScope, "buildQuizReportStudentScope");
  assertIncludes(files.quizReportScope, "STUDENT_DASHBOARD_SELECT");
  assertIncludes(scopedStudentsHelper, "UserModel.find(filter)");
  assertIncludes(scopedStudentsHelper, "countDocuments(filter)");
  assertIncludes(scopedStudentsHelper, ".limit(limit)");
  assertNotIncludes(scopedStudentsHelper, 'UserModel.find({ role: "student" })');
});

check("analytics overview has bounded work for high-scale dashboards", () => {
  assertIncludes(files.quizAnalyticsRoutes, "dashboardAnalyticsQuerySchema");
  assertIncludes(analyticsOverview, "studentLimit");
  assertIncludes(analyticsOverview, "resultLimit");
  assertIncludes(analyticsOverview, "attemptLimit");
  assertIncludes(analyticsOverview, ".limit(query.resultLimit).lean()");
  assertIncludes(analyticsOverview, ".limit(query.attemptLimit).lean()");
  assertIncludes(analyticsOverview, "sampledStudentCount");
  assertIncludes(analyticsOverview, "isTruncated");
});

check("scoped quiz results remain paginated and role-scoped", () => {
  assertIncludes(files.quizRoutes, "quizRouter.use(quizResultsRouter)");
  assertIncludes(files.quizResultsRoutes, '"/results/scoped"');
  assertIncludes(files.quizResultsRoutes, "resolvePagination(query");
  assertIncludes(files.quizResultsRoutes, 'import { filterResultsByManagedContentScope } from "../application/quizManagedContentScope.js";');
  assertIncludes(files.quizResultsRoutes, "filterResultsByManagedContentScope(results, authUser.role, managedPathIds, managedSubjectIds)");
  assertIncludes(files.managedContentScope, "export const filterResultsByManagedContentScope");
  assertIncludes(files.quizResultsRoutes, "sampledStudentCount");
});

check("frontend API requests dashboard data with safe limits without visual rewrites", () => {
  assertIncludes(files.api, "getQuizAnalyticsOverview: (pagination: PaginationOptions = {})");
  assertIncludes(files.api, "studentLimit: 500");
  assertIncludes(files.api, "resultLimit: 2000");
  assertAnyIncludes(files.api, [
    "getScopedQuizResults: (pagination: PaginationOptions = {})",
    "getScopedQuizResults: (pagination: QuizResultsPaginationOptions = {})",
  ]);
  assertIncludes(files.dashboard, "api.getScopedQuizResults()");
  assertIncludes(files.reports, "api.getQuizAnalyticsOverview(taxonomyScope)");
});

const failed = checks.filter((item) => item.status === "FAIL");
console.log(JSON.stringify({ total: checks.length, passed: checks.length - failed.length, failed: failed.length, checks }, null, 2));

if (failed.length > 0) {
  process.exit(1);
}
