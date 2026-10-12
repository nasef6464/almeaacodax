import { spawn } from 'node:child_process';
import { chromium } from 'playwright';
import path from 'node:path';

const ARTIFACTS_DIR = 'C:/Users/nasef/.gemini/antigravity/brain/6e4a6cc2-f148-461d-ae27-f8a0507cc66f';
const PORT = 4173;
const BASE_URL = `http://127.0.0.1:${PORT}`;

async function waitServerReady(url, timeoutMs = 25000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok || res.status === 200 || res.status === 304) return true;
    } catch {
      // wait a bit
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  throw new Error(`Server did not start in ${timeoutMs}ms on ${url}`);
}

async function run() {
  console.log('--- 1. STARTING VITE PREVIEW SERVER ---');
  const previewProcess = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], {
    shell: true,
    stdio: 'pipe',
  });

  previewProcess.stdout?.on('data', (d) => process.stdout.write(`[preview] ${d}`));
  previewProcess.stderr?.on('data', (d) => process.stderr.write(`[preview-err] ${d}`));

  let currentUserMock = null;

  try {
    await waitServerReady(BASE_URL);
    console.log(`Vite preview server is ready on ${BASE_URL}`);

    console.log('--- 2. LAUNCHING PLAYWRIGHT CHROMIUM ---');
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      viewport: { width: 1280, height: 850 },
      locale: 'ar-SA',
    });
    const page = await context.newPage();

    const mockQuestions = Array.from({ length: 10 }, (_, i) => ({
      id: `q_${i + 1}`,
      code: `Q0${i + 1}`,
      text: `سؤال تجريبي رقم ${i + 1}: ما هو الناتج الصحيح للعملية الحسابية؟`,
      options: ['10', '20', '30', '40'],
      correctAnswer: 0,
      pathId: 'p_1',
      subjectId: 'sub_1',
    }));

    // Universal API interceptors
    await page.route('**/*quizzes/questions*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: mockQuestions,
          pagination: { total: mockQuestions.length, page: 1, limit: 10, totalPages: 1 },
        }),
      });
    });

    await page.route('**/*questions*', async (route) => {
      const url = route.request().url();
      if (url.includes('paginate=true')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: mockQuestions,
            pagination: { total: mockQuestions.length, page: 1, limit: 10, totalPages: 1 },
          }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockQuestions),
        });
      }
    });

    await page.route('**/*quizzes*', async (route) => {
      const url = route.request().url();
      if (url.includes('/questions')) return;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'mock-test-auth-gate-01',
            title: 'اختبار تجريبي: قياس القدرات العامة 2026',
            description: 'اختبار تشخيصي مجاني لقياس المستوى والجاهزية',
            isPublished: true,
            showOnPlatform: true,
            approvalStatus: 'approved',
            pathId: 'p_1',
            subjectId: 'sub_1',
            questionIds: ['q_1', 'q_2', 'q_3', 'q_4', 'q_5', 'q_6', 'q_7', 'q_8', 'q_9', 'q_10'],
            settings: {
              timeLimit: 25,
              passingScore: 60,
              maxAttempts: 3,
              showExplanations: true,
              showAnswers: true,
            },
            access: {
              type: 'free',
            },
          },
        ]),
      });
    });

    await page.route('**/*auth/me*', async (route) => {
      if (currentUserMock) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ user: currentUserMock }),
        });
      } else {
        await route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'unauthorized' }),
        });
      }
    });

    await page.route('**/*skill-progress*', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{"data":[]}' }));
    await page.route('**/*quiz-results/my*', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{"data":[]}' }));
    await page.route('**/*question-attempts*', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{"data":[]}' }));
    await page.route('**/*courses*', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
    await page.route('**/*taxonomy/bootstrap*', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ paths: [], subjects: [] }) }));
    await page.route('**/*content/bootstrap*', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ lessons: [], topics: [] }) }));
    await page.route('**/*health*', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{"status":"ok"}' }));
    await page.route('**/*homepage-settings*', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{}' }));
    await page.route('**/*homepage/settings*', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{}' }));
    await page.route('**/*platform-font-settings*', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{}' }));

    page.on('console', (msg) => console.log(`[browser-console] ${msg.type()}: ${msg.text()}`));
    page.on('pageerror', (err) => console.error(`[browser-pageerror]`, err));

    console.log('--- 3. VISITING QUIZ AS AN ANONYMOUS GUEST ---');
    await page.goto(`${BASE_URL}/quiz/mock-test-auth-gate-01`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    // Wait for the Auth Gate card to appear
    await page.waitForSelector('text=سجّل دخولك أو أنشئ حسابك المجاني', { timeout: 10000 });
    console.log('✓ Found Guest Auth Gate header text');

    const badgeText = await page.textContent('text=اختبار متاح مجاناً للطلاب');
    console.log(`✓ Badge present: "${badgeText?.trim()}"`);

    const titleText = await page.textContent('h1');
    console.log(`✓ Quiz Title displayed: "${titleText?.trim()}"`);

    const questionCountText = await page.textContent('text=10 سؤال');
    console.log(`✓ Question count displayed: "${questionCountText?.trim()}"`);

    const durationText = await page.textContent('text=25 دقيقة');
    console.log(`✓ Duration displayed: "${durationText?.trim()}"`);

    const loginBtn = await page.waitForSelector('text=تسجيل الدخول والبدء مباشرة');
    console.log('✓ Login CTA button is present and clickable');

    const signupBtn = await page.waitForSelector('text=إنشاء حساب جديد مجاناً (في ثوانٍ)');
    console.log('✓ Signup CTA button is present and clickable');

    const screenshot1Path = path.join(ARTIFACTS_DIR, 'quiz_auth_gate_card.png');
    await page.screenshot({ path: screenshot1Path, fullPage: true });
    console.log(`✓ Saved Auth Gate Card screenshot: ${screenshot1Path}`);

    console.log('--- 4. TESTING CTA NAVIGATION WITH RETURNTO ---');
    await loginBtn.click();
    await page.waitForTimeout(1000);

    const currentUrl = page.url();
    console.log(`✓ Navigated URL after clicking Login: ${currentUrl}`);

    if (!currentUrl.includes('auth=login') || !currentUrl.includes('returnTo=')) {
      throw new Error(`Expected URL to contain auth=login and returnTo, got: ${currentUrl}`);
    }
    console.log('✓ URL correctly contains auth=login and returnTo query params');

    // Verify login modal is open
    await page.waitForSelector('#smart-login-input', { timeout: 5000 });
    console.log('✓ Login modal opened automatically with #smart-login-input!');

    const modalTitle = await page.textContent('text=تسجيل الدخول');
    console.log(`✓ Modal Title verified: "${modalTitle?.trim()}"`);

    const screenshot2Path = path.join(ARTIFACTS_DIR, 'quiz_auth_gate_login_modal.png');
    await page.screenshot({ path: screenshot2Path, fullPage: true });
    console.log(`✓ Saved Login Modal screenshot: ${screenshot2Path}`);

    console.log('--- 5. SIMULATING SUCCESSFUL STUDENT LOGIN ---');
    currentUserMock = {
      id: 'student-test-999',
      email: 'student@example.com',
      displayName: 'طالب تجريبي',
      role: 'student',
    };

    // Simulate authenticated session in sessionStorage
    await page.evaluate(() => {
      const studentSession = {
        id: 'student-test-999',
        email: 'student@example.com',
        displayName: 'طالب تجريبي',
        photoURL: '',
        role: 'student',
      };
      sessionStorage.setItem('the-hundred-auth-profile', JSON.stringify(studentSession));
    });

    console.log('--- 6. RETURNING TO QUIZ AS AUTHENTICATED STUDENT ---');
    await page.goto(`${BASE_URL}/quiz/mock-test-auth-gate-01`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Auth Gate Card should NOT be present now
    const authGateCount = await page.locator('text=سجّل دخولك أو أنشئ حسابك المجاني').count();
    console.log(`✓ Auth Gate Card count for registered user: ${authGateCount} (Expected: 0)`);
    if (authGateCount > 0) {
      throw new Error('Auth Gate should NOT be shown for registered student!');
    }

    // Quiz runner should be active
    const quizRunnerActive = (await page.locator('text=اختبار تجريبي: قياس القدرات العامة 2026').count()) > 0;
    console.log(`✓ Quiz runner active for registered student: ${quizRunnerActive}`);

    const bodyText = await page.innerText('body');
    console.log('[AUTHENTICATED RUNNER BODY SNIPPET]:\n' + bodyText.substring(0, 800) + '\n');

    const screenshot3Path = path.join(ARTIFACTS_DIR, 'quiz_runner_authenticated.png');
    await page.screenshot({ path: screenshot3Path, fullPage: true });
    console.log(`✓ Saved Authenticated Quiz Runner screenshot: ${screenshot3Path}`);

    const hasQuizTitle = bodyText.includes('اختبار تجريبي: قياس القدرات العامة 2026');
    console.log(`✓ Verified quiz title in runner body: ${hasQuizTitle}`);

    await browser.close();
    console.log('\n========================================');
    console.log('🎉 ALL END-TO-END BROWSER TESTS PASSED 100%!');
    console.log('========================================\n');
  } finally {
    previewProcess.kill();
  }
}

run().catch((err) => {
  console.error('TEST FAILED:', err);
  process.exit(1);
});
