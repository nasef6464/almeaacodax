import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const cliArgs = process.argv.slice(2);
const readArg = (name, fallback) => {
  const index = cliArgs.indexOf(name);
  if (index < 0) return fallback;
  const value = cliArgs[index + 1];
  if (!value || value.startsWith('--')) {
    throw new Error(`Missing value for ${name}`);
  }
  return value;
};

const BASE_URL = readArg('--base-url', 'http://127.0.0.1:4173');
const API_TARGET = readArg('--api-target', 'https://almeaacodax-k2ux.onrender.com/api');
const RUN_ID = readArg('--run-id', 'branch-public-ui');
const OUT_DIR = path.resolve('audit-artifacts', 'platform-v3-public-ui', RUN_ID);
const PAGE_TIMEOUT_MS = 30000;
const MOJIBAKE_PATTERN = /[\u00c3\u00d8\u00d9][^\n\r]{0,80}[\u00c3\u00d8\u00d9]/;
const STORE_KEY = 'learning-platform-storage';

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
  { path: '/checkout', expect: 'public' },
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

function extractCollection(payload, key) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.[key])) return payload[key];
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.data?.[key])) return payload.data[key];
  if (Array.isArray(payload?.data?.items)) return payload.data.items;
  return [];
}

const dynamicDiscovery = {
  status: 'WARN',
  pathCandidates: 0,
  courseCandidates: 0,
  addedRoutes: [],
  error: '',
};

async function addDynamicPublicRoutes() {
  try {
    const [taxonomyResponse, coursesResponse] = await Promise.all([
      fetch(`${API_TARGET}/taxonomy/bootstrap?phase=core`, { headers: { accept: 'application/json' } }),
      fetch(`${API_TARGET}/courses?limit=200`, { headers: { accept: 'application/json' } }),
    ]);

    if (!taxonomyResponse.ok) {
      throw new Error(`taxonomy bootstrap returned ${taxonomyResponse.status}`);
    }
    if (!coursesResponse.ok) {
      throw new Error(`courses endpoint returned ${coursesResponse.status}`);
    }

    const [taxonomyPayload, coursesPayload] = await Promise.all([
      taxonomyResponse.json(),
      coursesResponse.json(),
    ]);
    const paths = extractCollection(taxonomyPayload, 'paths');
    const courses = extractCollection(coursesPayload, 'courses');
    dynamicDiscovery.pathCandidates = paths.length;
    dynamicDiscovery.courseCandidates = courses.length;

    const firstPath = paths.find((item) => item?.id && item?.showOnPlatform !== false);
    const firstCourse = courses.find((item) => item?.id && item?.showOnPlatform !== false && item?.isPackage !== true);

    if (firstPath?.id) {
      const path = `/category/${encodeURIComponent(firstPath.id)}`;
      routes.push({ path, expect: 'public' });
      dynamicDiscovery.addedRoutes.push(path);
    }
    if (firstCourse?.id) {
      const path = `/course/${encodeURIComponent(firstCourse.id)}`;
      routes.push({ path, expect: 'public' });
      dynamicDiscovery.addedRoutes.push(path);
    }

    dynamicDiscovery.status = dynamicDiscovery.addedRoutes.length > 0 ? 'PASS' : 'WARN';
  } catch (error) {
    dynamicDiscovery.error = error instanceof Error ? error.message : String(error);
    console.warn('Dynamic public route discovery skipped:', dynamicDiscovery.error);
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

const cartAuditItems = {
  single: [
    { id: 'audit-course-sar', type: 'course', title: 'دورة تدقيق الدفع', price: 100, currency: 'SAR' },
  ],
  multiple: [
    { id: 'audit-course-sar', type: 'course', title: 'دورة تدقيق الدفع', price: 100, currency: 'SAR' },
    { id: 'audit-package-usd', type: 'package', title: 'باقة تدقيق العملات', price: 25, currency: 'USD' },
  ],
};

function assertJourney(condition, message) {
  if (!condition) throw new Error(message);
}

async function gotoJourneyPage(page, routePath) {
  await page.goto(`${BASE_URL}${routePath}`, { waitUntil: 'domcontentloaded', timeout: PAGE_TIMEOUT_MS });
  await page.waitForTimeout(700);
}

async function runJourney(browser, spec, viewport) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    locale: 'ar-SA',
  });
  await installApiBridge(context);
  if (spec.cartItems) {
    await context.addInitScript(({ key, items }) => {
      localStorage.setItem(key, JSON.stringify({ state: { cartItems: items }, version: 3 }));
    }, { key: STORE_KEY, items: spec.cartItems });
  }

  const page = await context.newPage();
  const consoleErrors = [];
  const network5xx = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text().slice(0, 400));
  });
  page.on('response', (response) => {
    if (response.status() >= 500) network5xx.push({ status: response.status(), url: response.url() });
  });

  let status = 'PASS';
  let error = '';
  let href = '';
  let horizontalOverflow = false;
  try {
    await spec.run(page);
    href = page.url();
    horizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 24);
    assertJourney(!horizontalOverflow, 'horizontal overflow after journey');
    assertJourney(network5xx.length === 0, `journey observed ${network5xx.length} server error response(s)`);
  } catch (journeyError) {
    status = 'FAIL';
    error = journeyError instanceof Error ? journeyError.message : String(journeyError);
    href = page.url();
  }

  const screenshot = path.join(OUT_DIR, `journey-${viewport.name}-${safeName(spec.name)}.png`);
  await page.screenshot({ path: screenshot, fullPage: true }).catch(() => undefined);
  await context.close();
  return {
    name: spec.name,
    viewport: viewport.name,
    status,
    error,
    href,
    horizontalOverflow,
    network5xx,
    consoleErrors,
    screenshot,
  };
}

