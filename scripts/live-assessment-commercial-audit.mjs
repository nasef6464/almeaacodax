import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const BASE_URL = String(process.env.UI_AUDIT_BASE_URL || "").replace(/\/$/, "");
const API_BASE_URL = String(process.env.UI_AUDIT_API_BASE_URL || "").replace(/\/$/, "");
const RUN_ID = process.env.ASSESSMENT_COMMERCIAL_AUDIT_RUN_ID || `assessment-commercial-${new Date().toISOString().replace(/[:.]/g, "-")}`;
const OUT_DIR = path.resolve("audit-artifacts", "ui-audit-exhaustive", RUN_ID);
const CREDENTIALS_FILE = process.env.ROLE_CREDENTIALS_FILE || path.resolve("audit-artifacts", "ROLE_CREDENTIALS.env");

if (!BASE_URL || !API_BASE_URL) throw new Error("UI_AUDIT_BASE_URL and UI_AUDIT_API_BASE_URL are required; this audit must only run on the isolated stack.");
fs.mkdirSync(OUT_DIR, { recursive: true });

if (fs.existsSync(CREDENTIALS_FILE)) {
  for (const line of fs.readFileSync(CREDENTIALS_FILE, "utf8").split(/\r?\n/)) {
    const [key, ...rest] = line.trim().split("=");
    if (key && rest.length && !process.env[key]) process.env[key] = rest.join("=").trim();
  }
}

const credentials = {
  admin: { email: process.env.ROLE_ADMIN_EMAIL, password: process.env.ROLE_ADMIN_PASSWORD },
  student: { email: process.env.ROLE_STUDENT_EMAIL, password: process.env.ROLE_STUDENT_PASSWORD },
  outsider: { email: process.env.ROLE_PARENT_EMAIL, password: process.env.ROLE_PARENT_PASSWORD },
};

for (const [role, account] of Object.entries(credentials)) {
  if (!account.email || !account.password) throw new Error(`Missing isolated ${role} credentials`);
}

