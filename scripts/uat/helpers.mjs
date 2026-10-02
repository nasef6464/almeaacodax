import { chromium } from "playwright";
import fs from "fs";
import path from "path";

export const BASE_URL = "http://localhost:3000";
export const API_BASE = "http://localhost:4000/api";
export const EVIDENCE_DIR = path.resolve("docs/FINAL_ACCEPTANCE/evidence");
export const SCREENSHOT_DIR = path.join(EVIDENCE_DIR, "screenshots");

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

export const VIEWPORTS = {
  desktopLarge: { width: 1920, height: 1080, name: "Desktop Large" },
  laptop: { width: 1366, height: 768, name: "Laptop" },
  tabletLandscape: { width: 1024, height: 768, name: "Tablet Landscape" },
  tabletPortrait: { width: 768, height: 1024, name: "Tablet Portrait" },
  mobile: { width: 390, height: 844, name: "Mobile" },
  smallMobile: { width: 360, height: 800, name: "Small Mobile" },
};

export async function createBrowser() {
  const browser = await chromium.launch({
    headless: true,
  });
  return browser;
}

export async function createPage(browser, viewport = VIEWPORTS.desktopLarge) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    locale: "ar-SA",
    serviceWorkers: "block",
  });
  const page = await context.newPage();
  
  // Track console errors
  page.consoleErrors = [];
  page.networkErrors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      page.consoleErrors.push(msg.text());
    }
  });
  page.on("requestfailed", (req) => {
    page.networkErrors.push(`${req.method()} ${req.url()}: ${req.failure()?.errorText || "failed"}`);
  });
  
  return { context, page };
}

export async function captureScreenshot(page, filename) {
  const target = path.join(SCREENSHOT_DIR, `${filename}.png`);
  try {
    await page.screenshot({ path: target, fullPage: false, animations: "disabled", timeout: 15000 });
  } catch (err) {
    console.warn(`[Screenshot Warning] for ${filename}: ${err.message}`);
  }
  return target;
}

export async function loginViaBrowser(page, email, password) {
  await page.goto(`${BASE_URL}/login`, { waitUntil: "domcontentloaded", timeout: 45000 });
  await page.waitForTimeout(1000);
  
  // Fill smart login input
  const input = page.locator('#smart-login-input');
  await input.waitFor({ state: "visible", timeout: 15000 });
  await input.fill(email);
  
  // Fill password
  const pass = page.locator('#smart-login-password');
  await pass.waitFor({ state: "visible", timeout: 15000 });
  await pass.fill(password);
  
  // Submit inside the form
  const submitBtn = page.locator('#smart-login-form button[type="submit"]');
  await submitBtn.click();
  
  // Wait for login to complete and session to be stored in sessionStorage
  await page.waitForFunction(() => {
    const raw = sessionStorage.getItem("the-hundred-auth-profile");
    return raw && raw.length > 5;
  }, { timeout: 20000 });
  
  await page.waitForTimeout(1000);
}

export async function loginViaApiAndSetCookies(context, email, password) {
  const csrfRes = await fetch(`${API_BASE}/auth/csrf-token`);
  const csrfCookie = (csrfRes.headers.get("set-cookie")?.match(/almeaa_csrf_token=([^;]+)/) || [])[1] || "";
  const csrfData = await csrfRes.json();
  const csrfToken = csrfData.csrfToken || csrfCookie;

  const loginRes = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-csrf-token": csrfToken,
      Cookie: `almeaa_csrf_token=${csrfCookie}`,
    },
    body: JSON.stringify({ email, password }),
  });

  if (!loginRes.ok) {
    const errText = await loginRes.text();
    throw new Error(`Login failed for ${email}: ${loginRes.status} ${errText}`);
  }

  const loginData = await loginRes.json();
  const token = loginData.token;
  const user = loginData.user;

  // Set cookies in context
  await context.addCookies([
    {
      name: "almeaa_access_token",
      value: token,
      domain: "localhost",
      path: "/",
    },
    {
      name: "almeaa_csrf_token",
      value: csrfToken,
      domain: "localhost",
      path: "/",
    },
  ]);

  return { token, user };
}

export function saveJsonEvidence(name, data) {
  const filePath = path.join(EVIDENCE_DIR, `${name}.json`);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
  return filePath;
}
