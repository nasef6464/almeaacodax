import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const BASE_URL = String(process.env.UI_AUDIT_BASE_URL || "https://almeaacodax.vercel.app").replace(/\/$/, "");
const API_BASE_URL = String(process.env.UI_AUDIT_API_BASE_URL || "https://almeaacodax-k2ux.onrender.com/api").replace(/\/$/, "");
const RUN_ID = process.env.REPORT_ACTIONS_AUDIT_RUN_ID || `report-actions-${new Date().toISOString().replace(/[:.]/g, "-")}`;
const OUT_DIR = path.resolve("audit-artifacts", "ui-audit-exhaustive", RUN_ID);
const CREDENTIALS_FILE = process.env.ROLE_CREDENTIALS_FILE || path.resolve("audit-artifacts", "ROLE_CREDENTIALS.env");
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

const roles = [
  {
    role: "student",
    email: process.env.ROLE_STUDENT_EMAIL,
    password: process.env.ROLE_STUDENT_PASSWORD,
    requiredSelectors: [
      '[data-testid="student-next-action-strip"]',
      '[data-testid="student-next-action-primary"]',
      '[data-testid="student-report-export-pdf"]',
      '[data-testid="student-report-export-excel"]',
      '[data-testid="student-report-depth-toggle"]',
    ],
  },
  {
    role: "parent",
    email: process.env.ROLE_PARENT_EMAIL,
    password: process.env.ROLE_PARENT_PASSWORD,
    requiredSelectors: [
      '[data-testid="parent-report-copy"]',
      '[data-testid="parent-report-share"]',
      '[data-testid="parent-report-pdf"]',
    ],
  },
  {
    role: "teacher",
    email: process.env.ROLE_TEACHER_EMAIL,
    password: process.env.ROLE_TEACHER_PASSWORD,
    requiredSelectors: [
      '[data-testid="staff-intervention-create"]',
      '[data-testid="staff-management-export"]',
      '[data-testid="staff-intervention-alert-send"]',
      '[data-testid="staff-students-export"]',
      '[data-testid="directed-quiz-analysis-export"]',
    ],
  },
  {
    role: "supervisor",
    email: process.env.ROLE_SUPERVISOR_EMAIL,
    password: process.env.ROLE_SUPERVISOR_PASSWORD,
    requiredSelectors: [
      '[data-testid="staff-intervention-create"]',
      '[data-testid="staff-management-export"]',
      '[data-testid="staff-intervention-alert-send"]',
      '[data-testid="staff-students-export"]',
      '[data-testid="directed-quiz-analysis-export"]',
    ],
  },
  {
    role: "admin",
    email: process.env.ROLE_ADMIN_EMAIL,
    password: process.env.ROLE_ADMIN_PASSWORD,
    requiredSelectors: [
      '[data-testid="staff-intervention-create"]',
      '[data-testid="staff-management-export"]',
      '[data-testid="staff-intervention-alert-send"]',
      '[data-testid="staff-students-export"]',
      '[data-testid="directed-quiz-analysis-export"]',
    ],
  },
];

function safeName(input) {
  return String(input || "").replace(/[^a-zA-Z0-9_-]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 100) || "page";
}

