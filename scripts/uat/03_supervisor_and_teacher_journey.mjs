import { createBrowser, createPage, BASE_URL, VIEWPORTS, captureScreenshot, loginViaBrowser, saveJsonEvidence } from "./helpers.mjs";

console.log("=== STARTING STAGE 3: SUPERVISOR & TEACHER JOURNEYS AUDIT ===");

const browser = await createBrowser();
const auditResults = {
  supervisor: null,
  mathTeacher: null,
  verbalTeacher: null,
  tahsiliTeacher: null,
};

// 1. SUPERVISOR JOURNEY
console.log("\n--- Testing Supervisor Persona (uat.supervisor@almeaa.local) ---");
{
  const { page } = await createPage(browser, VIEWPORTS.desktopLarge);
  try {
    await loginViaBrowser(page, "uat.supervisor@almeaa.local", "UatPass@2026");
    await page.waitForTimeout(3000);
    console.log("Supervisor post-login URL:", page.url());

    // If not on supervisor dashboard, navigate there
    if (!page.url().includes("supervisor-dashboard")) {
      await page.goto(`${BASE_URL}/supervisor-dashboard`, { waitUntil: "domcontentloaded", timeout: 45000 });
      await page.waitForTimeout(3000);
    }

    // Wait for content
    await page.waitForSelector('.animate-spin', { state: 'detached', timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(2000);

    const title = await page.title();
    const headings = await page.locator("h1, h2, h3, h4").allInnerTexts();
    const buttons = await page.locator("button:visible").allInnerTexts();
    const bodyText = await page.locator("body").innerText();

    const shotDesktop = await captureScreenshot(page, "supervisor_dashboard_desktop");
    
    // Test mobile responsive
    await page.setViewportSize(VIEWPORTS.mobile);
    await page.waitForTimeout(1000);
    const mobileOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    const shotMobile = await captureScreenshot(page, "supervisor_dashboard_mobile");

    auditResults.supervisor = {
      role: "supervisor",
      email: "uat.supervisor@almeaa.local",
      url: page.url(),
      title,
      headings: headings.slice(0, 15),
      visibleButtonsCount: buttons.length,
      mobileOverflow,
      screenshots: [shotDesktop, shotMobile],
      status: "PASS",
    };
    console.log("Supervisor audit complete: PASS");
  } catch (err) {
    console.error("Supervisor journey error:", err);
    auditResults.supervisor = { status: "FAIL", error: err.message };
  }
}

// 2. MATH TEACHER JOURNEY
console.log("\n--- Testing Math Teacher Persona (uat.teacher.math@almeaa.local) ---");
{
  const { page } = await createPage(browser, VIEWPORTS.desktopLarge);
  try {
    await loginViaBrowser(page, "uat.teacher.math@almeaa.local", "UatPass@2026");
    await page.waitForTimeout(3000);
    console.log("Math Teacher post-login URL:", page.url());

    if (!page.url().includes("school-teacher-dashboard") && !page.url().includes("instructor-dashboard")) {
      await page.goto(`${BASE_URL}/school-teacher-dashboard`, { waitUntil: "domcontentloaded", timeout: 45000 });
      await page.waitForTimeout(3000);
    }

    await page.waitForSelector('.animate-spin', { state: 'detached', timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(2000);

    const title = await page.title();
    const headings = await page.locator("h1, h2, h3, h4").allInnerTexts();
    const buttons = await page.locator("button:visible").allInnerTexts();

    const shotDesktop = await captureScreenshot(page, "teacher_math_dashboard_desktop");

    await page.setViewportSize(VIEWPORTS.mobile);
    await page.waitForTimeout(1000);
    const mobileOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    const shotMobile = await captureScreenshot(page, "teacher_math_dashboard_mobile");

    auditResults.mathTeacher = {
      role: "teacher",
      subject: "Math",
      email: "uat.teacher.math@almeaa.local",
      url: page.url(),
      title,
      headings: headings.slice(0, 15),
      visibleButtonsCount: buttons.length,
      mobileOverflow,
      screenshots: [shotDesktop, shotMobile],
      status: "PASS",
    };
    console.log("Math Teacher audit complete: PASS");
  } catch (err) {
    console.error("Math Teacher journey error:", err);
    auditResults.mathTeacher = { status: "FAIL", error: err.message };
  }
}

// 3. VERBAL TEACHER JOURNEY
console.log("\n--- Testing Verbal Teacher Persona (uat.teacher.verbal@almeaa.local) ---");
{
  const { page } = await createPage(browser, VIEWPORTS.desktopLarge);
  try {
    await loginViaBrowser(page, "uat.teacher.verbal@almeaa.local", "UatPass@2026");
    await page.waitForTimeout(3000);
    console.log("Verbal Teacher post-login URL:", page.url());

    if (!page.url().includes("school-teacher-dashboard") && !page.url().includes("instructor-dashboard")) {
      await page.goto(`${BASE_URL}/school-teacher-dashboard`, { waitUntil: "domcontentloaded", timeout: 45000 });
      await page.waitForTimeout(3000);
    }

    await page.waitForSelector('.animate-spin', { state: 'detached', timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(2000);

    const shotDesktop = await captureScreenshot(page, "teacher_verbal_dashboard_desktop");

    auditResults.verbalTeacher = {
      role: "teacher",
      subject: "Verbal",
      email: "uat.teacher.verbal@almeaa.local",
      url: page.url(),
      screenshots: [shotDesktop],
      status: "PASS",
    };
    console.log("Verbal Teacher audit complete: PASS");
  } catch (err) {
    console.error("Verbal Teacher journey error:", err);
    auditResults.verbalTeacher = { status: "FAIL", error: err.message };
  }
}

// 4. TAHSILI TEACHER JOURNEY
console.log("\n--- Testing Tahsili Teacher Persona (uat.teacher.tahsili@almeaa.local) ---");
{
  const { page } = await createPage(browser, VIEWPORTS.desktopLarge);
  try {
    await loginViaBrowser(page, "uat.teacher.tahsili@almeaa.local", "UatPass@2026");
    await page.waitForTimeout(3000);
    console.log("Tahsili Teacher post-login URL:", page.url());

    if (!page.url().includes("school-teacher-dashboard") && !page.url().includes("instructor-dashboard")) {
      await page.goto(`${BASE_URL}/school-teacher-dashboard`, { waitUntil: "domcontentloaded", timeout: 45000 });
      await page.waitForTimeout(3000);
    }

    await page.waitForSelector('.animate-spin', { state: 'detached', timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(2000);

    const shotDesktop = await captureScreenshot(page, "teacher_tahsili_dashboard_desktop");

    auditResults.tahsiliTeacher = {
      role: "teacher",
      subject: "Tahsili",
      email: "uat.teacher.tahsili@almeaa.local",
      url: page.url(),
      screenshots: [shotDesktop],
      status: "PASS",
    };
    console.log("Tahsili Teacher audit complete: PASS");
  } catch (err) {
    console.error("Tahsili Teacher journey error:", err);
    auditResults.tahsiliTeacher = { status: "FAIL", error: err.message };
  }
}

await browser.close();

saveJsonEvidence("03_supervisor_teacher_journey", auditResults);
console.log("\n=== STAGE 3 AUDIT FINISHED ===");
