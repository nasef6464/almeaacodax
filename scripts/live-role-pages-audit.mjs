import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const BASE_URL = String(process.env.UI_AUDIT_BASE_URL || "https://almeaacodax.vercel.app").replace(/\/$/, "");
const API_BASE_URL = String(process.env.UI_AUDIT_API_BASE_URL || "https://almeaacodax-k2ux.onrender.com/api").replace(/\/$/, "");
const RUN_ID = process.env.ROLE_PAGES_AUDIT_RUN_ID || `role-pages-${new Date().toISOString().replace(/[:.]/g, "-")}`;
const OUT_DIR = path.resolve("audit-artifacts", "ui-audit-exhaustive", RUN_ID);
const CREDENTIALS_FILE = process.env.ROLE_CREDENTIALS_FILE || path.resolve("audit-artifacts", "ROLE_CREDENTIALS.env");
const PAGE_TIMEOUT_MS = Number(process.env.UI_AUDIT_PAGE_TIMEOUT_MS || 45000);
const LOADING_TIMEOUT_MS = 10000;
const BASE_ORIGIN = new URL(BASE_URL);
const USE_API_BRIDGE = ["127.0.0.1", "localhost"].includes(BASE_ORIGIN.hostname);
const viewports = [
  { name: "desktop", width: 1440, height: 1000 },
  { name: "mobile", width: 390, height: 844 },
];
const ACTION_HINT_PATTERN = /(ابدأ|استمر|افتح|فتح|تابع|تقرير|خطة|اختبار|تدريب|تصدير|PDF|Excel|حفظ|إضافة|تعديل|إرسال|طلب|عرض|سجل|نسخ|متابعة)/i;
const LOADING_STATE_PATTERN = /(جار[ٍي]?\s+تحميل|Loading(?:…|\.{3})?)/i;
const MOJIBAKE_PATTERN = /[\u00c3\u00d8\u00d9][^\n\r]{0,80}[\u00c3\u00d8\u00d9]/;

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
    role: "guest",
    pages: [
      { path: "/", expect: "public" },
      { path: "/pricing", expect: "public" },
      { path: "/blog", expect: "public" },
      { path: "/reports", expect: "guarded" },
      { path: "/my-requests", expect: "guarded" },
    ],
  },
  {
    role: "student",
    email: process.env.ROLE_STUDENT_EMAIL,
    password: process.env.ROLE_STUDENT_PASSWORD,
    pages: [
      { path: "/dashboard", expect: "private" },
      { path: "/my-quizzes", expect: "private" },
      { path: "/reports", expect: "private" },
      { path: "/plan", expect: "private" },
      { path: "/profile", expect: "private" },
      { path: "/pricing", expect: "public" },
    ],
  },
  {
    role: "admin",
    email: process.env.ROLE_ADMIN_EMAIL,
    password: process.env.ROLE_ADMIN_PASSWORD,
    pages: [
      { path: "/admin-dashboard", expect: "private", minBodyLength: 80 },
      { path: "/admin-dashboard?tab=paths", expect: "private", minBodyLength: 80 },
      { path: "/reports", expect: "private" },
      { path: "/profile", expect: "private" },
    ],
  },
  {
    role: "parent",
    email: process.env.ROLE_PARENT_EMAIL,
    password: process.env.ROLE_PARENT_PASSWORD,
    pages: [
      { path: "/parent-dashboard", expect: "private" },
      { path: "/reports", expect: "private" },
      { path: "/profile", expect: "private" },
    ],
  },
  {
    role: "teacher",
    email: process.env.ROLE_TEACHER_EMAIL,
    password: process.env.ROLE_TEACHER_PASSWORD,
    pages: [
      { path: "/admin-dashboard", expect: "private" },
      { path: "/reports", expect: "private" },
      { path: "/profile", expect: "private" },
    ],
  },
  {
    role: "supervisor",
    email: process.env.ROLE_SUPERVISOR_EMAIL,
    password: process.env.ROLE_SUPERVISOR_PASSWORD,
    pages: [
      { path: "/admin-dashboard", expect: "private" },
      { path: "/reports", expect: "private" },
      { path: "/profile", expect: "private" },
    ],
  },
];

