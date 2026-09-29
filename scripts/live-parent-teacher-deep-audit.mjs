import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const BASE_URL = String(process.env.UI_AUDIT_BASE_URL || "https://almeaacodax.vercel.app").replace(/\/$/, "");
const API_BASE_URL = String(process.env.UI_AUDIT_API_BASE_URL || "https://almeaacodax-codex.onrender.com/api").replace(/\/$/, "");
const RUN_ID = process.env.ROLE_PAGES_AUDIT_RUN_ID
  ? `${process.env.ROLE_PAGES_AUDIT_RUN_ID}-v2`
  : `deep-role-v2-${new Date().toISOString().replace(/[:.]/g, "-")}`;
const OUT_DIR = path.resolve("audit-artifacts", "ui-audit-exhaustive", RUN_ID);
const CREDENTIALS_FILE = process.env.ROLE_CREDENTIALS_FILE || path.resolve("audit-artifacts", "ROLE_CREDENTIALS.env");
const VIEWPORTS = [
  { name: "desktop", width: 1440, height: 1000 },
  { name: "mobile", width: 390, height: 844 },
];
const LOADING = /(جار[ٍي]?\s+تحميل|Loading(?:…|\.{3})?)/i;
const MOJIBAKE = /[\u00c3\u00d8\u00d9][^\n\r]{0,80}[\u00c3\u00d8\u00d9]/;

fs.mkdirSync(OUT_DIR, { recursive: true });