async function login(page, role) {
  if (!role.email || !role.password) return { ok: false, reason: "missing credentials" };
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
    body: JSON.stringify({ email: role.email, password: role.password }),
  });
  const payload = await loginRes.json().catch(() => ({}));
  if (!loginRes.ok) return { ok: false, reason: `api login ${loginRes.status}` };
  const authCookie = String(loginRes.headers.get("set-cookie") || "").match(/almeaa_access_token=([^;]+)/)?.[1] || payload?.token || "";
  const user = payload?.user;
  if (!authCookie || !user?.email || !user?.role) return { ok: false, reason: "api login missing session" };

  await page.context().addCookies([
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
  await page.context().addInitScript((backendUser) => {
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
  return { ok: true, userRole: user.role };
}

async function inspectReports(page, role, viewport) {
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
  await page.goto(`${BASE_URL}/reports`, { waitUntil: "networkidle", timeout: 60000 }).catch(async () => {
    await page.goto(`${BASE_URL}/reports`, { waitUntil: "domcontentloaded", timeout: 60000 });
  });
  await page.waitForTimeout(1000);
  page.off("console", onConsole);
  page.off("response", onResponse);

  const roleDir = path.join(OUT_DIR, role.role);
  fs.mkdirSync(roleDir, { recursive: true });
  const screenshot = path.join(roleDir, `${safeName(`${viewport.name}-reports-actions`)}.png`);
  await page.screenshot({ path: screenshot, fullPage: true });

  const state = await page.evaluate((requiredSelectors) => {
    const text = document.body.innerText || "";
    const visibleSelectorState = requiredSelectors.map((selector) => {
      const element = document.querySelector(selector);
      if (!element) return { selector, exists: false, visible: false, disabled: false, text: "" };
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      return {
        selector,
        exists: true,
        visible: rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden",
        disabled: Boolean(element.disabled || element.getAttribute("aria-disabled") === "true"),
        text: element.textContent?.trim().slice(0, 80) || "",
      };
    });
    return {
      href: location.href,
      title: document.title,
      bodyLength: text.length,
      horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth + 24,
      scrollWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth,
      selectorState: visibleSelectorState,
      hasLoginForm: Boolean(document.querySelector('input[type="password"]')) && /تسجيل الدخول|Login|البريد الإلكتروني/.test(text),
    };
  }, role.requiredSelectors);

  const missingSelectors = state.selectorState.filter((item) => !item.exists || !item.visible).map((item) => item.selector);
  const layoutFailure = viewport.name === "mobile" && state.horizontalOverflow ? `horizontal overflow ${state.scrollWidth}/${state.viewportWidth}` : "";
  const pass =
    !state.hasLoginForm &&
    state.bodyLength > 300 &&
    missingSelectors.length === 0 &&
    !layoutFailure &&
    network5xx.length === 0;

  return {
    role: role.role,
    viewport: viewport.name,
    status: pass ? "PASS" : "FAIL",
    screenshot,
    consoleErrors,
    network5xx,
    missingSelectors,
    layoutFailure,
    ...state,
  };
}

const browser = await chromium.launch({ headless: true });
const results = [];
const loginResults = [];

try {
  for (const role of roles) {
    const context = await browser.newContext({ locale: "ar-SA", timezoneId: "Asia/Riyadh" });
    const page = await context.newPage();
    const loginResult = await login(page, role);
    loginResults.push({ role: role.role, ok: loginResult.ok, reason: loginResult.reason || "", userRole: loginResult.userRole || "" });
    if (!loginResult.ok) {
      results.push({ role: role.role, status: "BLOCKED", reason: loginResult.reason || "login failed" });
      await context.close();
      continue;
    }
    for (const viewport of VIEWPORTS) {
      results.push(await inspectReports(page, role, viewport));
    }
    await context.close();
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
  loginResults,
  results,
};

fs.writeFileSync(path.join(OUT_DIR, "report-actions-audit.json"), JSON.stringify(summary, null, 2), "utf8");
fs.writeFileSync(
  path.join(OUT_DIR, "SUMMARY.md"),
  [
    "# Live Report Actions Audit",
    "",
    `- Generated: ${summary.generatedAt}`,
    `- Base URL: ${summary.baseUrl}`,
    `- Total: ${summary.total}`,
    `- PASS: ${summary.pass}`,
    `- FAIL: ${summary.fail}`,
    `- BLOCKED: ${summary.blocked}`,
    "",
    "## Login",
    ...loginResults.map((item) => `- ${item.ok ? "PASS" : "BLOCKED"} ${item.role}${item.reason ? ` - ${item.reason}` : ""}`),
    "",
    "## Actions",
    ...results.map((item) => `- [${item.status}] ${item.role} ${item.viewport || "desktop"}: missing=${item.missingSelectors?.join(",") || "none"}, overflow=${item.layoutFailure || "none"}, network5xx=${item.network5xx?.length || 0}`),
    "",
  ].join("\n"),
  "utf8",
);

console.log(JSON.stringify({ outDir: OUT_DIR, total: summary.total, pass: summary.pass, fail: summary.fail, blocked: summary.blocked }, null, 2));
if (summary.fail || summary.blocked) process.exit(1);
