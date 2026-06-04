import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const BASE_URL = String(process.env.UI_AUDIT_BASE_URL || "https://almeaacodax.vercel.app").replace(/\/$/, "");
const API_BASE_URL = String(process.env.UI_AUDIT_API_BASE_URL || "https://almeaacodax-k2ux.onrender.com/api").replace(/\/$/, "");
const RUN_ID =
  process.env.BARCODE_LIVE_AUDIT_RUN_ID ||
  process.env.BARCODE_PUBLIC_TEST_AUDIT_RUN_ID ||
  `barcode-public-tests-${new Date().toISOString().replace(/[:.]/g, "-")}`;
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
    role: "admin",
    email: process.env.ROLE_ADMIN_EMAIL || process.env.SMOKE_ADMIN_EMAIL || process.env.ADMIN_EMAIL,
    password: process.env.ROLE_ADMIN_PASSWORD || process.env.SMOKE_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD,
  },
  {
    role: "supervisor",
    email: process.env.ROLE_SUPERVISOR_EMAIL || process.env.SUPERVISOR_EMAIL,
    password: process.env.ROLE_SUPERVISOR_PASSWORD || process.env.SUPERVISOR_PASSWORD,
  },
  {
    role: "teacher",
    email: process.env.ROLE_TEACHER_EMAIL || process.env.TEACHER_EMAIL,
    password: process.env.ROLE_TEACHER_PASSWORD || process.env.TEACHER_PASSWORD,
  },
].filter((item) => item.email && item.password);

function safeName(input) {
  return String(input || "").replace(/[^a-zA-Z0-9_-]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 100) || "page";
}

async function login(page) {
  if (!ROLE_CANDIDATES.length) throw new Error("Missing admin/supervisor/teacher credentials for barcode live audit");
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
  throw new Error(`Barcode live audit login failed (${lastFailure})`);
}

async function listPublicTests(page) {
  return page.evaluate(async ({ apiBaseUrl }) => {
    const response = await fetch(`${apiBaseUrl}/public-tests/admin?limit=20`, {
      credentials: "include",
      cache: "no-store",
      headers: { accept: "application/json" },
    });
    const payload = await response.json().catch(() => ({}));
    return {
      ok: response.ok,
      status: response.status,
      items: Array.isArray(payload?.items) ? payload.items : [],
      message: payload?.message || "",
    };
  }, { apiBaseUrl: API_BASE_URL });
}

async function listApprovedQuestions(page) {
  return page.evaluate(async ({ apiBaseUrl }) => {
    const response = await fetch(`${apiBaseUrl}/quizzes/questions?approvalStatus=approved&summary=true&limit=80`, {
      credentials: "include",
      cache: "no-store",
      headers: { accept: "application/json" },
    });
    const payload = await response.json().catch(() => ({}));
    const items = Array.isArray(payload) ? payload : Array.isArray(payload?.data) ? payload.data : Array.isArray(payload?.items) ? payload.items : [];
    return {
      ok: response.ok,
      status: response.status,
      items,
      message: payload?.message || "",
    };
  }, { apiBaseUrl: API_BASE_URL });
}

function selectQuestionGroup(questions) {
  const groups = new Map();
  for (const question of questions || []) {
    const pathId = String(question.pathId || "");
    const subjectId = String(question.subject || question.subjectId || "");
    const questionId = String(question.id || question._id || "");
    if (!pathId || !subjectId || !questionId) continue;
    const key = `${pathId}::${subjectId}`;
    const current = groups.get(key) || { pathId, subjectId, questions: [] };
    current.questions.push(question);
    groups.set(key, current);
  }
  return [...groups.values()].sort((a, b) => b.questions.length - a.questions.length)[0] || null;
}