const visitorJourneys = [
  {
    name: 'pricing-free-membership-opens-login',
    run: async (page) => {
      await gotoJourneyPage(page, '/pricing');
      const start = page.locator('[data-testid="pricing-free-membership-start"]');
      await start.waitFor({ state: 'visible', timeout: PAGE_TIMEOUT_MS });
      await start.click();
      await page.waitForTimeout(500);
      assertJourney(page.url().includes('/login') || page.url().includes('auth=login'), 'pricing free membership did not navigate to login');
      assertJourney(await page.locator('input[type="password"]').count() > 0, 'login form did not open after pricing CTA');
    },
  },
  {
    name: 'empty-cart-navigates-to-pricing',
    run: async (page) => {
      await gotoJourneyPage(page, '/cart');
      const browse = page.getByRole('link', { name: 'تصفح الباقات' });
      await browse.waitFor({ state: 'visible', timeout: PAGE_TIMEOUT_MS });
      await browse.click();
      await page.waitForTimeout(400);
      assertJourney(page.url().includes('/pricing'), 'empty cart did not navigate to pricing');
      assertJourney(await page.locator('[data-testid="pricing-memberships-page"]').count() > 0, 'pricing page did not render after cart navigation');
    },
  },
  {
    name: 'forgot-password-returns-to-login',
    run: async (page) => {
      await gotoJourneyPage(page, '/forgot-password');
      const loginLink = page.getByRole('link', { name: 'تذكرت كلمة المرور؟ سجل الدخول' });
      await loginLink.waitFor({ state: 'visible', timeout: PAGE_TIMEOUT_MS });
      await loginLink.click();
      await page.waitForTimeout(500);
      assertJourney(page.url().includes('/login') || page.url().includes('auth=login'), 'forgot-password link did not navigate to login');
      assertJourney(await page.locator('input[type="password"]').count() > 0, 'login form did not open from forgot-password');
    },
  },
  {
    name: 'checkout-multi-item-keeps-currencies-and-guidance',
    cartItems: cartAuditItems.multiple,
    run: async (page) => {
      await gotoJourneyPage(page, '/checkout');
      await page.locator('[data-testid="checkout-multi-item-note"]').waitFor({ state: 'visible', timeout: PAGE_TIMEOUT_MS });
      assertJourney(await page.locator('[data-testid="checkout-single-item-pay"]').count() === 0, 'multi-item checkout exposed a misleading pay-all button');
      const body = await page.locator('body').innerText();
      assertJourney(body.includes('100 SAR'), 'SAR total missing from multi-currency checkout');
      assertJourney(body.includes('25 USD'), 'USD total missing from multi-currency checkout');
      assertJourney(await page.getByRole('button', { name: 'شراء الآن' }).count() >= 2, 'multi-item checkout did not keep per-item purchase actions');
    },
  },
  {
    name: 'checkout-single-item-opens-payment-entry',
    cartItems: cartAuditItems.single,
    run: async (page) => {
      await gotoJourneyPage(page, '/checkout');
      const pay = page.locator('[data-testid="checkout-single-item-pay"]');
      await pay.waitFor({ state: 'visible', timeout: PAGE_TIMEOUT_MS });
      assertJourney(await page.locator('[data-testid="checkout-multi-item-note"]').count() === 0, 'single-item checkout showed multi-item guidance');
      await pay.click();
      await page.getByText('الاشتراك في الدورة', { exact: true }).waitFor({ state: 'visible', timeout: PAGE_TIMEOUT_MS });
      assertJourney(await page.getByText('ملخص طلب الشراء', { exact: true }).count() > 0, 'payment decision summary did not render');
    },
  },
  {
    name: 'invalid-certificate-fails-safely',
    run: async (page) => {
      await gotoJourneyPage(page, `/certificate/platform-v3-public-invalid-${RUN_ID}`);
      const body = await page.locator('body').innerText();
      assertJourney(/تعذر تحميل الشهادة|الشهادة غير موجودة/.test(body), 'invalid certificate did not show the safe not-found state');
      assertJourney(!/Application error|Internal Server Error|Something went wrong/i.test(body), 'invalid certificate caused an application crash');
    },
  },
];

