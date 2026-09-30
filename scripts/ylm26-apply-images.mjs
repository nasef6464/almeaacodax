import { readFile, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';

const API_BASE_URL = String(process.env.SMOKE_API_BASE_URL || process.env.SMOKE_API_URL || 'https://almeaacodax.vercel.app/api').replace(/\/$/, '');
const manifestPath = process.env.YLM26_MANIFEST || '/tmp/ylm26/YLM26_CROP_MANIFEST_V2.json';
const r2MapPath = process.env.YLM26_R2_MAP || '/tmp/ylm26-r2-map.json';
const reportPath = process.env.YLM26_IMAGE_APPLY_REPORT || '/tmp/ylm26-image-apply-report.json';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

let adminToken = '';
const hasLoginCreds = Boolean(String(process.env.SMOKE_ADMIN_EMAIL || '').trim() && String(process.env.SMOKE_ADMIN_PASSWORD || '').trim());
if (hasLoginCreds) {
  const resolved = spawnSync('node', ['scripts/resolve-smoke-admin-token.mjs'], {
    env: { ...process.env, SMOKE_ALLOW_PASSWORD_LOGIN: 'true' },
    encoding: 'utf8',
    shell: process.platform === 'win32',
  });
  if (resolved.status === 0) {
    try { adminToken = String(JSON.parse(String(resolved.stdout || '{}'))?.token || '').trim(); } catch {}
  }
}
if (!adminToken) adminToken = String(process.env.SMOKE_ADMIN_TOKEN || '').trim();
if (!adminToken) throw new Error('No production admin auth available for YLM26 image reconciliation.');

let csrfToken = '';
let csrfCookie = '';

async function parseResponse(res) {
  const txt = await res.text();
  let data = null;
  try { data = txt ? JSON.parse(txt) : null; } catch { data = { raw: txt.slice(0, 1000) }; }
  return data;
}

async function request(method, route, body, attempts = 12) {
  let last = null;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const headers = { Authorization: `Bearer ${adminToken}`, Accept: 'application/json' };
    if (method !== 'GET') {
      headers['Content-Type'] = 'application/json';
      headers['x-csrf-token'] = csrfToken;
      headers.Cookie = `almeaa_csrf_token=${csrfCookie}`;
    }
    try {
      const res = await fetch(`${API_BASE_URL}${route}`, {
        method,
        headers,
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        signal: AbortSignal.timeout(30_000),
      });
      const data = await parseResponse(res);
      if (res.ok) return data;
      last = new Error(`HTTP ${res.status} ${method} ${route}: ${JSON.stringify(data)}`);
      if (![429, 500, 502, 503, 504].includes(res.status)) throw last;
      const retryAfter = Number(res.headers.get('retry-after') || 0);
      const waitMs = retryAfter > 0 ? Math.min(60_000, retryAfter * 1000) : Math.min(30_000, 1200 * attempt);
      console.log(`retry ${method} ${route} HTTP ${res.status} in ${waitMs}ms (${attempt}/${attempts})`);
      await sleep(waitMs);
    } catch (error) {
      last = error;
      if (attempt >= attempts) break;
      await sleep(Math.min(30_000, 1200 * attempt));
    }
  }
  throw last || new Error(`Request failed: ${method} ${route}`);
}

async function bootstrapCsrf() {
  for (let attempt = 1; attempt <= 12; attempt += 1) {
    const res = await fetch(`${API_BASE_URL}/auth/csrf-token`, {
      headers: { Authorization: `Bearer ${adminToken}`, Accept: 'application/json' },
      signal: AbortSignal.timeout(15_000),
    });
    const body = await parseResponse(res);
    const setCookie = String(res.headers.get('set-cookie') || '');
    const m = setCookie.match(/almeaa_csrf_token=([^;]+)/);
    const cookie = String(m?.[1] || '').trim();
    const token = String(body?.csrfToken || cookie).trim();
    if (res.ok && cookie && token) {
      csrfCookie = cookie;
      csrfToken = token;
      return;
    }
    const retryAfter = Number(res.headers.get('retry-after') || 0);
    const waitMs = retryAfter > 0 ? Math.min(60_000, retryAfter * 1000) : Math.min(30_000, 1500 * attempt);
    if (attempt < 12) await sleep(waitMs);
  }
  throw new Error('Unable to bootstrap CSRF for YLM26 image reconciliation.');
}

