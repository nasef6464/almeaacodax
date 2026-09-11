import assert from "node:assert/strict";
import { chromium } from "playwright";

const baseUrl = String(process.env.UI_AUDIT_BASE_URL || "http://127.0.0.1:4173").replace(/\/$/, "");
const sessionId = "surface-audit-session";
const question = { questionId: "question-a", text: "ما ناتج ٢ + ٢؟", options: ["3", "4"], type: "mcq" };
const aggregate = { sessionId, status: "live", activeQuestionIndex: 0, responseCount: 3, distribution: { "1": 3 }, report: null, questions: [{ index: 0, ...question }] };

const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: "ar-SA" });
  await context.route("**/api/**", async (route) => {
    const request = route.request(); const url = new URL(request.url()); const path = url.pathname;
    const payload = path.endsWith("/aggregate") ? aggregate
      : path.endsWith("/join") ? { joined: true, sessionId }
      : path.endsWith("/current") ? { sessionId, question }
      : path.includes("/answers/") ? { accepted: true, responseId: "response-a" }
      : path.includes("/publish/") ? { status: "live", activeQuestionIndex: 0 }
      : path.endsWith("/end") ? { report: { sessionId, responseCount: 3 } }
      : { questions: [question] };
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(payload) });
  });

  const teacher = await context.newPage();
  await teacher.addInitScript(() => {
    sessionStorage.setItem("the-hundred-auth-profile", JSON.stringify({
      id: "teacher-1",
      email: "teacher@school.test",
      displayName: "معلم تجريبي",
      photoURL: "",
      role: "teacher",
      schoolId: "school-1",
      groupIds: ["class-1"],
      token: "mock-token",
    }));
  });
  await teacher.goto(`${baseUrl}/classroom/${sessionId}/teacher`, { waitUntil: "networkidle" });
  await assertText(teacher, "لوحة تحكم المعلم");
  await assertText(teacher, "ما ناتج ٢ + ٢؟");
  await teacher.getByRole("button", { name: /سؤال 1/ }).click();

  const student = await context.newPage();
  await student.goto(`${baseUrl}/classroom/${sessionId}`, { waitUntil: "networkidle" });
  await student.getByPlaceholder("000000").fill("123456");
  await student.getByRole("button", { name: "انضم الآن" }).click();
  await assertText(student, "ما ناتج ٢ + ٢؟");
  await student.getByRole("button", { name: "4" }).click();
  await student.getByRole("button", { name: "إرسال الإجابة" }).click();
  await assertText(student, "تم إرسال إجابتك");

  const projector = await context.newPage();
  await projector.goto(`${baseUrl}/classroom/${sessionId}/projector`, { waitUntil: "networkidle" });
  await assertText(projector, "إجابات مستلمة");
  await assertText(projector, "3");
  assert.equal((await projector.locator("body").innerText()).includes("student-a"), false, "projector must not display individual student identity");
  console.log("Smart Classroom surfaces audit: PASS (teacher, student, projector)");
} finally { await browser.close(); }

async function assertText(page, text) { await page.getByText(text, { exact: false }).first().waitFor({ state: "visible", timeout: 15000 }); }
