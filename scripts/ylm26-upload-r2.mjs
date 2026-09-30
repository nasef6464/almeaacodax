import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const API_BASE_URL = String(process.env.SMOKE_API_BASE_URL || process.env.SMOKE_API_URL || 'https://almeaacodax.vercel.app/api').replace(/\/$/, '');
const manifestPath = process.env.YLM26_MANIFEST || '/tmp/ylm26/YLM26_CROP_MANIFEST_V2.json';
const imageDir = process.env.YLM26_IMAGE_DIR || '/tmp/ylm26/crops_v2';
const outputPath = process.env.YLM26_R2_MAP || '/tmp/ylm26-r2-map.json';
const concurrency = Math.max(1, Math.min(6, Number(process.env.YLM26_UPLOAD_CONCURRENCY || 4)));

const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
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
if (!adminToken) throw new Error('No production admin auth available for YLM26 R2 upload.');

let csrfToken = '';
let csrfCookie = '';
async function ensureCsrf() {
  if (csrfToken && csrfCookie) return;
  const res = await fetch(`${API_BASE_URL}/auth/csrf-token`, {
    headers: { Authorization: `Bearer ${adminToken}`, Accept: 'application/json' },
    signal: AbortSignal.timeout(15_000),
  });
  const txt = await res.text();
  let body = {};
  try { body = JSON.parse(txt); } catch {}
  const setCookie = String(res.headers.get('set-cookie') || '');
  const m = setCookie.match(/almeaa_csrf_token=([^;]+)/);
  csrfCookie = String(m?.[1] || '').trim();
  csrfToken = String(body?.csrfToken || csrfCookie).trim();
  if (!res.ok || !csrfToken || !csrfCookie) throw new Error(`CSRF bootstrap failed HTTP ${res.status}`);
}

async function apiPost(route, body) {
  await ensureCsrf();
  const res = await fetch(`${API_BASE_URL}${route}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${adminToken}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'x-csrf-token': csrfToken,
      Cookie: `almeaa_csrf_token=${csrfCookie}`,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30_000),
  });
  const txt = await res.text();
  let data = null;
  try { data = txt ? JSON.parse(txt) : null; } catch { data = { raw: txt.slice(0, 500) }; }
  if (!res.ok) throw new Error(`HTTP ${res.status} ${route}: ${JSON.stringify(data)}`);
  return data;
}

async function withRetry(label, fn, attempts = 4) {
  let last;
  for (let i = 1; i <= attempts; i += 1) {
    try { return await fn(i); } catch (e) { last = e; if (i < attempts) await sleep(700 * i); }
  }
  throw new Error(`${label} failed after ${attempts} attempts: ${String(last?.message || last)}`);
}

const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
const items = Array.isArray(manifest?.items) ? manifest.items : [];
if (items.length !== 326 || Number(manifest?.count) !== 326 || Number(manifest?.errors) !== 0) {
  throw new Error(`Manifest gate failed: count=${items.length}, declared=${manifest?.count}, errors=${manifest?.errors}`);
}
if (new Set(items.map(x => x.questionCode)).size !== 326 || new Set(items.map(x => x.sourceItemId)).size !== 326) {
  throw new Error('Manifest identity uniqueness gate failed.');
}

const prepared = [];
for (const item of items) {
  const filePath = path.join(imageDir, item.imageFileName);
  const bytes = await readFile(filePath);
  const actual = sha256(bytes);
  if (actual !== item.imageHash) throw new Error(`Local image hash mismatch ${item.questionCode}`);
  if (!/\.webp$/i.test(item.imageFileName)) throw new Error(`Not WebP ${item.questionCode}`);
  prepared.push({ item, bytes, actual });
}

const result = new Array(prepared.length);
let cursor = 0;
async function worker() {
  while (true) {
    const idx = cursor++;
    if (idx >= prepared.length) return;
    const { item, bytes, actual } = prepared[idx];
    const intent = await withRetry(`presign ${item.questionCode}`, () => apiPost('/media/question-import-images/presign', {
      questionCode: item.questionCode,
      imageHash: actual,
      sizeBytes: bytes.length,
    }));
    if (!intent?.uploadUrl || !intent?.publicUrl || !intent?.key) throw new Error(`Incomplete presign intent ${item.questionCode}`);

    await withRetry(`PUT ${item.questionCode}`, async () => {
      const put = await fetch(intent.uploadUrl, {
        method: 'PUT',
        headers: { ...(intent.headers || {}), 'Content-Type': 'image/webp' },
        body: bytes,
        signal: AbortSignal.timeout(60_000),
      });
      if (!put.ok) throw new Error(`HTTP ${put.status}`);
    });

    await withRetry(`GET/hash ${item.questionCode}`, async (attempt) => {
      const get = await fetch(`${intent.publicUrl}?ylm26v2=${Date.now()}-${attempt}`, {
        headers: { 'cache-control': 'no-cache' },
        signal: AbortSignal.timeout(30_000),
      });
      if (!get.ok) throw new Error(`HTTP ${get.status}`);
      const remote = Buffer.from(await get.arrayBuffer());
      const remoteHash = sha256(remote);
      if (remoteHash !== actual) throw new Error(`hash ${remoteHash} != ${actual}`);
    }, 5);

    result[idx] = {
      questionCode: item.questionCode,
      sourceItemId: item.sourceItemId,
      pdfPageIndex: item.pdfPageIndex,
      printedPageNumber: item.printedPageNumber,
      printedQuestionNumber: item.printedQuestionNumber,
      imageHash: actual,
      imageVersion: item.imageVersion,
      imageUrl: intent.publicUrl,
      key: intent.key,
      sizeBytes: bytes.length,
      verified: true,
    };
    if ((idx + 1) % 25 === 0 || idx + 1 === prepared.length) console.log(`YLM26 R2 verified ${idx + 1}/${prepared.length}`);
  }
}
await Promise.all(Array.from({ length: concurrency }, () => worker()));

const verified = result.filter(x => x?.verified).length;
if (verified !== 326) throw new Error(`R2 gate failed: verified ${verified}/326`);
const out = {
  generatedAt: new Date().toISOString(),
  apiBase: API_BASE_URL,
  sourceCount: 326,
  uploaded: 326,
  publicHashVerified: 326,
  failures: 0,
  items: result,
};
await writeFile(outputPath, `${JSON.stringify(out, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ status: 'PASS', uploaded: 326, publicHashVerified: 326, outputPath }, null, 2));