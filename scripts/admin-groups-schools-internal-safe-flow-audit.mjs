import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const BASE_URL = process.env.UI_AUDIT_BASE_URL || "https://almeaacodax.vercel.app";
const API_BASE_URL = (process.env.UI_AUDIT_API_BASE_URL || "https://almeaacodax-k2ux.onrender.com/api").replace(/\/$/, "");
const RUN_ID = process.env.ADMIN_INTERNAL_AUDIT_RUN_ID || `internal-safe-flow-${new Date().toISOString().replace(/[:.]/g, "-")}`;
const OUT_DIR = path.resolve("audit-artifacts", "admin-live-handoff", RUN_ID);
fs.mkdirSync(OUT_DIR, { recursive: true });

const CREDENTIALS_FILE = process.env.ROLE_CREDENTIALS_FILE || path.resolve("audit-artifacts", "ROLE_CREDENTIALS.env");
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

const report = {
  generatedAt: new Date().toISOString(),
  runId: RUN_ID,
  baseUrl: BASE_URL,
  checks: [],
  consoleErrors: [],
  network5xx: [],
};

const safe = (v) => String(v || "").replace(/[^a-zA-Z0-9_-]+/g, "_");
const addCheck = (name, status, note = "") => report.checks.push({ name, status, note });

async function snap(page, name) {
  const p = path.join(OUT_DIR, `${safe(name)}.png`);
  await page.screenshot({ path: p, fullPage: true });
}