function safeName(input) {
  return String(input || "").replace(/[^a-zA-Z0-9_-]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 100) || "root";
}

async function installApiBridge(context) {
  if (!USE_API_BRIDGE) return;

  await context.route("**/api/**", async (route) => {
    const request = route.request();
    const originalUrl = new URL(request.url());
    const apiIndex = originalUrl.pathname.indexOf("/api/");
    if (apiIndex < 0) return route.continue();

    const apiPath = originalUrl.pathname.slice(apiIndex + 4);
    const targetUrl = `${API_BASE_URL}${apiPath}${originalUrl.search}`;
    const headers = { ...request.headers() };
    delete headers.host;
    delete headers.origin;
    delete headers.referer;
    delete headers["content-length"];

    try {
      const response = await fetch(targetUrl, {
        method: request.method(),
        headers,
        body: ["GET", "HEAD"].includes(request.method()) ? undefined : request.postDataBuffer() || undefined,
        redirect: "manual",
      });
      const responseHeaders = Object.fromEntries(response.headers.entries());
      delete responseHeaders["content-encoding"];
      delete responseHeaders["content-length"];
      delete responseHeaders["transfer-encoding"];
      await route.fulfill({
        status: response.status,
        headers: responseHeaders,
        body: Buffer.from(await response.arrayBuffer()),
      });
    } catch (error) {
      console.error(`API bridge failed for ${targetUrl}:`, error instanceof Error ? error.message : String(error));
      await route.abort("failed");
    }
  });
}

