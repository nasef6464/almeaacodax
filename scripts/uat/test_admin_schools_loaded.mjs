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
  console.log("Clicked 'تشغيل المدارس'");

  // Wait for "جاري تجهيز القسم..." to disappear
  await page.waitForSelector('text=جاري تجهيز القسم...', { state: 'detached', timeout: 30000 });
  await page.waitForTimeout(2000);

  console.log("Schools tab fully loaded!");

  const headings = await page.locator("h1, h2, h3, h4, th").allInnerTexts();
  console.log("\n=== HEADINGS / TABLES ===");
  console.log(headings.map(h => h.trim()).filter(Boolean).slice(0, 30));

  const textSnippets = await page.locator("main, .space-y-6, [data-school-id]").allInnerTexts();
  console.log("\n=== CONTENT SNIPPETS ===");
  console.log(textSnippets.slice(0, 10));

  await captureScreenshot(page, "admin_schools_fully_loaded");
  console.log("Screenshot admin_schools_fully_loaded saved!");

  // Now let's check for UAT School
  const hasUatSchool = await page.locator('text=ALMEAA UAT School').count();
  console.log("Has 'ALMEAA UAT School':", hasUatSchool > 0);

  // Check buttons inside the schools workspace
  const actionButtons = await page.locator('button:visible').allInnerTexts();
  console.log("\n=== ACTION BUTTONS ===");
  console.log(actionButtons.map(b => b.trim()).filter(Boolean).slice(0, 30));

} catch (err) {
  console.error("Error:", err);
} finally {
  await browser.close();
}