async function login(page) {
  if (!adminEmail || !adminPassword) throw new Error("Missing admin credentials");
  await page.goto(BASE_URL, { waitUntil: "networkidle", timeout: 60000 });
  const result = await page.evaluate(
    async ({ apiBaseUrl, email, password }) => {
      const csrf = await fetch(`${apiBaseUrl}/auth/csrf-token`, { credentials: "include", cache: "no-store" });
      const csrfPayload = await csrf.json().catch(() => ({}));
      const res = await fetch(`${apiBaseUrl}/auth/login`, {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json", "x-csrf-token": csrfPayload?.csrfToken || "" },
        body: JSON.stringify({ email, password }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) return { ok: false, status: res.status };
      const user = payload?.user || {};
      sessionStorage.setItem(
        "the-hundred-auth-profile",
        JSON.stringify({
          id: String(user.id || user._id || user.email || "admin"),
          email: user.email,
          displayName: user.name,
          role: user.role,
        }),
      );
      return { ok: true };
    },
    { apiBaseUrl: API_BASE_URL, email: adminEmail, password: adminPassword },
  );
  if (!result.ok) throw new Error(`login failed: ${result.status}`);
}

async function gotoTab(page, tab) {
  await page.goto(`${BASE_URL}/admin-dashboard?tab=${encodeURIComponent(tab)}`, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(500);
}

async function openButtonByText(page, candidates) {
  for (const text of candidates) {
    const btn = page.getByRole("button", { name: new RegExp(text, "i") }).first();
    if (await btn.isVisible().catch(() => false)) {
      await btn.click({ timeout: 3000 }).catch(() => {});
      await page.waitForTimeout(500);
      return text;
    }
  }
  return "";
}

async function closeDialogIfAny(page) {
  const closeTexts = ["إلغاء", "اغلاق", "إغلاق", "Cancel", "Close", "رجوع"];
  for (const text of closeTexts) {
    const btn = page.getByRole("button", { name: new RegExp(text, "i") }).first();
    if (await btn.isVisible().catch(() => false)) {
      await btn.click({ timeout: 2500 }).catch(() => {});
      await page.waitForTimeout(400);
      return true;
    }
  }
  await page.keyboard.press("Escape").catch(() => {});
  return false;
}

async function inspectFormState(page) {
  const formCount = await page.locator("form").count();
  const visibleInputs = await page.locator("input:visible, select:visible, textarea:visible").count().catch(() => 0);
  const saveBtn = page.getByRole("button", { name: /حفظ|save|إنشاء|اضافة|إضافة|تحديث/i }).first();
  const hasSave = await saveBtn.isVisible().catch(() => false);
  const saveDisabled = hasSave ? await saveBtn.isDisabled().catch(() => false) : false;
  return { formCount, visibleInputs, hasSave, saveDisabled };
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();

  page.on("console", (msg) => {
    if (msg.type() === "error") report.consoleErrors.push(msg.text().slice(0, 300));
  });
  page.on("response", (res) => {
    if (res.status() >= 500) report.network5xx.push({ status: res.status(), url: res.url() });
  });

  try {
    await login(page);

    await gotoTab(page, "groups");
    await snap(page, "groups-home");
    addCheck("groups open", "PASS", "loaded");

    const groupAction = await openButtonByText(page, ["إضافة", "اضافة", "جديد", "إنشاء", "create", "فتح الإدارة"]);
    await snap(page, "groups-action");
    addCheck("groups entry action", groupAction ? "PASS" : "REVIEW", groupAction || "no clear entry button");

    const groupForm = await inspectFormState(page);
    addCheck(
      "groups form state",
      groupForm.formCount > 0 || groupForm.visibleInputs > 0 ? "PASS" : "REVIEW",
      `forms=${groupForm.formCount}, inputs=${groupForm.visibleInputs}, hasSave=${groupForm.hasSave}, saveDisabled=${groupForm.saveDisabled}`,
    );
    await closeDialogIfAny(page);
    await snap(page, "groups-after-close");

    await gotoTab(page, "school-portal");
    await snap(page, "school-home");
    addCheck("school portal open", "PASS", "loaded");

    const schoolAction = await openButtonByText(page, ["إضافة", "اضافة", "جديد", "إنشاء", "create", "فتح الإدارة", "فتح إدارة المدارس", "العلاقات"]);
    await snap(page, "school-action");
    addCheck("school portal entry action", schoolAction ? "PASS" : "REVIEW", schoolAction || "no clear entry button");

    const schoolForm = await inspectFormState(page);
    addCheck(
      "school portal form state",
      schoolForm.formCount > 0 || schoolForm.visibleInputs > 0 ? "PASS" : "REVIEW",
      `forms=${schoolForm.formCount}, inputs=${schoolForm.visibleInputs}, hasSave=${schoolForm.hasSave}, saveDisabled=${schoolForm.saveDisabled}`,
    );
    await closeDialogIfAny(page);
    await snap(page, "school-after-close");

    await gotoTab(page, "users");
    await snap(page, "users-home");
    addCheck("users open", "PASS", "loaded");

    const usersAction = await openButtonByText(page, ["إضافة", "اضافة", "جديد", "إنشاء", "create", "تعديل", "edit"]);
    await snap(page, "users-action");
    addCheck("users entry action", usersAction ? "PASS" : "REVIEW", usersAction || "no clear entry button");

    const usersForm = await inspectFormState(page);
    addCheck(
      "users form state",
      usersForm.formCount > 0 || usersForm.visibleInputs > 0 ? "PASS" : "REVIEW",
      `forms=${usersForm.formCount}, inputs=${usersForm.visibleInputs}, hasSave=${usersForm.hasSave}, saveDisabled=${usersForm.saveDisabled}`,
    );
  } finally {
    await context.close().catch(() => {});
    await browser.close().catch(() => {});
  }

  const summary = {
    ...report,
    total: report.checks.length,
    pass: report.checks.filter((c) => c.status === "PASS").length,
    review: report.checks.filter((c) => c.status === "REVIEW").length,
    fail: report.checks.filter((c) => c.status === "FAIL").length,
  };

  fs.writeFileSync(path.join(OUT_DIR, "admin-groups-schools-internal-safe-flow-audit.json"), JSON.stringify(summary, null, 2), "utf8");
  const md = [
    "# Internal Safe Flow Audit",
    "",
    `- Generated: ${summary.generatedAt}`,
    `- Base URL: ${summary.baseUrl}`,
    `- Total: ${summary.total}`,
    `- PASS: ${summary.pass}`,
    `- REVIEW: ${summary.review}`,
    `- FAIL: ${summary.fail}`,
    `- Console errors: ${summary.consoleErrors.length}`,
    `- Network 5xx: ${summary.network5xx.length}`,
    "",
    "## Checks",
    ...summary.checks.map((c) => `- [${c.status}] ${c.name}: ${c.note}`),
  ].join("\n");
  fs.writeFileSync(path.join(OUT_DIR, "SUMMARY.md"), `${md}\n`, "utf8");

  console.log(`Internal safe flow audit complete: ${OUT_DIR}`);
  if (summary.fail > 0 || summary.network5xx.length > 0) process.exit(1);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
