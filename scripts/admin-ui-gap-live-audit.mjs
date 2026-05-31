import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const BASE_URL = process.env.UI_AUDIT_BASE_URL || "https://almeaacodax.vercel.app";
const API_BASE_URL = (process.env.UI_AUDIT_API_BASE_URL || "https://almeaacodax-k2ux.onrender.com/api").replace(/\/$/, "");
const RUN_ID = process.env.ADMIN_UI_GAP_RUN_ID || `admin-ui-gap-${new Date().toISOString().replace(/[:.]/g, "-")}`;
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

const tabs = [
  "overview",
  "paths",
  "lessons",
  "library",
  "quizzes",
  "mock-exams",
  "questions",
  "skills",
  "users",
  "groups",
  "school-portal",
  "memberships",
  "financial",
  "notifications",
  "homepage",
  "announcement-ads",
  "platform-fonts",
  "platform-integrations",
  "live-sessions",
  "backups",
  "monitoring",
  "ai-assistant",
  "settings",
];

async function login(page) {
  if (!adminEmail || !adminPassword) throw new Error("Missing admin credentials");
  await page.goto(BASE_URL, { waitUntil: "networkidle", timeout: 60000 });
  const result = await page.evaluate(
    async ({ apiBaseUrl, email, password }) => {
      const csrfResponse = await fetch(`${apiBaseUrl}/auth/csrf-token`, { credentials: "include", cache: "no-store" });
      const csrfPayload = await csrfResponse.json().catch(() => ({}));
      const loginResponse = await fetch(`${apiBaseUrl}/auth/login`, {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json", "x-csrf-token": csrfPayload?.csrfToken || "" },
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
  if (!result.ok) throw new Error(`Admin login failed: ${result.status}`);
}

async function inspectTab(page, tab) {
  const consoleErrors = [];
  const network5xx = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text().slice(0, 240));
  });
  page.on("response", (response) => {
    if (response.status() >= 500) network5xx.push({ status: response.status(), url: response.url() });
  });

  await page.goto(`${BASE_URL}/admin-dashboard?tab=${encodeURIComponent(tab)}`, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(800);

  const result = await page.evaluate(() => {
    const isVisible = (el) => {
      const rect = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      return rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden" && style.opacity !== "0";
    };
    const textOf = (el) =>
      [
        el.getAttribute("aria-label"),
        el.getAttribute("title"),
        el.textContent,
        el.getAttribute("placeholder"),
        el.getAttribute("name"),
      ]
        .map((value) => String(value || "").replace(/\s+/g, " ").trim())
        .find(Boolean) || "";

    const controls = Array.from(document.querySelectorAll("button, a[href], [role='button'], input, select, textarea")).filter(isVisible);
    const unnamedControls = controls
      .filter((el) => {
        const tag = el.tagName.toLowerCase();
        const type = String(el.getAttribute("type") || "").toLowerCase();
        if (tag === "input" && ["hidden", "password"].includes(type)) return false;
        return !textOf(el);
      })
      .slice(0, 12)
      .map((el) => ({
        tag: el.tagName.toLowerCase(),
        type: el.getAttribute("type") || "",
        className: String(el.getAttribute("class") || "").slice(0, 120),
      }));

    const disabledWithoutReason = controls
      .filter((el) => el.disabled || el.getAttribute("aria-disabled") === "true")
      .filter((el) => {
        const reason = [el.getAttribute("title"), el.getAttribute("aria-label"), el.getAttribute("aria-describedby")]
          .map((value) => String(value || "").trim())
          .filter(Boolean)
          .join(" ");
        return reason.length < 4;
      })
      .slice(0, 12)
      .map((el) => ({
        label: textOf(el).slice(0, 120),
        tag: el.tagName.toLowerCase(),
        className: String(el.getAttribute("class") || "").slice(0, 120),
      }));

    const bodyText = document.body.innerText || "";
    const incompletePatterns = [
      /قريبا/g,
      /قريبًا/g,
      /تحت التطوير/g,
      /غير متاح/g,
      /coming soon/gi,
      /under construction/gi,
      /TODO/g,
    ];
    const incompleteTextHits = [];
    for (const pattern of incompletePatterns) {
      const matches = bodyText.match(pattern) || [];
      if (matches.length) incompleteTextHits.push({ pattern: String(pattern), count: matches.length });
    }

    const genericButtons = Array.from(document.querySelectorAll("button, [role='button']")).filter(isVisible)
      .map((el) => textOf(el))
      .filter((label) => /^(ok|yes|no|submit|button|\.\.\.|…|حسنا|نعم|لا)$/i.test(label))
      .slice(0, 12);

    return {
      controls: controls.length,
      unnamedControls,
      disabledWithoutReason,
      incompleteTextHits,
      genericButtons,
      bodyLength: bodyText.length,
    };
  });

  const status =
    consoleErrors.length || network5xx.length || result.unnamedControls.length || result.disabledWithoutReason.length || result.incompleteTextHits.length
      ? "REVIEW"
      : "PASS";
  return { tab, status, consoleErrors, network5xx, ...result };
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  const results = [];
  try {
    await login(page);
    for (const tab of tabs) {
      results.push(await inspectTab(page, tab));
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
    total: results.length,
    pass: results.filter((row) => row.status === "PASS").length,
    review: results.filter((row) => row.status === "REVIEW").length,
    results,
  };
  fs.writeFileSync(path.join(OUT_DIR, "admin-ui-gap-live-audit.json"), JSON.stringify(summary, null, 2), "utf8");
  const lines = [
    "# Admin UI Gap Live Audit",
    "",
    `- Generated: ${summary.generatedAt}`,
    `- Base URL: ${summary.baseUrl}`,
    `- Total tabs: ${summary.total}`,
    `- PASS: ${summary.pass}`,
    `- REVIEW: ${summary.review}`,
    "",
    "## Results",
    ...results.map((row) => {
      const issues = [
        row.unnamedControls.length ? `unnamed=${row.unnamedControls.length}` : "",
        row.disabledWithoutReason.length ? `disabledWithoutReason=${row.disabledWithoutReason.length}` : "",
        row.incompleteTextHits.length ? `incompleteText=${row.incompleteTextHits.map((item) => item.count).reduce((a, b) => a + b, 0)}` : "",
        row.consoleErrors.length ? `console=${row.consoleErrors.length}` : "",
        row.network5xx.length ? `network5xx=${row.network5xx.length}` : "",
      ].filter(Boolean).join(", ");
      return `- [${row.status}] ${row.tab}: controls=${row.controls}${issues ? `, ${issues}` : ""}`;
    }),
  ];
  fs.writeFileSync(path.join(OUT_DIR, "SUMMARY.md"), `${lines.join("\n")}\n`, "utf8");
  console.log(JSON.stringify({ outDir: OUT_DIR, total: summary.total, pass: summary.pass, review: summary.review }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
