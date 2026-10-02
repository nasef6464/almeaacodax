import { createBrowser, createPage, BASE_URL, VIEWPORTS, captureScreenshot, loginViaBrowser } from "./helpers.mjs";
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

const browser = await createBrowser();
const { page } = await createPage(browser, VIEWPORTS.desktopLarge);

try {
  await loginViaBrowser(page, adminEmail, adminPassword);
  await page.waitForTimeout(3000);

  // Click "تشغيل المدارس"
  const schoolsBtn = page.locator('button:has-text("تشغيل المدارس")').first();
  await schoolsBtn.click();
  await page.waitForTimeout(3000);

  // Click "فتح تشغيل المدرسة" for ALMEAA UAT School
  const uatBtn = page.locator(':has-text("ALMEAA UAT School")').locator('button:has-text("فتح تشغيل المدرسة")').first();
  await uatBtn.click();
  await page.waitForTimeout(3000);

  // Click "إدارة الفصول"
  const manageClassesBtn = page.locator('button:has-text("إدارة الفصول")').first();
  console.log("Clicking 'إدارة الفصول'...");
  await manageClassesBtn.click();
  await page.waitForTimeout(2000);

  const classesShot = await captureScreenshot(page, "admin_uat_school_classes_view");
  console.log("Captured classes shot:", classesShot);

  const bodyAfterClasses = await page.locator("body").innerText();
  console.log("Does page have 'UAT Class 101'?:", bodyAfterClasses.includes("UAT Class 101"));
  console.log("Does page have 'UAT Class 102'?:", bodyAfterClasses.includes("UAT Class 102"));
  console.log("Does page have 'UAT Class 201'?:", bodyAfterClasses.includes("UAT Class 201"));

  // Click "عرض كشف الطلاب"
  const studentsBtn = page.locator('button:has-text("عرض كشف الطلاب"), button:has-text("الطلاب")').first();
  if (await studentsBtn.isVisible().catch(() => false)) {
    console.log("Clicking 'عرض كشف الطلاب'...");
    await studentsBtn.click();
    await page.waitForTimeout(2000);
    const studentsShot = await captureScreenshot(page, "admin_uat_school_students_view");
    console.log("Captured students shot:", studentsShot);

    const bodyAfterStudents = await page.locator("body").innerText();
    console.log("Does page have 'UAT Student 01'?:", bodyAfterStudents.includes("UAT Student 01"));
    console.log("Does page have 'uat.student01@almeaa.local'?:", bodyAfterStudents.includes("uat.student01@almeaa.local"));
  }

} catch (err) {
  console.error("Error:", err);
} finally {
  await browser.close();
}
