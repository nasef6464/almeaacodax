import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const BASE_URL = 'https://almeaacodax.vercel.app';
const RUN_DIR = path.resolve('audit-artifacts', 'ui-audit-exhaustive', '2026-05-26-full-audit');
const SOURCE = path.join(RUN_DIR, 'ui-audit-retest.ndjson');
const OUT = path.join(RUN_DIR, 'ui-audit-retest-fail22-focused.ndjson');
const OUT_SUMMARY = path.join(RUN_DIR, 'RETEST_FAIL22_FOCUSED_SUMMARY.md');

const roleCreds = {
  student: [{ email: 'student.a@almeaa.local', password: 'Student@123' }, { email: 'student@example.com', password: 'Student@123' }],
  teacher: [{ email: 'teacher.quant@almeaa.local', password: 'Teacher@123' }, { email: 'teacher@example.com', password: 'Teacher@123' }],
  supervisor: [{ email: 'supervisor.group@almeaa.local', password: 'Supervisor@123' }, { email: 'supervisor@example.com', password: 'Supervisor@123' }],
  parent: [{ email: 'parent.a@almeaa.local', password: 'Parent@123' }, { email: 'parent@example.com', password: 'Parent@123' }],
  admin: [{ email: 'nasef64@gmail.com', password: 'Nn@0120110367' }],
  guest: [],
};

const normalize = (s) => String(s || '').replace(/\s+/g, '').replace(/[^\p{L}\p{N}]/gu, '').toLowerCase();
const parseLabel = (element) => {
  const i = String(element || '').indexOf(':');
  return i >= 0 ? String(element).slice(i + 1).trim() : String(element || '').trim();
};

const loadFails = () => {
  const rows = fs.readFileSync(SOURCE, 'utf8').split(/\r?\n/).filter(Boolean).map((l) => JSON.parse(l));
  return rows.filter((r) => String(r.RetestStatus || '').toUpperCase() === 'FAIL');
};

async function login(page, role) {
  if (role === 'guest') return true;
  const creds = roleCreds[role] || [];
  for (const cred of creds) {
    for (const url of [`${BASE_URL}/login`, `${BASE_URL}/?auth=login`]) {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 }).catch(() => {});
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

async function clickBest(page, label) {
  const strict = [
    page.getByRole('button', { name: label }).first(),
    page.getByRole('link', { name: label }).first(),
    page.locator('button,a,[role="button"],input[type="button"],input[type="submit"]').filter({ hasText: label }).first(),
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

  const target = normalize(label);
  const hs = await page.locator('button,a,[role="button"],input[type="button"],input[type="submit"]').elementHandles();
  for (const h of hs) {
    const txt = normalize(await h.evaluate((el) => (el.innerText || el.textContent || el.getAttribute('aria-label') || '')));
    if (!txt) continue;
    if (txt.includes(target) || target.includes(txt)) {
      try {
        await h.evaluate((el) => el.scrollIntoView({ block: 'center' }));
        await h.click({ timeout: 3500 });
        return { ok: true, method: 'normalized' };
      } catch {}
    }
  }
  return { ok: false, method: 'not-found-or-not-clickable' };
}

function append(obj) {
  fs.appendFileSync(OUT, `${JSON.stringify(obj)}\n`, 'utf8');
}

async function main() {
  if (fs.existsSync(OUT)) fs.unlinkSync(OUT);
  const fails = loadFails();
  const groups = new Map();
  for (const f of fails) {
    const k = `${f.Role}|||${f.Page}`;
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(f);
  }

  const browser = await chromium.launch({ headless: true });
  try {
    for (const [k, items] of groups) {
      const [role, route] = k.split('|||');
      const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      const page = await ctx.newPage();
      const ok = await login(page, role);

      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        const dir = path.join(RUN_DIR, role, (route || '_').replace(/[^a-zA-Z0-9_-]+/g, '_'));
        fs.mkdirSync(dir, { recursive: true });
        const before = path.join(dir, `focused-retest-${i + 1}-before.png`);
        const after = path.join(dir, `focused-retest-${i + 1}-after.png`);

        if (!ok) {
          append({ ...it, FocusedRetestStatus: 'FAIL', FocusedRetestActual: 'role auth failed', FocusedRetestEvidence: '' });
          continue;
        }

        await page.goto(`${BASE_URL}${route}`, { waitUntil: 'networkidle', timeout: 60000 }).catch(() => {});
        await page.screenshot({ path: before, fullPage: true }).catch(() => {});
        const from = page.url();
        const result = await clickBest(page, parseLabel(it.Element));
        await page.waitForTimeout(700);
        const to = page.url();
        await page.screenshot({ path: after, fullPage: true }).catch(() => {});
        append({
          ...it,
          FocusedRetestStatus: result.ok ? 'PASS' : 'FAIL',
          FocusedRetestActual: `${result.method}; from=${from}; to=${to}`,
          FocusedRetestEvidence: `${before} | ${after}`,
        });
      }
      await ctx.close();
    }
  } finally {
    await browser.close();
  }

  const rows = fs.readFileSync(OUT, 'utf8').split(/\r?\n/).filter(Boolean).map((l) => JSON.parse(l));
  const pass = rows.filter((r) => r.FocusedRetestStatus === 'PASS').length;
  const fail = rows.filter((r) => r.FocusedRetestStatus === 'FAIL').length;
  fs.writeFileSync(OUT_SUMMARY, `# Retest Fail22 Focused Summary\n\n- Total Retested: ${rows.length}\n- PASS: ${pass}\n- FAIL: ${fail}\n`, 'utf8');
  console.log(`Focused retest done: ${OUT_SUMMARY}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

