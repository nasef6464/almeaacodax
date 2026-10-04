import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const API_BASE = String(process.env.COL26OLD_API_BASE || "https://almeaacodax.vercel.app/api").replace(/\/$/, "");
const TOKEN = String(process.env.SMOKE_ADMIN_TOKEN || "").trim();
const PACKAGE_URL = String(process.env.COL26OLD_PACKAGE_URL || "").trim();
const PACKAGE_SHA = String(process.env.COL26OLD_PACKAGE_SHA256 || "").trim().toLowerCase();
const BATCH_ID = "TAH-MATH-COL26OLD-SEC2-V1";
const EXPECTED = 1257;
const PUBLIC_BASE = "https://pub-335cc83968b2426d915cacd8e6dc085d.r2.dev";

if (!TOKEN) throw new Error("SMOKE_ADMIN_TOKEN is required");
if (!PACKAGE_URL || !PACKAGE_URL.startsWith("https://") || !PACKAGE_URL.includes(".oaiusercontent.com/")) {
  throw new Error("A short-lived oaiusercontent package URL is required");
}
if (!/^[a-f0-9]{64}$/.test(PACKAGE_SHA)) throw new Error("Invalid package SHA-256");

const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const chunk = (items, size) =>
  Array.from({ length: Math.ceil(items.length / size) }, (_, i) => items.slice(i * size, (i + 1) * size));

async function pool(items, concurrency, fn) {
  const results = new Array(items.length);
  let cursor = 0;
  async function run() {
    while (true) {
      const i = cursor++;
      if (i >= items.length) return;
      results[i] = await fn(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, Math.max(1, items.length)) }, run));
  return results;
}

function cookieValue(setCookie, name) {
  const m = String(setCookie || "").match(new RegExp(`${name}=([^;]+)`));
  return String(m?.[1] || "").trim();
}

let csrfToken = "";
let csrfCookie = "";

async function refreshCsrf() {
  const res = await fetch(`${API_BASE}/auth/csrf-token`, { headers: { accept: "application/json" } });
  const raw = await res.text();
  let body = null;
  try { body = raw ? JSON.parse(raw) : null; } catch {}
  csrfCookie = cookieValue(res.headers.get("set-cookie") || "", "almeaa_csrf_token");
  csrfToken = String(body?.csrfToken || csrfCookie).trim();
  if (!res.ok || !csrfCookie || !csrfToken) throw new Error(`CSRF bootstrap failed HTTP ${res.status}`);
}

async function api(method, route, body, { allow404 = false, attempts = 4 } = {}) {
  const upper = method.toUpperCase();
  const write = !["GET", "HEAD", "OPTIONS"].includes(upper);
  if (write && (!csrfToken || !csrfCookie)) await refreshCsrf();

  let last = null;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const headers = {
      accept: "application/json",
      authorization: `Bearer ${TOKEN}`,
    };
    if (body !== undefined) headers["content-type"] = "application/json";
    if (write) {
      headers["x-csrf-token"] = csrfToken;
      headers.cookie = `almeaa_csrf_token=${csrfCookie}`;
    }
    try {
      const res = await fetch(`${API_BASE}${route}`, {
        method: upper,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(90_000),
      });
      const raw = await res.text();
      let payload = null;
      try { payload = raw ? JSON.parse(raw) : null; } catch { payload = { raw: raw.slice(0, 500) }; }

      if (allow404 && res.status === 404) return null;
      if (res.status === 403 && write && attempt < attempts) {
        await refreshCsrf();
        await sleep(500 * attempt);
        continue;
      }
      if ((res.status === 429 || res.status >= 500) && attempt < attempts) {
        await sleep(1000 * attempt);
        continue;
      }
      if (!res.ok) {
        throw new Error(`${upper} ${route} HTTP ${res.status}: ${JSON.stringify(payload).slice(0, 1200)}`);
      }
      return payload;
    } catch (error) {
      last = error;
      if (attempt >= attempts) throw error;
      await sleep(1000 * attempt);
    }
  }
  throw last || new Error("API request failed");
}

async function uploadWithRetry(uploadUrl, headers, bytes) {
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    try {
      const res = await fetch(uploadUrl, {
        method: "PUT",
        headers: headers || {},
        body: Uint8Array.from(bytes),
        signal: AbortSignal.timeout(60_000),
      });
      if (res.ok) return;
      if (attempt === 4) throw new Error(`R2 PUT HTTP ${res.status}`);
    } catch (error) {
      if (attempt === 4) throw error;
    }
    await sleep(750 * attempt);
  }
}

