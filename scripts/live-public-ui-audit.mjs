import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const BASE_URL = process.env.PUBLIC_UI_BASE_URL || 'http://127.0.0.1:4173';
const API_TARGET = process.env.PUBLIC_UI_API_TARGET || 'https://almeaacodax-k2ux.onrender.com/api';
const RUN_ID = process.env.PUBLIC_UI_AUDIT_RUN_ID || 'branch-public-ui';
const OUT_DIR = path.resolve('audit-artifacts', 'platform-v3-public-ui', RUN_ID);
const PAGE_TIMEOUT_MS = 30000;
const MOJIBAKE_PATTERN = /[\u00c3\u00d8\u00d9][^\n\r]{0,80}[\u00c3\u00d8\u00d9]/;

const viewports = [
  { name: 'desktop', width: 1440, height: 1000 },
  { name: 'mobile', width: 390, height: 844 },
];

const routes = [
  { path: '/', expect: 'public' },
  { path: '/courses', expect: 'public' },
  { path: '/quizzes', expect: 'public' },
  { path: '/mock-exams', expect: 'public' },
  { path: '/pricing', expect: 'public' },
  { path: '/cart', expect: 'public' },
  { path: '/blog', expect: 'public' },
  { path: '/about', expect: 'public' },
  { path: '/contact', expect: 'public' },
  { path: '/faq', expect: 'public' },
  { path: '/privacy', expect: 'public' },
  { path: '/terms', expect: 'public' },
  { path: '/forgot-password', expect: 'public' },
  { path: '/login', expect: 'auth-entry' },
  { path: '/signup', expect: 'auth-entry' },
  { path: '/dashboard', expect: 'guarded' },
  { path: '/reports', expect: 'guarded' },
  { path: '/my-requests', expect: 'guarded' },
  { path: '/profile', expect: 'guarded' },
];

fs.mkdirSync(OUT_DIR, { recursive: true });

function safeName(input) {
  return String(input || '')
    .replace(/[^a-zA-Z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 120) || 'root';
}

async function addDynamicPublicRoutes() {
  try {
    const response = await fetch(`${API_TARGET}/content/bootstrap?scope=learning`, {
      headers: { accept: 'application/json' },
    });
    if (!response.ok) return;
    const payload = await response.json();
    const firstPath = (payload?.paths || []).find((item) => item?.id && item?.showOnPlatform !== false);
    const firstCourse = (payload?.courses || []).find((item) => item?.id && item?.showOnPlatform !== false && item?.isPackage !== true);
    if (firstPath?.id) routes.push({ path: `/category/${encodeURIComponent(firstPath.id)}`, expect: 'public' });
    if (firstCourse?.id) routes.push({ path: `/course/${encodeURIComponent(firstCourse.id)}`, expect: 'public' });
  } catch (error) {
    console.warn('Dynamic public route discovery skipped:', error instanceof Error ? error.message : String(error));
  }
}

async function installApiBridge(context) {
  await context.route('**/api/**', async (route) => {
    const request = route.request();
    const originalUrl = new URL(request.url());
    const apiIndex = originalUrl.pathname.indexOf('/api/');
    if (apiIndex < 0) return route.continue();

    const apiPath = originalUrl.pathname.slice(apiIndex + 4);
    const targetUrl = `${API_TARGET}${apiPath}${originalUrl.search}`;
    const headers = { ...request.headers() };
    delete headers.host;
    delete headers.origin;
    delete headers.referer;
    delete headers['content-length'];

    try {
      const response = await fetch(targetUrl, {
        method: request.method(),
        headers,
        body: ['GET', 'HEAD'].includes(request.method()) ? undefined : request.postDataBuffer() || undefined,
        redirect: 'manual',
      });
      const responseHeaders = Object.fromEntries(response.headers.entries());
      delete responseHeaders['content-encoding'];
      delete responseHeaders['content-length'];
      delete responseHeaders['transfer-encoding'];
      await route.fulfill({
        status: response.status,
        headers: responseHeaders,
        body: Buffer.from(await response.arrayBuffer()),
      });
    } catch (error) {
      console.error(`API bridge failed for ${targetUrl}:`, error instanceof Error ? error.message : String(error));
      await route.abort('failed');
    }
  });
}

async function inspectRoute(browser, routeSpec, viewport) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    locale: 'ar-SA',
  });
  await installApiBridge(context);
  const page = await context.newPage();
  const consoleErrors = [];
  const network4xx = [];
  const network5xx = [];

  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text().slice(0, 400));
  });
  page.on('response', (response) => {
    const record = { status: response.status(), url: response.url() };
    if (response.status() >= 400 && response.status() < 500) network4xx.push(record);
    if (response.status() >= 500) network5xx.push(record);
  });

  const target = `${BASE_URL}${routeSpec.path}`;
  let navigationError = '';
  let navigationWarning = '';
  try {
    await page.goto(target, { waitUntil: 'networkidle', timeout: PAGE_TIMEOUT_MS }).catch(async (error) => {
      navigationWarning = String(error?.message || error || '').slice(0, 500);
      await page.goto(target, { waitUntil: 'domcontentloaded', timeout: PAGE_TIMEOUT_MS });
    });
    await page.waitForTimeout(700);
  } catch (error) {
    navigationError = String(error?.message || error || '').slice(0, 500);
  }

  const screenshot = path.join(OUT_DIR, `${viewport.name}-${safeName(routeSpec.path)}.png`);
  await page.screenshot({ path: screenshot, fullPage: true }).catch(() => undefined);

  const state = await page.evaluate(({ mojibakeSource }) => {
    const text = document.body?.innerText || '';
    const controls = Array.from(document.querySelectorAll('a[href], button, input, select, textarea, [role="button"]')).filter((element) => {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
    });
    const hasPassword = Boolean(document.querySelector('input[type="password"]'));
    return {
      href: location.href,
      title: document.title,
      bodyLength: text.length,
      controlCount: controls.length,
      hasPassword,
      hasAuthText: /تسجيل الدخول|إنشاء حساب|البريد الإلكتروني|Login|Sign up/i.test(text),
      hasGuardText: /تسجيل الدخول|ليس لديك صلاحية|غير مصرح|Authentication required|Login/i.test(text),
      hasCrashText: /حدث خطأ غير متوقع|Something went wrong|Application error|Internal Server Error/i.test(text),
      hasMojibakeText: new RegExp(mojibakeSource).test(text),
      viewportWidth: innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
      horizontalOverflow: document.documentElement.scrollWidth > innerWidth + 24,
    };
  }, { mojibakeSource: MOJIBAKE_PATTERN.source }).catch((error) => ({
    href: page.url(),
    title: '',
    bodyLength: 0,
    controlCount: 0,
    hasPassword: false,
    hasAuthText: false,
    hasGuardText: false,
    hasCrashText: true,
    hasMojibakeText: false,
    viewportWidth: viewport.width,
    scrollWidth: 0,
    horizontalOverflow: false,
    evaluateError: String(error?.message || error || '').slice(0, 500),
  }));

  const publicOk = routeSpec.expect === 'public' && state.bodyLength > 120 && !state.hasCrashText;
  const authEntryOk = routeSpec.expect === 'auth-entry' && (state.hasPassword || state.hasAuthText || state.href.includes('auth='));
  const guardedOk = routeSpec.expect === 'guarded' && (state.hasPassword || state.hasGuardText || state.href.includes('auth=login'));
  const layoutFailure = viewport.name === 'mobile' && state.horizontalOverflow
    ? `horizontal overflow ${state.scrollWidth}/${state.viewportWidth}`
    : '';
  const textFailure = state.hasMojibakeText ? 'visible mojibake text' : '';
  const status = navigationError || network5xx.length || layoutFailure || textFailure || !(publicOk || authEntryOk || guardedOk)
    ? 'FAIL'
    : 'PASS';

  await context.close();
  return {
    path: routeSpec.path,
    expect: routeSpec.expect,
    viewport: viewport.name,
    status,
    screenshot,
    navigationError,
    navigationWarning,
    layoutFailure,
    textFailure,
    network4xx,
    network5xx,
    consoleErrors,
    ...state,
  };
}