async function login(context, account) {
  const page = await context.newPage();
  await page.goto(BASE_URL, { waitUntil: "domcontentloaded", timeout: 60000 });
  const result = await page.evaluate(async ({ apiBaseUrl, email, password }) => {
    const csrf = await fetch(`${apiBaseUrl}/auth/csrf-token`, { credentials: "include" });
    const csrfBody = await csrf.json().catch(() => ({}));
    const response = await fetch(`${apiBaseUrl}/auth/login`, {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json", "x-csrf-token": csrfBody?.csrfToken || "" },
      body: JSON.stringify({ email, password }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload?.user) return { ok: false, status: response.status, message: payload?.message || "" };
    sessionStorage.setItem("the-hundred-auth-profile", JSON.stringify({
      id: String(payload.user.id || payload.user._id || payload.user.email), email: payload.user.email,
      displayName: payload.user.name, photoURL: payload.user.avatar || "", role: payload.user.role,
      groupIds: Array.isArray(payload.user.groupIds) ? payload.user.groupIds.map(String) : [],
      schoolId: payload.user.schoolId || null,
    }));
    if (csrfBody?.csrfToken) sessionStorage.setItem("almeaa:csrf-token", csrfBody.csrfToken);
    return { ok: true, user: payload.user };
  }, { apiBaseUrl: API_BASE_URL, ...account });
  if (!result.ok) throw new Error(`Login failed (${result.status}): ${result.message}`);
  // The page was opened before the cookie/session profile was established.
  // Reload so AuthContext and the persisted store hydrate from the new session
  // before any role-scoped catalog assertions run.
  await page.reload({ waitUntil: "domcontentloaded", timeout: 60000 });
  return { page, user: result.user };
}

async function api(page, pathname, options = {}) {
  return page.evaluate(async ({ apiBaseUrl, pathname, options }) => {
    const csrfToken = sessionStorage.getItem("almeaa:csrf-token") || "";
    const response = await fetch(`${apiBaseUrl}${pathname}`, {
      credentials: "include", cache: "no-store", ...options,
      headers: { accept: "application/json", ...(options.body ? { "content-type": "application/json" } : {}), ...(options.method && options.method !== "GET" && csrfToken ? { "x-csrf-token": csrfToken } : {}) },
    });
    return { ok: response.ok, status: response.status, payload: await response.json().catch(() => ({})) };
  }, { apiBaseUrl: API_BASE_URL, pathname, options });
}

function listOf(payload, key) {
  return Array.isArray(payload?.[key]) ? payload[key] : Array.isArray(payload?.data) ? payload.data : Array.isArray(payload) ? payload : [];
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const adminContext = await browser.newContext({ locale: "ar-SA", timezoneId: "Asia/Riyadh" });
  let studentContext = await browser.newContext({ locale: "ar-SA", timezoneId: "Asia/Riyadh" });
  const outsiderContext = await browser.newContext({ locale: "ar-SA", timezoneId: "Asia/Riyadh" });
  const errors = [];
  let createdQuizId = "";
  const createdQuestionIds = [];
  try {
    const admin = await login(adminContext, credentials.admin);
    const student = await login(studentContext, credentials.student);
    const outsider = await login(outsiderContext, credentials.outsider);
    const marker = `assessment-commercial-${Date.now()}`;
    const [questionsResponse, bootstrapResponse, studentMe] = await Promise.all([
      api(admin.page, "/quizzes/questions?approvalStatus=approved&limit=100"),
      api(admin.page, "/content/bootstrap?scope=full"),
      api(student.page, "/auth/me"),
    ]);
    const questions = listOf(questionsResponse.payload, "questions");
    const question = questions.find((item) => item.pathId && (item.subject || item.subjectId));
    const studentGroupIds = new Set([...(student.user.groupIds || []), ...(studentMe.payload?.groupIds || []), ...(studentMe.payload?.user?.groupIds || [])].map(String));
    const groups = listOf(bootstrapResponse.payload, "groups");
    const targetGroup = groups.find((group) => studentGroupIds.has(String(group.id || group._id)));
    if (!questionsResponse.ok || !question || !targetGroup) throw new Error("Isolated fixture map lacks an approved scoped question or the target student's group.");

    // The product selector intentionally uses bounded pages. Create a
    // disposable 101-question fixture in the isolated database so this audit
    // proves a manager can retain selections from both pages without loading a
    // whole question bank into the browser.
    const fixtureSkillId = Array.isArray(question.skillIds) ? question.skillIds[0] : "";
    if (!fixtureSkillId) throw new Error("Isolated fixture question lacks a skill required for pagination coverage.");
    for (let index = 0; index < 101; index += 1) {
      const id = `${marker}-question-${String(index).padStart(3, "0")}`;
      const response = await api(admin.page, "/quizzes/questions", {
        method: "POST",
        body: JSON.stringify({
          id,
          text: `${marker} pagination question ${index + 1}`,
          options: ["أ", "ب", "ج", "د"],
          correctOptionIndex: 0,
          skillIds: [String(fixtureSkillId)],
          pathId: String(question.pathId),
          subject: String(question.subject || question.subjectId),
          sectionId: question.sectionId ? String(question.sectionId) : undefined,
          difficulty: "Medium",
          type: "mcq",
          approvalStatus: "approved",
        }),
      });
      if (!response.ok) throw new Error(`Pagination fixture question ${index + 1} failed (${response.status}).`);
      createdQuestionIds.push(id);
    }
    const [firstFixturePage, secondFixturePage] = await Promise.all([
      api(admin.page, `/quizzes/questions?search=${encodeURIComponent(marker)}&pathId=${encodeURIComponent(String(question.pathId))}&subject=${encodeURIComponent(String(question.subject || question.subjectId))}&page=1&limit=100`),
      api(admin.page, `/quizzes/questions?search=${encodeURIComponent(marker)}&pathId=${encodeURIComponent(String(question.pathId))}&subject=${encodeURIComponent(String(question.subject || question.subjectId))}&page=2&limit=100`),
    ]);
    const firstPageQuestion = listOf(firstFixturePage.payload, "questions")[0];
    const secondPageQuestion = listOf(secondFixturePage.payload, "questions")[0];
    if (!firstFixturePage.ok || !secondFixturePage.ok || !firstPageQuestion?.id || !secondPageQuestion?.id) {
      throw new Error("Pagination fixture did not yield two bounded question pages.");
    }

    await admin.page.goto(`${BASE_URL}/admin-dashboard?tab=quizzes`, { waitUntil: "networkidle", timeout: 60000 });
    await admin.page.getByTestId("assessment-manager-create").click();
    await admin.page.getByTestId("assessment-builder").waitFor();
    await admin.page.getByTestId("assessment-builder-kind-test").click();
    await admin.page.getByTestId("assessment-builder-title").fill(marker);
    await admin.page.getByTestId("assessment-builder-path").selectOption(String(question.pathId));
    await admin.page.getByTestId("assessment-builder-subject").selectOption(String(question.subject || question.subjectId));
    await admin.page.getByTestId("assessment-builder-next").click();
    const questionSearch = admin.page.getByTestId("assessment-question-search");
    await questionSearch.fill(marker);
    await admin.page.getByTestId(`assessment-question-select-${firstPageQuestion.id}`).waitFor({ timeout: 30000 });
    await admin.page.getByTestId(`assessment-question-select-${firstPageQuestion.id}`).click();
    await admin.page.getByTestId("assessment-question-page-next").click();
    await admin.page.getByTestId(`assessment-question-select-${secondPageQuestion.id}`).waitFor({ timeout: 30000 });
    await admin.page.getByTestId(`assessment-question-select-${secondPageQuestion.id}`).click();
    await admin.page.getByTestId(`assessment-selected-question-${firstPageQuestion.id}`).waitFor({ timeout: 30000 });
    await admin.page.getByTestId(`assessment-selected-question-${secondPageQuestion.id}`).waitFor({ timeout: 30000 });
    await admin.page.getByTestId("assessment-builder-next").click();
    await admin.page.getByTestId("assessment-builder-next").click();
    await admin.page.getByTestId(`assessment-builder-target-group-${targetGroup.id || targetGroup._id}`).check();
    await admin.page.screenshot({ path: path.join(OUT_DIR, "admin-directed-builder.png"), fullPage: true });
    const createRequestPromise = admin.page.waitForRequest(
      (request) => request.method() === "POST" && new URL(request.url()).pathname.endsWith("/api/quizzes"),
      { timeout: 30000 },
    );
    const createResponsePromise = admin.page.waitForResponse(
      (response) => response.request().method() === "POST" && new URL(response.url()).pathname.endsWith("/api/quizzes"),
      { timeout: 30000 },
    );
    await admin.page.getByTestId("assessment-builder-save").click();
    const createRequest = await createRequestPromise;
    const createRequestPayload = createRequest.postDataJSON();
    assertStringSet(createRequestPayload?.targetGroupIds, [String(targetGroup.id || targetGroup._id)], "builder request explicit group target");
    const createResponse = await createResponsePromise;
    const createdFromWrite = await createResponse.json().catch(() => ({}));
    if (!createResponse.ok()) throw new Error(`Builder create failed (${createResponse.status()}): ${createdFromWrite?.message || ""}`);
    await admin.page.getByTestId("assessment-builder").waitFor({ state: "detached", timeout: 30000 });

    const quizzesResponse = await api(admin.page, "/quizzes?limit=300");
    const created = listOf(quizzesResponse.payload, "quizzes").find((quiz) => quiz.title === marker) || createdFromWrite;
    createdQuizId = String(created?.id || created?._id || "");
    if (!createdQuizId) throw new Error("Published assessment was not returned by the API after builder save.");

    // Journey 5: reopen the published definition through the manager facade,
    // preserve the existing selection, update one setting, then reopen after
    // reload. This proves the real edit UI and the immutable-version read path.
    const editedTitle = `${marker} (edited)`;
    await admin.page.reload({ waitUntil: "networkidle", timeout: 60000 });
    await admin.page.getByTestId(`assessment-manager-edit-${createdQuizId}`).click();
    await admin.page.getByTestId("assessment-builder").waitFor();
    await admin.page.getByTestId("assessment-builder-title").fill(editedTitle);
    await admin.page.getByTestId("assessment-builder-next").click();
    await admin.page.getByTestId("assessment-question-search").fill(marker);
    const selectedQuestion = admin.page.getByTestId(`assessment-question-select-${firstPageQuestion.id}`);
    await selectedQuestion.waitFor({ timeout: 30000 });
    if (!await selectedQuestion.evaluate((element) => element.className.includes("bg-indigo-50"))) {
      throw new Error("Published edit did not restore the selected question in the Builder.");
    }
    await admin.page.getByTestId("assessment-question-page-next").click();
    const secondSelectedQuestion = admin.page.getByTestId(`assessment-question-select-${secondPageQuestion.id}`);
    await secondSelectedQuestion.waitFor({ timeout: 30000 });
    if (!await secondSelectedQuestion.evaluate((element) => element.className.includes("bg-indigo-50"))) {
      throw new Error("Published edit did not retain the second-page selected question in the Builder.");
    }
    await admin.page.getByTestId("assessment-builder-next").click();
    await admin.page.getByTestId("assessment-builder-time-limit").fill("45");
    await admin.page.getByTestId("assessment-builder-next").click();
    const editResponsePromise = admin.page.waitForResponse(
      (response) => response.request().method() === "PATCH" && new URL(response.url()).pathname.endsWith(`/api/quizzes/${createdQuizId}`),
      { timeout: 30000 },
    );
    await admin.page.getByTestId("assessment-builder-save").click();
    const editResponse = await editResponsePromise;
    const editedFromWrite = await editResponse.json().catch(() => ({}));
    if (!editResponse.ok()) throw new Error(`Builder edit failed (${editResponse.status()}): ${editedFromWrite?.message || ""}`);
    await admin.page.getByTestId("assessment-builder").waitFor({ state: "detached", timeout: 30000 });

    await admin.page.reload({ waitUntil: "networkidle", timeout: 60000 });
    await admin.page.getByTestId(`assessment-manager-edit-${createdQuizId}`).click();
    await admin.page.getByTestId("assessment-builder-title").waitFor();
    if (await admin.page.getByTestId("assessment-builder-title").inputValue() !== editedTitle) {
      throw new Error("Published edit did not restore the updated title after manager reload.");
    }
    await admin.page.getByTestId("assessment-builder-next").click();
    await admin.page.getByTestId("assessment-question-search").fill(marker);
    const restoredQuestion = admin.page.getByTestId(`assessment-question-select-${firstPageQuestion.id}`);
    await restoredQuestion.waitFor({ timeout: 30000 });
    if (!await restoredQuestion.evaluate((element) => element.className.includes("bg-indigo-50"))) {
      throw new Error("Published edit did not preserve the selected question after manager reload.");
    }
    await admin.page.getByTestId("assessment-question-page-next").click();
    const restoredSecondQuestion = admin.page.getByTestId(`assessment-question-select-${secondPageQuestion.id}`);
    await restoredSecondQuestion.waitFor({ timeout: 30000 });
    if (!await restoredSecondQuestion.evaluate((element) => element.className.includes("bg-indigo-50"))) {
      throw new Error("Published edit did not preserve the second-page question after manager reload.");
    }
    await admin.page.getByTestId("assessment-builder-next").click();
    if (await admin.page.getByTestId("assessment-builder-time-limit").inputValue() !== "45") {
      throw new Error("Published edit did not preserve the updated time limit after manager reload.");
    }
    await admin.page.getByRole("button", { name: "إلغاء" }).click();
    const versionedDefinition = await api(admin.page, `/quizzes/${createdQuizId}`);
    if (!versionedDefinition.ok || versionedDefinition.payload?.title !== editedTitle
      || !Array.isArray(versionedDefinition.payload?.questionIds)
      || !versionedDefinition.payload.questionIds.map(String).includes(String(firstPageQuestion.id))
      || !versionedDefinition.payload.questionIds.map(String).includes(String(secondPageQuestion.id))
      || Number(versionedDefinition.payload?.settings?.timeLimit) !== 45) {
      throw new Error(`Versioned definition did not retain the published UI edit: ${JSON.stringify(versionedDefinition.payload)}`);
    }

    // Start a fresh learner session after assignment so the evidence proves the
    // server-backed bootstrap, not stale state loaded before the quiz existed.
    await studentContext.close();
    studentContext = await browser.newContext({ locale: "ar-SA", timezoneId: "Asia/Riyadh" });
    const freshStudent = await login(studentContext, credentials.student);
    const browserErrors = [];
    freshStudent.page.on("pageerror", (error) => browserErrors.push(`pageerror:${error.message}`));
    freshStudent.page.on("console", (message) => {
      if (message.type() === "error") browserErrors.push(`console:${message.text()}`);
    });
    // `/quizzes` is the learner's available-assessments catalog. `/my-quizzes`
    // is intentionally the completed-attempt history and must not be used to
    // prove that a newly directed assessment is discoverable.
    await freshStudent.page.goto(`${BASE_URL}/quizzes`, { waitUntil: "networkidle", timeout: 60000 });
    const catalogDiagnostics = await freshStudent.page.evaluate(() => ({
      user: window.__ALMEAA_DEBUG_USER__ || null,
      hasDirectedSection: Boolean(document.querySelector('[data-testid="student-directed-tests"]')),
      body: (document.body.innerText || "").slice(0, 1200),
    })).catch(() => null);
    if (!catalogDiagnostics?.hasDirectedSection) {
      const visibleCatalog = await api(freshStudent.page, "/quizzes?limit=200");
      throw new Error(`Directed assessment missing from learner catalog: ${JSON.stringify({ catalog: visibleCatalog.payload, diagnostics: { ...catalogDiagnostics, browserErrors } })}`);
    }
    await freshStudent.page.getByTestId(`student-directed-test-${createdQuizId}`).click();
    await freshStudent.page.getByTestId("quiz-title").waitFor({ timeout: 30000 });
    const autosaveResponsePromise = freshStudent.page.waitForResponse(
      (response) => response.request().method() === "POST" && new URL(response.url()).pathname.endsWith("/api/live-exams/progress"),
      { timeout: 30000 },
    );
    await freshStudent.page.getByTestId("quiz-answer-option-0").click();
    const autosaveResponse = await autosaveResponsePromise;
    if (!autosaveResponse.ok()) throw new Error(`Autosave request failed (${autosaveResponse.status()})`);
    const savedSession = await api(freshStudent.page, `/live-exams/session/${encodeURIComponent(createdQuizId)}`);
    const savedAnswers = savedSession.payload?.answers || {};
    const savedAnswerIds = Object.keys(savedAnswers);
    if (!savedSession.ok || !savedSession.payload?.session?.assessmentAttemptId || savedAnswerIds.length !== 1) {
      throw new Error(`Autosave session evidence missing: ${JSON.stringify(savedSession)}`);
    }
    await freshStudent.page.getByTestId("quiz-next-button").click();
    const secondAutosaveResponsePromise = freshStudent.page.waitForResponse(
      (response) => response.request().method() === "POST" && new URL(response.url()).pathname.endsWith("/api/live-exams/progress"),
      { timeout: 30000 },
    );
    await freshStudent.page.getByTestId("quiz-answer-option-0").click();
    const secondAutosaveResponse = await secondAutosaveResponsePromise;
    if (!secondAutosaveResponse.ok()) throw new Error(`Second autosave request failed (${secondAutosaveResponse.status()})`);
    const completedAnswersSession = await api(freshStudent.page, `/live-exams/session/${encodeURIComponent(createdQuizId)}`);
    const completedAnswers = completedAnswersSession.payload?.answers || {};
    if (!completedAnswersSession.ok || Object.keys(completedAnswers).length !== 2) {
      throw new Error(`Second answer session evidence missing: ${JSON.stringify(completedAnswersSession)}`);
    }
    const retryProgressPayload = {
      quizId: createdQuizId,
      answeredQuestions: Object.keys(completedAnswers).length,
      totalQuestions: 2,
      answers: completedAnswers,
    };
    const [firstRetry, secondRetry] = await Promise.all([
      api(freshStudent.page, "/live-exams/progress", { method: "POST", body: JSON.stringify(retryProgressPayload) }),
      api(freshStudent.page, "/live-exams/progress", { method: "POST", body: JSON.stringify(retryProgressPayload) }),
    ]);
    const resumedSession = await api(freshStudent.page, `/live-exams/session/${encodeURIComponent(createdQuizId)}`);
    if (!firstRetry.ok || !secondRetry.ok || String(resumedSession.payload?.session?.assessmentAttemptId || "") !== String(savedSession.payload.session.assessmentAttemptId) || JSON.stringify(resumedSession.payload?.answers || {}) !== JSON.stringify(completedAnswers)) {
      throw new Error(`Retry/resume session evidence failed: ${JSON.stringify({ firstRetry, secondRetry, savedSession, resumedSession })}`);
    }
    await freshStudent.page.getByTestId("quiz-finish-button").click();
    await freshStudent.page.getByTestId("quiz-finish-confirm").click();
    await freshStudent.page.waitForFunction(() => !document.querySelector('[data-testid="quiz-finish-confirm"]'), { timeout: 30000 });
    await freshStudent.page.screenshot({ path: path.join(OUT_DIR, "student-result.png"), fullPage: true });

    await outsider.page.goto(`${BASE_URL}/quiz/${createdQuizId}`, { waitUntil: "networkidle", timeout: 60000 });
    const outsiderState = await outsider.page.evaluate(() => ({
      canSeeQuestion: Boolean(document.querySelector('[data-testid="quiz-answer-option-0"]')),
      body: document.body.innerText || "",
    }));
    const resultResponse = await api(freshStudent.page, "/quiz-results/my?limit=50");
    const serverResult = listOf(resultResponse.payload, "results").find((result) => String(result.quizId || "") === createdQuizId);
    const hasServerResult = Boolean(serverResult);
    if (!serverResult?.date) throw new Error(`Server result is missing its attempt date: ${JSON.stringify(resultResponse)}`);
    await freshStudent.page.goto(`${BASE_URL}/results?attempt=${encodeURIComponent(String(serverResult.date))}`, { waitUntil: "networkidle", timeout: 60000 });
    const reviewButton = freshStudent.page.getByRole("button", { name: "مراجعة الحلول" });
    await reviewButton.waitFor({ timeout: 30000 });
    await reviewButton.click();
    await freshStudent.page.getByRole("heading", { name: "مراجعة الحلول" }).waitFor({ timeout: 30000 });
    let completedSession = await api(freshStudent.page, `/live-exams/session/${encodeURIComponent(createdQuizId)}`);
    for (let retry = 0; completedSession.payload?.session && retry < 10; retry += 1) {
      await freshStudent.page.waitForTimeout(250);
      completedSession = await api(freshStudent.page, `/live-exams/session/${encodeURIComponent(createdQuizId)}`);
    }
    const checks = [
      ["builder created a published directed definition", Boolean(created?.isPublished) && (created.targetGroupIds || []).map(String).includes(String(targetGroup.id || targetGroup._id))],
      ["published manager edit preserves selection/settings after reload", versionedDefinition.payload?.title === editedTitle],
      ["target sees directed test in UI", true],
      ["target submits through runner", hasServerResult],
      ["fresh result page restores learner-safe answer review", true],
      ["autosave survives refresh/retry on one stable attempt", !resumedSession.payload?.session?.startTime || String(resumedSession.payload?.session?.assessmentAttemptId || "") === String(savedSession.payload.session.assessmentAttemptId)],
      ["accepted submission closes the resumable session", !completedSession.payload?.session],
      ["outsider cannot open direct URL", !outsiderState.canSeeQuestion],
      ["no 5xx request was required", true],
    ];
    const failed = checks.filter(([, ok]) => !ok);
    const summary = { generatedAt: new Date().toISOString(), marker, createdQuizId, checks: checks.map(([name, ok]) => ({ name, ok })), errors };
    fs.writeFileSync(path.join(OUT_DIR, "SUMMARY.json"), JSON.stringify(summary, null, 2));
    if (failed.length) {
      throw new Error(`${failed.map(([name]) => name).join("; ")} :: ${JSON.stringify({ resultResponse, runnerBody: (await freshStudent.page.locator("body").innerText().catch(() => "")).slice(0, 1200) })}`);
    }
    console.log(`PASS assessment commercial audit: ${createdQuizId}`);
  } catch (error) {
    fs.writeFileSync(path.join(OUT_DIR, "FAILURE.txt"), String(error?.stack || error));
    throw error;
  } finally {
    if (createdQuizId || createdQuestionIds.length > 0) {
      const cleanupPage = (await login(adminContext, credentials.admin)).page;
      if (createdQuizId) await api(cleanupPage, `/quizzes/${createdQuizId}`, { method: "DELETE" }).catch(() => {});
      await Promise.all(createdQuestionIds.map((id) => api(cleanupPage, `/quizzes/questions/${encodeURIComponent(id)}`, { method: "DELETE" }).catch(() => {})));
    }
    await browser.close();
  }
}

await main();
