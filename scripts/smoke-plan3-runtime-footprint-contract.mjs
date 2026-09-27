import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const read = (file) => fs.readFileSync(path.join(process.cwd(), file), "utf8");

const app = read("App.tsx");
const store = read("store/useStore.ts");
const apiGroup = read("services/apiGroups/taxonomyContentApi.ts");
const adapter = read("services/adapter.ts");
const bootstrap = read("server/src/modules/content/http/contentBootstrapRoutes.ts");
const genericPath = read("pages/GenericPathPage.tsx");
const reports = read("pages/Reports.tsx");
const landing = read("pages/Landing.tsx");
const vite = read("vite.config.ts");
const vercel = JSON.parse(read("vercel.json"));

assert.ok(app.includes("const STUDENT_OVERVIEW_BOOTSTRAP_PROFILE"));
assert.ok(app.includes("path.startsWith('/dashboard') || path.startsWith('/reports')"));
assert.ok(app.includes("contentFilters?: { pathId?: string; subjectId?: string }"));
assert.ok(app.includes("contentFilters: resolveContentFiltersForPath(path)"));
assert.ok(!app.includes("prefetchCommonRouteModules"));
assert.ok(!app.includes("adapter.getContentBootstrap('learning', 'full')"));
assert.ok(app.includes("prefetchRoleWorkspaceModule"));
assert.ok(!app.includes("void import('./pages/Quizzes');"));
assert.ok(!app.includes("void import('./pages/MockExams');"));
assert.ok(!app.includes("void import('./pages/Courses');"));

assert.ok(apiGroup.includes("filters: { pathId?: string; subjectId?: string } = {}"));
assert.ok(apiGroup.includes('withQuery("/content/bootstrap", { scope, phase, ...filters })'));
assert.ok(apiGroup.includes('path:${filters.pathId || "all"}:subject:${filters.subjectId || "all"}'));
assert.ok(adapter.includes("filters: { pathId?: string; subjectId?: string } = {}"));
assert.ok(adapter.includes("api.getContentBootstrapByScope(scope, phase, filters)"));

assert.ok(bootstrap.includes("contentBootstrapIdSchema"));
assert.ok(bootstrap.includes("requestedPathId"));
assert.ok(bootstrap.includes("requestedSubjectId"));
assert.ok(bootstrap.includes("requestedContentFilter"));
assert.ok(bootstrap.includes("requestedContentFilter)"));
assert.ok(bootstrap.includes('X-Content-Path'));
assert.ok(bootstrap.includes('X-Content-Subject'));

assert.ok(genericPath.includes("adapter.getContentBootstrap('learning', 'full', {"));
assert.ok(genericPath.includes("subjectId: scopedSubjectId"));
assert.ok(reports.includes("adapter.getContentBootstrap('learning', 'full', {"));
assert.ok(reports.includes("pathId: studentTodayFocus.pathId"));

assert.ok(store.includes("version: 4"));
const persisted = store.match(/partialize:\s*\(state\)\s*=>\s*\(\{([\s\S]*?)\}\),\s*migrate:/)?.[1] || "";
assert.ok(persisted.includes("cartItems: state.cartItems"));
for (const forbidden of [
  "examResults",
  "questionAttempts",
  "recentActivity",
  "studyPlans",
  "questions",
  "lessons",
  "libraryItems",
  "skillProgress",
  "courses",
]) {
  assert.ok(!persisted.includes(forbidden), `persist allowlist must not include ${forbidden}`);
}
assert.ok(store.includes("persistedState.cartItems.slice(0, 50)"));
assert.ok(!store.includes("Object.entries(state).filter"));

assert.ok(vite.includes("globPatterns: ['**/*.{js,css,html,svg,woff2}']"));
assert.ok(landing.includes("loading={isActive ? 'eager' : 'lazy'}"));
assert.ok(landing.includes('loading="lazy"'));
assert.equal(vercel.ignoreCommand, '[ "$VERCEL_GIT_COMMIT_REF" != "main" ] && exit 0 || exit 1');
const staticCache = vercel.headers.find((entry) => String(entry.source).includes("webp"));
assert.ok(staticCache?.headers?.some((header) => header.key === "Cache-Control"));

console.log("PLAN 3 runtime footprint contract: PASS");
