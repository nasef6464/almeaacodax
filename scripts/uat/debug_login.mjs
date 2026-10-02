import { createBrowser, createPage, BASE_URL, VIEWPORTS, captureScreenshot } from "./helpers.mjs";

async function testLogin() {
  const browser = await createBrowser();
  const { page } = await createPage(browser, VIEWPORTS.desktopLarge);

  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.type(), msg.text()));
  page.on('response', async res => {
    if (res.url().includes('/auth/')) {
      let body = '';
      try { body = await res.text(); } catch {}
      console.log('AUTH RESPONSE:', res.status(), res.url(), body.slice(0, 150));
    }
  });

  await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);

  const input = page.locator('#smart-login-input');
  await input.fill('uat.student01@almeaa.local');

  const pass = page.locator('#smart-login-password');
  await pass.fill('UatPass@2026');

  console.log('Clicking submit...');
  const submitBtn = page.locator('#smart-login-form button[type="submit"]');
  await submitBtn.click();

  await page.waitForTimeout(4000);
  await captureScreenshot(page, 'debug_student_login');
  console.log('Current URL:', page.url());

  const session = await page.evaluate(() => sessionStorage.getItem('the-hundred-auth-profile'));
  console.log('Session storage profile exists?:', !!session, session?.slice(0, 100));

  await browser.close();
}
testLogin();
