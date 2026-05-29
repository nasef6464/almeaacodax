import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const BASE_URL = process.env.UI_AUDIT_BASE_URL || "https://almeaacodax.vercel.app";
const API_BASE_URL = (process.env.UI_AUDIT_API_BASE_URL || "https://almeaacodax-k2ux.onrender.com/api").replace(/\/$/, "");
const RUN_ID = process.env.ADMIN_DEEP_AUDIT_RUN_ID || `deep-admin-groups-schools-${new Date().toISOString().replace(/[:.]/g, "-")}`;
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

const blockedWords = ["حذف", "delete", "remove", "رفض", "approve", "اعتماد", "approve", "reject"];
const preferredWords = ["فتح", "إدارة", "عرض", "تفاصيل", "ربط", "edit", "manage"];

const audit = {
  generatedAt: new Date().toISOString(),
  baseUrl: BASE_URL,
  apiBaseUrl: API_BASE_URL,
  runId: RUN_ID,
  checks: [],
  consoleErrors: [],
  networkFailures: [],
};

const safeName = (value) => String(value || "").replace(/[^a-zA-Z0-9_-]+/g, "_");

function pushCheck(name, status, note = "") {
  audit.checks.push({ name, status, note });
}

async function screenshot(page, label) {
  const target = path.join(OUT_DIR, `${safeName(label)}.png`);
  await page.screenshot({ path: target, fullPage: true });
  return target;
}

