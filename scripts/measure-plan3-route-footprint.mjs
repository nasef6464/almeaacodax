import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const BASE_URL = String(process.env.UI_AUDIT_BASE_URL || "http://127.0.0.1:4173").replace(/\/$/, "");
const API_BASE_URL = String(process.env.UI_AUDIT_API_BASE_URL || "http://127.0.0.1:4010/api").replace(/\/$/, "");
const FRONTEND_ORIGIN = new URL(BASE_URL).origin;
const API_ORIGIN = new URL(API_BASE_URL).origin;
const API_COOKIE_DOMAIN = new URL(API_ORIGIN).hostname;
const API_COOKIE_SECURE = new URL(API_ORIGIN).protocol === "https:";
const readArg = (name) => {
  const index = process.argv.indexOf(name);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : "";
};
const OUT_FILE = readArg("--output") || "audit-artifacts/deep-premerge/plan3-route-footprint.json";
const SETTLE_MS = Math.min(Math.max(Number(readArg("--settle-ms") || 2500), 500), 8000);

const routePlan = [
  { id: "dashboard", path: "/dashboard" },
  { id: "reports", path: "/reports" },
  { id: "courses", path: "/courses" },
  { id: "category", path: "/category/p_qudrat" },
];

const student = {
  email: process.env.ROLE_STUDENT_EMAIL || process.env.SMOKE_STUDENT_EMAIL,
  password: process.env.ROLE_STUDENT_PASSWORD || process.env.SMOKE_STUDENT_PASSWORD,
};

if (!student.email || !student.password) {
  throw new Error("student credentials are required for PLAN 3 footprint measurement");
}

fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });

async function login(context) {
  const csrfRes = await fetch(`${API_BASE_URL}/auth/csrf-token`, {
    headers: { accept: "application/json" },
  });
  const csrfBody = await csrfRes.json().catch(() => ({}));
  const csrfCookie =
    String(csrfRes.headers.get("set-cookie") || "").match(/almeaa_csrf_token=([^;]+)/)?.[1] || "";

  const loginRes = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-csrf-token": csrfBody?.csrfToken || csrfCookie,
      cookie: csrfCookie ? `almeaa_csrf_token=${csrfCookie}` : "",
    },
    body: JSON.stringify(student),
  });
  const payload = await loginRes.json().catch(() => ({}));
  if (!loginRes.ok) throw new Error(`student login failed ${loginRes.status}`);

  const authCookie =
    String(loginRes.headers.get("set-cookie") || "").match(/almeaa_access_token=([^;]+)/)?.[1] ||
    payload?.token ||
    "";
  const user = payload?.user;
  if (!authCookie || !user?.email || !user?.role) {
    throw new Error("student login missing session");
  }

  await context.addCookies([
    {
      name: "almeaa_access_token",
      value: authCookie,
      domain: API_COOKIE_DOMAIN,
      path: "/",
      httpOnly: true,
      secure: API_COOKIE_SECURE,
      sameSite: API_COOKIE_SECURE ? "None" : "Lax",
    },
  ]);

  await context.addInitScript((backendUser) => {
    sessionStorage.setItem(
      "the-hundred-auth-profile",
      JSON.stringify({
        id: String(backendUser.id || backendUser._id || backendUser.email),
        email: backendUser.email,
        displayName: backendUser.name,
        photoURL: backendUser.avatar || "",
        role: backendUser.role,
      }),
    );
  }, user);
}

function normalizeApiPath(rawUrl) {
  try {
    const url = new URL(rawUrl);
    return `${url.pathname}${url.search}`;
  } catch {
    return rawUrl;
  }
}

