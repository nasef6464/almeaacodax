import assert from 'node:assert/strict';
import { mkdtemp, realpath } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';

const root = fileURLToPath(new URL('../', import.meta.url));
const artifacts = process.env.TEACHING_BOARD_ARTIFACTS || await mkdtemp(path.join(tmpdir(), 'almeaa-board-'));
const server = await createServer({
  configFile: false, root, plugins: [react()], define: { __APP_VERSION__: '"board-test"' },
  optimizeDeps: { entries: ['scripts/fixtures/teaching-board.html'] },
  server: { host: '127.0.0.1', port: 0, fs: { allow: [root, await realpath(path.join(root, 'node_modules'))] } },
});
let browser;
try {
  await server.listen();
  const address = server.httpServer.address();
  browser = await chromium.launch({ ...(process.env.PLAYWRIGHT_CHANNEL ? { channel: process.env.PLAYWRIGHT_CHANNEL } : {}) });
  const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(`http://127.0.0.1:${address.port}/scripts/fixtures/teaching-board.html`);
  await page.getByRole('button', { name: 'إيقاف مؤقت', exact: true }).waitFor();
  await page.getByRole('button', { name: 'إيقاف مؤقت', exact: true }).click();
  const initialReveal = await page.locator('.teaching-writing').first().getAttribute('style');
  await page.waitForTimeout(250);
  assert.equal(await page.locator('.teaching-writing').first().getAttribute('style'), initialReveal);
  assert.equal(await page.evaluate(() => window.testRequests.length), 1);
  await page.getByRole('button', { name: 'لماذا؟', exact: true }).click();
  await page.getByRole('button', { name: 'نكمل الشرح من نفس النقطة', exact: true }).waitFor();
  const requests = await page.evaluate(() => window.testRequests);
  assert.equal(requests.length, 2);
  assert.match(requests[1].boardContext, /معادلة أسية/);
  await page.getByRole('button', { name: 'نكمل الشرح من نفس النقطة', exact: true }).click();
  await page.getByText('عندنا معادلة أسية.', { exact: true }).waitFor();
  await page.waitForTimeout(100);
  await page.getByRole('button', { name: 'إيقاف مؤقت', exact: true }).click();
  assert.notEqual(await page.locator('.teaching-writing').first().getAttribute('style'), '--reveal: 0%;');
  await page.getByRole('button', { name: 'الخطوة التالية', exact: true }).click();
  await page.getByRole('button', { name: 'تشغيل', exact: true }).click();
  await page.evaluate(() => window.testSpeak.at(-1).onend());
  await page.getByText('نساوي الأسس ثم نحل.', { exact: true }).waitFor();
  await page.evaluate(() => window.testSpeak.at(-1).onend());
  await page.waitForTimeout(2200);
  assert.ok(await page.getByTestId('teaching-board').getByText('x=2', { exact: true }).count());
  assert.equal(await page.evaluate(() => window.testRequests.length), 2);
  await page.screenshot({ path: path.join(artifacts, 'desktop.png') });
  await page.setViewportSize({ width: 800, height: 1280 });
  await page.getByRole('button', { name: 'اسأل المعلم', exact: true }).click();
  const dialogue = await page.locator('#teacher-dialogue').boundingBox();
  assert.ok(dialogue && dialogue.y + dialogue.height <= 1280);
  await page.screenshot({ path: path.join(artifacts, 'tablet.png') });

  await page.getByRole('button', { name: 'إغلاق المعلم الذكي', exact: true }).click();
  await page.evaluate(() => { window.testEnglish = true; });
  await page.getByRole('button', { name: 'فتح', exact: true }).click();
  await page.getByText('Focus on the verb.', { exact: true }).waitFor();
  assert.equal(await page.getByTestId('teaching-board').getAttribute('dir'), 'ltr');
  assert.equal(await page.evaluate(() => window.testSpeak.at(-1).lang), 'en-US');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.waitForTimeout(100);
  assert.equal(await page.locator('.teaching-writing').first().evaluate(element => getComputedStyle(element).clipPath), 'none');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'اسأل المعلم', exact: true }).click();
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth) <= 390);
  await page.screenshot({ path: path.join(artifacts, 'mobile.png') });

  await page.getByRole('button', { name: 'إغلاق المعلم الذكي', exact: true }).click();
  await page.evaluate(() => { window.testEnglish = false; window.testFallback = true; });
  await page.getByRole('button', { name: 'فتح', exact: true }).click();
  await page.getByText('الشرح المعتمد الحالي', { exact: true }).first().waitFor();
  assert.equal(await page.getByTestId('teaching-board').count(), 0);
  await page.getByRole('button', { name: 'اسأل المعلم', exact: true }).click();
  await page.getByRole('textbox', { name: 'سؤالك للمعلم', exact: true }).fill('أغلق أثناء الرد');
  await page.getByRole('button', { name: 'إرسال السؤال للمعلم', exact: true }).click();
  await page.getByRole('button', { name: 'إغلاق المعلم الذكي', exact: true }).click();
  await page.waitForTimeout(200);
  assert.equal(await page.getByRole('dialog').count(), 0);
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ status: 'PASS', artifacts, checks: ['pause', 'contextual interruption', 'saved resume', 'speech-end advancement', 'no animation requests', 'tablet/mobile', 'English', 'reduced motion', 'invalid-plan fallback', 'stale reply'] }));
} finally {
  await browser?.close();
  await server.close();
}