async function createAuditPublicTest(page) {
  const questions = await listApprovedQuestions(page);
  if (!questions.ok) {
    return { ok: false, status: questions.status, message: `approved questions list failed: ${questions.message || questions.status}` };
  }
  const group = selectQuestionGroup(questions.items);
  if (!group || group.questions.length < 1) {
    return { ok: false, status: 0, message: "no approved question group available for barcode audit" };
  }
  const selectedQuestions = group.questions.slice(0, Math.min(5, group.questions.length));
  return page.evaluate(
    async ({ apiBaseUrl, group, selectedQuestions }) => {
      const now = Date.now();
      const csrfToken = sessionStorage.getItem("almeaa:csrf-token") || "";
      const response = await fetch(`${apiBaseUrl}/public-tests/admin`, {
        method: "POST",
        credentials: "include",
        cache: "no-store",
        headers: {
          "content-type": "application/json",
          accept: "application/json",
          ...(csrfToken ? { "x-csrf-token": csrfToken } : {}),
        },
        body: JSON.stringify({
          title: `اختبار باركود تدقيق ${new Date(now).toLocaleString("ar-SA")}`,
          description: "اختبار تدقيق آلي للتأكد من أن رابط الباركود العام يعمل بدون تسجيل.",
          pathId: group.pathId,
          subjectId: group.subjectId,
          sectionId: String(selectedQuestions[0]?.sectionId || ""),
          skillIds: [...new Set(selectedQuestions.flatMap((question) => Array.isArray(question.skillIds) ? question.skillIds.map(String) : []))],
          questionIds: selectedQuestions.map((question) => String(question.id || question._id)),
          testKind: "quick",
          status: "active",
          showResultToStudent: true,
          collectSchool: true,
          collectClassroom: true,
          settings: {
            showExplanations: true,
            showAnswers: true,
            showResultsReport: true,
            maxAttempts: 20,
            passingScore: 60,
            timeLimit: 20,
            randomizeQuestions: false,
            randomizeOptions: false,
            showProgressBar: true,
            requireAnswerBeforeNext: false,
            allowQuestionReview: true,
            optionLayout: "auto",
          },
          startsAt: null,
          endsAt: null,
          maxSubmissions: null,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      return {
        ok: response.ok,
        status: response.status,
        message: payload?.message || "",
        test: payload?.test || null,
        publicUrl: payload?.publicUrl || "",
      };
    },
    { apiBaseUrl: API_BASE_URL, group, selectedQuestions },
  );
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
  await page.waitForTimeout(1000);
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
    const requiredSelectors = spec.requiredSelectors || [];
    return {
      href: location.href,
      title: document.title,
      bodyLength: text.length,
      controlCount: controls.length,
      missingSelectors: requiredSelectors.filter((selector) => !document.querySelector(selector)),
      horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth + 24,
      scrollWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth,
      hasLoginForm: Boolean(document.querySelector('input[type="password"]')) && /تسجيل الدخول|Login|البريد الإلكتروني/.test(text),
      hasBlockingError: /تعذر|خطأ غير متوقع|غير مصرح|ليس لديك صلاحية|Authentication required|Invalid CSRF/i.test(text),
    };
  }, routeSpec);

  const layoutFailure = viewport.name === "mobile" && state.horizontalOverflow ? `horizontal overflow ${state.scrollWidth}/${state.viewportWidth}` : "";
  const pass =
    state.bodyLength >= (routeSpec.minBodyLength || 400) &&
    state.controlCount >= (routeSpec.minControlCount || 3) &&
    state.missingSelectors.length === 0 &&
    !state.hasLoginForm &&
    !state.hasBlockingError &&
    !layoutFailure &&
    network5xx.length === 0;

  return {
    name: routeSpec.name,
    viewport: viewport.name,
    status: pass ? "PASS" : "FAIL",
    screenshot,
    consoleErrors,
    network5xx,
    layoutFailure,
    ...state,
  };
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ locale: "ar-SA", timezoneId: "Asia/Riyadh" });
  const page = await context.newPage();
  const results = [];
  let loginResult = null;
  let publicTests = { ok: false, status: 0, items: [] };
  let selectedTest = null;
  let createdAuditTest = null;

  try {
    loginResult = await login(page);
    publicTests = await listPublicTests(page);
    if (!publicTests.ok) throw new Error(`Public barcode admin list failed ${publicTests.status}: ${publicTests.message}`);
    selectedTest = publicTests.items.find((item) => item.status === "active" && item.slug && Number(item.questionCount || 0) > 0) || null;
    if (!selectedTest) {
      createdAuditTest = await createAuditPublicTest(page);
      if (!createdAuditTest.ok || !createdAuditTest.test?.slug) {
        throw new Error(`Unable to create a live barcode audit test (${createdAuditTest.status || 0}: ${createdAuditTest.message || "unknown"})`);
      }
      selectedTest = {
        id: createdAuditTest.test.id,
        slug: createdAuditTest.test.slug,
        title: createdAuditTest.test.title,
        status: createdAuditTest.test.status,
        questionCount: Array.isArray(createdAuditTest.test.questionIds) ? createdAuditTest.test.questionIds.length : 1,
      };
    }

    for (const viewport of VIEWPORTS) {
      results.push(
        await inspectRoute(page, viewport, {
          name: "admin-barcode-tests",
          path: "/admin-dashboard?tab=barcode-tests",
          minBodyLength: 900,
          minControlCount: 12,
          requiredSelectors: [
            '[data-testid="barcode-test-kind-selector"]',
            '[data-testid="barcode-kind-quick"]',
            '[data-testid="barcode-kind-mock"]',
            '[data-testid="barcode-path-select"]',
            '[data-testid="barcode-subject-select"]',
            '[data-testid="barcode-real-test-settings"]',
            '[data-testid="barcode-question-center-filter"]',
            '[data-testid="barcode-create-real-test"]',
            '[data-testid="barcode-required-identity-note"]',
          ],
        }),
      );

      if (selectedTest) {
        results.push(
          await inspectRoute(page, viewport, {
            name: "public-barcode-test",
            path: `/barcode-test/${encodeURIComponent(selectedTest.slug)}`,
            minBodyLength: 600,
            minControlCount: 5,
            requiredSelectors: [
              '[data-testid="barcode-public-real-test-shell"]',
              '[data-testid="barcode-public-test-header"]',
              '[data-testid="barcode-public-identity-fields"]',
              '[data-testid="barcode-public-question-list"]',
              '[data-testid="barcode-public-submit"]',
            ],
          }),
        );
      }
    }
  } finally {
    await context.close().catch(() => {});
    await browser.close().catch(() => {});
  }

  const skippedPublic = selectedTest ? 0 : VIEWPORTS.length;
  const summary = {
    generatedAt: new Date().toISOString(),
    baseUrl: BASE_URL,
    apiBaseUrl: API_BASE_URL,
    runId: RUN_ID,
    login: loginResult,
    listedPublicTests: publicTests.items?.length || 0,
    createdAuditTest: createdAuditTest?.test ? { id: createdAuditTest.test.id, slug: createdAuditTest.test.slug } : null,
    selectedPublicTest: selectedTest ? { id: selectedTest.id, slug: selectedTest.slug, questionCount: selectedTest.questionCount } : null,
    total: results.length,
    pass: results.filter((row) => row.status === "PASS").length,
    fail: results.filter((row) => row.status === "FAIL").length,
    skippedPublic,
    results,
  };

  fs.writeFileSync(path.join(OUT_DIR, "barcode-public-tests-live-audit.json"), JSON.stringify(summary, null, 2), "utf8");
  fs.writeFileSync(
    path.join(OUT_DIR, "SUMMARY.md"),
    [
      "# Barcode Public Tests Live Audit",
      "",
      `- Generated: ${summary.generatedAt}`,
      `- Base URL: ${summary.baseUrl}`,
      `- Logged role: ${summary.login?.role || "unknown"}`,
      `- Listed public tests: ${summary.listedPublicTests}`,
      `- Created audit test: ${summary.createdAuditTest?.slug || "no"}`,
      `- Selected public test: ${summary.selectedPublicTest?.slug || "none"}`,
      `- Total checked: ${summary.total}`,
      `- PASS: ${summary.pass}`,
      `- FAIL: ${summary.fail}`,
      `- Public page skipped: ${summary.skippedPublic}`,
      "",
      "## Results",
      ...results.map((row) => `- [${row.status}] ${row.viewport}/${row.name}: controls=${row.controlCount}, missing=${row.missingSelectors.length}, overflow=${row.layoutFailure || "none"}, url=${row.href}`),
      "",
    ].join("\n"),
    "utf8",
  );

  console.log(`Barcode public tests live audit complete: ${OUT_DIR}`);
  console.log(`PASS ${summary.pass}/${summary.total}; skipped public=${summary.skippedPublic}`);
  if (summary.fail > 0) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