if (fs.existsSync(CREDENTIALS_FILE)) {
  for (const line of fs.readFileSync(CREDENTIALS_FILE, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const [key, ...rest] = trimmed.split("=");
    if (key && rest.length && !process.env[key]) process.env[key] = rest.join("=").trim();
  }
}

const roleConfigs = {
  parent: {
    email: process.env.ROLE_PARENT_EMAIL,
    password: process.env.ROLE_PARENT_PASSWORD,
    checkpoints: [
      { name: "parent-overview", path: "/parent-dashboard", expectAny: ["متابعة الأبناء", "نتائج الأبناء"], minBody: 350 },
      { name: "parent-results", path: "/dashboard?tab=parent-results", expectAny: ["نتائج الأبناء"], minBody: 350 },
      { name: "parent-skills", path: "/dashboard?tab=parent-skills", expectAny: ["المهارات الضعيفة"], minBody: 350 },
      {
        name: "parent-simple-report",
        path: "/dashboard?tab=reports",
        expectAny: ["تقرير", "الأداء"],
        selectors: ['[data-testid="parent-report-copy"]', '[data-testid="parent-report-share"]', '[data-testid="parent-report-pdf"]'],
        minBody: 350,
      },
      {
        name: "parent-reports-route",
        path: "/reports",
        expectAny: ["تقرير", "الأداء"],
        selectors: ['[data-testid="parent-report-copy"]', '[data-testid="parent-report-share"]', '[data-testid="parent-report-pdf"]'],
        minBody: 350,
      },
      { name: "parent-profile", path: "/profile", expectAny: ["الملف", "الحساب", "الاسم"], minBody: 250 },
    ],
  },
  teacher: {
    email: process.env.ROLE_TEACHER_EMAIL,
    password: process.env.ROLE_TEACHER_PASSWORD,
    checkpoints: [
      { name: "teacher-school-overview", path: "/school-teacher-dashboard?tab=overview", expectAny: ["لوحة معلم المدرسة", "نظرة عامة"], minBody: 500 },
      { name: "teacher-smart-classroom", path: "/school-teacher-dashboard?tab=smart-classroom", expectAny: ["إدارة الحصص والجدول"], minBody: 450 },
      { name: "teacher-prepared-bank", path: "/school-teacher-dashboard?tab=prepared-questions", expectAny: ["بنك التحضير المسبق"], minBody: 450 },
      { name: "teacher-school-reports", path: "/school-teacher-dashboard?tab=reports", expectAny: ["تقارير الحصص والمهارات"], minBody: 450 },
      { name: "teacher-skills-radar", path: "/school-teacher-dashboard?tab=skills-radar", expectAny: ["رادار فجوات الفصول"], minBody: 450 },
      { name: "teacher-assessments", path: "/school-teacher-dashboard?tab=assessments", expectAny: ["اختبارات المدرسة"], minBody: 450 },
      {
        name: "teacher-platform-reports",
        path: "/reports",
        expectAny: ["تقارير", "المهارات"],
        selectors: [
          '[data-testid="staff-intervention-create"]',
          '[data-testid="staff-management-export"]',
          '[data-testid="staff-intervention-alert-send"]',
          '[data-testid="staff-students-export"]',
        ],
        minBody: 500,
      },
      { name: "teacher-profile", path: "/profile", expectAny: ["الملف", "الحساب", "الاسم"], minBody: 250 },
    ],
  },
};

function safeName(value) {
  return String(value || "").replace(/[^a-zA-Z0-9_-]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 120) || "step";
}

async function login(context, config) {
  if (!config.email || !config.password) return { ok: false, reason: "missing credentials" };

  const csrfRes = await fetch(`${API_BASE_URL}/auth/csrf-token`, {
    headers: { accept: "application/json" },
    signal: AbortSignal.timeout(20_000),
  });
  const csrfBody = await csrfRes.json().catch(() => ({}));
  const csrfCookie = String(csrfRes.headers.get("set-cookie") || "").match(/almeaa_csrf_token=([^;]+)/)?.[1] || "";
  const loginRes = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-csrf-token": csrfBody?.csrfToken || csrfCookie,
      cookie: csrfCookie ? `almeaa_csrf_token=${csrfCookie}` : "",
    },
    body: JSON.stringify({ email: config.email, password: config.password }),
    signal: AbortSignal.timeout(20_000),
  });
  const payload = await loginRes.json().catch(() => ({}));
  if (!loginRes.ok) return { ok: false, reason: `api login ${loginRes.status}` };

  const accessToken =
    String(loginRes.headers.get("set-cookie") || "").match(/almeaa_access_token=([^;]+)/)?.[1] ||
    payload?.token ||
    "";
  const user = payload?.user;
  if (!accessToken || !user?.email || !user?.role) return { ok: false, reason: "login missing session" };

  const apiOrigin = new URL(API_BASE_URL).origin;
  const apiUrl = new URL(apiOrigin);
  await context.addCookies([
    {
      name: "almeaa_access_token",
      value: accessToken,
      domain: apiUrl.hostname,
      path: "/",
      httpOnly: true,
      secure: apiUrl.protocol === "https:",
      sameSite: apiUrl.protocol === "https:" ? "None" : "Lax",
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

  return { ok: true, userRole: user.role, userEmail: user.email };
}

async function inspectCheckpoint(page, role, checkpoint, viewport) {
  await page.setViewportSize({ width: viewport.width, height: viewport.height });
  const consoleErrors = [];
  const api4xx = [];
  const api5xx = [];

  const onConsole = (message) => {
    if (message.type() === "error") consoleErrors.push(message.text().slice(0, 500));
  };
  const onResponse = (response) => {
    const url = response.url();
    const isApi = url.includes("/api/") || url.startsWith(API_BASE_URL);
    if (!isApi) return;
    const status = response.status();
    if (status >= 400 && status < 500) api4xx.push({ status, url });
    if (status >= 500) api5xx.push({ status, url });
  };

  page.on("console", onConsole);
  page.on("response", onResponse);

  let navigationError = "";
  try {
    await page.goto(`${BASE_URL}${checkpoint.path}`, { waitUntil: "domcontentloaded", timeout: 60_000 });
    await page.waitForTimeout(900);
    await page
      .waitForFunction(
        ({ source, flags }) => !new RegExp(source, flags).test(document.body.innerText || ""),
        { source: LOADING.source, flags: LOADING.flags },
        { timeout: 10_000 },
      )
      .catch(() => undefined);
  } catch (error) {
    navigationError = String(error?.message || error || "").slice(0, 500);
  } finally {
    page.off("console", onConsole);
    page.off("response", onResponse);
  }

  const roleDir = path.join(OUT_DIR, role);
  fs.mkdirSync(roleDir, { recursive: true });
  const screenshot = path.join(roleDir, `${safeName(`${viewport.name}-${checkpoint.name}`)}.png`);
  await page.screenshot({ path: screenshot, fullPage: true }).catch(() => undefined);

  const state = await page.evaluate(
    ({ expectAny, selectors, mojibakeSource }) => {
      const bodyText = document.body.innerText || "";
      const selectorState = (selectors || []).map((selector) => {
        const element = document.querySelector(selector);
        if (!element) return { selector, exists: false, visible: false, disabled: false };
        const rect = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        return {
          selector,
          exists: true,
          visible: rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden",
          disabled: Boolean(element.disabled || element.getAttribute("aria-disabled") === "true"),
        };
      });
      return {
        href: location.href,
        title: document.title,
        bodyLength: bodyText.length,
        hasExpectedText: (expectAny || []).length === 0 || (expectAny || []).some((value) => bodyText.includes(value)),
        hasLoginForm: Boolean(document.querySelector('input[type="password"]')) && /تسجيل الدخول|Login|البريد الإلكتروني/.test(bodyText),
        hasLoadingState: /(جار[ٍي]?\s+تحميل|Loading(?:…|\.{3})?)/i.test(bodyText),
        hasMojibake: new RegExp(mojibakeSource).test(bodyText),
        horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth + 24,
        scrollWidth: document.documentElement.scrollWidth,
        viewportWidth: window.innerWidth,
        selectorState,
      };
    },
    {
      expectAny: checkpoint.expectAny || [],
      selectors: checkpoint.selectors || [],
      mojibakeSource: MOJIBAKE.source,
    },
  ).catch((error) => ({
    href: page.url(),
    title: "",
    bodyLength: 0,
    hasExpectedText: false,
    hasLoginForm: false,
    hasLoadingState: false,
    hasMojibake: false,
    horizontalOverflow: false,
    scrollWidth: 0,
    viewportWidth: viewport.width,
    selectorState: [],
    evaluateError: String(error?.message || error || "").slice(0, 500),
  }));

  const missingSelectors = state.selectorState.filter((item) => !item.exists || !item.visible).map((item) => item.selector);
  const failures = [];
  if (navigationError) failures.push(`navigation: ${navigationError}`);
  if (state.hasLoginForm) failures.push("unexpected login form");
  if (state.bodyLength < Number(checkpoint.minBody || 250)) failures.push(`thin body ${state.bodyLength}`);
  if (!state.hasExpectedText) failures.push("expected role content missing");
  if (state.hasLoadingState) failures.push("loading state did not settle");
  if (state.hasMojibake) failures.push("visible mojibake");
  if (viewport.name === "mobile" && state.horizontalOverflow) failures.push(`horizontal overflow ${state.scrollWidth}/${state.viewportWidth}`);
  if (missingSelectors.length) failures.push(`missing selectors: ${missingSelectors.join(", ")}`);
  if (api4xx.length) failures.push(`unexpected API 4xx: ${api4xx.length}`);
  if (api5xx.length) failures.push(`API 5xx: ${api5xx.length}`);

  return {
    role,
    viewport: viewport.name,
    checkpoint: checkpoint.name,
    path: checkpoint.path,
    status: failures.length ? "FAIL" : "PASS",
    failures,
    screenshot,
    consoleErrors,
    api4xx,
    api5xx,
    missingSelectors,
    ...state,
  };
}

const browser = await chromium.launch({ headless: true });
const results = [];
const logins = [];

try {
  for (const [role, config] of Object.entries(roleConfigs)) {
    for (const viewport of VIEWPORTS) {
      const context = await browser.newContext({
        locale: "ar-SA",
        timezoneId: "Asia/Riyadh",
        viewport: { width: viewport.width, height: viewport.height },
      });
      const page = await context.newPage();
      const loginResult = await login(context, config);
      if (loginResult.ok && String(loginResult.userRole) !== String(role)) {
        loginResult.ok = false;
        loginResult.reason = `role mismatch: expected ${role}, got ${loginResult.userRole}`;
      }
      logins.push({ role, viewport: viewport.name, ...loginResult });

      if (!loginResult.ok) {
        for (const checkpoint of config.checkpoints) {
          results.push({
            role,
            viewport: viewport.name,
            checkpoint: checkpoint.name,
            path: checkpoint.path,
            status: "BLOCKED",
            failures: [loginResult.reason || "login failed"],
          });
        }
        await context.close();
        continue;
      }

      for (const checkpoint of config.checkpoints) {
        results.push(await inspectCheckpoint(page, role, checkpoint, viewport));
      }
      await context.close();
    }
  }
} finally {
  await browser.close();
}

const summary = {
  generatedAt: new Date().toISOString(),
  baseUrl: BASE_URL,
  apiBaseUrl: API_BASE_URL,
  runId: RUN_ID,
  total: results.length,
  pass: results.filter((item) => item.status === "PASS").length,
  fail: results.filter((item) => item.status === "FAIL").length,
  blocked: results.filter((item) => item.status === "BLOCKED").length,
  roles: Object.fromEntries(
    Object.keys(roleConfigs).map((role) => [
      role,
      {
        total: results.filter((item) => item.role === role).length,
        pass: results.filter((item) => item.role === role && item.status === "PASS").length,
        fail: results.filter((item) => item.role === role && item.status === "FAIL").length,
        blocked: results.filter((item) => item.role === role && item.status === "BLOCKED").length,
      },
    ]),
  ),
  logins,
  results,
};

fs.writeFileSync(path.join(OUT_DIR, "deep-role-v2-parent-teacher.json"), JSON.stringify(summary, null, 2), "utf8");
fs.writeFileSync(
  path.join(OUT_DIR, "SUMMARY.md"),
  [
    "# Deep Role Journey V2 — Parent + Teacher",
    "",
    `- Generated: ${summary.generatedAt}`,
    `- Base URL: ${summary.baseUrl}`,
    `- API: ${summary.apiBaseUrl}`,
    `- Total: ${summary.total}`,
    `- PASS: ${summary.pass}`,
    `- FAIL: ${summary.fail}`,
    `- BLOCKED: ${summary.blocked}`,
    "",
    "## Role totals",
    ...Object.entries(summary.roles).map(([role, value]) => `- ${role}: ${value.pass}/${value.total} PASS, fail=${value.fail}, blocked=${value.blocked}`),
    "",
    "## Checkpoints",
    ...results.map((item) => `- [${item.status}] ${item.role} ${item.viewport} ${item.checkpoint} ${item.path}${item.failures?.length ? ` — ${item.failures.join("; ")}` : ""}`),
    "",
  ].join("\n"),
  "utf8",
);

console.log(JSON.stringify({
  outDir: OUT_DIR,
  total: summary.total,
  pass: summary.pass,
  fail: summary.fail,
  blocked: summary.blocked,
  roles: summary.roles,
}, null, 2));

if (summary.fail || summary.blocked) process.exit(1);
