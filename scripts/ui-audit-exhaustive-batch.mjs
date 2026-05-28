import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const BASE_URL = 'https://almeaacodax.vercel.app';
const OUT_ROOT = path.resolve('audit-artifacts', 'ui-audit-exhaustive');
const runId = process.env.UI_AUDIT_RUN_ID || new Date().toISOString().replace(/[:.]/g, '-');
const OUT_DIR = path.join(OUT_ROOT, runId);
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

const roleFilter = new Set((process.env.UI_AUDIT_ROLES || '').split(',').map((x) => x.trim()).filter(Boolean));
const MAX_ELEMENTS_PER_PAGE = Number(process.env.UI_AUDIT_MAX_ELEMENTS || 40);

const ROLE_CONFIGS = [
  { role: 'guest', credentials: [], pages: ['/', '/pricing', '/blog', '/category/p_qudrat', '/category/p_tahsili', '/mock-exams', '/my-requests', '/reports'] },
  { role: 'student', credentials: credentialsFor('student'), pages: ['/dashboard', '/my-quizzes', '/reports', '/plan', '/profile', '/favorites', '/category/p_qudrat', '/mock-exams'] },
  { role: 'admin', credentials: credentialsFor('admin'), pages: ['/admin-dashboard', '/reports', '/profile'] },
  { role: 'supervisor', credentials: credentialsFor('supervisor'), pages: ['/admin-dashboard', '/reports', '/profile'] },
  { role: 'teacher', credentials: credentialsFor('teacher'), pages: ['/admin-dashboard', '/reports', '/profile'] },
  { role: 'parent', credentials: credentialsFor('parent'), pages: ['/parent-dashboard', '/reports', '/profile'] },
].filter((r) => roleFilter.size === 0 || roleFilter.has(r.role));

const BLOCKED_ACTION_REGEX = /(delete|remove|deactivate|revoke|drop)/i;
const checklistPath = path.join(OUT_DIR, 'ui-audit-checklist.ndjson');