await addDynamicPublicRoutes();
const browser = await chromium.launch({ headless: true });
const results = [];
try {
  for (const routeSpec of routes) {
    for (const viewport of viewports) {
      results.push(await inspectRoute(browser, routeSpec, viewport));
    }
  }
} finally {
  await browser.close();
}

const summary = {
  generatedAt: new Date().toISOString(),
  baseUrl: BASE_URL,
  apiTarget: API_TARGET,
  runId: RUN_ID,
  total: results.length,
  pass: results.filter((item) => item.status === 'PASS').length,
  fail: results.filter((item) => item.status === 'FAIL').length,
  results,
};

fs.writeFileSync(path.join(OUT_DIR, 'public-ui-audit.json'), JSON.stringify(summary, null, 2), 'utf8');
fs.writeFileSync(path.join(OUT_DIR, 'SUMMARY.md'), [
  '# Platform V3 Public UI Live Audit',
  '',
  `- Generated: ${summary.generatedAt}`,
  `- Branch UI: ${summary.baseUrl}`,
  `- API target: ${summary.apiTarget}`,
  `- Run ID: ${summary.runId}`,
  `- Total: ${summary.total}`,
  `- PASS: ${summary.pass}`,
  `- FAIL: ${summary.fail}`,
  '',
  ...results.map((item) => `- [${item.status}] ${item.viewport} ${item.path}: expect=${item.expect}, body=${item.bodyLength}, controls=${item.controlCount}, 4xx=${item.network4xx.length}, 5xx=${item.network5xx.length}, console=${item.consoleErrors.length}, overflow=${item.horizontalOverflow ? 'yes' : 'no'}${item.navigationError ? `, navigation=${item.navigationError}` : ''}${item.layoutFailure ? `, layout=${item.layoutFailure}` : ''}${item.textFailure ? `, text=${item.textFailure}` : ''}`),
  '',
].join('\n'), 'utf8');

const failures = results.filter((item) => item.status === 'FAIL');
console.log(JSON.stringify({ outDir: OUT_DIR, total: summary.total, pass: summary.pass, fail: summary.fail }, null, 2));
if (failures.length) {
  console.error('\nPublic UI failures:');
  for (const item of failures) {
    console.error(JSON.stringify({
      viewport: item.viewport,
      path: item.path,
      expect: item.expect,
      href: item.href,
      navigationError: item.navigationError,
      navigationWarning: item.navigationWarning,
      layoutFailure: item.layoutFailure,
      textFailure: item.textFailure,
      network4xx: item.network4xx,
      network5xx: item.network5xx,
      consoleErrors: item.consoleErrors,
      bodyLength: item.bodyLength,
      controlCount: item.controlCount,
      horizontalOverflow: item.horizontalOverflow,
    }, null, 2));
  }
  process.exit(1);
}
