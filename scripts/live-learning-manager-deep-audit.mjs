import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const BASE_URL = String(process.env.UI_AUDIT_BASE_URL || "https://almeaacodax.vercel.app").replace(/\/$/, "");
const API_BASE_URL = String(process.env.UI_AUDIT_API_BASE_URL || "https://almeaacodax-k2ux.onrender.com/api").replace(/\/$/, "");
const RUN_ID = process.env.LEARNING_MANAGER_AUDIT_RUN_ID || `learning-manager-${Date.now()}`;
const CREDENTIALS_FILE = process.env.ROLE_CREDENTIALS_FILE || path.resolve("audit-artifacts", "ROLE_CREDENTIALS.env");
const TARGET_PATH_ID = process.env.SMOKE_STUDENT_JOURNEY_PATH_ID || "p_qudrat";
const TARGET_SUBJECT_ID = process.env.SMOKE_STUDENT_JOURNEY_SUBJECT_ID || "sub_quant";
const OUT_DIR = path.resolve("audit-artifacts", "ui-audit-exhaustive", RUN_ID);
fs.mkdirSync(OUT_DIR, { recursive: true });

if (fs.existsSync(CREDENTIALS_FILE)) {
  for (const line of fs.readFileSync(CREDENTIALS_FILE, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const [key, ...rest] = trimmed.split("=");
    if (key && rest.length && !process.env[key]) process.env[key] = rest.join("=").trim();
  }
}

const adminEmail = process.env.ROLE_ADMIN_EMAIL || process.env.ADMIN_EMAIL;
const adminPassword = process.env.ROLE_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD;
const cookieValue = (header, name) => String(header || "").match(new RegExp(`${name}=([^;]+)`))?.[1] || "";
const idOf = (item) => String(item?.id || item?._id || "").trim();

async function login() {
  if (!adminEmail || !adminPassword) throw new Error("Missing admin credentials");
  const csrfRes = await fetch(`${API_BASE_URL}/auth/csrf-token`, { headers: { accept: "application/json" } });
  const csrf = await csrfRes.json().catch(() => ({}));
  const csrfCookie = cookieValue(csrfRes.headers.get("set-cookie"), "almeaa_csrf_token");
  const csrfToken = String(csrf?.csrfToken || csrfCookie);
  const loginRes = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-csrf-token": csrfToken, cookie: `almeaa_csrf_token=${csrfCookie}` },
    body: JSON.stringify({ email: adminEmail, password: adminPassword }),
  });
  const body = await loginRes.json().catch(() => ({}));
  if (!loginRes.ok) throw new Error(`admin login failed ${loginRes.status}`);
  const token = cookieValue(loginRes.headers.get("set-cookie"), "almeaa_access_token") || body?.token;
  if (!token || !body?.user) throw new Error("admin login returned no session");
  return { token, csrfToken, csrfCookie, user: body.user };
}

async function apiGet(session, pathname) {
  const response = await fetch(`${API_BASE_URL}${pathname}`, {
    headers: { accept: "application/json", authorization: `Bearer ${session.token}`, cookie: `almeaa_csrf_token=${session.csrfCookie}` },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`${pathname} returned ${response.status}`);
  return body;
}

const session = await login();
const taxonomy = await apiGet(session, "/taxonomy/bootstrap");
const content = await apiGet(session, "/content/bootstrap?scope=full");
const targetPath = (taxonomy.paths || []).find((item) => idOf(item) === TARGET_PATH_ID) || (taxonomy.paths || [])[0];
const targetSubject = (taxonomy.subjects || []).find((item) => idOf(item) === TARGET_SUBJECT_ID && String(item.pathId || "") === idOf(targetPath)) ||
  (taxonomy.subjects || []).find((item) => String(item.pathId || "") === idOf(targetPath));
if (!targetPath || !targetSubject) throw new Error("No path/subject target available for manager audit");

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
await context.addCookies([
  { name: "almeaa_access_token", value: session.token, url: new URL(API_BASE_URL).origin, httpOnly: true, secure: new URL(API_BASE_URL).protocol === "https:", sameSite: "None" },
  { name: "almeaa_csrf_token", value: session.csrfCookie, url: new URL(API_BASE_URL).origin, httpOnly: false, secure: new URL(API_BASE_URL).protocol === "https:", sameSite: "None" },
]);
const page = await context.newPage();
const observedApi = new Set();
page.on("response", (response) => {
  if (response.url().includes("/api/")) observedApi.add(new URL(response.url()).pathname);
});
await page.goto(BASE_URL, { waitUntil: "domcontentloaded", timeout: 60000 });
await page.evaluate((user) => {
  sessionStorage.setItem("the-hundred-auth-profile", JSON.stringify({
    id: String(user.id || user._id || user.email),
    email: user.email,
    displayName: user.name,
    photoURL: user.avatar || "",
    role: user.role,
  }));
}, session.user);
await page.goto(`${BASE_URL}/#/admin-dashboard?tab=paths`, { waitUntil: "domcontentloaded", timeout: 60000 });
await page.waitForSelector(`[data-testid="learning-manager-path-${idOf(targetPath)}"]`, { timeout: 30000 });
await page.locator(`[data-testid="learning-manager-path-${idOf(targetPath)}"]`).click();
await page.waitForSelector(`[data-testid="learning-manager-subject-${idOf(targetSubject)}"]`, { timeout: 30000 });
await page.locator(`[data-testid="learning-manager-subject-${idOf(targetSubject)}"]`).click();
await page.waitForSelector(`[data-testid="learning-manager-slot-courses"]`, { timeout: 30000 });
const slots = await page.locator('[data-testid^="learning-manager-slot-"]').count();
const bodyText = await page.locator("body").innerText();
const requiredLabels = ["إدارة الدورات", "إدارة التأسيس", "إدارة التدريب", "إدارة الاختبارات", "إدارة المكتبة"];
const missingLabels = requiredLabels.filter((label) => !bodyText.includes(label));
const result = {
  status: slots >= 5 && missingLabels.length === 0 ? "PASS" : "FAIL",
  pathId: idOf(targetPath),
  subjectId: idOf(targetSubject),
  managerSlots: slots,
  missingLabels,
  observedApi: [...observedApi].filter((value) => value.includes("taxonomy") || value.includes("content")),
  apiData: { paths: (taxonomy.paths || []).length, subjects: (taxonomy.subjects || []).length, topics: (content.topics || []).length, lessons: (content.lessons || []).length },
};
fs.writeFileSync(path.join(OUT_DIR, "MANAGER_LEARNING_AUDIT.json"), JSON.stringify(result, null, 2));
await page.screenshot({ path: path.join(OUT_DIR, "manager-learning-space.png"), fullPage: true }).catch(() => undefined);
await browser.close();
console.log(JSON.stringify(result, null, 2));
if (result.status !== "PASS") process.exitCode = 1;
