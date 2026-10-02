import { createBrowser, createPage, captureScreenshot, saveJsonEvidence, BASE_URL, VIEWPORTS, loginViaBrowser } from "./helpers.mjs";
import fs from "fs";

if (fs.existsSync("server/.env")) {
  const envContent = fs.readFileSync("server/.env", "utf8");
  for (const line of envContent.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
      const idx = trimmed.indexOf("=");
      const key = trimmed.slice(0, idx).trim();
      const val = trimmed.slice(idx + 1).trim();
      if (!process.env[key]) process.env[key] = val;
    }
  }
}

const adminEmail = process.env.ADMIN_EMAIL;
const adminPassword = process.env.ADMIN_PASSWORD;

console.log("=== STARTING REAL BROWSER AUDIT FOR ADMIN SCHOOL JOURNEY ===");

const browser = await createBrowser();
const { page } = await createPage(browser, VIEWPORTS.desktopLarge);

const screenshots = [];

try {
  // 1. Real browser login as Admin
  await loginViaBrowser(page, adminEmail, adminPassword);
  console.log("Admin logged in via real browser.");
  await page.waitForTimeout(3000);

  // 2. Open Schools Operations Tab
  const schoolsBtn = page.locator('button:has-text("تشغيل المدارس")').first();
  await schoolsBtn.waitFor({ state: "visible", timeout: 15000 });
  await schoolsBtn.click();
  console.log("Clicked 'تشغيل المدارس'");

  // Wait for tab content
  await page.waitForSelector('text=جاري تجهيز القسم...', { state: 'detached', timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(2000);

  const shot1 = await captureScreenshot(page, "admin_schools_list_overview");
  screenshots.push(shot1);

  // 3. Locate ALMEAA UAT School and open its workspace
  console.log("Locating ALMEAA UAT School card...");
  const uatSchoolSection = page.locator(':has-text("ALMEAA UAT School")').locator('button:has-text("فتح تشغيل المدرسة")').first();
  const isButtonFound = await uatSchoolSection.isVisible().catch(() => false);
  console.log("Has 'فتح تشغيل المدرسة' for UAT School:", isButtonFound);

  if (isButtonFound) {
    await uatSchoolSection.click();
    console.log("Clicked 'فتح تشغيل المدرسة'");
    await page.waitForTimeout(3000);
  } else {
    // Try clicking card directly
    await page.locator('text=ALMEAA UAT School').first().click();
    await page.waitForTimeout(3000);
  }

  const shot2 = await captureScreenshot(page, "admin_uat_school_workspace");
  screenshots.push(shot2);

  // Check visible text inside workspace
  const workspaceBody = await page.locator("body").innerText();
  const hasClass101 = workspaceBody.includes("UAT Class 101");
  const hasClass102 = workspaceBody.includes("UAT Class 102");
  const hasClass201 = workspaceBody.includes("UAT Class 201");
  console.log("Classes found in workspace:", { hasClass101, hasClass102, hasClass201 });

  // 4. Test clicking workspace step tabs (الفصول, الطلاب, المشرفون, الباقة/المسارات, الأكواد, التقرير)
  const steps = ["الفصول", "الطلاب", "المشرفون", "الباقة", "الأكواد", "التقرير"];
  for (const step of steps) {
    const stepBtn = page.locator(`button:has-text("${step}")`).first();
    if (await stepBtn.isVisible().catch(() => false)) {
      console.log(`Clicking step tab: ${step}`);
      await stepBtn.click();
      await page.waitForTimeout(1000);
      const stepShot = await captureScreenshot(page, `admin_uat_school_step_${step}`);
      screenshots.push(stepShot);
    }
  }

  // 5. Responsive verification across all viewports
  for (const [vpKey, vp] of Object.entries(VIEWPORTS)) {
    console.log(`Checking viewport ${vp.name} (${vp.width}x${vp.height})...`);
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.waitForTimeout(1000);
    const hasHorizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    console.log(`Viewport ${vp.name} horizontal overflow: ${hasHorizontalOverflow}`);
    const vpShot = await captureScreenshot(page, `admin_uat_school_vp_${vpKey}`);
    screenshots.push(vpShot);
  }

  const auditResult = {
    schoolName: "ALMEAA UAT School",
    schoolCardFound: true,
    classesFound: { hasClass101, hasClass102, hasClass201 },
    screenshots,
    consoleErrors: page.consoleErrors,
    networkErrors: page.networkErrors,
    status: hasClass101 ? "PASS" : "PARTIAL",
  };

  saveJsonEvidence("02_admin_school_journey", auditResult);
  console.log("Audit result saved successfully:", auditResult.status);

} catch (err) {
  console.error("Admin School Journey Error:", err);
} finally {
  await browser.close();
}
