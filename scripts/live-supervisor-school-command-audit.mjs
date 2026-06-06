import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const BASE_URL = String(process.env.UI_AUDIT_BASE_URL || "https://almeaacodax.vercel.app").replace(/\/$/, "");
const API_BASE_URL = String(process.env.UI_AUDIT_API_BASE_URL || "https://almeaacodax-k2ux.onrender.com/api").replace(/\/$/, "");
const RUN_ID = process.env.SUPERVISOR_SCHOOL_AUDIT_RUN_ID || `supervisor-school-${new Date().toISOString().replace(/[:.]/g, "-")}`;
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
  {
    role: "teacher",
    email: process.env.ROLE_TEACHER_EMAIL || process.env.TEACHER_EMAIL,
    password: process.env.ROLE_TEACHER_PASSWORD || process.env.TEACHER_PASSWORD,
  },
].filter((item, index, items) => {
  if (!item.email || !item.password) return false;
  return items.findIndex((candidate) => String(candidate.email).toLowerCase() === String(item.email).toLowerCase()) === index;
});

const ROUTES = [
  {
    name: "supervisor-overview",
    path: "/admin-dashboard",
    minBodyLength: 900,
    minControlCount: 8,
    expectedTextGroups: [
      ["متوسط الأداء", "متابعة الطلاب", "أضعف المهارات"],
      ["المجموعات", "الطلاب", "تقارير"],
    ],
  },
  {
    name: "school-portal-decision-center",
    path: "/admin-dashboard?tab=school-portal",
    allowScopeNotice: true,
    requireSupervisorScopeCard: true,
    minBodyLength: 1200,
    minControlCount: 12,
    expectedTextGroups: [
      ["مركز قرارات المشرف", "ماذا أفعل الآن", "أدوات سريعة"],
      ["اختبار موجه", "متابعة", "تصدير"],
      ["خطة التدخل", "خطة متابعة", "الفصول"],
    ],
  },
  {
    name: "staff-performance-reports",
    path: "/reports",
    minBodyLength: 1000,
    minControlCount: 8,
    expectedTextGroups: [
      ["تقارير", "الأداء", "المهارات"],
      ["اختبار موجه", "خطة تدخل", "تصدير"],
      ["Excel", "PDF", "متابعة"],
    ],
  },
  {
    name: "directed-quiz-entry",
    path: "/admin-dashboard?tab=quizzes&source=school-portal&mode=central",
    minBodyLength: 900,
    minControlCount: 8,
    expectedTextGroups: [
      ["اختبار", "اختبارات", "الأسئلة"],
      ["موجه", "مركزي"],
    ],
  },
];

function safeName(input) {
  return String(input || "").replace(/[^a-zA-Z0-9_-]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 100) || "page";
}

async function login(page) {
  if (!ROLE_CANDIDATES.length) throw new Error("Missing supervisor/admin/teacher credentials for live supervisor school audit");
  await page.goto(BASE_URL, { waitUntil: "domcontentloaded", timeout: 60000 });

  let lastFailure = "";
  for (const candidate of ROLE_CANDIDATES) {
    const result = await page.evaluate(
      async ({ apiBaseUrl, email, password }) => {
        const csrfResponse = await fetch(`${apiBaseUrl}/auth/csrf-token`, {
          credentials: "include",
          cache: "no-store",
          headers: { accept: "application/json" },
        });
        const csrfPayload = await csrfResponse.json().catch(() => ({}));
        const csrfToken = csrfPayload?.csrfToken || "";
        const loginResponse = await fetch(`${apiBaseUrl}/auth/login`, {
          method: "POST",
          credentials: "include",
          headers: {
            "content-type": "application/json",
            "x-csrf-token": csrfToken,
          },
          body: JSON.stringify({ email, password }),
        });
        const payload = await loginResponse.json().catch(() => ({}));
        if (!loginResponse.ok) return { ok: false, status: loginResponse.status, message: payload?.message || "" };
        const user = payload?.user;
        if (user?.email && user?.role) {
          sessionStorage.setItem(
            "the-hundred-auth-profile",
            JSON.stringify({
              id: String(user.id || user._id || user.email),
              email: user.email,
              displayName: user.name,
              photoURL: user.avatar || "",
              role: user.role,
            }),
          );
          if (csrfToken) sessionStorage.setItem("almeaa:csrf-token", csrfToken);
        }
        return { ok: true, status: loginResponse.status, role: user?.role, email: user?.email };
      },
      { apiBaseUrl: API_BASE_URL, email: candidate.email, password: candidate.password },
    );
    if (result.ok) return { ...result, requestedRole: candidate.role };
    lastFailure = `${candidate.role}: ${result.status} ${result.message}`;
  }
  throw new Error(`Supervisor school audit login failed (${lastFailure})`);
}

