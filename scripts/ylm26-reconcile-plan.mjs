import { readFile, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';

const API_BASE_URL = String(process.env.SMOKE_API_BASE_URL || process.env.SMOKE_API_URL || 'https://almeaacodax.vercel.app/api').replace(/\/$/, '');
const manifestPath = process.env.YLM26_MANIFEST || '/tmp/ylm26/YLM26_CROP_MANIFEST_V2.json';
const r2MapPath = process.env.YLM26_R2_MAP || '/tmp/ylm26-r2-map.json';
const outputPath = process.env.YLM26_RECONCILE_PLAN || '/tmp/ylm26-reconcile-plan.json';

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
if (!adminToken) throw new Error('No production admin auth available for YLM26 reconciliation plan.');

async function apiGet(route) {
  const res = await fetch(`${API_BASE_URL}${route}`, {
    headers: { Authorization: `Bearer ${adminToken}`, Accept: 'application/json' },
    signal: AbortSignal.timeout(30_000),
  });
  const txt = await res.text();
  let data = null;
  try { data = txt ? JSON.parse(txt) : null; } catch { data = { raw: txt.slice(0, 500) }; }
  if (!res.ok) throw new Error(`HTTP ${res.status} ${route}: ${JSON.stringify(data)}`);
  return data;
}

const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
const items = Array.isArray(manifest?.items) ? manifest.items : [];
if (items.length !== 326) throw new Error(`Expected 326 manifest items, got ${items.length}`);

const r2 = JSON.parse(await readFile(r2MapPath, 'utf8'));
if (r2?.uploaded !== 326 || r2?.publicHashVerified !== 326 || !Array.isArray(r2?.items) || r2.items.length !== 326) {
  throw new Error('R2 map gate failed before reconciliation planning.');
}

const stableCode = (item) => `TAH-MATH-YLM26-P${String(Number(item.printedPageNumber)).padStart(3, '0')}-Q${String(Number(item.printedQuestionNumber)).padStart(2, '0')}`;
const manifestBySource = new Map(items.map(item => [String(item.sourceItemId), { ...item, stableQuestionCode: stableCode(item) }]));
const r2BySource = new Map(r2.items.map(item => [String(item.sourceItemId), item]));
if (manifestBySource.size !== 326 || r2BySource.size !== 326) throw new Error('Source identity uniqueness gate failed.');

for (const [sourceItemId, item] of manifestBySource) {
  const remote = r2BySource.get(sourceItemId);
  if (!remote) throw new Error(`Missing R2 mapping for ${sourceItemId}`);
  if (remote.questionCode !== item.stableQuestionCode) throw new Error(`R2 stable code mismatch ${sourceItemId}: ${remote.questionCode} != ${item.stableQuestionCode}`);
  if (remote.imageHash !== item.imageHash || !remote.verified) throw new Error(`R2 hash verification mismatch ${sourceItemId}`);
}

const questions = [];
for (let page = 1; page <= 20; page += 1) {
  const response = await apiGet(`/quizzes/questions?search=YLM26&paginate=true&limit=100&page=${page}`);
  const rows = Array.isArray(response?.data) ? response.data : [];
  questions.push(...rows);
  const totalPages = Number(response?.pagination?.totalPages || 1);
  if (page >= totalPages) break;
}
const ylm = questions.filter(q => String(q?.questionCode || '').toUpperCase().includes('YLM26'));
const currentBySource = new Map();
const duplicateSourceItemIds = [];
for (const q of ylm) {
  const sid = String(q?.sourceMeta?.sourceItemId || '').trim();
  if (!sid) continue;
  if (currentBySource.has(sid)) duplicateSourceItemIds.push(sid);
  else currentBySource.set(sid, q);
}

const matched = [];
const missing = [];
for (const [sourceItemId, item] of manifestBySource) {
  const q = currentBySource.get(sourceItemId);
  const remote = r2BySource.get(sourceItemId);
  if (!q) {
    missing.push({
      sourceItemId,
      questionCode: item.stableQuestionCode,
      pdfPageIndex: item.pdfPageIndex,
      printedPageNumber: item.printedPageNumber,
      printedQuestionNumber: item.printedQuestionNumber,
      imageHash: item.imageHash,
      imageVersion: item.imageVersion,
      imageUrl: remote.imageUrl,
      cropBoxPdf: item.cropBoxPdf,
    });
    continue;
  }
  matched.push({
    id: String(q.id || q._id || ''),
    sourceItemId,
    questionCode: String(q.questionCode || ''),
    stableQuestionCode: item.stableQuestionCode,
    codeMatchesStable: String(q.questionCode || '') === item.stableQuestionCode,
    oldImageUrl: String(q.imageUrl || ''),
    oldImageHash: String(q?.sourceMeta?.imageHash || ''),
    newImageUrl: remote.imageUrl,
    newImageHash: remote.imageHash,
    newImageVersion: remote.imageVersion,
    approvalStatus: q.approvalStatus || '',
  });
}

const manifestSources = new Set(manifestBySource.keys());
const orphans = ylm
  .filter(q => {
    const sid = String(q?.sourceMeta?.sourceItemId || '').trim();
    return !sid || !manifestSources.has(sid);
  })
  .map(q => ({
    id: String(q.id || q._id || ''),
    questionCode: String(q.questionCode || ''),
    sourceItemId: String(q?.sourceMeta?.sourceItemId || ''),
    approvalStatus: q.approvalStatus || '',
  }));

const codeMismatches = matched.filter(x => !x.codeMatchesStable);
const report = {
  generatedAt: new Date().toISOString(),
  apiBase: API_BASE_URL,
  manifestCount: items.length,
  r2VerifiedCount: r2.items.length,
  currentYlmCount: ylm.length,
  currentWithSourceIdentity: currentBySource.size,
  matchedCount: matched.length,
  missingCount: missing.length,
  orphanCount: orphans.length,
  duplicateSourceItemIdCount: duplicateSourceItemIds.length,
  codeMismatchCount: codeMismatches.length,
  missing,
  orphans,
  duplicateSourceItemIds,
  codeMismatches,
  matched,
};
await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({
  status: missing.length === 34 && matched.length === 292 && orphans.length === 0 && duplicateSourceItemIds.length === 0 ? 'PASS_EXPECTED_BASELINE' : 'REVIEW',
  currentYlmCount: ylm.length,
  matchedCount: matched.length,
  missingCount: missing.length,
  orphanCount: orphans.length,
  duplicateSourceItemIdCount: duplicateSourceItemIds.length,
  codeMismatchCount: codeMismatches.length,
  outputPath,
}, null, 2));
