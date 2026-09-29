import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const BASE_URL = String(process.env.UI_AUDIT_BASE_URL || "https://almeaacodax.vercel.app").replace(/\/$/, "");
const API_BASE_URL = String(process.env.UI_AUDIT_API_BASE_URL || `${BASE_URL}/api`).replace(/\/$/, "");
const RUN_ID = `counter-integrity-${new Date().toISOString().replace(/[:.]/g, "-")}`;
const OUT_DIR = path.resolve("audit-artifacts", "counter-integrity", RUN_ID);
const ADMIN_EMAIL = process.env.ROLE_ADMIN_EMAIL || process.env.SMOKE_ADMIN_EMAIL || process.env.ADMIN_EMAIL || "";
const ADMIN_PASSWORD = process.env.ROLE_ADMIN_PASSWORD || process.env.SMOKE_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD || "";

const QUANT_PATH_ID = "p_1777779639431";
const QUANT_SUBJECT_ID = "sub_1777779748206";

fs.mkdirSync(OUT_DIR, { recursive: true });

if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  throw new Error("Counter integrity audit requires admin email/password credentials.");
}

const readNumber = async (page, testId) => {
  const text = (await page.getByTestId(testId).innerText()).replace(/,/g, "");
  const matches = text.match(/\d+/g);
  if (!matches?.length) throw new Error(`No numeric value found in ${testId}: ${text}`);
  return Number(matches[matches.length - 1]);
};

const waitNumber = async (page, testId, expected) => {
  await page.waitForFunction(
    ({ testId, expected }) => {
      const el = document.querySelector(`[data-testid="${testId}"]`);
      if (!el) return false;
      const values = String(el.textContent || "").replace(/,/g, "").match(/\d+/g);
      return Boolean(values?.length && Number(values[values.length - 1]) === expected);
    },
    { testId, expected },
    { timeout: 60000 },
  );
};

async function login(page) {
  await page.goto(BASE_URL, { waitUntil: "domcontentloaded", timeout: 60000 });
  const result = await page.evaluate(
    async ({ apiBaseUrl, email, password }) => {
      const csrfResponse = await fetch(`${apiBaseUrl}/auth/csrf-token`, {
        credentials: "include",
        cache: "no-store",
        headers: { accept: "application/json" },
      });
      const csrfPayload = await csrfResponse.json().catch(() => ({}));
      const csrfToken = String(csrfPayload?.csrfToken || "");
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
      if (!loginResponse.ok) {
        return { ok: false, status: loginResponse.status, message: payload?.message || "login failed" };
      }
      const user = payload?.user || {};
      sessionStorage.setItem(
        "the-hundred-auth-profile",
        JSON.stringify({
          id: String(user.id || user._id || user.email || ""),
          email: user.email || "",
          displayName: user.name || "",
          photoURL: user.avatar || "",
          role: user.role || "",
        }),
      );
      if (csrfToken) sessionStorage.setItem("almeaa:csrf-token", csrfToken);
      return { ok: true, role: user.role || "", email: user.email || "" };
    },
    { apiBaseUrl: API_BASE_URL, email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
  );
  if (!result.ok || result.role !== "admin") {
    throw new Error(`Admin login failed: ${JSON.stringify(result)}`);
  }
  return result;
}

async function apiJson(page, pathname) {
  return page.evaluate(
    async ({ apiBaseUrl, pathname }) => {
      const response = await fetch(`${apiBaseUrl}${pathname}`, {
        credentials: "include",
        cache: "no-store",
        headers: { accept: "application/json" },
      });
      const payload = await response.json().catch(() => ({}));
      return { ok: response.ok, status: response.status, payload };
    },
    { apiBaseUrl: API_BASE_URL, pathname },
  );
}

function taxonomyCounts(payload) {
  const sections = Array.isArray(payload?.sections) ? payload.sections : [];
  const skills = Array.isArray(payload?.skills) ? payload.skills : [];
  const sumSubSkills = (subjectId) =>
    skills
      .filter((skill) => !subjectId || String(skill.subjectId || "") === subjectId)
      .reduce((sum, skill) => sum + (Array.isArray(skill.subSkills) ? skill.subSkills.length : 0), 0);
  return {
    global: { main: sections.length, sub: sumSubSkills("") },
    quant: {
      main: sections.filter((section) => String(section.subjectId || "") === QUANT_SUBJECT_ID).length,
      sub: sumSubSkills(QUANT_SUBJECT_ID),
    },
  };
}

const checks = [];
const check = (name, actual, expected) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  checks.push({ name, ok, actual, expected });
};

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ locale: "ar-SA", timezoneId: "Asia/Riyadh" });
const page = await context.newPage();
const network5xx = [];
page.on("response", (response) => {
  if (response.status() >= 500) network5xx.push({ status: response.status(), url: response.url() });
});

