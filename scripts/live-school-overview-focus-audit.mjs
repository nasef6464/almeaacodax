import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const BASE_URL = process.env.UI_AUDIT_BASE_URL || "https://almeaacodax.vercel.app";
const API_BASE_URL = (process.env.UI_AUDIT_API_BASE_URL || "https://almeaacodax-k2ux.onrender.com/api").replace(/\/$/, "");
const RUN_ID = process.env.SCHOOL_OVERVIEW_FOCUS_RUN_ID || `prod-school-overview-focus-${new Date().toISOString().replace(/[:.]/g, "-")}`;
const OUT_DIR = path.resolve("audit-artifacts", "admin-live-handoff", RUN_ID);
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

const adminEmail = process.env.ROLE_ADMIN_EMAIL || process.env.SMOKE_ADMIN_EMAIL || process.env.ADMIN_EMAIL;
const adminPassword = process.env.ROLE_ADMIN_PASSWORD || process.env.SMOKE_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD;
const audit = {
  generatedAt: new Date().toISOString(),
  baseUrl: BASE_URL,
  apiBaseUrl: API_BASE_URL,
  runId: RUN_ID,
  checks: [],
  consoleErrors: [],
  networkFailures: [],
  screenshots: [],
};

function check(name, status, note = "") {
  audit.checks.push({ name, status, note });
}

async function screenshot(page, label) {
  const target = path.join(OUT_DIR, `${label}.png`);
  await page.screenshot({ path: target, fullPage: true });
  audit.screenshots.push(target);
}

async function login(page) {
  if (!adminEmail || !adminPassword) throw new Error("Missing admin credentials.");

  await page.goto(BASE_URL, { waitUntil: "networkidle", timeout: 90000 });
  const result = await page.evaluate(
    async ({ apiBaseUrl, email, password }) => {
      const csrfResponse = await fetch(`${apiBaseUrl}/auth/csrf-token`, { credentials: "include", cache: "no-store" });
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
      if (csrfToken) sessionStorage.setItem("almeaa:csrf-token", csrfToken);
      return { ok: true, role: user.role };
    },
    { apiBaseUrl: API_BASE_URL, email: adminEmail, password: adminPassword },
  );

  if (!result.ok) throw new Error(`Admin login failed: ${result.status}`);
  check("admin login", "PASS", `role=${result.role || "unknown"}`);
}

async function visible(page, testId) {
  return page.getByTestId(testId).isVisible({ timeout: 12000 }).catch(() => false);
}

async function scrollTop(page) {
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
}

