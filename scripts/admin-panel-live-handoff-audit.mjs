import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const BASE_URL = process.env.UI_AUDIT_BASE_URL || 'https://almeaacodax.vercel.app';
const API_BASE_URL = (process.env.UI_AUDIT_API_BASE_URL || 'https://almeaacodax-k2ux.onrender.com/api').replace(/\/$/, '');
const RUN_ID = process.env.ADMIN_AUDIT_RUN_ID || new Date().toISOString().replace(/[:.]/g, '-');
const OUT_DIR = path.resolve('audit-artifacts', 'admin-live-handoff', RUN_ID);
fs.mkdirSync(OUT_DIR, { recursive: true });

const CREDENTIALS_FILE = process.env.ROLE_CREDENTIALS_FILE || path.resolve('audit-artifacts', 'ROLE_CREDENTIALS.env');
if (fs.existsSync(CREDENTIALS_FILE)) {
  for (const line of fs.readFileSync(CREDENTIALS_FILE, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
    const [key, ...rest] = trimmed.split('=');
    if (key && rest.length && !process.env[key]) process.env[key] = rest.join('=').trim();
  }
}

const adminEmail = process.env.ROLE_ADMIN_EMAIL || process.env.SMOKE_ADMIN_EMAIL || process.env.ADMIN_EMAIL;
const adminPassword = process.env.ROLE_ADMIN_PASSWORD || process.env.SMOKE_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD;

const tabs = [
  'overview',
  'paths',
  'lessons',
  'library',
  'quizzes',
  'mock-exams',
  'questions',
  'skills',
  'users',
  'groups',
  'school-portal',
  'financial',
  'notifications',
  'homepage',
  'announcement-ads',
  'platform-fonts',
  'platform-integrations',
  'live-sessions',
  'backups',
  'monitoring',
  'ai-assistant',
  'settings',
];

function safeName(input) {
  return String(input || '').replace(/[^a-zA-Z0-9_-]+/g, '_').slice(0, 80);
}

async function login(page) {
  if (!adminEmail || !adminPassword) {
    throw new Error('Missing ROLE_ADMIN_EMAIL/ROLE_ADMIN_PASSWORD or compatible admin credentials');
  }

  await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 60000 });
  const loginResult = await page.evaluate(
    async ({ apiBaseUrl, email, password }) => {
      const csrfResponse = await fetch(`${apiBaseUrl}/auth/csrf-token`, {
        credentials: 'include',
        cache: 'no-store',
      });
      const csrfPayload = await csrfResponse.json();
      const csrfToken = csrfPayload?.csrfToken || '';
      const loginResponse = await fetch(`${apiBaseUrl}/auth/login`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'content-type': 'application/json',
          'x-csrf-token': csrfToken,
        },
        body: JSON.stringify({ email, password }),
      });
      const payload = await loginResponse.json().catch(() => ({}));
      if (!loginResponse.ok) {
        return { ok: false, status: loginResponse.status, payload };
      }
      const user = payload?.user;
      if (user?.email && user?.role) {
        sessionStorage.setItem(
          'the-hundred-auth-profile',
          JSON.stringify({
            id: String(user.id || user._id || user.email),
            email: user.email,
            displayName: user.name,
            photoURL: user.avatar || `https://i.pravatar.cc/150?u=${encodeURIComponent(user.email)}`,
            role: user.role,
          }),
        );
      }
      return { ok: true, status: loginResponse.status, role: user?.role };
    },
    { apiBaseUrl: API_BASE_URL, email: adminEmail, password: adminPassword },
  );
  if (!loginResult.ok) {
    throw new Error(`Admin API login failed; status=${loginResult.status}`);
  }

  await page.goto(`${BASE_URL}/admin-dashboard`, { waitUntil: 'networkidle', timeout: 60000 });

  const url = page.url();
  const body = await page.locator('body').innerText({ timeout: 10000 }).catch(() => '');
  if (!url.includes('/admin-dashboard') || /تسجيل الدخول|Login/i.test(body)) {
    throw new Error(`Admin login did not reach dashboard; url=${url}`);
  }
}

