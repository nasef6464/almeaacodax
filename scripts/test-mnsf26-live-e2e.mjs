import { chromium } from 'playwright';
import path from 'node:path';

const ARTIFACTS_DIR = 'C:/Users/nasef/.gemini/antigravity/brain/6e4a6cc2-f148-461d-ae27-f8a0507cc66f';

async function run() {
  console.log('--- 1. LAUNCHING PLAYWRIGHT FOR LIVE VERCEL TEST ---');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    locale: 'ar-SA',
    serviceWorkers: 'block',
  });
  const page = await context.newPage();

  // Mock student auth session
  await page.route('**/api/auth/me', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        user: {
          id: 'usr_student_test',
          name: 'طالب تجريبي',
          email: 'student@test.com',
          role: 'student',
        },
      }),
    });
  });

  console.log('--- 2. NAVIGATING TO exam_mnsf26_mock_02 ---');
  await page.goto('https://almeaacodax.vercel.app/quiz/exam_mnsf26_mock_02', {
    waitUntil: 'networkidle',
    timeout: 30000,
  });
  await page.waitForTimeout(3000);

  const img02 = await page.$('img[alt="صورة السؤال"]');
  if (img02) {
    console.log('✓ Mock 02 question 1 image src:', await img02.getAttribute('src'));
  }
  const screenshot02 = path.join(ARTIFACTS_DIR, 'mnsf26_mock02_question1_live.png');
  await page.screenshot({ path: screenshot02, fullPage: false });
  console.log(`✓ Screenshot 02 saved to ${screenshot02}`);

  console.log('--- 3. NAVIGATING TO exam_mnsf26_mock_01 ---');
  await page.goto('https://almeaacodax.vercel.app/quiz/exam_mnsf26_mock_01', {
    waitUntil: 'networkidle',
    timeout: 30000,
  });
  await page.waitForTimeout(3000);

  const img01 = await page.$('img[alt="صورة السؤال"]');
  if (img01) {
    console.log('✓ Mock 01 question 1 image src:', await img01.getAttribute('src'));
  }
  const screenshot01 = path.join(ARTIFACTS_DIR, 'mnsf26_mock01_question1_live.png');
  await page.screenshot({ path: screenshot01, fullPage: false });
  console.log(`✓ Screenshot 01 saved to ${screenshot01}`);

  await browser.close();
  console.log('--- E2E TEST COMPLETED ---');
}

run().catch(console.error);
