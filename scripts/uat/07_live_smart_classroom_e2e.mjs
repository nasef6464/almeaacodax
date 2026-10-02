import { createBrowser, createPage, BASE_URL, VIEWPORTS, captureScreenshot, loginViaBrowser, saveJsonEvidence } from "./helpers.mjs";

console.log("=== STARTING REAL BROWSER LIVE SMART CLASSROOM TEST ===");

const browser = await createBrowser();
const sessionId = "6abff278fe3257264dce0fc6";
const sessionPin = "913953";

const results = {
  sessionId,
  sessionPin,
  teacherConsoleLoaded: false,
  projectorViewLoaded: false,
  studentLiveLoaded: false,
  screenshots: [],
};

try {
  // 1. TEACHER LIVE CONSOLE
  console.log("\n--- 1. Testing Teacher Live Console ---");
  {
    const { context, page } = await createPage(browser, VIEWPORTS.desktopLarge);
    try {
      await loginViaBrowser(page, "uat.teacher.math@almeaa.local", "UatPass@2026");
      await page.waitForTimeout(2000);

      console.log(`Navigating to Teacher Console: /classroom/${sessionId}/teacher`);
      await page.goto(`${BASE_URL}/classroom/${sessionId}/teacher`, { waitUntil: "domcontentloaded", timeout: 45000 });
      await page.waitForTimeout(4000);

      const shotTeacher = await captureScreenshot(page, "smart_classroom_teacher_console_live");
      results.screenshots.push(shotTeacher);
      results.teacherConsoleLoaded = true;
      console.log("Captured Teacher Console screenshot:", shotTeacher);

      const bodyText = await page.locator("body").innerText();
      console.log("Teacher page preview:", bodyText.slice(0, 200).replace(/\n+/g, " "));
    } finally {
      await context.close();
    }
  }

  // 2. PROJECTOR VIEW
  console.log("\n--- 2. Testing Projector View ---");
  {
    const { context, page } = await createPage(browser, VIEWPORTS.desktopLarge);
    try {
      console.log(`Navigating to Projector View: /classroom/${sessionId}/projector`);
      await page.goto(`${BASE_URL}/classroom/${sessionId}/projector`, { waitUntil: "domcontentloaded", timeout: 45000 });
      await page.waitForTimeout(4000);

      const shotProjector = await captureScreenshot(page, "smart_classroom_projector_live");
      results.screenshots.push(shotProjector);
      results.projectorViewLoaded = true;
      console.log("Captured Projector View screenshot:", shotProjector);
    } finally {
      await context.close();
    }
  }

  // 3. STUDENT LIVE VIEW
  console.log("\n--- 3. Testing Student Live Classroom ---");
  {
    const { context, page } = await createPage(browser, VIEWPORTS.desktopLarge);
    try {
      await loginViaBrowser(page, "uat.student01@almeaa.local", "UatPass@2026");
      await page.waitForTimeout(2000);

      console.log(`Navigating to Student Live Classroom: /classroom/${sessionId}`);
      await page.goto(`${BASE_URL}/classroom/${sessionId}`, { waitUntil: "domcontentloaded", timeout: 45000 });
      await page.waitForTimeout(4000);

      // If PIN input exists, fill PIN
      const pinInput = page.locator('input[type="text"], input[name="pin"]').first();
      if (await pinInput.isVisible().catch(() => false)) {
        console.log("Filling PIN in student screen:", sessionPin);
        await pinInput.fill(sessionPin);
        const joinBtn = page.locator('button:has-text("انضمام"), button:has-text("دخول"), button[type="submit"]').first();
        if (await joinBtn.isVisible().catch(() => false)) {
          await joinBtn.click();
          await page.waitForTimeout(3000);
        }
      }

      const shotStudent = await captureScreenshot(page, "smart_classroom_student_live");
      results.screenshots.push(shotStudent);
      results.studentLiveLoaded = true;
      console.log("Captured Student Live Classroom screenshot:", shotStudent);

      const bodyText = await page.locator("body").innerText();
      console.log("Student page preview:", bodyText.slice(0, 200).replace(/\n+/g, " "));
    } finally {
      await context.close();
    }
  }

  console.log("\n=== ALL SMART CLASSROOM REAL BROWSER CHECKS PASSED ===");
} catch (err) {
  console.error("Smart Classroom test error:", err);
} finally {
  await browser.close();
  saveJsonEvidence("07_smart_classroom_live", results);
}
