import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const BASE_URL = String(process.env.UI_AUDIT_BASE_URL || "https://almeaacodax.vercel.app").replace(/\/$/, "");
const API_BASE_URL = String(process.env.UI_AUDIT_API_BASE_URL || "https://almeaacodax-k2ux.onrender.com/api").replace(/\/$/, "");
const RUN_ID = process.env.SUPERVISOR_EXECUTIVE_SNAPSHOT_AUDIT_RUN_ID || `supervisor-executive-snapshot-${new Date().toISOString().replace(/[:.]/g, "-")}`;
const OUT_DIR = path.resolve("audit-artifacts", "ui-audit-exhaustive", RUN_ID);
const CREDENTIALS_FILE = process.env.ROLE_CREDENTIALS_FILE || path.resolve("audit-artifacts", "ROLE_CREDENTIALS.env");
const ALLOW_ADMIN_FALLBACK = process.env.SUPERVISOR_EXECUTIVE_SNAPSHOT_ALLOW_ADMIN_FALLBACK === "1";
const VIEWPORTS = [
  { name: "desktop", width: 1440, height: 1000 },
  { name: "mobile", width: 390, height: 844 },
];

fs.mkdirSync(OUT_DIR, { recursive: true });

if (fs.existsSync(CREDENTIALS_FILE)) {
  for (const line of fs.readFileSync(CREDENTIALS_FILE, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const [key, ...rest] = trimmed.split("=");
    if (key && rest.length && !process.env[key]) process.env[key] = rest.join("=").trim();
  }
}

const ROLE_CANDIDATES = [
  {
    role: "school-supervisor",
    email: process.env.ROLE_SCHOOL_SUPERVISOR_EMAIL || "supervisor.school@almeaa.local",
    password: process.env.ROLE_SCHOOL_SUPERVISOR_PASSWORD || "Supervisor@123",
  },
  {
    role: "supervisor",
    email: process.env.ROLE_SUPERVISOR_EMAIL || process.env.SUPERVISOR_EMAIL,
    password: process.env.ROLE_SUPERVISOR_PASSWORD || process.env.SUPERVISOR_PASSWORD,
  },
  {
    role: "group-supervisor",
    email: "supervisor.group@almeaa.local",
    password: "Supervisor@123",
  },
  {
    role: "admin",
    email: process.env.ROLE_ADMIN_EMAIL || process.env.SMOKE_ADMIN_EMAIL || process.env.ADMIN_EMAIL,
    password: process.env.ROLE_ADMIN_PASSWORD || process.env.SMOKE_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD,
  },
].filter((candidate, index, candidates) => {
  if (!candidate.email || !candidate.password) return false;
  if (candidate.role === "admin" && !ALLOW_ADMIN_FALLBACK) return false;
  return candidates.findIndex((item) => String(item.email).toLowerCase() === String(candidate.email).toLowerCase()) === index;
});

const REQUIRED_SELECTORS = [
  '[data-testid="supervisor-executive-decision-snapshot"]',
  '[data-testid="supervisor-best-class"]',
  '[data-testid="supervisor-weakest-class"]',
  '[data-testid="supervisor-shared-weak-skill"]',
];

function safeName(input) {
  return String(input || "").replace(/[^a-zA-Z0-9_-]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 100) || "page";
}

async function authenticate(context, candidate) {
  const csrfRes = await fetch(`${API_BASE_URL}/auth/csrf-token`, { headers: { accept: "application/json" } });
  const csrfBody = await csrfRes.json().catch(() => ({}));
  const csrfCookie = String(csrfRes.headers.get("set-cookie") || "").match(/almeaa_csrf_token=([^;]+)/)?.[1] || "";
  const loginRes = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-csrf-token": csrfBody?.csrfToken || csrfCookie,
      cookie: csrfCookie ? `almeaa_csrf_token=${csrfCookie}` : "",
    },
    body: JSON.stringify({ email: candidate.email, password: candidate.password }),
  });
  const payload = await loginRes.json().catch(() => ({}));
  if (!loginRes.ok) return { ok: false, reason: `${candidate.role} api login ${loginRes.status}` };
  const authCookie = String(loginRes.headers.get("set-cookie") || "").match(/almeaa_access_token=([^;]+)/)?.[1] || payload?.token || "";
  const user = payload?.user;
  if (!authCookie || !user?.email || !user?.role) return { ok: false, reason: `${candidate.role} login missing session` };

  await context.addCookies([
    {
      name: "almeaa_access_token",
      value: authCookie,
      domain: "almeaacodax-k2ux.onrender.com",
      path: "/",
      httpOnly: true,
      secure: true,
      sameSite: "None",
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

  return { ok: true, requestedRole: candidate.role, userRole: user.role, email: user.email };
}

async function inspectSnapshot(page, viewport) {
  await page.setViewportSize({ width: viewport.width, height: viewport.height });
  const consoleErrors = [];
  const network5xx = [];
  const onConsole = (message) => {
    if (message.type() === "error") consoleErrors.push(message.text().slice(0, 300));
  };
  const onResponse = (response) => {
    if (response.status() >= 500) network5xx.push({ status: response.status(), url: response.url() });
  };

  page.on("console", onConsole);
  page.on("response", onResponse);
  await page.goto(`${BASE_URL}/admin-dashboard?tab=school-portal`, { waitUntil: "networkidle", timeout: 60000 }).catch(async () => {
    await page.goto(`${BASE_URL}/admin-dashboard?tab=school-portal`, { waitUntil: "domcontentloaded", timeout: 60000 });
  });
  await page.waitForTimeout(1200);

  const beforeClickScreenshot = path.join(OUT_DIR, `${viewport.name}-school-portal-executive-snapshot.png`);
  await page.screenshot({ path: beforeClickScreenshot, fullPage: true });

  const state = await page.evaluate((requiredSelectors) => {
    const text = document.body.innerText || "";
    const missingSelectors = requiredSelectors.filter((selector) => !document.querySelector(selector));
    const snapshot = document.querySelector('[data-testid="supervisor-executive-decision-snapshot"]');
    const button = snapshot?.querySelector("button");
    const visibleControls = Array.from(document.querySelectorAll("a[href], button, [role='button'], input, select, textarea")).filter((el) => {
      const rect = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      return rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden";
    });
    return {
      href: location.href,
      bodyLength: text.length,
      controlCount: visibleControls.length,
      missingSelectors,
      hasDecisionButton: Boolean(button),
      snapshotTextLength: snapshot?.textContent?.trim().length || 0,
      hasScopeNotice: /لا يوجد نطاق إشراف|لم يتم ربط حسابك بمدرسة|ربطك بالمدرسة/.test(text),
      hasLoginForm: Boolean(document.querySelector('input[type="password"]')),
      hasBlockingError: /Authentication required|Invalid CSRF|غير مصرح|ليس لديك صلاحية|خطأ غير متوقع/.test(text),
      horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth + 24,
      scrollWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth,
    };
  }, REQUIRED_SELECTORS);

  let clickResult = { ok: false, href: page.url(), reason: "not-clicked" };
  if (state.hasDecisionButton && state.missingSelectors.length === 0) {
    await page.locator('[data-testid="supervisor-executive-decision-snapshot"] button').first().click();
    await page.waitForTimeout(900);
    clickResult = await page.evaluate(() => {
      const href = location.href;
      const hash = location.hash || "";
      return {
        ok:
          hash.includes("tab=quizzes") &&
          hash.includes("mode=central") &&
          hash.includes("source=school-portal") &&
          hash.includes("intent=intervention"),
        href,
        hash,
      };
    });
  }

  page.off("console", onConsole);
  page.off("response", onResponse);

  const layoutFailure = viewport.name === "mobile" && state.horizontalOverflow ? `horizontal overflow ${state.scrollWidth}/${state.viewportWidth}` : "";
  const pass =
    state.missingSelectors.length === 0 &&
    state.hasDecisionButton &&
    state.snapshotTextLength >= 80 &&
    clickResult.ok &&
    !state.hasScopeNotice &&
    !state.hasLoginForm &&
    !state.hasBlockingError &&
    !layoutFailure &&
    network5xx.length === 0;

  return {
    viewport: viewport.name,
    status: pass ? "PASS" : "FAIL",
    screenshot: beforeClickScreenshot,
    layoutFailure,
    clickResult,
    consoleErrors,
    network5xx,
    ...state,
  };
}

async function main() {
  if (!ROLE_CANDIDATES.length) throw new Error("Missing supervisor/admin credentials for executive snapshot live audit");
  const browser = await chromium.launch({ headless: true });
  const attempts = [];
  let loginResult = null;
  let results = [];

  try {
    for (const candidate of ROLE_CANDIDATES) {
      const context = await browser.newContext({ locale: "ar-SA", timezoneId: "Asia/Riyadh" });
      const page = await context.newPage();
      const authResult = await authenticate(context, candidate);
      if (!authResult.ok) {
        attempts.push({ candidate: candidate.role, status: "auth-failed", reason: authResult.reason });
        await context.close().catch(() => {});
        continue;
      }

      const candidateResults = [];
      for (const viewport of VIEWPORTS) {
        candidateResults.push(await inspectSnapshot(page, viewport));
      }
      const unscoped = candidateResults.every((row) => row.hasScopeNotice && row.missingSelectors.length === REQUIRED_SELECTORS.length);
      attempts.push({
        candidate: candidate.role,
        userRole: authResult.userRole,
        status: unscoped ? "unscoped" : "inspected",
        pass: candidateResults.filter((row) => row.status === "PASS").length,
        fail: candidateResults.filter((row) => row.status === "FAIL").length,
      });

      await context.close().catch(() => {});
      if (unscoped && candidate !== ROLE_CANDIDATES[ROLE_CANDIDATES.length - 1]) continue;

      loginResult = authResult;
      results = candidateResults;
      break;
    }
  } finally {
    await browser.close().catch(() => {});
  }

  if (!loginResult) throw new Error(`Executive snapshot audit could not find an inspectable account: ${JSON.stringify(attempts)}`);

  const summary = {
    generatedAt: new Date().toISOString(),
    baseUrl: BASE_URL,
    apiBaseUrl: API_BASE_URL,
    runId: RUN_ID,
    login: loginResult,
    attempts,
    total: results.length,
    pass: results.filter((row) => row.status === "PASS").length,
    fail: results.filter((row) => row.status === "FAIL").length,
    results,
  };

  fs.writeFileSync(path.join(OUT_DIR, "supervisor-executive-snapshot-live-audit.json"), JSON.stringify(summary, null, 2), "utf8");
  fs.writeFileSync(
    path.join(OUT_DIR, "SUMMARY.md"),
    [
      "# Supervisor Executive Snapshot Live Audit",
      "",
      `- Generated: ${summary.generatedAt}`,
      `- Base URL: ${summary.baseUrl}`,
      `- Logged role: ${summary.login?.userRole || "unknown"} (${summary.login?.requestedRole || "unknown"})`,
      `- Total checked: ${summary.total}`,
      `- PASS: ${summary.pass}`,
      `- FAIL: ${summary.fail}`,
      "",
      "## Results",
      ...results.map((row) => `- [${row.status}] ${row.viewport}: selectorsMissing=${row.missingSelectors.length}, clickOk=${row.clickResult.ok}, overflow=${row.layoutFailure || "none"}, url=${row.clickResult.href || row.href}`),
      "",
    ].join("\n"),
    "utf8",
  );

  console.log(`Supervisor executive snapshot live audit complete: ${OUT_DIR}`);
  console.log(`PASS ${summary.pass}/${summary.total}`);
  if (summary.fail > 0) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
