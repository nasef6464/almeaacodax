import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

const [csrfMiddlewareSource, appSource, authRoutesSource, apiSource] = await Promise.all([
  read("server/src/middleware/csrf.ts"),
  read("server/src/app.ts"),
  read("server/src/routes/auth.routes.ts"),
  read("services/api.ts"),
]);

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

check("csrf middleware defines cookie/header contract and safe methods", () => {
  assertIncludes(csrfMiddlewareSource, 'CSRF_COOKIE_NAME = "almeaa_csrf_token"');
  assertIncludes(csrfMiddlewareSource, 'CSRF_HEADER_NAME = "x-csrf-token"');
  assertIncludes(csrfMiddlewareSource, 'new Set(["GET", "HEAD", "OPTIONS"])');
  assertIncludes(csrfMiddlewareSource, "Invalid CSRF token");
});

check("csrf guard protects API and both auth mounts without changing app mount contracts", () => {
  assertIncludes(appSource, "import { csrfGuard } from \"./middleware/csrf.js\"");
  assertIncludes(appSource, "app.use(\"/api\", csrfGuard)");
  assertIncludes(authRoutesSource, "import { csrfGuard, issueCsrfToken } from \"../middleware/csrf.js\"");
  assertIncludes(authRoutesSource, "authRouter.use(csrfGuard)");
});

check("compatibility auth alias keeps API-equivalent request protections", () => {
  assertIncludes(appSource, 'app.use("/api/auth", express.json({ limit: "100kb" }))');
  assertIncludes(appSource, 'const authAliasJsonParser = express.json({ limit: "100kb" })');
  assertIncludes(appSource, 'pathname === "/auth" || pathname.startsWith("/auth/")');
  for (const route of ["/auth/login", "/auth/register", "/auth/forgot-password", "/auth/reset-password"]) {
    assertIncludes(appSource, route);
  }
  assertIncludes(appSource, '"/auth/me/redeem-access-code"');
  assertIncludes(appSource, "authRateLimiter");
  assertIncludes(appSource, "sensitiveActionRateLimiter");
});

check("auth route exposes csrf token endpoint", () => {
  assertIncludes(authRoutesSource, '"/csrf-token"');
  assertIncludes(authRoutesSource, "issueCsrfToken(res)");
});

check("frontend request sends csrf header on unsafe methods", () => {
  assertIncludes(apiSource, 'CSRF_COOKIE_NAME = "almeaa_csrf_token"');
  assertIncludes(apiSource, 'CSRF_HEADER_NAME = "x-csrf-token"');
  assertIncludes(apiSource, "isUnsafeMethod");
  assertIncludes(apiSource, "ensureCsrfToken");
  assertIncludes(apiSource, "...(csrfToken ? { [CSRF_HEADER_NAME]: csrfToken } : {}),");
});

const failed = checks.filter((item) => item.status === "FAIL");
console.log(JSON.stringify({ total: checks.length, passed: checks.length - failed.length, failed: failed.length, checks }, null, 2));

if (failed.length > 0) {
  process.exit(1);
}