async function login(page) {
  if (!adminEmail || !adminPassword) {
    throw new Error("Missing admin credentials for deep audit.");
  }

  await page.goto(BASE_URL, { waitUntil: "networkidle", timeout: 60000 });
  const loginResult = await page.evaluate(
    async ({ apiBaseUrl, email, password }) => {
      const csrfResponse = await fetch(`${apiBaseUrl}/auth/csrf-token`, {
        credentials: "include",
        cache: "no-store",
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
      if (!loginResponse.ok) return { ok: false, status: loginResponse.status };
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

  if (!loginResult.ok) throw new Error(`Admin login failed with status ${loginResult.status}`);
}

async function gotoTab(page, tab) {
  await page.goto(`${BASE_URL}/admin-dashboard?tab=${encodeURIComponent(tab)}`, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(600);
}

async function runSearchExercise(page, keyword) {
  const inputs = page.locator("input[type='text'], input[type='search']");
  const count = await inputs.count();
  for (let i = 0; i < count; i += 1) {
    const input = inputs.nth(i);
    if (!(await input.isVisible().catch(() => false))) continue;
    await input.click({ timeout: 3000 }).catch(() => {});
    await input.fill(keyword, { timeout: 3000 }).catch(() => {});
    await page.waitForTimeout(350);
    await input.fill("", { timeout: 3000 }).catch(() => {});
    return true;
  }
  return false;
}

async function clickSafeAction(page) {
  const result = await page.evaluate(({ blockedWords: blocked, preferredWords: preferred }) => {
    const buttons = Array.from(document.querySelectorAll("button, [role='button'], a[href]"));
    const visible = buttons.filter((el) => {
      const rect = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      return rect.width > 0 && rect.height > 0 && style.visibility !== "hidden" && style.display !== "none";
    });
    const ranked = visible
      .map((el) => {
        const text = (el.textContent || "").trim().toLowerCase();
        const blockedHit = blocked.some((word) => text.includes(String(word).toLowerCase()));
        const preferredHit = preferred.some((word) => text.includes(String(word).toLowerCase()));
        return { text, blockedHit, preferredHit, el };
      })
      .filter((row) => row.text.length > 0 && !row.blockedHit)
      .sort((a, b) => Number(b.preferredHit) - Number(a.preferredHit));

    const target = ranked[0];
    if (!target) return { clicked: false };
    target.el.click();
    return { clicked: true, text: target.text.slice(0, 120) };
  }, { blockedWords, preferredWords });

  await page.waitForTimeout(600);
  return result;
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();

  page.on("console", (msg) => {
    if (msg.type() === "error") audit.consoleErrors.push(msg.text().slice(0, 300));
  });
  page.on("response", (res) => {
    if (res.status() >= 500) {
      audit.networkFailures.push({ status: res.status(), url: res.url() });
    }
  });

  try {
    await login(page);
    await gotoTab(page, "groups");
    await screenshot(page, "groups-initial");
    pushCheck("groups tab open", "PASS", "tab loaded");

    const groupsSearch = await runSearchExercise(page, "مدرسة");
    await screenshot(page, "groups-search");
    pushCheck("groups search/filter", groupsSearch ? "PASS" : "REVIEW", groupsSearch ? "search input exercised" : "no obvious search input");

    const groupsAction = await clickSafeAction(page);
    await screenshot(page, "groups-action-open");
    pushCheck("groups safe action", groupsAction.clicked ? "PASS" : "REVIEW", groupsAction.clicked ? `clicked: ${groupsAction.text}` : "no safe action found");

    await gotoTab(page, "school-portal");
    await screenshot(page, "school-portal-initial");
    pushCheck("school portal tab open", "PASS", "tab loaded");

    const schoolSearch = await runSearchExercise(page, "فصل");
    await screenshot(page, "school-portal-search");
    pushCheck("school portal search/filter", schoolSearch ? "PASS" : "REVIEW", schoolSearch ? "search input exercised" : "no obvious search input");

    const schoolAction = await clickSafeAction(page);
    await screenshot(page, "school-portal-action-open");
    pushCheck("school portal safe action", schoolAction.clicked ? "PASS" : "REVIEW", schoolAction.clicked ? `clicked: ${schoolAction.text}` : "no safe action found");

    await gotoTab(page, "users");
    await screenshot(page, "users-initial");
    pushCheck("users tab open", "PASS", "tab loaded");

    const usersSearch = await runSearchExercise(page, "طالب");
    await screenshot(page, "users-search");
    pushCheck("users search/filter", usersSearch ? "PASS" : "REVIEW", usersSearch ? "search input exercised" : "no obvious search input");

    const usersAction = await clickSafeAction(page);
    await screenshot(page, "users-action-open");
    pushCheck("users safe action", usersAction.clicked ? "PASS" : "REVIEW", usersAction.clicked ? `clicked: ${usersAction.text}` : "no safe action found");
  } finally {
    await context.close().catch(() => {});
    await browser.close().catch(() => {});
  }

  const summary = {
    ...audit,
    totalChecks: audit.checks.length,
    pass: audit.checks.filter((c) => c.status === "PASS").length,
    review: audit.checks.filter((c) => c.status === "REVIEW").length,
    fail: audit.checks.filter((c) => c.status === "FAIL").length,
  };

  fs.writeFileSync(path.join(OUT_DIR, "admin-deep-groups-schools-audit.json"), JSON.stringify(summary, null, 2), "utf8");
  const md = [
    "# Admin Deep Visual Audit (Groups + Schools + Users)",
    "",
    `- Generated: ${summary.generatedAt}`,
    `- Base URL: ${summary.baseUrl}`,
    `- Checks: ${summary.totalChecks}`,
    `- PASS: ${summary.pass}`,
    `- REVIEW: ${summary.review}`,
    `- FAIL: ${summary.fail}`,
    `- Console errors: ${summary.consoleErrors.length}`,
    `- Network 5xx: ${summary.networkFailures.length}`,
    "",
    "## Checks",
    ...summary.checks.map((c) => `- [${c.status}] ${c.name}: ${c.note}`),
  ].join("\n");
  fs.writeFileSync(path.join(OUT_DIR, "SUMMARY.md"), `${md}\n`, "utf8");

  console.log(`Deep admin visual audit complete: ${OUT_DIR}`);
  if (summary.fail > 0 || summary.networkFailures.length > 0) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
