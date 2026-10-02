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

console.log(`[TEST] Testing Real Browser Login for: ${adminEmail}`);

const browser = await createBrowser();
const { page } = await createPage(browser, VIEWPORTS.desktopLarge);

try {
  await loginViaBrowser(page, adminEmail, adminPassword);
  console.log("Logged in successfully via Browser!");

  const sessionProfile = await page.evaluate(() => sessionStorage.getItem("the-hundred-auth-profile"));
  console.log("Session profile:", sessionProfile);

  // Navigate to admin-dashboard
  await page.goto(`${BASE_URL}/admin-dashboard?tab=schools`, { waitUntil: "domcontentloaded", timeout: 45000 });
  await page.waitForTimeout(3000);
  console.log("Current URL:", page.url());

  const headings = await page.locator("h1, h2, h3, h4, .font-bold").allInnerTexts();
  console.log("Admin Dashboard headings:", headings.slice(0, 15));

  await captureScreenshot(page, "admin_dashboard_schools_verified");
  console.log("Screenshot admin_dashboard_schools_verified captured successfully!");
} catch (err) {
  console.error("Test failed:", err);
} finally {
  await browser.close();
}