async function inspectTab(page, tab) {
  const url = `${BASE_URL}/admin-dashboard?tab=${encodeURIComponent(tab)}`;
  const consoleErrors = [];
  const responseFailures = [];
  const onConsole = (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text().slice(0, 240));
  };
  const onResponse = (response) => {
    if (response.status() >= 500) {
      responseFailures.push({
        status: response.status(),
        url: response.url(),
      });
    }
  };
  page.on('console', onConsole);
  page.on('response', onResponse);

  await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(800);
  page.off('console', onConsole);
  page.off('response', onResponse);

  const screenshot = path.join(OUT_DIR, `${safeName(tab)}.png`);
  await page.screenshot({ path: screenshot, fullPage: true });

  const state = await page.evaluate(() => {
    const interactives = Array.from(document.querySelectorAll('a[href], button, [role="button"], input[type="submit"], input[type="button"]'));
    const visible = interactives.filter((el) => {
      const rect = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
    });
    const disabled = visible.filter((el) => el.disabled || el.getAttribute('aria-disabled') === 'true');
    const text = document.body.innerText || '';
    return {
      title: document.title,
      visibleInteractiveCount: visible.length,
      disabledInteractiveCount: disabled.length,
      hasAuthForm: Boolean(document.querySelector('input[type="password"]')) && /تسجيل الدخول|Login/i.test(text),
      hasAdminText: /لوحة|إدارة|المسارات|المستخدم|الاختبارات|التقارير/.test(text),
      bodyLength: text.length,
    };
  });

  const actualUrl = page.url();
  const pass =
    actualUrl.includes('/admin-dashboard') &&
    actualUrl.includes(`tab=${encodeURIComponent(tab)}`) &&
    !state.hasAuthForm &&
    state.visibleInteractiveCount > 0 &&
    state.bodyLength > 500 &&
    responseFailures.length === 0;

  return {
    tab,
    status: pass ? 'PASS' : 'FAIL',
    url: actualUrl,
    screenshot,
    consoleErrors,
    responseFailures,
    ...state,
  };
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  const results = [];

  try {
    await login(page);
    for (const tab of tabs) {
      results.push(await inspectTab(page, tab));
    }
  } finally {
    await context.close().catch(() => {});
    await browser.close().catch(() => {});
  }

  const summary = {
    generatedAt: new Date().toISOString(),
    baseUrl: BASE_URL,
    runId: RUN_ID,
    total: results.length,
    pass: results.filter((row) => row.status === 'PASS').length,
    fail: results.filter((row) => row.status === 'FAIL').length,
    results,
  };

  fs.writeFileSync(path.join(OUT_DIR, 'admin-live-handoff-audit.json'), JSON.stringify(summary, null, 2), 'utf8');
  const lines = [
    '# Admin Live Handoff Audit',
    '',
    `- Generated: ${summary.generatedAt}`,
    `- Base URL: ${summary.baseUrl}`,
    `- API Base URL: ${API_BASE_URL}`,
    `- Total tabs: ${summary.total}`,
    `- PASS: ${summary.pass}`,
    `- FAIL: ${summary.fail}`,
    '',
    '## Results',
    ...results.map((row) => `- [${row.status}] ${row.tab}: interactive=${row.visibleInteractiveCount}, disabled=${row.disabledInteractiveCount}, responseFailures=${row.responseFailures.length}, consoleErrors=${row.consoleErrors.length}, url=${row.url}`),
  ];
  fs.writeFileSync(path.join(OUT_DIR, 'SUMMARY.md'), `${lines.join('\n')}\n`, 'utf8');

  console.log(`Admin live handoff audit complete: ${OUT_DIR}`);
  if (summary.fail > 0) process.exit(1);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