async function measureRoute(browser, routeSpec) {
  const context = await browser.newContext();
  await login(context);
  const page = await context.newPage();

  const responseTasks = [];
  const records = [];
  const startedAt = performance.now();

  page.on("response", (response) => {
    const task = (async () => {
      const url = response.url();
      let parsed;
      try {
        parsed = new URL(url);
      } catch {
        return;
      }

      const isApi = parsed.origin === API_ORIGIN && parsed.pathname.startsWith("/api/");
      const isFrontend = parsed.origin === FRONTEND_ORIGIN;
      if (!isApi && !isFrontend) return;

      const request = response.request();
      const resourceType = request.resourceType();
      if (resourceType === "eventsource" || resourceType === "websocket") return;

      const rawLength = Number(response.headers()["content-length"] || 0);
      const bytes = Number.isFinite(rawLength) && rawLength > 0 ? rawLength : 0;

      records.push({
        kind: isApi ? "api" : "frontend",
        url: isApi ? normalizeApiPath(url) : parsed.pathname,
        status: response.status(),
        resourceType,
        bytes,
        byteSource: bytes > 0 ? "content-length" : "unobserved",
      });
    })();
    responseTasks.push(task);
  });

  await page.goto(`${BASE_URL}${routeSpec.path}`, {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  await page.waitForTimeout(SETTLE_MS);
  await Promise.allSettled(responseTasks);

  const elapsedMs = Number((performance.now() - startedAt).toFixed(2));
  const apiRecords = records.filter((item) => item.kind === "api");
  const frontendRecords = records.filter((item) => item.kind === "frontend");
  const okApiRecords = apiRecords.filter((item) => item.status >= 200 && item.status < 400);
  const endpointCounts = new Map();

  for (const record of apiRecords) {
    const current = endpointCounts.get(record.url) || {
      url: record.url,
      count: 0,
      bytes: 0,
      statuses: new Set(),
    };
    current.count += 1;
    current.bytes += record.bytes;
    current.statuses.add(record.status);
    endpointCounts.set(record.url, current);
  }

  const result = {
    id: routeSpec.id,
    route: routeSpec.path,
    finalUrl: page.url(),
    settleMs: SETTLE_MS,
    elapsedMs,
    apiRequestCount: apiRecords.length,
    apiSuccessfulRequestCount: okApiRecords.length,
    apiResponseBytes: apiRecords.reduce((sum, item) => sum + item.bytes, 0),
    frontendRequestCount: frontendRecords.length,
    frontendResponseBytes: frontendRecords.reduce((sum, item) => sum + item.bytes, 0),
    totalLocalRequestCount: records.length,
    totalLocalResponseBytes: records.reduce((sum, item) => sum + item.bytes, 0),
    apiEndpoints: [...endpointCounts.values()]
      .map((item) => ({
        url: item.url,
        count: item.count,
        bytes: item.bytes,
        statuses: [...item.statuses].sort((a, b) => a - b),
      }))
      .sort((a, b) => b.bytes - a.bytes || a.url.localeCompare(b.url)),
  };

  await context.close();
  return result;
}

const browser = await chromium.launch({ headless: true });
const results = [];
try {
  for (const routeSpec of routePlan) {
    results.push(await measureRoute(browser, routeSpec));
  }
} finally {
  await browser.close();
}

const totals = results.reduce(
  (summary, result) => {
    summary.apiRequestCount += result.apiRequestCount;
    summary.apiResponseBytes += result.apiResponseBytes;
    summary.totalLocalRequestCount += result.totalLocalRequestCount;
    summary.totalLocalResponseBytes += result.totalLocalResponseBytes;
    return summary;
  },
  { apiRequestCount: 0, apiResponseBytes: 0, totalLocalRequestCount: 0, totalLocalResponseBytes: 0 },
);

const report = {
  kind: "plan3-route-footprint",
  measuredAt: new Date().toISOString(),
  commit: process.env.GIT_COMMIT_SHA || readArg("--commit") || "unknown",
  baseUrl: BASE_URL,
  apiBaseUrl: API_BASE_URL,
  measurementWindow: `domcontentloaded + ${SETTLE_MS}ms`,
  routes: results,
  totals,
};

fs.writeFileSync(OUT_FILE, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify(report, null, 2));