async function login(page, role) {
  if (role.role === "guest") return { ok: true, skipped: true };
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

  const authCookies = [
    {
      name: "almeaa_access_token",
      value: authCookie,
      domain: "almeaacodax-k2ux.onrender.com",
      path: "/",
      httpOnly: true,
      secure: true,
      sameSite: "None",
    },
  ];
  if (USE_API_BRIDGE) {
    authCookies.push({
      name: "almeaa_access_token",
      value: authCookie,
      url: BASE_ORIGIN.origin,
      httpOnly: true,
      secure: BASE_ORIGIN.protocol === "https:",
      sameSite: "Lax",
    });
  }
  await page.context().addCookies(authCookies);
  await page.goto(BASE_URL, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.evaluate((backendUser) => {
    sessionStorage.setItem(
      "the-hundred-auth-profile",
      JSON.stringify({
        id: String(backendUser.id || backendUser._id || backendUser.email),
        email: backendUser.email,
        displayName: backendUser.name,
        photoURL: backendUser.avatar || `https://i.pravatar.cc/150?u=${encodeURIComponent(backendUser.email)}`,
        role: backendUser.role,
      }),
    );
  }, user);
  return { ok: true, url: page.url(), role: user.role };
}

async function inspectPage(page, role, pageSpec, viewport) {
  const consoleErrors = [];
  const network4xx = [];
  const network5xx = [];
  const onConsole = (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text().slice(0, 300));
  };
  const onResponse = (response) => {
    if (response.status() >= 400 && response.status() < 500) network4xx.push({ status: response.status(), url: response.url() });
    if (response.status() >= 500) network5xx.push({ status: response.status(), url: response.url() });
  };
  page.on("console", onConsole);
  page.on("response", onResponse);
  await page.setViewportSize({ width: viewport.width, height: viewport.height });

  const url = `${BASE_URL}${pageSpec.path}`;
  const roleDir = path.join(OUT_DIR, role.role);
  fs.mkdirSync(roleDir, { recursive: true });
  const screenshot = path.join(roleDir, `${safeName(`${viewport.name}-${pageSpec.path}`)}.png`);
  let navigationError = "";
  let navigationWarning = "";

  try {
    await page.goto(url, { waitUntil: "networkidle", timeout: PAGE_TIMEOUT_MS }).catch(async (error) => {
      navigationWarning = String(error?.message || error || "").slice(0, 500);
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: PAGE_TIMEOUT_MS });
    });
    await page.waitForTimeout(800);
    await page.waitForFunction(
      ({ source, flags }) => !new RegExp(source, flags).test(document.body.innerText || ""),
      { source: LOADING_STATE_PATTERN.source, flags: LOADING_STATE_PATTERN.flags },
      { timeout: LOADING_TIMEOUT_MS },
    ).catch(() => undefined);
  } catch (error) {
    navigationError = String(error?.message || error || "").slice(0, 500);
  } finally {
    page.off("console", onConsole);
    page.off("response", onResponse);
  }

  await page.screenshot({ path: screenshot, fullPage: true }).catch(() => undefined);

  const state = await page.evaluate(({ actionPatternSource, actionPatternFlags, loadingPatternSource, loadingPatternFlags, mojibakePatternSource }) => {
    const text = document.body.innerText || "";
    const controls = Array.from(document.querySelectorAll("a[href], button, [role='button'], input, select, textarea")).filter((el) => {
      const rect = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      return rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden";
    });
    const actionPattern = new RegExp(actionPatternSource, actionPatternFlags);
    const loadingPattern = new RegExp(loadingPatternSource, loadingPatternFlags);
    const mojibakePattern = new RegExp(mojibakePatternSource);
    const actionControlCount = controls.filter((el) => {
      const label = `${el.innerText || ""} ${el.getAttribute("aria-label") || ""} ${el.getAttribute("title") || ""}`.trim();
      return actionPattern.test(label);
    }).length;
    return {
      href: location.href,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      scrollWidth: document.documentElement.scrollWidth,
      horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth + 24,
      bodyLength: text.length,
      controlCount: controls.length,
      actionControlCount,
      hasLoadingState: loadingPattern.test(text),
      hasMojibakeText: mojibakePattern.test(text),
      hasLoginForm: Boolean(document.querySelector('input[type="password"]')) && /تسجيل الدخول|Login|البريد الإلكتروني/.test(text),
      hasGuardText: /تسجيل الدخول|ليس لديك صلاحية|غير مصرح|Authentication|Login/.test(text),
      hasRoleContent: /لوحة|تقرير|اختبار|خطة|حساب|ملف|ولي|طالب|معلم|مشرف|دورة|عضوية|إدارة|مسار|محتوى|مدرسة/.test(text),
      title: document.title,
    };
  }, {
    actionPatternSource: ACTION_HINT_PATTERN.source,
    actionPatternFlags: ACTION_HINT_PATTERN.flags,
    loadingPatternSource: LOADING_STATE_PATTERN.source,
    loadingPatternFlags: LOADING_STATE_PATTERN.flags,
    mojibakePatternSource: MOJIBAKE_PATTERN.source,
  }).catch((error) => ({
    href: page.url(),
    viewportWidth: viewport.width,
    viewportHeight: viewport.height,
    scrollWidth: 0,
    horizontalOverflow: false,
    bodyLength: 0,
    controlCount: 0,
    actionControlCount: 0,
    hasLoadingState: false,
    hasMojibakeText: false,
    hasLoginForm: false,
    hasGuardText: false,
    hasRoleContent: false,
    title: "",
    evaluateError: String(error?.message || error || "").slice(0, 500),
  }));

  const isGuardedOk = pageSpec.expect === "guarded" && (state.hasLoginForm || state.hasGuardText || state.href.includes("login"));
  const hasActionHint = state.actionControlCount > 0;
  const isPublicOk = pageSpec.expect === "public" && !state.hasLoginForm && state.bodyLength > 250 && state.controlCount > 0 && hasActionHint;
  const privateMinBodyLength = Number(pageSpec.minBodyLength || 250);
  const isPrivateOk = pageSpec.expect === "private" && !state.hasLoginForm && state.bodyLength >= privateMinBodyLength && state.controlCount > 0 && hasActionHint && state.hasRoleContent;
  const isOpenOk = isPublicOk || isPrivateOk;
  const layoutFailure = viewport.name === "mobile" && state.horizontalOverflow ? `horizontal overflow ${state.scrollWidth}/${state.viewportWidth}` : "";
  const textFailure = state.hasMojibakeText ? "visible mojibake text" : "";
  const loadingFailure = state.hasLoadingState ? "visible loading state did not settle" : "";
  const actionFailure = pageSpec.expect !== "guarded" && !hasActionHint ? "missing visible action hint" : "";
  const status = navigationError || layoutFailure || textFailure || loadingFailure || actionFailure || network5xx.length || !(isGuardedOk || isOpenOk) ? "FAIL" : "PASS";

  return {
    role: role.role,
    viewport: viewport.name,
    path: pageSpec.path,
    expect: pageSpec.expect,
    status,
    screenshot,
    consoleErrors,
    network4xx,
    network5xx,
    navigationError,
    navigationWarning,
    layoutFailure,
    textFailure,
    loadingFailure,
    actionFailure,
    ...state,
  };
}

