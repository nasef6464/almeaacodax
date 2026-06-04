import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const BASE_URL = String(process.env.UI_AUDIT_BASE_URL || "https://almeaacodax.vercel.app").replace(/\/$/, "");
const API_BASE_URL = String(process.env.UI_AUDIT_API_BASE_URL || "https://almeaacodax-k2ux.onrender.com/api").replace(/\/$/, "");
const RUN_ID = process.env.STUDENT_LEARNING_AUDIT_RUN_ID || `student-learning-${new Date().toISOString().replace(/[:.]/g, "-")}`;
const OUT_DIR = path.resolve("audit-artifacts", "ui-audit-exhaustive", RUN_ID);
const CREDENTIALS_FILE = process.env.ROLE_CREDENTIALS_FILE || path.resolve("audit-artifacts", "ROLE_CREDENTIALS.env");
const TARGET_PATH_ID = process.env.SMOKE_STUDENT_JOURNEY_PATH_ID || "p_1777779639431";
const TARGET_SUBJECT_ID = process.env.SMOKE_STUDENT_JOURNEY_SUBJECT_ID || "sub_1777779748206";

fs.mkdirSync(OUT_DIR, { recursive: true });

if (fs.existsSync(CREDENTIALS_FILE)) {
  for (const line of fs.readFileSync(CREDENTIALS_FILE, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const [key, ...rest] = trimmed.split("=");
    if (key && rest.length && !process.env[key]) process.env[key] = rest.join("=").trim();
  }
}

function cookieValue(headers, name) {
  return String(headers.get("set-cookie") || "").match(new RegExp(`${name}=([^;]+)`))?.[1] || "";
}

async function apiLogin() {
  const email = process.env.ROLE_STUDENT_EMAIL || process.env.STUDENT_EMAIL;
  const password = process.env.ROLE_STUDENT_PASSWORD || process.env.STUDENT_PASSWORD;
  if (!email || !password) throw new Error("Missing student credentials");

  const csrfRes = await fetch(`${API_BASE_URL}/auth/csrf-token`, { headers: { accept: "application/json" } });
  const csrfBody = await csrfRes.json().catch(() => ({}));
  const csrfCookie = cookieValue(csrfRes.headers, "almeaa_csrf_token");
  const loginRes = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-csrf-token": csrfBody?.csrfToken || csrfCookie,
      cookie: csrfCookie ? `almeaa_csrf_token=${csrfCookie}` : "",
    },
    body: JSON.stringify({ email, password }),
  });
  const body = await loginRes.json().catch(() => ({}));
  if (!loginRes.ok) throw new Error(`student login failed ${loginRes.status}`);
  const authCookie = cookieValue(loginRes.headers, "almeaa_access_token") || body?.token || "";
  if (!authCookie || !body?.user) throw new Error("student login missing session");
  return { authCookie, csrfCookie, csrfToken: csrfBody?.csrfToken || csrfCookie, user: body.user };
}

async function apiGet(pathname) {
  const response = await fetch(`${API_BASE_URL}${pathname}`, { headers: { accept: "application/json", "cache-control": "no-store" } });
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(`${pathname} returned ${response.status}`);
  return body;
}

const idOf = (item) => String(item?.id || item?._id || "").trim();
const visible = (item) => item?.showOnPlatform !== false && item?.isPublished !== false && (!item?.approvalStatus || item.approvalStatus === "approved");
const stripCopySuffix = (value) => String(value || "").replace(/_copy(?:_\d+)?$/i, "");
const matchesId = (item, value) => {
  const actual = idOf(item);
  const expected = String(value || "").trim();
  return actual === expected || actual === stripCopySuffix(expected) || stripCopySuffix(actual) === expected;
};