function safeName(input) {
  return String(input || '').replace(/https?:\/\//g, '').replace(/[^a-zA-Z0-9_-]+/g, '_').slice(0, 100);
}

function appendEntry(entry) {
  fs.appendFileSync(checklistPath, JSON.stringify(entry) + '\n', 'utf8');
}

function readEntries() {
  if (!fs.existsSync(checklistPath)) return [];
  const lines = fs.readFileSync(checklistPath, 'utf8').split(/\r?\n/).filter(Boolean);
  return lines.map((line) => JSON.parse(line));
}

function writeSummary() {
  const items = readEntries();
  const pass = items.filter((x) => x.Status === 'PASS').length;
  const fail = items.filter((x) => x.Status === 'FAIL').length;
  const blocked = items.filter((x) => x.Status === 'BLOCKED').length;
  const summary = {
    generatedAt: new Date().toISOString(),
    runId,
    total: items.length,
    pass,
    fail,
    blocked,
  };
  fs.writeFileSync(path.join(OUT_DIR, 'ui-audit-checklist.json'), JSON.stringify({ ...summary, items }, null, 2), 'utf8');

  const headers = ['Role', 'Page', 'Element', 'Expected', 'Actual', 'Status', 'Severity', 'Type', 'Evidence Path', 'Notes'];
  const rows = [headers.join(',')];
  for (const row of items) rows.push(headers.map((h) => `"${String(row[h] ?? '').replaceAll('"', '""')}"`).join(','));
  fs.writeFileSync(path.join(OUT_DIR, 'ui-audit-checklist.csv'), rows.join('\n'), 'utf8');

  const topFails = items.filter((x) => x.Status === 'FAIL').slice(0, 10).map((x, i) => `${i + 1}. [${x.Role}] ${x.Page} -> ${x.Element} | ${x.Actual}`).join('\n');
  const md = `# UI Audit Exhaustive\n\n- Run: ${runId}\n- Generated: ${summary.generatedAt}\n- Total: ${summary.total}\n- PASS: ${pass}\n- FAIL: ${fail}\n- BLOCKED: ${blocked}\n\n## Top 10 Failures\n${topFails || 'None'}\n`;
  fs.writeFileSync(path.join(OUT_DIR, 'SUMMARY.md'), md, 'utf8');
}

async function loginAsRole(page, roleConfig) {
  if (roleConfig.role === 'guest') return true;
  for (const cred of roleConfig.credentials) {
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle', timeout: 60000 });
    const emailInput = page.locator('input[type="email"]').first();
    const passwordInput = page.locator('input[type="password"]').first();
    if (!(await emailInput.count()) || !(await passwordInput.count())) continue;
    await emailInput.fill(cred.email).catch(() => {});
    await passwordInput.fill(cred.password).catch(() => {});
    const submit = page.locator('form button[type="submit"]').first();
    if (await submit.count()) await submit.click({ timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(2200);
    await page.goto(`${BASE_URL}/profile`, { waitUntil: 'networkidle', timeout: 60000 }).catch(() => {});
    const url = page.url();
    if (!url.includes('/login')) return true;
  }
  return false;
}

async function collectVisibleInteractive(page) {
  return page.evaluate((max) => {
    const nodes = Array.from(document.querySelectorAll('a[href], button, [role="button"], input[type="submit"], input[type="button"]'));
    const out = [];
    for (let i = 0; i < nodes.length; i++) {
      const el = nodes[i];
      const rect = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      const visible = rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden' && rect.bottom > 0 && rect.top < window.innerHeight;
      if (!visible) continue;
      const label = ((el.textContent || '').trim() || (el.getAttribute('aria-label') || '').trim()).slice(0, 120);
      if (!label) continue;
      out.push({ idx: i, tag: el.tagName.toLowerCase(), label });
      if (out.length >= max) break;
    }
    return out;
  }, MAX_ELEMENTS_PER_PAGE);
}

async function auditRole(browser, roleConfig) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const roleDir = path.join(OUT_DIR, roleConfig.role);
  fs.mkdirSync(roleDir, { recursive: true });

  const loggedIn = await loginAsRole(page, roleConfig);
  if (!loggedIn) {
    appendEntry({ Role: roleConfig.role, Page: '-', Element: 'AUTH', Expected: 'login succeeds', Actual: 'unable to authenticate', Status: 'BLOCKED', Severity: 'High', Type: 'Access Control', 'Evidence Path': '', Notes: 'Skipped role due to auth failure' });
    writeSummary();
    await context.close();
    return;
  }

  for (const route of roleConfig.pages) {
    const pageDir = path.join(roleDir, safeName(route));
    fs.mkdirSync(pageDir, { recursive: true });
    try {
      await page.goto(`${BASE_URL}${route}`, { waitUntil: 'networkidle', timeout: 60000 });
      const fullPath = path.join(pageDir, 'page-full.png');
      await page.screenshot({ path: fullPath, fullPage: true });
      const items = await collectVisibleInteractive(page);

      if (!items.length) {
        appendEntry({ Role: roleConfig.role, Page: route, Element: '(none)', Expected: 'visible interactive elements', Actual: 'none detected', Status: 'BLOCKED', Severity: 'Low', Type: 'Visual', 'Evidence Path': fullPath, Notes: 'No visible interactive elements' });
        writeSummary();
        continue;
      }

      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        const el = `${it.tag}:${it.label}`;
        const base = safeName(`${i + 1}_${it.tag}_${it.label}`);
        const before = path.join(pageDir, `${base}-before.png`);
        const after = path.join(pageDir, `${base}-after.png`);
        await page.screenshot({ path: before, fullPage: true }).catch(() => {});

        if (BLOCKED_ACTION_REGEX.test(it.label)) {
          appendEntry({ Role: roleConfig.role, Page: route, Element: el, Expected: 'safe click', Actual: 'blocked by policy', Status: 'BLOCKED', Severity: 'Low', Type: 'UX', 'Evidence Path': before, Notes: 'Potentially destructive label' });
          continue;
        }

        const from = page.url();
        let clicked = false;
        let err = '';
        try {
          const loc = page.locator('a[href], button, [role="button"], input[type="submit"], input[type="button"]').nth(it.idx);
          await loc.scrollIntoViewIfNeeded().catch(() => {});
          await loc.click({ timeout: 3500 });
          clicked = true;
          await page.waitForTimeout(700);
        } catch (e) {
          err = e instanceof Error ? e.message.slice(0, 220) : String(e).slice(0, 220);
        }
        await page.screenshot({ path: after, fullPage: true }).catch(() => {});
        const to = page.url();

        appendEntry({
          Role: roleConfig.role,
          Page: route,
          Element: el,
          Expected: 'element is interactable',
          Actual: clicked ? `clicked; from=${from} to=${to}` : `click failed: ${err}`,
          Status: clicked ? 'PASS' : 'FAIL',
          Severity: clicked ? '' : 'Medium',
          Type: clicked ? 'Navigation' : 'UX',
          'Evidence Path': `${before} | ${after}`,
          Notes: '',
        });

        if (to !== `${BASE_URL}${route}` && !to.startsWith(`${BASE_URL}${route}`)) {
          await page.goto(`${BASE_URL}${route}`, { waitUntil: 'networkidle', timeout: 60000 }).catch(() => {});
        }
      }

      writeSummary();
    } catch (e) {
      const msg = e instanceof Error ? e.message.slice(0, 220) : String(e).slice(0, 220);
      appendEntry({ Role: roleConfig.role, Page: route, Element: '(page-load)', Expected: 'page loads', Actual: msg, Status: 'FAIL', Severity: 'High', Type: 'Navigation', 'Evidence Path': '', Notes: 'Page-level error' });
      writeSummary();
    }
  }

  await context.close();
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
  writeSummary();
  console.log(`UI audit batch complete: ${OUT_DIR}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
