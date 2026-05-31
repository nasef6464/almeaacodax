import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const BASE_URL = String(process.env.UI_AUDIT_BASE_URL || "https://almeaacodax.vercel.app").replace(/\/$/, "");
const API_BASE_URL = String(process.env.UI_AUDIT_API_BASE_URL || "https://almeaacodax-k2ux.onrender.com/api").replace(/\/$/, "");
const RUN_ID = process.env.ADMIN_XLSX_EXPORT_RUN_ID || `admin-xlsx-export-${new Date().toISOString().replace(/[:.]/g, "-")}`;
const OUT_DIR = path.resolve("audit-artifacts", "admin-live-handoff", RUN_ID);
const CREDENTIALS_FILE = process.env.ROLE_CREDENTIALS_FILE || path.resolve("audit-artifacts", "ROLE_CREDENTIALS.env");

const T = {
  exportUsers: "\u062a\u0635\u062f\u064a\u0631 \u0627\u0644\u0645\u0633\u062a\u062e\u062f\u0645\u064a\u0646",
  exportSchoolReadiness: "\u062a\u0635\u062f\u064a\u0631 \u062c\u0627\u0647\u0632\u064a\u0629 \u0627\u0644\u0645\u062f\u0627\u0631\u0633",
  lessonsTemplate: "\u0642\u0627\u0644\u0628 \u0627\u0644\u0627\u0633\u062a\u064a\u0631\u0627\u062f",
  exportLessons: "\u062a\u0635\u062f\u064a\u0631 \u0627\u0644\u062f\u0631\u0648\u0633",
  exportQuestions: "\u062a\u0635\u062f\u064a\u0631 \u0627\u0644\u0623\u0633\u0626\u0644\u0629 \u0627\u0644\u062d\u0627\u0644\u064a\u0629",
  questionsTemplate: "\u062a\u062d\u0645\u064a\u0644 \u0646\u0645\u0648\u0630\u062c Excel",
  exportLibrary: "\u062a\u0635\u062f\u064a\u0631 \u0627\u0644\u0645\u0643\u062a\u0628\u0629",
  exportReadiness: "\u062a\u0635\u062f\u064a\u0631 \u0627\u0644\u062c\u0627\u0647\u0632\u064a\u0629",
};

fs.mkdirSync(OUT_DIR, { recursive: true });

if (fs.existsSync(CREDENTIALS_FILE)) {
  for (const line of fs.readFileSync(CREDENTIALS_FILE, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const [key, ...rest] = trimmed.split("=");
    if (key && rest.length && !process.env[key]) process.env[key] = rest.join("=").trim();
  }
}

const adminEmail = process.env.ROLE_ADMIN_EMAIL || process.env.SMOKE_ADMIN_EMAIL || process.env.ADMIN_EMAIL;
const adminPassword = process.env.ROLE_ADMIN_PASSWORD || process.env.SMOKE_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD;

const audit = {
  generatedAt: new Date().toISOString(),
  runId: RUN_ID,
  baseUrl: BASE_URL,
  apiBaseUrl: API_BASE_URL,
  checks: [],
  consoleErrors: [],
  networkFailures: [],
};

const addCheck = (name, status, note = "", meta = {}) => audit.checks.push({ name, status, note, meta });

function extractCookie(setCookieHeader, cookieName) {
  return String(setCookieHeader || "").match(new RegExp(`${cookieName}=([^;]+)`))?.[1] || "";
}

async function apiLogin() {
  if (!adminEmail || !adminPassword) throw new Error("Missing admin credentials");

  const csrfRes = await fetch(`${API_BASE_URL}/auth/csrf-token`, { headers: { Accept: "application/json" } });
  const csrfPayload = await csrfRes.json().catch(() => ({}));
  const csrfCookie = extractCookie(csrfRes.headers.get("set-cookie"), "almeaa_csrf_token");
  const csrfToken = String(csrfPayload?.csrfToken || csrfCookie || "").trim();
  if (!csrfRes.ok || !csrfToken) throw new Error(`CSRF failed: ${csrfRes.status}`);

  const loginRes = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-csrf-token": csrfToken,
      Cookie: csrfCookie ? `almeaa_csrf_token=${csrfCookie}` : "",
    },
    body: JSON.stringify({ email: adminEmail, password: adminPassword }),
  });
  const payload = await loginRes.json().catch(() => ({}));
  if (!loginRes.ok) throw new Error(`Login failed: ${loginRes.status}`);
  const authCookie = extractCookie(loginRes.headers.get("set-cookie"), "almeaa_access_token");
  const token = String(payload?.token || authCookie || "").trim();
  const user = payload?.user;
  if (!token || !user) throw new Error("Login succeeded but no auth token/user was returned");
  return { token, user, authCookie };
}

async function seedSession(context, page, session) {
  if (session.authCookie) {
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
    ]);
  }

  await page.goto(BASE_URL, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.evaluate(({ user }) => {
    const sessionUser = {
      id: String(user.id || user._id || user.email),
      email: user.email,
      displayName: user.name,
      photoURL: user.avatar || `https://i.pravatar.cc/150?u=${encodeURIComponent(user.email)}`,
      role: user.role,
    };
    sessionStorage.setItem("the-hundred-auth-profile", JSON.stringify(sessionUser));
  }, session);
}

