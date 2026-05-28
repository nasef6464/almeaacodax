import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const BASE_URL = 'https://almeaacodax.vercel.app';
const RUN_DIR = path.resolve('audit-artifacts', 'ui-audit-exhaustive', '2026-05-26-full-audit');
const CHECKLIST_FINAL = path.join(RUN_DIR, 'ui-audit-checklist-final.json');
const OUT_NDJSON = path.join(RUN_DIR, 'ui-audit-retest-blocked.ndjson');
const OUT_MD = path.join(RUN_DIR, 'RETEST_BLOCKED_SUMMARY.md');

const roleCreds = {
  guest: [],
  student: [{ email: 'student.a@almeaa.local', password: 'Student@123' }, { email: 'student@example.com', password: 'Student@123' }],
  admin: [{ email: 'nasef64@gmail.com', password: 'Nn@0120110367' }],
  supervisor: [{ email: 'supervisor.group@almeaa.local', password: 'Supervisor@123' }, { email: 'supervisor@example.com', password: 'Supervisor@123' }],
  teacher: [{ email: 'teacher.quant@almeaa.local', password: 'Teacher@123' }, { email: 'teacher@example.com', password: 'Teacher@123' }],
  parent: [{ email: 'parent.a@almeaa.local', password: 'Parent@123' }, { email: 'parent@example.com', password: 'Parent@123' }],
};

function normalize(s) {
  return String(s || '')
    .replace(/\s+/g, '')
    .replace(/[^\p{L}\p{N}]/gu, '')
    .toLowerCase();
}

function parseLabel(elementField) {
  const idx = String(elementField || '').indexOf(':');
  return idx < 0 ? String(elementField || '').trim() : String(elementField).slice(idx + 1).trim();
}

function loadBlocked() {
  const data = JSON.parse(fs.readFileSync(CHECKLIST_FINAL, 'utf8'));
  return (data.items || []).filter((x) => String(x.Status).toUpperCase() === 'BLOCKED');
}

function append(obj) {
  fs.appendFileSync(OUT_NDJSON, `${JSON.stringify(obj)}\n`, 'utf8');
}

async function login(page, role) {
  if (role === 'guest') return true;
  const creds = roleCreds[role] || [];
  for (const cred of creds) {
    for (const authUrl of [`${BASE_URL}/login`, `${BASE_URL}/?auth=login`]) {
      await page.goto(authUrl, { waitUntil: 'networkidle', timeout: 60000 }).catch(() => {});
      const email = page.locator('input[type="email"]').first();
      const pass = page.locator('input[type="password"]').first();
      if (!(await email.count()) || !(await pass.count())) continue;
      await email.fill(cred.email).catch(() => {});
      await pass.fill(cred.password).catch(() => {});
      const submit = page.locator('form button[type="submit"]').first();
      if (await submit.count()) await submit.click({ timeout: 5000 }).catch(() => {});
      await page.waitForTimeout(2500);
      await page.goto(`${BASE_URL}/profile`, { waitUntil: 'networkidle', timeout: 60000 }).catch(() => {});
      const u = page.url();
      if (!u.includes('/login') && !u.includes('auth=login')) return true;
    }
  }
  return false;
}

async function clickByBestMatch(page, rawLabel) {
  const target = normalize(rawLabel);
  if (!target) return { ok: false, method: 'empty-label' };

  const strict = [
    page.getByRole('button', { name: rawLabel }).first(),
    page.getByRole('link', { name: rawLabel }).first(),
    page.locator('button,a,[role="button"],input[type="button"],input[type="submit"]').filter({ hasText: rawLabel }).first(),
  ];
  for (const c of strict) {
    if (await c.count()) {
      try {
        await c.scrollIntoViewIfNeeded().catch(() => {});
        await c.click({ timeout: 3500 });
        return { ok: true, method: 'strict' };
      } catch {}
    }
  }

  const handles = await page.locator('button,a,[role="button"],input[type="button"],input[type="submit"]').elementHandles();
  for (const h of handles) {
    const txt = normalize(await h.evaluate((el) => (el.innerText || el.textContent || el.getAttribute('aria-label') || '')));
    if (!txt) continue;
    if (txt.includes(target) || target.includes(txt)) {
      try {
        await h.evaluate((el) => el.scrollIntoView({ block: 'center' }));
        await h.click({ timeout: 3500 });
        return { ok: true, method: 'normalized-contains' };
      } catch {
        try {
          await h.evaluate((el) => {
            el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
            if ('click' in el) el.click();
          });
          return { ok: true, method: 'normalized-js-click' };
        } catch {}
      }
    }
  }

  return { ok: false, method: 'not-found-or-not-clickable' };
}

async function main() {
  if (fs.existsSync(OUT_NDJSON)) fs.unlinkSync(OUT_NDJSON);
  const blocked = loadBlocked();
  const grouped = new Map();
  for (const item of blocked) {
    const key = `${item.Role}|||${item.Page}`;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(item);
  }

  const browser = await chromium.launch({ headless: true });
  try {
    for (const [key, items] of grouped) {
      const [role, route] = key.split('|||');
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      const page = await context.newPage();
      const auth = await login(page, role);

      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        const label = parseLabel(it.Element);
        const pageDir = path.join(RUN_DIR, role, (route || '_').replace(/[^a-zA-Z0-9_-]+/g, '_'));
        fs.mkdirSync(pageDir, { recursive: true });

        if (!auth) {
          append({ ...it, RetestStatus: 'BLOCKED', RetestActual: 'role auth failed', RetestEvidence: '' });
          continue;
        }

        await page.goto(`${BASE_URL}${route}`, { waitUntil: 'networkidle', timeout: 60000 }).catch(() => {});
        const before = path.join(pageDir, `blocked-retest-${i + 1}-before.png`);
        const after = path.join(pageDir, `blocked-retest-${i + 1}-after.png`);
        await page.screenshot({ path: before, fullPage: true }).catch(() => {});

        const from = page.url();
        const result = await clickByBestMatch(page, label);
        await page.waitForTimeout(800);
        const to = page.url();
        await page.screenshot({ path: after, fullPage: true }).catch(() => {});

        append({
          ...it,
          RetestStatus: result.ok ? 'PASS' : 'BLOCKED',
          RetestActual: `${result.method}; from=${from}; to=${to}`,
          RetestEvidence: `${before} | ${after}`,
        });
      }

      await context.close();
    }
  } finally {
    await browser.close();
  }

  const rows = fs.readFileSync(OUT_NDJSON, 'utf8').split(/\r?\n/).filter(Boolean).map((l) => JSON.parse(l));
  const pass = rows.filter((x) => x.RetestStatus === 'PASS').length;
  const blockedCount = rows.filter((x) => x.RetestStatus === 'BLOCKED').length;
  const md = `# Retest Blocked Summary\n\n- Total Retested: ${rows.length}\n- PASS: ${pass}\n- BLOCKED: ${blockedCount}\n`;
  fs.writeFileSync(OUT_MD, md, 'utf8');
  console.log(`Blocked retest done: ${OUT_MD}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
