import { performance } from "node:perf_hooks";
import fs from "node:fs";
import path from "node:path";

const API_BASE = String(process.env.SMOKE_API_BASE_URL || process.env.LOAD_API_BASE || "https://almeaacodax.vercel.app/api").replace(/\/$/, "");
const STUDENT_EMAIL = String(process.env.SMOKE_STUDENT_EMAIL || process.env.ROLE_STUDENT_EMAIL || "student.a@almeaa.local").trim();
const STUDENT_PASSWORD = String(process.env.SMOKE_STUDENT_PASSWORD || process.env.ROLE_STUDENT_PASSWORD || "Student@123");
const EXPECTED_SHA = String(process.env.EXPECTED_RELEASE_SHA || "").trim();
const LEVELS = [10, 25, 50];
const ENDPOINTS = [
  { id: "me", path: "/auth/me" },
  { id: "results", path: "/quizzes/results" },
  { id: "courses", path: "/courses?limit=100" },
  { id: "learning-bootstrap", path: "/content/bootstrap?scope=learning&phase=core" },
];
const MAX_ERROR_RATE = 0.02;
const MAX_P95_MS = 2500;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const percentile = (values, p) => {
  if (!values.length) return 0;
  const sorted = [...values].sort((a,b) => a-b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return Number(sorted[index].toFixed(2));
};

async function csrfContext() {
  const response = await fetch(`${API_BASE}/auth/csrf-token`, { headers: { Accept: "application/json", "user-agent": "almeaa-plan2-auth-load/1.0" } });
  const raw = await response.text();
  let payload = {};
  try { payload = JSON.parse(raw); } catch {}
  const setCookie = String(response.headers.get("set-cookie") || "");
  const match = setCookie.match(/almeaa_csrf_token=([^;]+)/);
  const cookie = String(match?.[1] || "").trim();
  const token = String(payload?.csrfToken || cookie).trim();
  if (!response.ok || !cookie || !token) throw new Error(`csrf failed ${response.status}`);
  return { cookie, token };
}

async function loginOnce() {
  const csrf = await csrfContext();
  const response = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-csrf-token": csrf.token,
      Cookie: `almeaa_csrf_token=${csrf.cookie}`,
      "user-agent": "almeaa-plan2-auth-load/1.0",
    },
    body: JSON.stringify({ email: STUDENT_EMAIL, password: STUDENT_PASSWORD }),
  });
  const raw = await response.text();
  let payload = {};
  try { payload = JSON.parse(raw); } catch {}
  const cookieHeader = String(response.headers.get("set-cookie") || "");
  const cookieToken = String(cookieHeader.match(/almeaa_access_token=([^;]+)/)?.[1] || "").trim();
  const token = String(payload?.token || cookieToken).trim();
  if (!response.ok || !token) throw new Error(`student login failed ${response.status}`);
  if (String(payload?.user?.role || "") !== "student") throw new Error(`expected student role, got ${payload?.user?.role || "unknown"}`);
  return token;
}

async function requestOne(endpoint, token) {
  const started = performance.now();
  let response;
  try {
    response = await fetch(`${API_BASE}${endpoint.path}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        "user-agent": "almeaa-plan2-auth-load/1.0",
      },
    });
    const body = await response.arrayBuffer();
    return {
      ok: response.ok,
      status: response.status,
      durationMs: performance.now() - started,
      bytes: body.byteLength,
      renderOriginSeen: Boolean(response.headers.get("x-render-origin-server")),
    };
  } catch (error) {
    return { ok:false, status:0, durationMs:performance.now()-started, bytes:0, renderOriginSeen:false, error:error instanceof Error ? error.message : String(error) };
  }
}

function summarize(level, endpoint, records) {
  const durations = records.map((x) => x.durationMs);
  const failed = records.filter((x) => !x.ok);
  const statuses = Array.from(new Set(records.map((x) => x.status))).sort((a,b) => a-b);
  const result = {
    level,
    endpoint: endpoint.path,
    totalRequests: records.length,
    successfulRequests: records.length - failed.length,
    failedRequests: failed.length,
    errorRate: Number((failed.length / records.length).toFixed(4)),
    p50DurationMs: percentile(durations, 50),
    p95DurationMs: percentile(durations, 95),
    p99DurationMs: percentile(durations, 99),
    avgResponseBytes: Math.round(records.reduce((sum,x)=>sum+x.bytes,0)/records.length),
    statuses,
    renderOriginSeen: records.some((x)=>x.renderOriginSeen),
  };
  result.pass = result.errorRate <= MAX_ERROR_RATE && result.p95DurationMs <= MAX_P95_MS;
  return result;
}

const token = await loginOnce();
const results = [];
for (const level of LEVELS) {
  for (const endpoint of ENDPOINTS) {
    const batch = await Promise.all(Array.from({ length: level }, () => requestOne(endpoint, token)));
    results.push(summarize(level, endpoint, batch));
    await sleep(500);
  }
  await sleep(1000);
}

const failed = results.filter((x) => !x.pass);
const report = {
  kind: "plan2-authenticated-read-load",
  measuredAt: new Date().toISOString(),
  releaseSha: EXPECTED_SHA || null,
  apiBase: API_BASE,
  userRole: "student",
  methodPolicy: "single login then GET-only; no submit/write operations",
  concurrencyLevels: LEVELS,
  totalReadRequests: results.reduce((sum,x)=>sum+x.totalRequests,0),
  thresholds: { maxErrorRate: MAX_ERROR_RATE, maxP95DurationMs: MAX_P95_MS },
  limits: "Bounded authenticated read-load evidence only. Not a 500/1000-user capacity certification.",
  status: failed.length ? "FAIL" : "PASS",
  results,
};

const outDir = path.resolve("audit-artifacts/production-auth-read-load");
fs.mkdirSync(outDir, { recursive:true });
const outPath = path.join(outDir, "summary.json");
fs.writeFileSync(outPath, JSON.stringify(report, null, 2) + "\n", "utf8");
console.log(JSON.stringify(report, null, 2));
if (failed.length) process.exit(1);