const canonicalIdentity = (item) => {
  const page = Number(item.printedPageNumber);
  let questionNumber = Number(item.printedQuestionNumber);
  if (page === 88 && questionNumber === 2) questionNumber = 12;
  if (page === 91 && questionNumber === 3) questionNumber = 13;
  const pdfPageIndex = Number(item.pdfPageIndex);
  return {
    printedPageNumber: page,
    printedQuestionNumber: questionNumber,
    questionCode: `TAH-MATH-YLM26-P${String(page).padStart(3, '0')}-Q${String(questionNumber).padStart(2, '0')}`,
    sourceItemId: `YLM26-PDF${String(pdfPageIndex).padStart(3, '0')}-P${String(page).padStart(3, '0')}-N${String(questionNumber).padStart(2, '0')}`,
  };
};

const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
const rawItems = Array.isArray(manifest?.items) ? manifest.items : [];
if (rawItems.length !== 326) throw new Error(`Expected 326 manifest items; got ${rawItems.length}`);
const items = rawItems.map(item => ({ ...item, ...canonicalIdentity(item) }));
if (new Set(items.map(x => x.questionCode)).size !== 326 || new Set(items.map(x => x.sourceItemId)).size !== 326) {
  throw new Error('Canonical identity uniqueness gate failed.');
}

const r2 = JSON.parse(await readFile(r2MapPath, 'utf8'));
if (r2?.uploaded !== 326 || r2?.publicHashVerified !== 326 || !Array.isArray(r2?.items) || r2.items.length !== 326) {
  throw new Error('R2 verification gate failed.');
}
const r2ByCode = new Map(r2.items.map(x => [String(x.questionCode), x]));

const existing = [];
const missing = [];
for (let index = 0; index < items.length; index += 1) {
  const item = items[index];
  const response = await request('GET', `/quizzes/questions?search=${encodeURIComponent(item.questionCode)}&approvalStatus=draft&paginate=true&limit=10&page=1`);
  const rows = Array.isArray(response?.data) ? response.data : Array.isArray(response) ? response : [];
  const exact = rows.filter(q => String(q?.questionCode || '').trim().toUpperCase() === item.questionCode);
  if (exact.length > 1) throw new Error(`Duplicate exact questionCode in API: ${item.questionCode}`);
  if (exact.length === 1) existing.push({ item, row: exact[0] });
  else missing.push(item);
  if ((index + 1) % 25 === 0) console.log(`identity preflight ${index + 1}/326`);
  await sleep(250);
}

if (existing.length !== 289 || missing.length !== 37) {
  await writeFile(reportPath, JSON.stringify({
    status: 'BLOCKED_PRECHECK',
    existingCount: existing.length,
    missingCount: missing.length,
    existingCodes: existing.map(x => x.item.questionCode),
    missingCodes: missing.map(x => x.questionCode),
  }, null, 2));
  throw new Error(`Preflight count gate failed: existing=${existing.length}, missing=${missing.length}; expected 289/37. No writes performed.`);
}

await bootstrapCsrf();

const changed = [];
for (let index = 0; index < existing.length; index += 1) {
  const { item, row } = existing[index];
  const remote = r2ByCode.get(item.questionCode);
  if (!remote || remote.imageHash !== item.imageHash || remote.verified !== true) {
    throw new Error(`R2/manifest mismatch for ${item.questionCode}`);
  }
  const id = String(row?.id || row?._id || '').trim();
  if (!id) throw new Error(`Missing API id for ${item.questionCode}`);
  const payload = {
    imageUrl: remote.imageUrl,
    imageAlt: `صورة السؤال ${item.questionCode} من كتاب تأسيس يلو للرياضيات 2026`,
    optionsEmbeddedInImage: true,
    sourceMeta: {
      documentCode: 'YLM26',
      documentTitle: 'كتاب تأسيس يلو للرياضيات 2026 - تجميعات',
      sourceItemId: item.sourceItemId,
      pdfPageIndex: Number(item.pdfPageIndex),
      printedPageNumber: Number(item.printedPageNumber),
      printedQuestionNumber: Number(item.printedQuestionNumber),
      page: Number(item.printedPageNumber),
      questionNumber: String(item.printedQuestionNumber),
      cropIndex: 0,
      importBatchId: 'TAH-MATH-YLM26-CROP-V2-20260930',
      imageVersion: 2,
      imageHash: remote.imageHash,
    },
  };
  await request('PATCH', `/quizzes/questions/${encodeURIComponent(id)}`, payload);
  changed.push(item.questionCode);
  if ((index + 1) % 25 === 0) console.log(`image apply ${index + 1}/289`);
  await sleep(350);
}

await writeFile(reportPath, JSON.stringify({
  status: 'PASS',
  existingCount: existing.length,
  missingCount: missing.length,
  modifiedCount: changed.length,
  missingCodes: missing.map(x => x.questionCode),
  modifiedCodes: changed,
}, null, 2));
console.log(JSON.stringify({ status:'PASS', modified:changed.length, missing:missing.length, reportPath }, null, 2));