async function resolveJourneyTargets() {
  const [taxonomy, content, coursesPayload, quizzesPayload, questions] = await Promise.all([
    apiGet("/taxonomy/bootstrap"),
    apiGet("/content/bootstrap"),
    apiGet(`/courses?pathId=${encodeURIComponent(TARGET_PATH_ID)}&subjectId=${encodeURIComponent(TARGET_SUBJECT_ID)}&page=1&limit=20`),
    apiGet("/quizzes"),
    apiGet("/quizzes/questions"),
  ]);
  const courses = Array.isArray(coursesPayload?.courses) ? coursesPayload.courses : Array.isArray(coursesPayload) ? coursesPayload : [];
  const quizzes = Array.isArray(quizzesPayload?.quizzes) ? quizzesPayload.quizzes : Array.isArray(quizzesPayload) ? quizzesPayload : [];
  const questionById = new Map((questions || []).flatMap((question) => {
    const id = idOf(question);
    return id ? [[id, question], [stripCopySuffix(id), question]] : [];
  }));

  const pathItem = (taxonomy.paths || []).find((item) => idOf(item) === TARGET_PATH_ID);
  const subjectItem = (taxonomy.subjects || []).find((item) => idOf(item) === TARGET_SUBJECT_ID);
  const course = courses.find((item) => visible(item) && !item.isPackage && Array.isArray(item.modules) && item.modules.some((module) => (module.lessons || []).length));
  const topic = (content.topics || []).find((item) => visible(item) && item.pathId === TARGET_PATH_ID && item.subjectId === TARGET_SUBJECT_ID && !item.parentId);
  const topicQuizIds = new Set([...(topic?.quizIds || [])].map(String));
  const quiz = quizzes.find((item) => {
    const refs = Array.isArray(item.questionIds) ? item.questionIds.map(String).filter(Boolean) : [];
    const linked = [...topicQuizIds].some((quizId) => matchesId(item, quizId));
    const placement = (item.learningPlacements || []).some((placementItem) =>
      placementItem.pathId === TARGET_PATH_ID &&
      placementItem.subjectId === TARGET_SUBJECT_ID &&
      placementItem.isVisible !== false
    );
    return visible(item) && refs.length > 0 && refs.every((ref) => questionById.has(ref) || questionById.has(stripCopySuffix(ref))) && (linked || placement || item.pathId === TARGET_PATH_ID || item.subjectId === TARGET_SUBJECT_ID);
  });

  return {
    path: pathItem,
    subject: subjectItem,
    course,
    topic,
    quiz,
    routes: {
      dashboard: "/dashboard",
      subject: `/category/${TARGET_PATH_ID}?subject=${TARGET_SUBJECT_ID}&tab=skills`,
      course: course ? `/course/${idOf(course)}` : "",
      quiz: quiz ? `/quiz/${idOf(quiz)}?returnTo=${encodeURIComponent(`/category/${TARGET_PATH_ID}?subject=${TARGET_SUBJECT_ID}&tab=skills`)}&source=foundation` : "",
      myQuizzes: "/my-quizzes",
      reports: "/reports",
      plan: "/plan",
    },
  };
}

async function seedBrowserSession(context, page, session) {
  await context.addCookies([
    {
      name: "almeaa_access_token",
      value: session.authCookie,
      domain: "almeaacodax-k2ux.onrender.com",
      path: "/",
      httpOnly: true,
      secure: true,
      sameSite: "None",
    },
    ...(session.csrfCookie
      ? [
          {
            name: "almeaa_csrf_token",
            value: session.csrfCookie,
            domain: "almeaacodax-k2ux.onrender.com",
            path: "/",
            httpOnly: false,
            secure: true,
            sameSite: "None",
          },
        ]
      : []),
  ]);
  await page.goto(BASE_URL, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.evaluate(({ user, csrfToken }) => {
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
  }, { user: session.user, csrfToken: session.csrfToken });
}

async function inspectRoute(page, name, route, expectations = {}) {
  const consoleErrors = [];
  const network4xx = [];
  const network5xx = [];
  const onConsole = (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text().slice(0, 320));
  };
  const onResponse = (response) => {
    if (response.status() >= 400 && response.status() < 500) network4xx.push({ status: response.status(), url: response.url() });
    if (response.status() >= 500) network5xx.push({ status: response.status(), url: response.url() });
  };
  page.on("console", onConsole);
  page.on("response", onResponse);

  await page.goto(`${BASE_URL}${route}`, { waitUntil: "networkidle", timeout: 60000 }).catch(async () => {
    await page.goto(`${BASE_URL}${route}`, { waitUntil: "domcontentloaded", timeout: 60000 });
  });
  await page.waitForTimeout(1000);

  page.off("console", onConsole);
  page.off("response", onResponse);

  const screenshot = path.join(OUT_DIR, `${name}.png`);
  await page.screenshot({ path: screenshot, fullPage: true });

  const state = await page.evaluate(() => {
    const text = document.body.innerText || "";
    const controls = Array.from(document.querySelectorAll("a[href], button, [role='button'], input, select, textarea")).filter((el) => {
      const rect = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      return rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden";
    });
    return {
      href: location.href,
      title: document.title,
      bodyLength: text.length,
      controlCount: controls.length,
      hasLoginForm: Boolean(document.querySelector('input[type="password"]')) && /تسجيل الدخول|Login|البريد الإلكتروني/.test(text),
      hasQuizUi: /السؤال|التالي|إنهاء|اختبار|نتيجة|إجابة|ابدأ|ابدأ الاختبار/.test(text),
      hasLearningUi: /درس|دورة|المهارات|تدريب|المسار|خطة|تقرير|اختبار/.test(text),
      hasBlockingError: /تعذر تحميل|تعذر إرسال|خطأ غير متوقع|حدث خطأ|غير مصرح|ليس لديك صلاحية|Authentication required|Invalid CSRF|CSRF_TOKEN_INVALID/i.test(text),
    };
  });

  const allowed4xx = network4xx.filter((item) => expectations.allow4xx?.some((pattern) => item.url.includes(pattern)));
  const unexpected4xx = network4xx.filter((item) => !allowed4xx.includes(item));
  const pass =
    !state.hasLoginForm &&
    state.bodyLength >= (expectations.minBodyLength || 300) &&
    state.controlCount >= (expectations.minControls || 1) &&
    !state.hasBlockingError &&
    network5xx.length === 0 &&
    unexpected4xx.length === 0 &&
    (expectations.quiz ? state.hasQuizUi : state.hasLearningUi);

  return {
    name,
    route,
    status: pass ? "PASS" : "FAIL",
    screenshot,
    consoleErrors,
    network4xx,
    unexpected4xx,
    network5xx,
    ...state,
  };
}