async function clickDownload(page, label, selector) {
  const before = fs.readdirSync(OUT_DIR);
  try {
    const downloadPromise = page.waitForEvent("download", { timeout: 15000 });
    await page.locator(selector).first().click({ timeout: 15000 });
    const download = await downloadPromise;
    const fileName = download.suggestedFilename();
    const target = path.join(OUT_DIR, fileName.replace(/[<>:"/\\|?*\u0000-\u001F]/g, "_"));
    await download.saveAs(target);
    const size = fs.statSync(target).size;
    addCheck(label, size > 0 ? "PASS" : "FAIL", `downloaded ${fileName}`, { fileName, size });
  } catch (error) {
    const after = fs.readdirSync(OUT_DIR);
    const newFiles = after.filter((file) => !before.includes(file));
    addCheck(label, "FAIL", error instanceof Error ? error.message : String(error), { newFiles });
  }
}

async function capture(page, name) {
  await page.screenshot({ path: path.join(OUT_DIR, `${name}.png`), fullPage: true });
}

const flow = [
  {
    tab: "users",
    screenshot: "users-xlsx-export",
    checks: [{ label: "users export downloads workbook", selector: `button:has-text("${T.exportUsers}")` }],
  },
  {
    tab: "groups",
    screenshot: "groups-schools-xlsx-export",
    checks: [{ label: "schools and groups readiness export downloads workbook", selector: `button:has-text("${T.exportSchoolReadiness}")` }],
  },
  {
    tab: "lessons",
    screenshot: "lessons-xlsx-export",
    checks: [
      { label: "lessons import template downloads workbook", selector: `button:has-text("${T.lessonsTemplate}")` },
      { label: "lessons export downloads workbook", selector: `button:has-text("${T.exportLessons}")` },
    ],
  },
  {
    tab: "questions",
    screenshot: "questions-xlsx-export",
    checks: [
      { label: "questions export downloads workbook", selector: `button:has-text("${T.exportQuestions}")` },
      { label: "questions import template downloads workbook", selector: `button:has-text("${T.questionsTemplate}")` },
    ],
  },
  {
    tab: "library",
    screenshot: "library-xlsx-export",
    checks: [{ label: "library export downloads workbook", selector: `button:has-text("${T.exportLibrary}")` }],
  },
  {
    tab: "quizzes",
    screenshot: "quizzes-xlsx-export",
    checks: [{ label: "quizzes readiness export downloads workbook", selector: `button:has-text("${T.exportReadiness}")` }],
  },
];

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  acceptDownloads: true,
  locale: "ar-SA",
  viewport: { width: 1440, height: 1100 },
});
const page = await context.newPage();

page.on("console", (msg) => {
  if (msg.type() === "error") {
    audit.consoleErrors.push({ text: msg.text().slice(0, 500) });
  }
});
page.on("requestfailed", (request) => {
  const failure = request.failure()?.errorText || "";
  if (failure === "net::ERR_ABORTED") return;
  audit.networkFailures.push({ url: request.url(), failure });
});

try {
  const session = await apiLogin();
  await seedSession(context, page, session);
  addCheck("admin visual session seeded", "PASS", "admin dashboard session was prepared without exposing credentials");

  for (const item of flow) {
    await page.goto(`${BASE_URL}/admin-dashboard?tab=${item.tab}`, { waitUntil: "networkidle", timeout: 60000 }).catch(async () => {
      await page.goto(`${BASE_URL}/admin-dashboard?tab=${item.tab}`, { waitUntil: "domcontentloaded", timeout: 60000 });
    });
    const bodyText = await page.locator("body").innerText({ timeout: 20000 }).catch(() => "");
    const reachedAdmin = bodyText.includes("\u0644\u0648\u062d\u0629") || bodyText.includes("\u0625\u062f\u0627\u0631\u0629") || bodyText.includes("\u062a\u0635\u062f\u064a\u0631");
    addCheck(`${item.tab} tab opens for xlsx/export audit`, reachedAdmin ? "PASS" : "FAIL", reachedAdmin ? "admin content visible" : "admin content not visible");
    await capture(page, item.screenshot);

    for (const check of item.checks) {
      const count = await page.locator(check.selector).count();
      if (!count) {
        addCheck(check.label, "FAIL", `button not found: ${check.selector}`);
        continue;
      }
      await clickDownload(page, check.label, check.selector);
    }
  }
} finally {
  await browser.close();
}

audit.total = audit.checks.length;
audit.pass = audit.checks.filter((check) => check.status === "PASS").length;
audit.fail = audit.checks.filter((check) => check.status === "FAIL").length;
audit.blocked = audit.checks.filter((check) => check.status === "BLOCKED").length;

fs.writeFileSync(path.join(OUT_DIR, "admin-xlsx-export-live-audit.json"), JSON.stringify(audit, null, 2));
fs.writeFileSync(
  path.join(OUT_DIR, "SUMMARY.md"),
  [
    "# Admin XLSX Export Live Audit",
    "",
    `- Generated: ${audit.generatedAt}`,
    `- Frontend: ${BASE_URL}`,
    `- API: ${API_BASE_URL}`,
    `- Total: ${audit.total}`,
    `- PASS: ${audit.pass}`,
    `- FAIL: ${audit.fail}`,
    `- Console errors: ${audit.consoleErrors.length}`,
    `- Network failures: ${audit.networkFailures.length}`,
    "",
    "## Checks",
    ...audit.checks.map((check) => `- ${check.status}: ${check.name} - ${check.note}`),
    "",
  ].join("\n"),
);

console.log(JSON.stringify({ outDir: OUT_DIR, total: audit.total, pass: audit.pass, fail: audit.fail, consoleErrors: audit.consoleErrors.length, networkFailures: audit.networkFailures.length }, null, 2));

if (audit.fail > 0 || audit.consoleErrors.length > 0 || audit.networkFailures.length > 0) {
  process.exitCode = 1;
}
