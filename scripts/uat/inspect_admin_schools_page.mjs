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
  console.log("Logged in!");

  // Wait for the automatic navigation to complete
  await page.waitForTimeout(3000);
  console.log("URL after login:", page.url());

  // Wait for loading spinner to detach / content to mount
  try {
    await page.waitForSelector('.animate-spin', { state: 'detached', timeout: 15000 });
  } catch {
    console.log("Spinner wait timed out or no spinner found.");
  }
  await page.waitForTimeout(3000);

  console.log("Current URL after dashboard load:", page.url());

  // Look for tabs in AdminDashboard
  const tabs = await page.locator('[role="tab"], button, a').allInnerTexts();
  const schoolTabs = tabs.filter(t => t.includes("مدارس") || t.includes("مدرسة") || t.includes("Schools"));
  console.log("Found school-related buttons/tabs:", schoolTabs);

  // If there's a button/tab with "المدارس", let's click it
  const schoolsBtn = page.locator('button:has-text("المدارس"), [role="tab"]:has-text("المدارس"), a:has-text("المدارس")').first();
  if (await schoolsBtn.isVisible().catch(() => false)) {
    console.log("Clicking 'المدارس' tab...");
    await schoolsBtn.click();
    await page.waitForTimeout(3000);
  }

  const headings = await page.locator("h1, h2, h3, h4, th").allInnerTexts();
  console.log("\n=== HEADINGS / TABLES ===");
  console.log(headings.map(h => h.trim()).filter(Boolean).slice(0, 30));

  const visibleButtons = await page.locator("button:visible").allInnerTexts();
  console.log("\n=== ALL VISIBLE BUTTONS ===");
  console.log(visibleButtons.map(b => b.trim()).filter(Boolean).slice(0, 30));

  await captureScreenshot(page, "admin_schools_screen_live");
  console.log("Screenshot admin_schools_screen_live saved!");

} catch (err) {
  console.error("Inspect error:", err);
} finally {
  await browser.close();
}
