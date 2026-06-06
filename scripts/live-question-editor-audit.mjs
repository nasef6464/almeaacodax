import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const BASE_URL = String(process.env.UI_AUDIT_BASE_URL || "https://almeaacodax.vercel.app").replace(/\/$/, "");
const API_BASE_URL = String(process.env.UI_AUDIT_API_BASE_URL || "https://almeaacodax-k2ux.onrender.com/api").replace(/\/$/, "");
const RUN_ID = process.env.QUESTION_EDITOR_AUDIT_RUN_ID || `question-editor-${new Date().toISOString().replace(/[:.]/g, "-")}`;
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

const ROLE_CANDIDATES = [
  {
    role: "admin",
    email: process.env.ROLE_ADMIN_EMAIL || process.env.SMOKE_ADMIN_EMAIL || process.env.ADMIN_EMAIL,
    password: process.env.ROLE_ADMIN_PASSWORD || process.env.SMOKE_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD,
  },
  {
    role: "teacher",
    email: process.env.ROLE_TEACHER_EMAIL || process.env.TEACHER_EMAIL,
    password: process.env.ROLE_TEACHER_PASSWORD || process.env.TEACHER_PASSWORD,
  },
].filter((candidate) => candidate.email && candidate.password);

const inlineSvg =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="260" height="120" viewBox="0 0 260 120">
      <rect width="260" height="120" fill="#fff7ed"/>
      <line x1="24" y1="86" x2="236" y2="86" stroke="#111827" stroke-width="4"/>
      <line x1="56" y1="86" x2="168" y2="22" stroke="#dc2626" stroke-width="4"/>
      <text x="120" y="52" font-family="Arial" font-size="22" fill="#111827">س² + ص²</text>
      <text x="32" y="108" font-family="Arial" font-size="18" fill="#1d4ed8">رسم سؤال</text>
    </svg>`,
  );

async function login(page) {
  if (!ROLE_CANDIDATES.length) throw new Error("Missing admin/teacher credentials for question editor live audit");
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
  throw new Error(`Question editor audit login failed (${lastFailure})`);
}

async function apiRequest(page, pathName, options = {}) {
  return page.evaluate(
    async ({ apiBaseUrl, pathName, options }) => {
      const csrfToken = sessionStorage.getItem("almeaa:csrf-token") || "";
      const response = await fetch(`${apiBaseUrl}${pathName}`, {
        credentials: "include",
        cache: "no-store",
        ...options,
        headers: {
          accept: "application/json",
          ...(options.body ? { "content-type": "application/json" } : {}),
          ...(csrfToken && options.method && options.method !== "GET" ? { "x-csrf-token": csrfToken } : {}),
          ...(options.headers || {}),
        },
      });
      const payload = await response.json().catch(() => ({}));
      return { ok: response.ok, status: response.status, payload };
    },
    { apiBaseUrl: API_BASE_URL, pathName, options },
  );
}

async function createInlineMediaQuestion(page, marker) {
  const list = await apiRequest(page, "/quizzes/questions?approvalStatus=approved&limit=20");
  const items = Array.isArray(list.payload?.data) ? list.payload.data : Array.isArray(list.payload) ? list.payload : [];
  const seed = items.find((question) => question.pathId && question.subject && Array.isArray(question.skillIds) && question.skillIds.length);
  if (!seed) throw new Error("No seeded approved question with path/subject/skillIds is available for question editor audit");

  const text = [
    `<p dir="rtl"><strong>${marker}</strong> سؤال تدقيق للمحرر: احسب <span style="font-family: Arial; font-size: 18px">س<sup>2</sup> + ص<sup>2</sup></span></p>`,
    `<p dir="rtl"><img src="${inlineSvg}" alt="رسم رياضيات داخل السؤال" /></p>`,
    '<table dir="rtl" style="border-collapse: collapse"><tbody><tr><td>أ</td><td>٣</td></tr><tr><td>ب</td><td>٤</td></tr></tbody></table>',
  ].join("");

  const created = await apiRequest(page, "/quizzes/questions", {
    method: "POST",
    body: JSON.stringify({
      text,
      options: ["٣", "٤", "٥", "٦"],
      correctOptionIndex: 2,
      explanation: "سؤال تدقيق مؤقت لفحص عرض الصور والرياضيات في قائمة الأسئلة.",
      skillIds: seed.skillIds.slice(0, 3),
      pathId: seed.pathId,
      subject: seed.subject,
      sectionId: seed.sectionId || undefined,
      difficulty: "Medium",
      type: "mcq",
      approvalStatus: "approved",
    }),
  });

  if (!created.ok) {
    throw new Error(`Could not create audit question (${created.status}): ${created.payload?.message || ""}`);
  }

  return created.payload;
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ locale: "ar-SA", timezoneId: "Asia/Riyadh" });
  const page = await context.newPage();
  const consoleErrors = [];
  const network5xx = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text().slice(0, 300));
  });
  page.on("response", (response) => {
    if (response.status() >= 500) network5xx.push({ status: response.status(), url: response.url() });
  });

  const marker = `question-editor-audit-${Date.now()}`;
  let createdQuestion = null;

  try {
    const loginResult = await login(page);
    createdQuestion = await createInlineMediaQuestion(page, marker);

    await page.goto(`${BASE_URL}/admin-dashboard?tab=questions`, { waitUntil: "networkidle", timeout: 60000 });
    await page.getByTestId("question-bank-add-question").click();
    await page.waitForSelector('[data-testid="question-editor-math-toolbar"]', { timeout: 30000 });
    const editorState = await page.evaluate(() => ({
      hasWordPasteSurface: Boolean(document.querySelector('[data-testid="question-editor-word-paste"]')),
      hasMathToolbar: Boolean(document.querySelector('[data-testid="question-editor-math-toolbar"]')),
      hasEquationInput: Boolean(document.querySelector('[data-testid="question-editor-equation-input"]')),
      hasEquationPreview: Boolean(document.querySelector('[data-testid="question-editor-equation-preview"]')),
      hasInsertEquation: Boolean(document.querySelector('[data-testid="question-editor-insert-equation"]')),
      formulaTemplateCount: document.querySelectorAll('[data-testid="question-editor-formula-template"]').length,
      mathSymbolCount: document.querySelectorAll('[data-testid="question-editor-math-symbol"]').length,
      hasDrawingToggle: Boolean(document.querySelector('[data-testid="question-editor-drawing-toggle"]')),
    }));
    await page.getByTestId("question-editor-equation-input").fill("\\frac{444}{555}\\div\\frac{666}{333}");
    await page.getByTestId("question-editor-insert-equation").click();
    const insertedFormulaCount = await page.locator(".ql-formula").count();
    await page.screenshot({ path: path.join(OUT_DIR, "editor-toolbar.png"), fullPage: false });

    await page.goto(`${BASE_URL}/admin-dashboard?tab=questions`, { waitUntil: "networkidle", timeout: 60000 });
    const searchInput = page.getByTestId("question-bank-search-input");
    await searchInput.fill(marker);
    await page.waitForFunction(
      (needle) => Array.from(document.querySelectorAll("tbody tr")).some((row) => (row.textContent || "").includes(needle)),
      marker,
      { timeout: 30000 },
    );
    const markerRow = page.locator("tbody tr").filter({ hasText: marker }).first();
    await markerRow.scrollIntoViewIfNeeded();
    const listState = await page.evaluate((marker) => {
      const text = document.body.innerText || "";
      const row = Array.from(document.querySelectorAll("tbody tr")).find((item) => (item.textContent || "").includes(marker));
      const inlinePreview = row?.querySelector('[data-testid="question-row-inline-media-preview"]');
      const mediaPreview = row?.querySelector('[data-testid="question-row-media-preview"]');
      const inlineImage = inlinePreview?.querySelector("img");
      return {
        hasMarker: text.includes(marker),
        markerRowVisible: Boolean(row && row.getBoundingClientRect().width > 20 && row.getBoundingClientRect().height > 20),
        markerRowHasMediaPreview: Boolean(mediaPreview),
        markerRowHasInlineMediaPreview: Boolean(inlinePreview),
        mediaPreviewCount: document.querySelectorAll('[data-testid="question-row-media-preview"]').length,
        inlineMediaPreviewCount: document.querySelectorAll('[data-testid="question-row-inline-media-preview"]').length,
        inlineImageVisible: Boolean(inlineImage && inlineImage.getBoundingClientRect().width > 20 && inlineImage.getBoundingClientRect().height > 20),
        fallbackWithoutTextVisible: text.includes("سؤال بدون نص"),
      };
    }, marker);
    await page.screenshot({ path: path.join(OUT_DIR, "question-list-inline-media.png"), fullPage: false });

    await markerRow.getByTestId("question-row-edit").click();
    await page.waitForSelector('[data-testid="question-builder-option-input"]', { timeout: 30000 });
    const editState = await page.evaluate(() => {
      const modal = document.querySelector('[data-testid="question-builder-modal"]');
      const optionInputs = Array.from(document.querySelectorAll<HTMLInputElement>('[data-testid="question-builder-option-input"]'));
      const questionEditor = document.querySelector('[data-testid="question-editor-word-paste"] .ql-container');
      return {
        optionCount: optionInputs.length,
        filledOptionCount: optionInputs.filter((input) => input.value.trim().length > 0).length,
        optionValues: optionInputs.map((input) => input.value),
        modalWidth: modal?.getBoundingClientRect().width || 0,
        questionEditorHeight: questionEditor?.getBoundingClientRect().height || 0,
      };
    });
    await page.screenshot({ path: path.join(OUT_DIR, "edit-question-options.png"), fullPage: false });

    const checks = [
      { name: "editor word-paste surface visible", ok: editorState.hasWordPasteSurface },
      { name: "editor math toolbar visible", ok: editorState.hasMathToolbar },
      { name: "editor equation input visible", ok: editorState.hasEquationInput },
      { name: "editor equation preview visible", ok: editorState.hasEquationPreview },
      { name: "editor formula templates available", ok: editorState.formulaTemplateCount >= 1 },
      { name: "editor equation insertion works", ok: insertedFormulaCount >= 1 },
      { name: "editor math symbols available", ok: editorState.mathSymbolCount >= 10 },
      { name: "editor drawing toggle visible", ok: editorState.hasDrawingToggle },
      { name: "temporary inline-media question is searchable", ok: listState.hasMarker },
      { name: "temporary question row is visible", ok: listState.markerRowVisible },
      { name: "question row media preview visible", ok: listState.markerRowHasMediaPreview },
      { name: "inline media preview visible in row", ok: listState.markerRowHasInlineMediaPreview && listState.inlineImageVisible },
      { name: "edit form keeps saved options", ok: editState.optionCount >= 4 && editState.filledOptionCount >= 4 },
      { name: "edit form is wider and question editor is taller", ok: editState.modalWidth >= 900 && editState.questionEditorHeight >= 300 },
      { name: "no server errors observed", ok: network5xx.length === 0 },
    ];

    const failed = checks.filter((check) => !check.ok);
    const summary = {
      generatedAt: new Date().toISOString(),
      baseUrl: BASE_URL,
      loginRole: loginResult.role,
      marker,
      createdQuestionId: createdQuestion?.id || createdQuestion?._id || "",
      editorState,
      listState,
      editState,
      consoleErrors,
      network5xx,
      checks,
      passed: failed.length === 0,
    };

    fs.writeFileSync(path.join(OUT_DIR, "question-editor-live-audit.json"), JSON.stringify(summary, null, 2), "utf8");
    fs.writeFileSync(
      path.join(OUT_DIR, "SUMMARY.md"),
      [
        "# Question Editor Live Audit",
        "",
        `- Generated: ${summary.generatedAt}`,
        `- Base URL: ${BASE_URL}`,
        `- Logged role: ${summary.loginRole}`,
        `- PASS: ${checks.length - failed.length}/${checks.length}`,
        "",
        "## Checks",
        ...checks.map((check) => `- [${check.ok ? "PASS" : "FAIL"}] ${check.name}`),
        "",
      ].join("\n"),
      "utf8",
    );

    if (failed.length) {
      console.error(`Question editor live audit failed: ${OUT_DIR}`);
      failed.forEach((check) => console.error(`- ${check.name}`));
      process.exitCode = 1;
    } else {
      console.log(`Question editor live audit passed: ${OUT_DIR}`);
      console.log(`PASS ${checks.length}/${checks.length}`);
    }
  } finally {
    if (createdQuestion?.id || createdQuestion?._id) {
      const id = createdQuestion.id || createdQuestion._id;
      await apiRequest(page, `/quizzes/questions/${id}`, { method: "DELETE" }).catch(() => null);
    }
    await context.close().catch(() => {});
    await browser.close().catch(() => {});
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