async function clickFocus(page, id, expectedTestId) {
  await scrollTop(page);
  const button = page.getByTestId(`school-overview-focus-${id}`);
  await button.waitFor({ state: "visible", timeout: 15000 });
  await button.click();
  const appeared = await visible(page, expectedTestId);
  check(`focus action ${id}`, appeared ? "PASS" : "FAIL", appeared ? `target ${expectedTestId} visible` : `target ${expectedTestId} missing`);
  return appeared;
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
  const page = await context.newPage();

  page.on("console", (msg) => {
    if (msg.type() === "error") audit.consoleErrors.push(msg.text().slice(0, 500));
  });
  page.on("response", (res) => {
    if (res.status() >= 500) audit.networkFailures.push({ status: res.status(), url: res.url() });
  });

  try {
    await login(page);
    await page.goto(`${BASE_URL}/admin-dashboard?tab=groups`, { waitUntil: "networkidle", timeout: 90000 });
    const createJourneyVisible = await page.getByTestId("school-create-journey-panel").isVisible({ timeout: 15000 }).catch(() => false);
    check("school create journey panel", createJourneyVisible ? "PASS" : "FAIL", createJourneyVisible ? "clear create journey visible" : "create journey missing");
    const firstSchoolCard = page.getByTestId("school-card").first();
    await firstSchoolCard.waitFor({ state: "visible", timeout: 45000 });
    check("school list", "PASS", "at least one school card visible");
    const cardReadinessVisible = await firstSchoolCard.getByTestId("school-card-readiness").isVisible({ timeout: 12000 }).catch(() => false);
    const cardNextActionVisible = await firstSchoolCard.getByTestId("school-card-next-action").isVisible({ timeout: 12000 }).catch(() => false);
    const cardProgressVisible = await firstSchoolCard.getByTestId("school-card-readiness-progress").isVisible({ timeout: 12000 }).catch(() => false);
    check("school card commercial state", cardReadinessVisible && cardNextActionVisible && cardProgressVisible ? "PASS" : "FAIL", "readiness, progress and next action visible");

    await firstSchoolCard.getByTestId("school-card-open-management").click();
    await page.getByTestId("school-workspace-shell").waitFor({ state: "visible", timeout: 45000 });
    check("school workspace open", "PASS", "selected school workspace visible");

    await page.getByTestId("school-delete-button").click();
    const deletePanelVisible = await page.getByTestId("school-delete-confirm-panel").isVisible({ timeout: 12000 }).catch(() => false);
    check("school delete confirmation panel", deletePanelVisible ? "PASS" : "FAIL", deletePanelVisible ? "destructive delete requires review panel" : "delete confirmation missing");
    if (deletePanelVisible) {
      await page.getByTestId("school-delete-cancel").click();
      const deletePanelClosed = !(await page.getByTestId("school-delete-confirm-panel").isVisible({ timeout: 3000 }).catch(() => false));
      check("school delete confirmation cancel", deletePanelClosed ? "PASS" : "FAIL", deletePanelClosed ? "delete panel cancelled without deletion" : "delete panel remained open");
    }

    const focusStripVisible = await visible(page, "school-overview-focus-strip");
    check("overview focus strip visible", focusStripVisible ? "PASS" : "FAIL", focusStripVisible ? "focus strip rendered" : "focus strip missing");
    await screenshot(page, "01-school-overview-focus-strip");

    const ids = ["classes", "students", "supervisors", "access"];
    const focusCount = await page.locator('button[data-testid^="school-overview-focus-"]').count();
    check("overview focus card count", focusCount === ids.length ? "PASS" : "FAIL", `${focusCount}/${ids.length} cards`);

    await clickFocus(page, "students", "school-students-panel");
    await screenshot(page, "02-focus-students");
    await clickFocus(page, "supervisors", "school-wide-supervisors-panel");
    await screenshot(page, "03-focus-supervisors");
    await clickFocus(page, "classes", "school-class-creation-panel");
    await screenshot(page, "04-focus-classes");
    await clickFocus(page, "access", "school-packages-panel");
    await screenshot(page, "05-focus-access");

    check("console errors", audit.consoleErrors.length === 0 ? "PASS" : "FAIL", `${audit.consoleErrors.length} console errors`);
    check("server errors", audit.networkFailures.length === 0 ? "PASS" : "FAIL", `${audit.networkFailures.length} 5xx responses`);
  } catch (error) {
    check("audit exception", "FAIL", error?.message || String(error));
    await screenshot(page, "error-state").catch(() => {});
  } finally {
    await browser.close();
    fs.writeFileSync(path.join(OUT_DIR, "SUMMARY.json"), JSON.stringify(audit, null, 2));
    const lines = [
      `# School Overview Focus Audit`,
      ``,
      `- Run: ${RUN_ID}`,
      `- Base URL: ${BASE_URL}`,
      `- Generated: ${audit.generatedAt}`,
      ``,
      `## Checks`,
      ...audit.checks.map((item) => `- ${item.status}: ${item.name}${item.note ? ` - ${item.note}` : ""}`),
      ``,
      `## Screenshots`,
      ...audit.screenshots.map((item) => `- ${item}`),
    ];
    fs.writeFileSync(path.join(OUT_DIR, "SUMMARY.md"), `${lines.join("\n")}\n`);
  }

  const failed = audit.checks.filter((item) => item.status === "FAIL");
  console.log(JSON.stringify({ runId: RUN_ID, failed: failed.length, checks: audit.checks }, null, 2));
  if (failed.length) process.exit(1);
}

main();