const session = await apiLogin();
const targets = await resolveJourneyTargets();
const checks = [];

const addPrereq = (name, pass, details) => checks.push({ name, status: pass ? "PASS" : "FAIL", details });
addPrereq("active path and subject are available", Boolean(targets.path && targets.subject), `${targets.path?.name || TARGET_PATH_ID} / ${targets.subject?.name || TARGET_SUBJECT_ID}`);
addPrereq("course target is available", Boolean(targets.course), targets.course?.title || "missing course");
addPrereq("training quiz target is available", Boolean(targets.quiz), targets.quiz?.title || "missing quiz");

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
  locale: "ar-SA",
  ignoreHTTPSErrors: process.env.UI_AUDIT_IGNORE_HTTPS_ERRORS === "1",
});
const page = await context.newPage();
const routeResults = [];

try {
  await seedBrowserSession(context, page, session);
  const routePlan = [
    ["student-dashboard", targets.routes.dashboard, { minBodyLength: 800, minControls: 8 }],
    ["subject-skill-map", targets.routes.subject, { minBodyLength: 650, minControls: 8 }],
    ["course-player", targets.routes.course, { minBodyLength: 350, minControls: 4 }],
    ["training-quiz", targets.routes.quiz, { minBodyLength: 240, minControls: 2, quiz: true }],
    ["my-quizzes", targets.routes.myQuizzes, { minBodyLength: 900, minControls: 8 }],
    ["student-reports", targets.routes.reports, { minBodyLength: 500, minControls: 4 }],
    ["student-plan", targets.routes.plan, { minBodyLength: 900, minControls: 8 }],
  ].filter(([, route]) => Boolean(route));

  for (const [name, route, expectations] of routePlan) {
    routeResults.push(await inspectRoute(page, name, route, expectations));
  }
} finally {
  await context.close().catch(() => {});
  await browser.close().catch(() => {});
}

const report = {
  generatedAt: new Date().toISOString(),
  baseUrl: BASE_URL,
  apiBaseUrl: API_BASE_URL,
  runId: RUN_ID,
  targetPathId: TARGET_PATH_ID,
  targetSubjectId: TARGET_SUBJECT_ID,
  targets: {
    path: targets.path ? { id: idOf(targets.path), name: targets.path.name } : null,
    subject: targets.subject ? { id: idOf(targets.subject), name: targets.subject.name } : null,
    course: targets.course ? { id: idOf(targets.course), title: targets.course.title } : null,
    quiz: targets.quiz ? { id: idOf(targets.quiz), title: targets.quiz.title } : null,
  },
  checks,
  routeResults,
};
report.summary = {
  total: checks.length + routeResults.length,
  pass: [...checks, ...routeResults].filter((item) => item.status === "PASS").length,
  fail: [...checks, ...routeResults].filter((item) => item.status === "FAIL").length,
};

fs.writeFileSync(path.join(OUT_DIR, "student-learning-deep-audit.json"), JSON.stringify(report, null, 2), "utf8");
fs.writeFileSync(
  path.join(OUT_DIR, "SUMMARY.md"),
  [
    "# Live Student Learning Deep Audit",
    "",
    `- Generated: ${report.generatedAt}`,
    `- Base URL: ${BASE_URL}`,
    `- Path: ${report.targets.path?.name || TARGET_PATH_ID}`,
    `- Subject: ${report.targets.subject?.name || TARGET_SUBJECT_ID}`,
    `- Course: ${report.targets.course?.title || "missing"}`,
    `- Quiz: ${report.targets.quiz?.title || "missing"}`,
    `- PASS: ${report.summary.pass}`,
    `- FAIL: ${report.summary.fail}`,
    "",
    "## Prerequisites",
    ...checks.map((item) => `- [${item.status}] ${item.name} - ${item.details}`),
    "",
    "## Routes",
    ...routeResults.map((item) => `- [${item.status}] ${item.name}: controls=${item.controlCount}, console=${item.consoleErrors.length}, network4xx=${item.network4xx.length}, network5xx=${item.network5xx.length}, url=${item.href}`),
    "",
  ].join("\n"),
  "utf8",
);

console.log(JSON.stringify({ outDir: OUT_DIR, ...report.summary, targets: report.targets }, null, 2));
if (report.summary.fail) process.exit(1);