const browser = await chromium.launch({ headless: true });
const results = [];
const loginResults = [];

try {
  for (const role of roles) {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
      locale: "ar-SA",
      ignoreHTTPSErrors: process.env.UI_AUDIT_IGNORE_HTTPS_ERRORS === "1",
    });
    await installApiBridge(context);
    const page = await context.newPage();
    const loginResult = await login(page, role);
    loginResults.push({ role: role.role, ok: loginResult.ok, skipped: loginResult.skipped || false, reason: loginResult.reason || "" });

    if (!loginResult.ok) {
      for (const pageSpec of role.pages) {
        results.push({ role: role.role, path: pageSpec.path, expect: pageSpec.expect, status: "BLOCKED", reason: loginResult.reason || "login failed" });
      }
      await context.close();
      continue;
    }

    for (const pageSpec of role.pages) {
      for (const viewport of viewports) {
        results.push(await inspectPage(page, role, pageSpec, viewport));
      }
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
  viewports,
  total: results.length,
  pass: results.filter((item) => item.status === "PASS").length,
  fail: results.filter((item) => item.status === "FAIL").length,
  blocked: results.filter((item) => item.status === "BLOCKED").length,
  loginResults,
  results,
};

fs.writeFileSync(path.join(OUT_DIR, "role-pages-audit.json"), JSON.stringify(summary, null, 2), "utf8");
fs.writeFileSync(
  path.join(OUT_DIR, "SUMMARY.md"),
  [
    "# Live Role Pages Audit",
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
    "## Pages",
    ...results.map((item) => `- [${item.status}] ${item.role} ${item.viewport || "desktop"} ${item.path}: expect=${item.expect}, controls=${item.controlCount ?? "-"}, actions=${item.actionControlCount ?? "-"}, loading=${item.hasLoadingState ? "yes" : "no"}, mojibake=${item.hasMojibakeText ? "yes" : "no"}, overflow=${item.horizontalOverflow ? "yes" : "no"}, console=${item.consoleErrors?.length || 0}, network4xx=${item.network4xx?.length || 0}, network5xx=${item.network5xx?.length || 0}${item.loadingFailure ? `, loadingFailure=${item.loadingFailure}` : ""}${item.actionFailure ? `, action=${item.actionFailure}` : ""}${item.textFailure ? `, text=${item.textFailure}` : ""}${item.layoutFailure ? `, layout=${item.layoutFailure}` : ""}${item.navigationError ? `, navigation=${item.navigationError}` : ""}${item.navigationWarning ? `, warning=${item.navigationWarning}` : ""}`),
    "",
  ].join("\n"),
  "utf8",
);

console.log(JSON.stringify({ outDir: OUT_DIR, total: summary.total, pass: summary.pass, fail: summary.fail, blocked: summary.blocked }, null, 2));
if (summary.fail || summary.blocked) process.exit(1);
