import { readFile } from "node:fs/promises";

const files = {
  api: await readFile(new URL("../services/api.ts", import.meta.url), "utf8"),
  authApi: await readFile(new URL("../services/apiGroups/authApi.ts", import.meta.url), "utf8"),
  paymentsApi: await readFile(new URL("../services/apiGroups/paymentsApi.ts", import.meta.url), "utf8"),
  coursesApi: await readFile(new URL("../services/apiGroups/coursesApi.ts", import.meta.url), "utf8"),
  quizzesApi: await readFile(new URL("../services/apiGroups/quizzesApi.ts", import.meta.url), "utf8"),
  apiQueryUtilities: await readFile(new URL("../services/apiQueryUtilities.ts", import.meta.url), "utf8"),
  adapter: await readFile(new URL("../services/adapter.ts", import.meta.url), "utf8"),
  authContext: await readFile(new URL("../contexts/AuthContext.tsx", import.meta.url), "utf8"),
  phase5Report: await readFile(new URL("../docs/archive_reports/05_FRONTEND_IMPLEMENTATION_REPORT.md", import.meta.url), "utf8").catch(() => ""),
};

const checks = [];

function check(name, fn) {
  checks.push([name, fn]);
}

function assertIncludes(source, expected) {
  if (!source.includes(expected)) {
    throw new Error(`Expected to find: ${expected}`);
  }
}

check("api client keeps paginated backend responses compatible with existing pages", () => {
  assertIncludes(files.api, "createAuthApi(request)");
  assertIncludes(files.api, "createPaymentsApi(request)");
  assertIncludes(files.api, "createCoursesApi(request");
  assertIncludes(files.api, "createQuizzesApi(request");
  assertIncludes(files.apiQueryUtilities, "export interface PaginationOptions");
  assertIncludes(files.authApi, "extractList");
  assertIncludes(files.authApi, 'withQuery("/auth/admin/users"');
  assertIncludes(files.paymentsApi, "extractList");
  assertIncludes(files.paymentsApi, 'withQuery("/payments/requests"');
  assertIncludes(files.coursesApi, 'withQuery("/courses"');
  assertIncludes(files.quizzesApi, 'withQuery("/quizzes"');
  assertIncludes(files.quizzesApi, 'withQuery("/quizzes/results"');
});

check("adapter still normalizes course and quiz arrays after API compatibility layer", () => {
  assertIncludes(files.adapter, "normalizeCourse");
  assertIncludes(files.adapter, "normalizeQuiz");
  assertIncludes(files.adapter, "const data = await api.getCourses(params)");
  assertIncludes(files.adapter, "data.map(normalizeCourse)");
  assertIncludes(files.adapter, "const data = await api.getQuizzes(params)");
  assertIncludes(files.adapter, "data.map(normalizeQuiz)");
});

check("auth bootstrap keeps heavy quiz data non-critical", () => {
  assertIncludes(files.authContext, "hydrateNonCriticalSessionData");
  assertIncludes(files.authContext, "requestIdleCallback");
  assertIncludes(files.authContext, "api.getCurrentUser()");
});

check("phase five report documents no visual UI changes", () => {
  assertIncludes(files.phase5Report, "No visual UI/UX changes were made");
  assertIncludes(files.phase5Report, "services/api.ts");
  assertIncludes(files.phase5Report, "STOP");
});

for (const [name, fn] of checks) {
  try {
    fn();
  } catch (error) {
    console.error(`Frontend phase 5 contract failed: ${name}`);
    console.error(error);
    process.exit(1);
  }
}

console.log(`Frontend phase 5 contract passed (${checks.length} checks).`);
