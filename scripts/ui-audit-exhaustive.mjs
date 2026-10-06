import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const BASE_URL = 'https://almeaacodax.vercel.app';
const OUT_ROOT = path.resolve('audit-artifacts', 'ui-audit-exhaustive');
const ts = new Date().toISOString().replace(/[:.]/g, '-');
const OUT_DIR = path.join(OUT_ROOT, ts);
fs.mkdirSync(OUT_DIR, { recursive: true });

const roleCredentialsPath = process.env.ROLE_CREDENTIALS_FILE || path.resolve('audit-artifacts', 'ROLE_CREDENTIALS.env');
if (fs.existsSync(roleCredentialsPath)) {
  for (const line of fs.readFileSync(roleCredentialsPath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
    const [key, ...rest] = trimmed.split('=');
    if (key && rest.length && !process.env[key]) process.env[key] = rest.join('=').trim();
  }
}

const credentialsFor = (role) => {
  const prefix = `ROLE_${role.toUpperCase()}`;
  const email = process.env[`${prefix}_EMAIL`];
  const password = process.env[`${prefix}_PASSWORD`];
  return email && password ? [{ email, password }] : [];
};

const ROLE_CONFIGS = [
  { role: 'guest', credentials: [], pages: ['/', '/pricing', '/blog', '/category/p_qudrat', '/category/p_tahsili', '/mock-exams', '/my-requests', '/reports'] },
  {
    role: 'student',
    credentials: credentialsFor('student'),
    pages: ['/dashboard', '/my-quizzes', '/reports', '/plan', '/profile', '/favorites', '/category/p_qudrat', '/mock-exams'],
  },
  {
    role: 'admin',
    credentials: credentialsFor('admin'),
    pages: ['/admin-dashboard', '/reports', '/profile'],
  },
  {
    role: 'supervisor',
    credentials: credentialsFor('supervisor'),
    pages: ['/admin-dashboard', '/reports', '/profile'],
  },
  {
    role: 'teacher',
    credentials: credentialsFor('teacher'),
    pages: ['/admin-dashboard', '/reports', '/profile'],
  },
  {
    role: 'parent',
    credentials: credentialsFor('parent'),
    pages: ['/parent-dashboard', '/reports', '/profile'],
  },
];

const MAX_ELEMENTS_PER_PAGE = 120;
const BLOCKED_ACTION_REGEX = /(delete|remove|deactivate|revoke|drop)/i;
const checklist = [];

function safeName(input) {
  return String(input || '')
    .replace(/https?:\/\//g, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '_')
    .slice(0, 120);
}

function addEntry(entry) {
  checklist.push({
    Role: entry.role,
    Page: entry.page,
    Element: entry.element,
    Expected: entry.expected,
    Actual: entry.actual,
    Status: entry.status,
    Severity: entry.severity || '',
    Type: entry.type || '',
    'Evidence Path': entry.evidence || '',
    Notes: entry.notes || '',
  });
}

async function dismissModalIfOpen(page) {
  await page.keyboard.press('Escape').catch(() => {});
}

async function loginAsRole(page, roleConfig) {
  if (roleConfig.role === 'guest') return { ok: true, used: null };

  for (const cred of roleConfig.credentials) {
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle', timeout: 60000 });
    const emailInput = page.locator('input[type="email"]').first();
    const passwordInput = page.locator('input[type="password"]').first();
    if (!(await emailInput.count()) || !(await passwordInput.count())) continue;

    await emailInput.fill(cred.email).catch(() => {});
    await passwordInput.fill(cred.password).catch(() => {});

    const submit = page.locator('form button[type="submit"]').first();
    if (await submit.count()) await submit.click({ timeout: 5000 }).catch(() => {});

    await page.waitForTimeout(2500);
    await page.goto(`${BASE_URL}/profile`, { waitUntil: 'networkidle', timeout: 60000 }).catch(() => {});

    const url = page.url();
    const body = await page.locator('body').innerText().catch(() => '');
    const loggedIn = !url.includes('/login') && !body.includes('user@example.com') && !body.includes('Create Account');
    if (loggedIn) return { ok: true, used: cred };
  }

  return { ok: false, used: null };
}

async function collectVisibleInteractive(page) {
  return page.evaluate((max) => {
    const nodes = Array.from(document.querySelectorAll('a[href], button, [role="button"], input[type="submit"], input[type="button"]'));
    const list = [];
    for (let i = 0; i < nodes.length; i++) {
      const el = nodes[i];
      const rect = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      const visible = rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none' && rect.bottom > 0 && rect.top < window.innerHeight;
      if (!visible) continue;

      const text = (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 120);
      const aria = (el.getAttribute('aria-label') || '').trim().slice(0, 120);
      const label = text || aria || el.getAttribute('title') || el.getAttribute('name') || '';
      if (!label) continue;

      list.push({ idx: i, tag: el.tagName.toLowerCase(), label, href: el.getAttribute('href') || '' });
      if (list.length >= max) break;
    }
    return list;
  }, MAX_ELEMENTS_PER_PAGE);
}

async function testElement(page, role, route, element, outDir, index) {
  const elName = safeName(`${index}_${element.tag}_${element.label}`);
  const before = path.join(outDir, `${elName}-before.png`);
  const after = path.join(outDir, `${elName}-after.png`);
  await page.screenshot({ path: before, fullPage: true }).catch(() => {});

  if (BLOCKED_ACTION_REGEX.test(element.label)) {
    addEntry({ role, page: route, element: `${element.tag}:${element.label}`, expected: 'click without destructive actions', actual: 'policy blocked', status: 'BLOCKED', severity: 'Low', type: 'UX', evidence: before, notes: 'Potentially destructive action' });
    return;
  }

  const prevUrl = page.url();
  let clicked = false;
  let errorMsg = '';
  try {
    const locator = page.locator('a[href], button, [role="button"], input[type="submit"], input[type="button"]').nth(element.idx);
    await locator.scrollIntoViewIfNeeded().catch(() => {});
    await locator.click({ timeout: 4000 });
    clicked = true;
    await page.waitForTimeout(800);
  } catch (e) {
    errorMsg = e instanceof Error ? e.message.slice(0, 220) : String(e).slice(0, 220);
  }

  await page.screenshot({ path: after, fullPage: true }).catch(() => {});
  const newUrl = page.url();
  const changed = newUrl !== prevUrl;

  addEntry({
    role,
    page: route,
    element: `${element.tag}:${element.label}`,
    expected: 'interactable element with expected behavior',
    actual: clicked ? `clicked; url ${changed ? 'changed' : 'unchanged'}` : `click failed: ${errorMsg}`,
    status: clicked ? 'PASS' : 'FAIL',
    severity: clicked ? '' : 'Medium',
    type: clicked ? 'Navigation' : 'UX',
    evidence: `${before} | ${after}`,
    notes: `from=${prevUrl} to=${newUrl}`,
  });

  if (newUrl !== `${BASE_URL}${route}` && !newUrl.startsWith(`${BASE_URL}${route}`)) {
    await page.goto(`${BASE_URL}${route}`, { waitUntil: 'networkidle', timeout: 60000 }).catch(() => {});
  }

  await dismissModalIfOpen(page);
}

async function auditRole(browser, roleConfig) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const roleDir = path.join(OUT_DIR, roleConfig.role);
  fs.mkdirSync(roleDir, { recursive: true });

  const loginState = await loginAsRole(page, roleConfig);
  if (!loginState.ok) {
    addEntry({
      role: roleConfig.role,
      page: '-',
      element: 'AUTH',
      expected: 'login succeeds',
      actual: 'unable to authenticate with configured credentials',
      status: roleConfig.role === 'guest' ? 'PASS' : 'BLOCKED',
      severity: roleConfig.role === 'guest' ? '' : 'High',
      type: 'Access Control',
      evidence: '',
      notes: 'Role audit skipped due to auth failure',
    });
    await context.close();
    return;
  }

  for (const route of roleConfig.pages) {
    const pageDir = path.join(roleDir, safeName(route || 'root'));
    fs.mkdirSync(pageDir, { recursive: true });
    try {
      await page.goto(`${BASE_URL}${route}`, { waitUntil: 'networkidle', timeout: 60000 });
      const fullShot = path.join(pageDir, 'page-full.png');
      await page.screenshot({ path: fullShot, fullPage: true });

      const items = await collectVisibleInteractive(page);
      if (!items.length) {
        addEntry({ role: roleConfig.role, page: route, element: '(none)', expected: 'visible interactive elements', actual: 'none detected', status: 'BLOCKED', severity: 'Low', type: 'Visual', evidence: fullShot, notes: 'no elements in viewport' });
        continue;
      }

      for (let i = 0; i < items.length; i++) {
        await testElement(page, roleConfig.role, route, items[i], pageDir, i + 1);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      addEntry({ role: roleConfig.role, page: route, element: '(page-load)', expected: 'page loads', actual: message.slice(0, 220), status: 'FAIL', severity: 'High', type: 'Navigation', evidence: '', notes: 'page level failure' });
    }
  }

  await context.close();
}

function writeOutputs() {
  const summary = {
    generatedAt: new Date().toISOString(),
    total: checklist.length,
    pass: checklist.filter((x) => x.Status === 'PASS').length,
    fail: checklist.filter((x) => x.Status === 'FAIL').length,
    blocked: checklist.filter((x) => x.Status === 'BLOCKED').length,
  };

  fs.writeFileSync(path.join(OUT_DIR, 'ui-audit-checklist.json'), JSON.stringify({ ...summary, items: checklist }, null, 2), 'utf8');

  const headers = ['Role', 'Page', 'Element', 'Expected', 'Actual', 'Status', 'Severity', 'Type', 'Evidence Path', 'Notes'];
  const csvRows = [headers.join(',')];
  for (const row of checklist) {
    csvRows.push(headers.map((h) => `"${String(row[h] ?? '').replaceAll('"', '""')}"`).join(','));
  }
  fs.writeFileSync(path.join(OUT_DIR, 'ui-audit-checklist.csv'), csvRows.join('\n'), 'utf8');

  const topFails = checklist
    .filter((x) => x.Status === 'FAIL')
    .slice(0, 10)
    .map((x, i) => `${i + 1}. [${x.Role}] ${x.Page} -> ${x.Element} | ${x.Actual}`)
    .join('\n');

  const md = `# UI Audit Exhaustive\n\n- Generated: ${summary.generatedAt}\n- Total: ${summary.total}\n- PASS: ${summary.pass}\n- FAIL: ${summary.fail}\n- BLOCKED: ${summary.blocked}\n\n## Top 10 Failures\n${topFails || 'None'}\n`;
  fs.writeFileSync(path.join(OUT_DIR, 'SUMMARY.md'), md, 'utf8');
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  try {
    for (const roleConfig of ROLE_CONFIGS) {
      await auditRole(browser, roleConfig);
    }
  } finally {
    await browser.close();
  }

  writeOutputs();
  console.log(`UI audit complete: ${OUT_DIR}`);
}

main().catch((error) => {
  console.error('UI audit failed', error);
  process.exit(1);
});
