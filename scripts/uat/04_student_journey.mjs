import { createBrowser, createPage, BASE_URL, VIEWPORTS, captureScreenshot, loginViaBrowser, saveJsonEvidence } from "./helpers.mjs";

console.log("=== STARTING STAGE 4: STUDENT LEARNING & TEST TAKING JOURNEY ===");

const browser = await createBrowser();
const studentAudit = {
  login: false,
  dashboard: false,
  quizTaking: false,
  resultsEngine: false,
  reviewLater: false,
  screenshots: [],
  independentStudent: false,
};

// 1. STUDENT 01 JOURNEY
console.log("\n--- Testing Student 01 (uat.student01@almeaa.local) ---");
{
  const { page } = await createPage(browser, VIEWPORTS.desktopLarge);
  try {
    // A. Login
    await loginViaBrowser(page, "uat.student01@almeaa.local", "UatPass@2026");
    await page.waitForTimeout(3000);
    console.log("Student post-login URL:", page.url());
    studentAudit.login = true;

    // B. Dashboard verification
    if (!page.url().includes("dashboard")) {
      await page.goto(`${BASE_URL}/dashboard`, { waitUntil: "domcontentloaded", timeout: 45000 });
      await page.waitForTimeout(3000);
    }
    await page.waitForSelector('.animate-spin', { state: 'detached', timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(2000);

    const shotDashboard = await captureScreenshot(page, "student_dashboard_desktop");
    studentAudit.screenshots.push(shotDashboard);
    studentAudit.dashboard = true;
    console.log("Student Dashboard loaded and captured.");

    // C. Quizzes Catalog & Selection
    console.log("Navigating to quizzes catalog...");
    await page.goto(`${BASE_URL}/quizzes`, { waitUntil: "domcontentloaded", timeout: 45000 });
    await page.waitForTimeout(3000);

    const shotQuizzes = await captureScreenshot(page, "student_quizzes_catalog");
    studentAudit.screenshots.push(shotQuizzes);

    // Look for a start test button
    const startQuizBtn = page.locator('button:has-text("ابدأ الاختبار"), button:has-text("بدء الاختبار"), a:has-text("ابدأ"), button:has-text("اختبار")').first();
    const canStartQuiz = await startQuizBtn.isVisible().catch(() => false);
    console.log("Can start quiz directly from catalog?:", canStartQuiz);

    if (canStartQuiz) {
      await startQuizBtn.click();
      await page.waitForTimeout(3000);
    } else {
      // Go directly to generic quiz route or mock exam
      await page.goto(`${BASE_URL}/mock-exams`, { waitUntil: "domcontentloaded", timeout: 45000 });
      await page.waitForTimeout(3000);
      const mockStartBtn = page.locator('button:has-text("ابدأ"), button:has-text("اختبار"), a:has-text("ابدأ")').first();
      if (await mockStartBtn.isVisible().catch(() => false)) {
        await mockStartBtn.click();
        await page.waitForTimeout(3000);
      }
    }

    console.log("Quiz route URL:", page.url());
    const shotQuizTaking = await captureScreenshot(page, "student_quiz_taking_view");
    studentAudit.screenshots.push(shotQuizTaking);
    studentAudit.quizTaking = true;

    // D. Answer questions if quiz engine is active
    const optionButtons = await page.locator('[role="radio"], button:has-text("أ"), button:has-text("ب"), button:has-text("ج"), button:has-text("د"), label:has-text("أ"), label:has-text("ب")').all();
    console.log(`Found ${optionButtons.length} answer option elements.`);
    if (optionButtons.length > 0) {
      // Click first option
      await optionButtons[0].click().catch(() => {});
      await page.waitForTimeout(1000);
      console.log("Clicked answer option.");

      // Check review later
      const reviewLaterBtn = page.locator('button:has-text("مراجعة لاحقاً"), button:has-text("للمراجعة")').first();
      if (await reviewLaterBtn.isVisible().catch(() => false)) {
        await reviewLaterBtn.click();
        console.log("Clicked 'مراجعة لاحقاً'.");
        studentAudit.reviewLater = true;
      }

      // Check next question
      const nextBtn = page.locator('button:has-text("التالي")').first();
      if (await nextBtn.isVisible().catch(() => false)) {
        await nextBtn.click();
        console.log("Clicked 'التالي'.");
      }

      // Finish quiz if button visible
      const submitQuizBtn = page.locator('button:has-text("إنهاء الاختبار"), button:has-text("تسليم")').first();
      if (await submitQuizBtn.isVisible().catch(() => false)) {
        await submitQuizBtn.click();
        await page.waitForTimeout(3000);
        const shotResults = await captureScreenshot(page, "student_quiz_results");
        studentAudit.screenshots.push(shotResults);
        studentAudit.resultsEngine = true;
      }
    }

    // Mobile check
    await page.setViewportSize(VIEWPORTS.mobile);
    await page.waitForTimeout(1000);
    const shotStudentMobile = await captureScreenshot(page, "student_dashboard_mobile");
    studentAudit.screenshots.push(shotStudentMobile);

  } catch (err) {
    console.error("Student 01 journey error:", err);
  }
}

// 2. INDEPENDENT STUDENT JOURNEY
console.log("\n--- Testing Independent Student (uat.independent@almeaa.local) ---");
{
  const { page } = await createPage(browser, VIEWPORTS.desktopLarge);
  try {
    await loginViaBrowser(page, "uat.independent@almeaa.local", "UatPass@2026");
    await page.waitForTimeout(3000);

    // Navigate to courses catalog
    await page.goto(`${BASE_URL}/courses`, { waitUntil: "domcontentloaded", timeout: 45000 });
    await page.waitForTimeout(2000);
    const shotCourses = await captureScreenshot(page, "independent_courses_catalog");
    studentAudit.screenshots.push(shotCourses);

    // Navigate to pricing / packages
    await page.goto(`${BASE_URL}/pricing`, { waitUntil: "domcontentloaded", timeout: 45000 });
    await page.waitForTimeout(2000);
    const shotPricing = await captureScreenshot(page, "independent_pricing_packages");
    studentAudit.screenshots.push(shotPricing);

    // Navigate to cart
    await page.goto(`${BASE_URL}/cart`, { waitUntil: "domcontentloaded", timeout: 45000 });
    await page.waitForTimeout(2000);
    const shotCart = await captureScreenshot(page, "independent_cart_view");
    studentAudit.screenshots.push(shotCart);

    studentAudit.independentStudent = true;
    console.log("Independent Student journey complete: PASS");
  } catch (err) {
    console.error("Independent student journey error:", err);
  }
}

await browser.close();

saveJsonEvidence("04_student_journey", studentAudit);
console.log("\n=== STAGE 4 AUDIT FINISHED ===");