await addDynamicPublicRoutes();
const browser = await chromium.launch({ headless: true });
const results = [];
const journeyResults = [];
try {
  for (const routeSpec of routes) {
    for (const viewport of viewports) {
      results.push(await inspectRoute(browser, routeSpec, viewport));
    }
  }
  for (const spec of visitorJourneys) {
    for (const viewport of viewports) {
      journeyResults.push(await runJourney(browser, spec, viewport));
    }
  }
} finally {
  await browser.close();
}

const allResults = [...results, ...journeyResults];
const summary = {
  generatedAt: new Date().toISOString(),
  baseUrl: BASE_URL,
  apiTarget: API_TARGET,
  runId: RUN_ID,
  dynamicDiscovery,
  routeTotal: results.length,
  routePass: results.filter((item) => item.status === 'PASS').length,
  routeFail: results.filter((item) => item.status === 'FAIL').length,
  journeyTotal: journeyResults.length,
  journeyPass: journeyResults.filter((item) => item.status === 'PASS').length,
  journeyFail: journeyResults.filter((item) => item.status === 'FAIL').length,
  total: allResults.length,
  pass: allResults.filter((item) => item.status === 'PASS').length,
  fail: allResults.filter((item) => item.status === 'FAIL').length,
  results,
  journeys: journeyResults,
};

fs.writeFileSync(path.join(OUT_DIR, 'public-ui-audit.json'), JSON.stringify(summary, null, 2), 'utf8');
fs.writeFileSync(path.join(OUT_DIR, 'SUMMARY.md'), [
  '# Platform V3 Public UI Live Audit',
  '',
  `- Generated: ${summary.generatedAt}`,
  `- Branch UI: ${summary.baseUrl}`,
  `- API target: ${summary.apiTarget}`,
  `- Run ID: ${summary.runId}`,
  `- Dynamic discovery: ${dynamicDiscovery.status}; paths=${dynamicDiscovery.pathCandidates}; courses=${dynamicDiscovery.courseCandidates}; added=${dynamicDiscovery.addedRoutes.join(', ') || 'none'}${dynamicDiscovery.error ? `; error=${dynamicDiscovery.error}` : ''}`,
  `- Route checks: ${summary.routePass}/${summary.routeTotal} PASS`,
  `- Visitor journeys: ${summary.journeyPass}/${summary.journeyTotal} PASS`,
  `- Total: ${summary.total}`,
  `- PASS: ${summary.pass}`,
  `- FAIL: ${summary.fail}`,
  '',
  '## Route checks',
  '',
  ...results.map((item) => `- [${item.status}] ${item.viewport} ${item.path}: expect=${item.expect}, body=${item.bodyLength}, controls=${item.controlCount}, 4xx=${item.network4xx.length}, 5xx=${item.network5xx.length}, console=${item.consoleErrors.length}, overflow=${item.horizontalOverflow ? 'yes' : 'no'}${item.navigationError ? `, navigation=${item.navigationError}` : ''}${item.layoutFailure ? `, layout=${item.layoutFailure}` : ''}${item.textFailure ? `, text=${item.textFailure}` : ''}`),
  '',
  '## Visitor interaction journeys',
  '',
  ...journeyResults.map((item) => `- [${item.status}] ${item.viewport} ${item.name}: 5xx=${item.network5xx.length}, console=${item.consoleErrors.length}, overflow=${item.horizontalOverflow ? 'yes' : 'no'}${item.error ? `, error=${item.error}` : ''}`),
  '',
].join('\n'), 'utf8');

const failures = allResults.filter((item) => item.status === 'FAIL');
console.log(JSON.stringify({
  outDir: OUT_DIR,
  dynamicDiscovery,
  routeTotal: summary.routeTotal,
  routePass: summary.routePass,
  routeFail: summary.routeFail,
  journeyTotal: summary.journeyTotal,
  journeyPass: summary.journeyPass,
  journeyFail: summary.journeyFail,
  total: summary.total,
  pass: summary.pass,
  fail: summary.fail,
}, null, 2));
if (failures.length) {
  console.error('\nPublic UI failures:');
  for (const item of failures) {
    console.error(JSON.stringify(item, null, 2));
  }
  process.exit(1);
}