try {
  const loginResult = await login(page);

  const [globalApi, quantApi, taxonomyApi] = await Promise.all([
    apiJson(page, "/quizzes/questions?includeCoverage=true&paginate=true&page=1&limit=1"),
    apiJson(page, `/quizzes/questions?pathId=${QUANT_PATH_ID}&subject=${QUANT_SUBJECT_ID}&includeCoverage=true&paginate=true&page=1&limit=1`),
    apiJson(page, "/taxonomy/bootstrap"),
  ]);

  if (!globalApi.ok || !quantApi.ok || !taxonomyApi.ok) {
    throw new Error(
      `Counter API request failed: global=${globalApi.status}, quant=${quantApi.status}, taxonomy=${taxonomyApi.status}`,
    );
  }

  const globalCoverage = globalApi.payload?.coverage || {};
  const quantCoverage = quantApi.payload?.coverage || {};
  const taxonomy = taxonomyCounts(taxonomyApi.payload || {});

  check(
    "API global question coverage",
    {
      total: Number(globalCoverage.total),
      main: Number(globalCoverage.mainSkillCount),
      sub: Number(globalCoverage.subSkillCount),
      pending: Number(globalCoverage.pendingCount),
      draft: Number(globalCoverage.draftCount),
    },
    { total: 3062, main: 47, sub: 163, pending: 0, draft: 1258 },
  );
  check(
    "API quant question coverage",
    {
      total: Number(quantCoverage.total),
      main: Number(quantCoverage.mainSkillCount),
      sub: Number(quantCoverage.subSkillCount),
    },
    { total: 1804, main: 25, sub: 93 },
  );
  check("API global taxonomy", taxonomy.global, { main: 87, sub: 322 });
  check("API quant taxonomy", taxonomy.quant, { main: 25, sub: 95 });

  await page.goto(`${BASE_URL}/admin-dashboard?tab=questions`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await waitNumber(page, "question-counter-total", 3062);
  const questionGlobalUi = {
    total: await readNumber(page, "question-counter-total"),
    main: await readNumber(page, "question-counter-main-covered"),
    sub: await readNumber(page, "question-counter-sub-covered"),
    draft: await readNumber(page, "question-counter-draft"),
    pending: await readNumber(page, "question-counter-pending"),
  };
  check("UI Question Center global", questionGlobalUi, { total: 3062, main: 47, sub: 163, draft: 1258, pending: 0 });
  await page.screenshot({ path: path.join(OUT_DIR, "question-center-global.png"), fullPage: false });

  await page.getByTestId("question-filter-path").selectOption(QUANT_PATH_ID);
  await page.getByTestId("question-filter-subject").locator(`option[value="${QUANT_SUBJECT_ID}"]`).waitFor({ state: "attached", timeout: 30000 });
  await page.getByTestId("question-filter-subject").selectOption(QUANT_SUBJECT_ID);
  await waitNumber(page, "question-counter-total", 1804);
  const questionQuantUi = {
    total: await readNumber(page, "question-counter-total"),
    main: await readNumber(page, "question-counter-main-covered"),
    sub: await readNumber(page, "question-counter-sub-covered"),
  };
  check("UI Question Center quant", questionQuantUi, { total: 1804, main: 25, sub: 93 });
  await page.screenshot({ path: path.join(OUT_DIR, "question-center-quant.png"), fullPage: false });

  await page.goto(`${BASE_URL}/admin-dashboard?tab=skills`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await waitNumber(page, "skills-counter-main", 87);
  await waitNumber(page, "skills-counter-sub", 322);
  const skillsGlobalUi = {
    main: await readNumber(page, "skills-counter-main"),
    sub: await readNumber(page, "skills-counter-sub"),
  };
  check("UI Skills Center global", skillsGlobalUi, { main: 87, sub: 322 });

  await page.getByTestId("skills-filter-path").selectOption(QUANT_PATH_ID);
  await page.getByTestId("skills-filter-subject").locator(`option[value="${QUANT_SUBJECT_ID}"]`).waitFor({ state: "attached", timeout: 30000 });
  await page.getByTestId("skills-filter-subject").selectOption(QUANT_SUBJECT_ID);
  await waitNumber(page, "skills-counter-main", 25);
  await waitNumber(page, "skills-counter-sub", 95);
  await waitNumber(page, "skills-counter-questions", 1804);
  const skillsQuantUi = {
    main: await readNumber(page, "skills-counter-main"),
    sub: await readNumber(page, "skills-counter-sub"),
    questions: await readNumber(page, "skills-counter-questions"),
  };
  check("UI Skills Center quant", skillsQuantUi, { main: 25, sub: 95, questions: 1804 });
  await page.screenshot({ path: path.join(OUT_DIR, "skills-center-quant.png"), fullPage: false });

  check("No network 5xx during live counter audit", network5xx.length, 0);

  const report = {
    generatedAt: new Date().toISOString(),
    baseUrl: BASE_URL,
    apiBaseUrl: API_BASE_URL,
    login: loginResult,
    checks,
    network5xx,
    status: checks.every((item) => item.ok) ? "PASS" : "FAIL",
  };
  fs.writeFileSync(path.join(OUT_DIR, "counter-integrity-live.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));

  if (report.status !== "PASS") process.exitCode = 1;
} finally {
  await browser.close();
}
