import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

const [appSource, routeSource, headerSource, genericPathSource] = await Promise.all([
  read("App.tsx"),
  read("app/AppRouteTree.tsx"),
  read("components/Header.tsx"),
  read("pages/GenericPathPage.tsx"),
]);

const routeOwnershipSource = `${appSource}\n${routeSource}`;

const checks = [];

function check(name, assertion) {
  checks.push({ name, assertion });
}

function assertIncludes(source, fragment, message = fragment) {
  if (!source.includes(fragment)) {
    throw new Error(`Missing expected fragment: ${message}`);
  }
}

check("route loading fallback is a full branded shell, not a blank spinner", () => {
  assertIncludes(appSource, "const LoadingFallback = () => {");
  assertIncludes(appSource, "isDashboardRoute");
  assertIncludes(appSource, "text-blue-900");
  assertIncludes(appSource, "text-amber-500");
  assertIncludes(appSource, "loading-side");
  assertIncludes(appSource, "loading-card");
});

check("student and public route chunks stay lazy instead of being globally prefetched", () => {
  if (routeOwnershipSource.includes("prefetchCommonRouteModules")) {
    throw new Error("global route prefetch must stay removed");
  }
  for (const forbidden of [
    "void import('./pages/Dashboard')",
    "void import('./pages/GenericPathPage')",
    "void import('./pages/Quizzes')",
    "void import('./pages/MockExams')",
    "void import('./pages/Courses')",
  ]) {
    if (routeOwnershipSource.includes(forbidden)) {
      throw new Error(`unexpected global route prefetch: ${forbidden}`);
    }
  }
  assertIncludes(routeSource, "const Dashboard = React.lazy(() => import('../pages/Dashboard'))");
  assertIncludes(routeSource, "const GenericPathPage = React.lazy(() => import('../pages/GenericPathPage')");
  assertIncludes(routeSource, "const Courses = React.lazy(() => import('../pages/Courses'))");
});

check("staff workspace chunks are the only idle-prefetched route modules", () => {
  assertIncludes(routeSource, "const loadAdminDashboardModule = () => import('../dashboards/admin/AdminDashboard')");
  assertIncludes(routeSource, "const loadSupervisorDashboardModule = () => import('../dashboards/admin/SupervisorDashboard')");
  assertIncludes(routeSource, "export const prefetchRoleWorkspaceModule = (role?: string | null) =>");
  assertIncludes(routeSource, "void loadAdminDashboardModule()");
  assertIncludes(routeSource, "void loadSupervisorDashboardModule()");
  assertIncludes(appSource, "if (!['admin', 'teacher', 'supervisor'].includes(user?.role || ''))");
  assertIncludes(appSource, "prefetchRoleWorkspaceModule(user.role)");
});

check("public routes load navigation bootstrap early", () => {
  assertIncludes(appSource, "const loadPublicNavigationBootstrap = async () =>");
  assertIncludes(appSource, "adapter.getTaxonomyBootstrap('core')");
  assertIncludes(appSource, "hydrateTaxonomy({");
  assertIncludes(appSource, "void loadPublicNavigationBootstrap()");
});

check("header avoids showing incomplete navigation as final UI", () => {
  assertIncludes(headerSource, "showNavigationLoading");
  assertIncludes(headerSource, "navigationLoadingExpired");
  assertIncludes(headerSource, "setNavigationLoadingExpired(true)");
  assertIncludes(headerSource, "1800");
  assertIncludes(headerSource, "paths.length === 0");
  assertIncludes(headerSource, "navigationMenu.length <= 2");
  assertIncludes(headerSource, "nav-loading");
});

check("subject query is not removed before lazy taxonomy arrives", () => {
  assertIncludes(genericPathSource, "const pathSubjectsLoaded = pathSubjects.length > 0");
  assertIncludes(genericPathSource, "if (selectedSubjectId && !pathSubjectsLoaded)");
  assertIncludes(genericPathSource, "return;");
  assertIncludes(genericPathSource, "pathSubjects.length");
});

check("absolute URLs pasted into the app path are canonicalized", () => {
  assertIncludes(appSource, "const AbsoluteUrlPathRedirect: React.FC = () => {");
  assertIncludes(appSource, "const normalizeAbsolutePathCandidate = (value: string) =>");
  assertIncludes(appSource, "value.replace(/^(https?):\\/(?!\\/)/i, '$1://')");
  assertIncludes(appSource, "decodeURIComponent(encodedCandidate)");
  assertIncludes(appSource, "target.origin === window.location.origin");
  assertIncludes(appSource, "navigate(nextPath || '/', { replace: true })");
  assertIncludes(appSource, "<AbsoluteUrlPathRedirect />");
});

let failures = 0;
for (const item of checks) {
  try {
    item.assertion();
    console.log(`PASS ${item.name}`);
  } catch (error) {
    failures += 1;
    console.error(`FAIL ${item.name}`);
    console.error(error instanceof Error ? error.message : error);
  }
}

if (failures > 0) {
  process.exitCode = 1;
} else {
  console.log("Route loading contract is intact.");
}