const work = await mkdtemp(path.join(tmpdir(), "col26old-action-"));
try {
  const zipPath = path.join(work, "package.zip");
  const res = await fetch(PACKAGE_URL, { signal: AbortSignal.timeout(120_000) });
  if (!res.ok) throw new Error(`Package download HTTP ${res.status}`);
  const zipBytes = Buffer.from(await res.arrayBuffer());
  const actualPackageSha = sha256(zipBytes);
  if (actualPackageSha !== PACKAGE_SHA) {
    throw new Error(`Package SHA mismatch expected=${PACKAGE_SHA} actual=${actualPackageSha}`);
  }
  await writeFile(zipPath, zipBytes);
  console.log(`COL26OLD_PACKAGE_PASS bytes=${zipBytes.length} sha256=${actualPackageSha}`);

  const payloadDir = path.join(work, "payload");
  await execFileAsync("unzip", ["-oq", zipPath, "-d", payloadDir], { timeout: 120_000 });

  const manifestRaw = await readFile(path.join(payloadDir, "COL26OLD_IMPORT_MANIFEST_READY.json"), "utf8");
  const parsed = JSON.parse(manifestRaw);
  const items = Array.isArray(parsed) ? parsed : parsed.items;
  if (!Array.isArray(items) || items.length !== EXPECTED) {
    throw new Error(`Manifest count mismatch: ${Array.isArray(items) ? items.length : "invalid"}`);
  }

  const verified = [];
  const codes = new Set(), sourceIds = new Set(), hashes = new Set();
  for (const item of items) {
    const code = String(item.questionCode || "").trim().toUpperCase();
    const sourceMeta = item.sourceMeta || {};
    const sourceItemId = String(sourceMeta.sourceItemId || "").trim().toUpperCase();
    const expectedHash = String(sourceMeta.imageHash || "").trim().toLowerCase();
    const imageName = path.basename(String(item.imageFileName || ""));
    if (!code.startsWith("TAH-MATH-COL26OLD-")) throw new Error(`Bad code ${code}`);
    if (String(sourceMeta.documentCode || "").toUpperCase() !== "COL26OLD") throw new Error(`Bad documentCode ${code}`);
    if (!sourceItemId.startsWith("COL26OLD-PDF")) throw new Error(`Bad sourceItemId ${code}`);
    if (!/\.webp$/i.test(imageName)) throw new Error(`Bad image file ${code}`);
    const bytes = await readFile(path.join(payloadDir, "images", imageName));
    const actual = sha256(bytes);
    if (actual !== expectedHash) throw new Error(`Image hash mismatch ${code}`);
    if (codes.has(code) || sourceIds.has(sourceItemId) || hashes.has(actual)) throw new Error(`Duplicate identity ${code}`);
    codes.add(code); sourceIds.add(sourceItemId); hashes.add(actual);
    verified.push({ item, code, sourceItemId, hash: actual, bytes });
  }
  console.log(`COL26OLD_LOCAL_GATE_PASS items=${verified.length} uniqueCodes=${codes.size} uniqueHashes=${hashes.size}`);

  const auditRoute = `/quizzes/questions/import-batch/${encodeURIComponent(BATCH_ID)}`;
  const existingAudit = await api("GET", auditRoute, undefined, { allow404: true });
  const existingQuestions = Array.isArray(existingAudit?.questions) ? existingAudit.questions : [];
  if (existingQuestions.some((q) => q.approvalStatus !== "draft")) {
    throw new Error("Existing COL26OLD batch contains non-draft records");
  }
  const existingCodes = new Set(existingQuestions.map((q) => String(q.questionCode || "").toUpperCase()));
  const unknown = [...existingCodes].filter((code) => !codes.has(code));
  if (unknown.length) throw new Error(`Unexpected existing codes: ${unknown.slice(0, 5).join(",")}`);
  const pending = verified.filter((x) => !existingCodes.has(x.code));
  if (existingCodes.size + pending.length !== EXPECTED) throw new Error("Resume accounting mismatch");

  const payloadFor = (x, imageUrl) => {
    const { imageFileName: _imageFileName, sha256: _legacy, ...base } = x.item;
    return {
      ...base,
      questionCode: x.code,
      imageUrl,
      sourceMeta: {
        ...(base.sourceMeta || {}),
        documentCode: "COL26OLD",
        sourceItemId: x.sourceItemId,
        imageHash: x.hash,
        importBatchId: BATCH_ID,
      },
    };
  };

  let dryPrepared = 0;
  for (const group of chunk(pending, 100)) {
    const dryItems = group.map((x) => payloadFor(
      x,
      `${PUBLIC_BASE}/questions/v2/${x.code}/${x.hash}.webp`,
    ));
    const result = await api("POST", "/quizzes/questions/import-batch", {
      batchId: BATCH_ID,
      dryRun: true,
      items: dryItems,
    });
    if (result?.status !== "PASS" || Number(result?.prepared || 0) !== group.length) {
      throw new Error(`Dry-run failed: ${JSON.stringify(result).slice(0, 1000)}`);
    }
    dryPrepared += group.length;
  }
  console.log(`COL26OLD_DRY_RUN_PASS pending=${pending.length} prepared=${dryPrepared}`);

  async function writeGroup(group) {
    const prepared = await pool(group, 8, async (x) => {
      const intent = await api("POST", "/media/question-import-images/presign", {
        questionCode: x.code,
        imageHash: x.hash,
        sizeBytes: x.bytes.length,
      });
      const publicUrl = `${PUBLIC_BASE}/questions/v2/${x.code}/${x.hash}.webp`;
      if (String(intent?.publicUrl || "") !== publicUrl) {
        throw new Error(`Presign publicUrl mismatch ${x.code}`);
      }
      return { x, intent, payload: payloadFor(x, publicUrl) };
    });
    await pool(prepared, 8, async ({ x, intent }) =>
      uploadWithRetry(intent.uploadUrl, intent.headers || {}, x.bytes),
    );
    const result = await api("POST", "/quizzes/questions/import-batch", {
      batchId: BATCH_ID,
      dryRun: false,
      items: prepared.map((x) => x.payload),
    });
    if (result?.status !== "IMPORTED" || Number(result?.inserted || 0) !== group.length) {
      throw new Error(`Import chunk failed: ${JSON.stringify(result).slice(0, 1000)}`);
    }
    return group.length;
  }

  if (existingCodes.size < 5) {
    const canary = pending.slice(0, 5 - existingCodes.size);
    await writeGroup(canary);
    const canaryAudit = await api("GET", auditRoute);
    if (
      Number(canaryAudit?.count || 0) !== 5 ||
      Number(canaryAudit?.drafts || 0) !== 5 ||
      canaryAudit?.allDraft !== true ||
      Number(canaryAudit?.linkedQuizCount || 0) !== 0 ||
      (canaryAudit?.integrityIssues || []).length !== 0
    ) {
      throw new Error(`Canary gate failed: ${JSON.stringify({
        count: canaryAudit?.count,
        drafts: canaryAudit?.drafts,
        linkedQuizCount: canaryAudit?.linkedQuizCount,
        issues: canaryAudit?.integrityIssues?.length,
      })}`);
    }
    console.log("COL26OLD_CANARY_PASS count=5 drafts=5 linked=0 issues=0");
  }

  const afterCanary = await api("GET", auditRoute);
  const written = new Set((afterCanary.questions || []).map((q) => String(q.questionCode || "").toUpperCase()));
  const remaining = verified.filter((x) => !written.has(x.code));
  let done = written.size;
  for (const group of chunk(remaining, 100)) {
    await writeGroup(group);
    done += group.length;
    console.log(`COL26OLD_IMPORT_PROGRESS ${done}/${EXPECTED}`);
  }

  const finalAudit = await api("GET", auditRoute);
  if (
    finalAudit?.status !== "PASS" ||
    Number(finalAudit?.count || 0) !== EXPECTED ||
    Number(finalAudit?.drafts || 0) !== EXPECTED ||
    finalAudit?.allDraft !== true ||
    Number(finalAudit?.linkedQuizCount || 0) !== 0 ||
    (finalAudit?.integrityIssues || []).length !== 0
  ) {
    throw new Error(`Final audit failed: ${JSON.stringify({
      status: finalAudit?.status,
      count: finalAudit?.count,
      drafts: finalAudit?.drafts,
      linkedQuizCount: finalAudit?.linkedQuizCount,
      issues: finalAudit?.integrityIssues?.length,
    })}`);
  }

  const qByCode = new Map((finalAudit.questions || []).map((q) => [q.questionCode, q]));
  const samples = [];
  for (let i = 0; i < 30; i += 1) {
    samples.push(verified[Math.floor((i * (verified.length - 1)) / 29)]);
  }
  for (const x of samples) {
    const q = qByCode.get(x.code);
    const imageUrl = String(q?.imageUrl || "");
    if (!imageUrl) throw new Error(`Missing final imageUrl ${x.code}`);
    const imageRes = await fetch(imageUrl, { signal: AbortSignal.timeout(30_000) });
    if (!imageRes.ok) throw new Error(`Final image GET ${x.code} HTTP ${imageRes.status}`);
    const actual = sha256(Buffer.from(await imageRes.arrayBuffer()));
    if (actual !== x.hash) throw new Error(`Final image hash mismatch ${x.code}`);
  }
  console.log(`COL26OLD_IMPORT_PASS count=${EXPECTED} drafts=${EXPECTED} liveImageSamples=30`);
} finally {
  await rm(work, { recursive: true, force: true }).catch(() => {});
}
