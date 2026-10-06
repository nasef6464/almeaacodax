import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const BASE_URL = String(process.env.UI_AUDIT_BASE_URL || "https://almeaacodax.vercel.app").replace(/\/$/, "");
const API_BASE_URL = String(process.env.UI_AUDIT_API_BASE_URL || "https://almeaacodax-k2ux.onrender.com/api").replace(/\/$/, "");
const RUN_ID = process.env.STUDENT_SUPPORT_AUDIT_RUN_ID || `student-support-${new Date().toISOString().replace(/[:.]/g, "-")}`;
const OUT_DIR = path.resolve("audit-artifacts", "ui-audit-exhaustive", RUN_ID);
const CREDENTIALS_FILE = process.env.ROLE_CREDENTIALS_FILE || path.resolve("audit-artifacts", "ROLE_CREDENTIALS.env");

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
      ? [{
          name: "almeaa_csrf_token",
          value: session.csrfCookie,
          domain: "almeaacodax-k2ux.onrender.com",
          path: "/",
          httpOnly: false,
          secure: true,
          sameSite: "None",
        }]
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

async function inspectRoute(page, name, route, expectations) {
  const consoleErrors = [];
  const network5xx = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text().slice(0, 300));
  });
  page.on("response", (response) => {
    if (response.status() >= 500) network5xx.push({ status: response.status(), url: response.url() });
  });

  await page.goto(`${BASE_URL}${route}`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(1200);
  const screenshot = path.join(OUT_DIR, `${name}.png`);
  await page.screenshot({ path: screenshot, fullPage: true });

  const state = await page.evaluate((expectedTexts) => {
    const text = document.body.innerText || "";
    const controls = Array.from(document.querySelectorAll("a[href], button, input, select, textarea")).filter((el) => {
      const rect = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      return rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden";
    });
    const missingTexts = expectedTexts.filter((expected) => !text.includes(expected));
    return {
      href: location.href,
      title: document.title,
      bodyLength: text.length,
      controlCount: controls.length,
      missingTexts,
      hasLoginForm: Boolean(document.querySelector('input[type="password"]')),
      hasBlockingError: /تعذر تحميل|خطأ غير متوقع|غير مصرح|ليس لديك صلاحية|Authentication required|Invalid CSRF|CSRF_TOKEN_INVALID/i.test(text),
    };
  }, expectations.texts || []);

  const status =
    state.bodyLength >= (expectations.minBodyLength || 250) &&
    state.controlCount >= (expectations.minControls || 1) &&
    state.missingTexts.length === 0 &&
    !state.hasLoginForm &&
    !state.hasBlockingError &&
    network5xx.length === 0
      ? "PASS"
      : "FAIL";

  return { name, route, status, screenshot, consoleErrors, network5xx, ...state };
}

const session = await apiLogin();
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: "ar-SA" });
const page = await context.newPage();
const routeResults = [];

try {
  await seedBrowserSession(context, page, session);
  const routes = [
    ["student-dashboard-sessions", "/dashboard?tab=sessions", { texts: ["حصة"], minBodyLength: 300, minControls: 6 }],
    ["student-book-session", "/book-session", { texts: ["حجز", "المادة"], minBodyLength: 300, minControls: 4 }],
    ["student-live-sessions", "/live-sessions", { texts: ["الحصص"], minBodyLength: 300, minControls: 1 }],
    ["student-qa", "/qa", { texts: ["سؤال", "جواب"], minBodyLength: 350, minControls: 4 }],
    ["student-my-quizzes", "/my-quizzes", { texts: ["اختبار"], minBodyLength: 700, minControls: 6 }],
    ["student-reports", "/reports", { texts: ["تقرير"], minBodyLength: 500, minControls: 4 }],
    ["student-plan", "/plan", { texts: ["خطة"], minBodyLength: 800, minControls: 6 }],
  ];

  for (const [name, route, expectations] of routes) {
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
  routeResults,
};
report.summary = {
  total: routeResults.length,
  pass: routeResults.filter((item) => item.status === "PASS").length,
  fail: routeResults.filter((item) => item.status === "FAIL").length,
};

fs.writeFileSync(path.join(OUT_DIR, "student-support-routes-audit.json"), JSON.stringify(report, null, 2), "utf8");
fs.writeFileSync(
  path.join(OUT_DIR, "SUMMARY.md"),
  [
    "# Live Student Support Routes Audit",
    "",
    `- Generated: ${report.generatedAt}`,
    `- Base URL: ${BASE_URL}`,
    `- PASS: ${report.summary.pass}`,
    `- FAIL: ${report.summary.fail}`,
    "",
    "## Routes",
    ...routeResults.map((item) => `- [${item.status}] ${item.name}: controls=${item.controlCount}, missing=${item.missingTexts.length}, console=${item.consoleErrors.length}, network5xx=${item.network5xx.length}, url=${item.href}`),
    "",
  ].join("\n"),
  "utf8",
);

console.log(JSON.stringify({ outDir: OUT_DIR, ...report.summary }, null, 2));
if (report.summary.fail) process.exit(1);