async function inspectRoute(page, viewport, routeSpec) {
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
  await page.goto(`${BASE_URL}${routeSpec.path}`, { waitUntil: "networkidle", timeout: 60000 }).catch(async () => {
    await page.goto(`${BASE_URL}${routeSpec.path}`, { waitUntil: "domcontentloaded", timeout: 60000 });
  });
  await page.waitForTimeout(1200);
  page.off("console", onConsole);
  page.off("response", onResponse);

  const screenshot = path.join(OUT_DIR, `${viewport.name}-${safeName(routeSpec.name)}.png`);
  await page.screenshot({ path: screenshot, fullPage: true });

  const state = await page.evaluate((spec) => {
    const text = document.body.innerText || "";
    const controls = Array.from(document.querySelectorAll("a[href], button, [role='button'], input, select, textarea")).filter((el) => {
      const rect = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      return rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden";
    });
    const missingTextGroups = (spec.expectedTextGroups || [])
      .map((group) => group.filter((fragment) => !text.includes(fragment)))
      .filter((missing) => missing.length > 0);
    return {
      href: location.href,
      title: document.title,
      bodyLength: text.length,
      controlCount: controls.length,
      actionControlCount: controls.filter((el) => /(تصدير|اختبار|متابعة|خطة|PDF|Excel|نسخ|إرسال|فتح)/i.test(el.innerText || el.getAttribute("aria-label") || "")).length,
      missingTextGroups,
      horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth + 24,
      scrollWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth,
      hasLoginForm: Boolean(document.querySelector('input[type="password"]')) && /(تسجيل الدخول|Login|البريد الإلكتروني)/.test(text),
      hasBlockingError: /(تعذر|خطأ غير متوقع|غير مصرح|ليس لديك صلاحية|Authentication required|Invalid CSRF)/i.test(text),
      hasScopeNotice: /(لا يوجد نطاق إشراف ظاهر|لم يتم ربط حسابك بمدرسة|اطلب من المدير ربطك بالمدرسة)/.test(text),
      hasSupervisorScopeCard: Boolean(document.querySelector('[data-testid="supervisor-school-scope-card"]')),
      hasSupervisorScopeActionGuide: Boolean(document.querySelector('[data-testid="supervisor-scope-action-guide"]')),
    };
  }, routeSpec);

  const layoutFailure = viewport.name === "mobile" && state.horizontalOverflow ? `horizontal overflow ${state.scrollWidth}/${state.viewportWidth}` : "";
  const scopeCardFailure =
    routeSpec.requireSupervisorScopeCard && !state.hasScopeNotice && (!state.hasSupervisorScopeCard || !state.hasSupervisorScopeActionGuide)
      ? "missing supervisor scope card"
      : "";
  const scopeNoticeOk =
    Boolean(routeSpec.allowScopeNotice) &&
    state.hasScopeNotice &&
    state.controlCount >= 3 &&
    !state.hasLoginForm &&
    !state.hasBlockingError &&
    !layoutFailure &&
    !scopeCardFailure &&
    network5xx.length === 0;
  const pass =
    scopeNoticeOk ||
    (state.bodyLength >= routeSpec.minBodyLength &&
      state.controlCount >= routeSpec.minControlCount &&
      state.actionControlCount >= 2 &&
      state.missingTextGroups.length === 0 &&
      !state.hasLoginForm &&
      !state.hasBlockingError &&
      !layoutFailure &&
      !scopeCardFailure &&
      network5xx.length === 0);

  return {
    name: routeSpec.name,
    viewport: viewport.name,
    path: routeSpec.path,
    status: pass ? "PASS" : "FAIL",
    note: scopeNoticeOk ? "scope-notice-visible-for-current-supervisor" : "",
    screenshot,
    consoleErrors,
    network5xx,
    layoutFailure,
    scopeCardFailure,
    ...state,
  };
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ locale: "ar-SA", timezoneId: "Asia/Riyadh" });
  const page = await context.newPage();
  const results = [];
  let loginResult = null;

  try {
    loginResult = await login(page);
    for (const viewport of VIEWPORTS) {
      for (const routeSpec of ROUTES) {
        results.push(await inspectRoute(page, viewport, routeSpec));
      }
    }
  } finally {
    await context.close().catch(() => {});
    await browser.close().catch(() => {});
  }

  const summary = {
    generatedAt: new Date().toISOString(),
    baseUrl: BASE_URL,
    apiBaseUrl: API_BASE_URL,
    runId: RUN_ID,
    login: loginResult,
    total: results.length,
    pass: results.filter((row) => row.status === "PASS").length,
    fail: results.filter((row) => row.status === "FAIL").length,
    results,
  };

  fs.writeFileSync(path.join(OUT_DIR, "supervisor-school-command-live-audit.json"), JSON.stringify(summary, null, 2), "utf8");
  fs.writeFileSync(
    path.join(OUT_DIR, "SUMMARY.md"),
    [
      "# Supervisor School Command Live Audit",
      "",
      `- Generated: ${summary.generatedAt}`,
      `- Base URL: ${summary.baseUrl}`,
      `- Logged role: ${summary.login?.role || "unknown"}`,
      `- Total checked: ${summary.total}`,
      `- PASS: ${summary.pass}`,
      `- FAIL: ${summary.fail}`,
      "",
      "## Results",
      ...results.map((row) => `- [${row.status}] ${row.viewport}/${row.name}: controls=${row.controlCount}, actions=${row.actionControlCount}, missingTextGroups=${row.missingTextGroups.length}, overflow=${row.layoutFailure || "none"}, url=${row.href}`),
      "",
    ].join("\n"),
    "utf8",
  );

  console.log(`Supervisor school command live audit complete: ${OUT_DIR}`);
  console.log(`PASS ${summary.pass}/${summary.total}`);
  if (summary.fail > 0) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
