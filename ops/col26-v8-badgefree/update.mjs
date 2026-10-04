import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const API = String(process.env.PILOT_API_BASE || "https://almeaacodax.vercel.app/api").replace(/\/$/, "");
const ADMIN_EMAIL = String(process.env.SMOKE_ADMIN_EMAIL || process.env.ROLE_ADMIN_EMAIL || "").trim();
const ADMIN_PASSWORD = String(process.env.SMOKE_ADMIN_PASSWORD || process.env.ROLE_ADMIN_PASSWORD || "").trim();
const IMAGE_DIR = String(process.env.COL26_V8_IMAGE_DIR || "/tmp/cv8-v8/images");
const V7_BATCH = "TAH-MATH-COL26-SEC1-V7";
const V8_BATCH = "TAH-MATH-COL26-SEC1-V8";
const EXPECTED = 1012;
const CONCURRENCY = 4;

let token = String(process.env.SMOKE_ADMIN_TOKEN || "").trim();
let csrf = "";
let csrfCookie = "";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const sha256 = (buffer) => crypto.createHash("sha256").update(buffer).digest("hex");

async function refreshCsrf() {
  const response = await fetch(API + "/auth/csrf-token", { headers: { accept: "application/json" } });
  if (!response.ok) throw new Error("csrf HTTP " + response.status);
  const body = await response.json();
  csrf = String(body?.csrfToken || "").trim();
  const setCookie = response.headers.get("set-cookie") || "";
  const match = setCookie.match(/almeaa_csrf_token=([^;]+)/);
  csrfCookie = match ? "almeaa_csrf_token=" + match[1] : setCookie.split(";")[0];
  if (!csrf || !csrfCookie) throw new Error("missing csrf context");
}

async function login() {
  await refreshCsrf();
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) throw new Error("No admin refresh credentials available");
  const response = await fetch(API + "/auth/login", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-csrf-token": csrf,
      cookie: csrfCookie,
    },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  });
  const raw = await response.text();
  if (!response.ok) throw new Error("login HTTP " + response.status + " " + raw.slice(0, 160));
  let body = {};
  try { body = JSON.parse(raw); } catch {}
  const setCookie = response.headers.get("set-cookie") || "";
  const match = setCookie.match(/almeaa_access_token=([^;]+)/);
  token = String(body?.token || match?.[1] || "").trim();
  if (!token) throw new Error("login succeeded without reusable admin token");
}

async function ensureAuth() {
  if (token) {
    const probe = await fetch(API + "/auth/me", { headers: { authorization: "Bearer " + token } });
    if (probe.ok) {
      await refreshCsrf();
      return;
    }
  }
  await login();
}

async function request(method, apiPath, body = undefined, attempt = 1) {
  if (!csrf || !csrfCookie) await refreshCsrf();
  const headers = {
    accept: "application/json",
    authorization: "Bearer " + token,
    ...(body !== undefined ? { "content-type": "application/json" } : {}),
    ...(!["GET", "HEAD", "OPTIONS"].includes(method) ? { "x-csrf-token": csrf, cookie: csrfCookie } : {}),
  };
  let response;
  try {
    response = await fetch(API + apiPath, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(60000),
    });
  } catch (error) {
    if (attempt < 3) {
      await sleep(attempt * 1500);
      return request(method, apiPath, body, attempt + 1);
    }
    throw error;
  }
  const raw = await response.text();
  let payload = null;
  try { payload = raw ? JSON.parse(raw) : null; } catch { payload = { raw: raw.slice(0, 500) }; }
  if (response.status === 401 && attempt === 1 && ADMIN_EMAIL && ADMIN_PASSWORD) {
    await login();
    return request(method, apiPath, body, attempt + 1);
  }
  if ((response.status === 403 || response.status >= 500) && attempt < 3) {
    await refreshCsrf();
    await sleep(attempt * 1500);
    return request(method, apiPath, body, attempt + 1);
  }
  if (!response.ok) throw new Error(method + " " + apiPath + " HTTP " + response.status + " " + JSON.stringify(payload).slice(0, 500));
  return payload;
}

async function fetchBatch(batchId) {
  return request("GET", "/quizzes/questions/import-batch/" + encodeURIComponent(batchId));
}

function canonicalMap(v7, v8) {
  const byCode = new Map();
  for (const question of [...(v7?.questions || []), ...(v8?.questions || [])]) {
    const code = String(question?.questionCode || "").trim().toUpperCase();
    if (!code) continue;
    const current = byCode.get(code);
    const batch = String(question?.sourceMeta?.importBatchId || "").toUpperCase();
    if (!current || batch === V8_BATCH) byCode.set(code, question);
  }
  return byCode;
}

function buildArtifact(question) {
  const code = String(question.questionCode || "").trim().toUpperCase();
  const imagePath = path.join(IMAGE_DIR, code + ".webp");
  const bytes = fs.readFileSync(imagePath);
  const hash = sha256(bytes);
  if (!/^[a-f0-9]{64}$/.test(hash)) throw new Error("Invalid hash for " + code);
  return { question, code, imagePath, bytes, hash, sizeBytes: bytes.length };
}

function alreadyV8(entry) {
  const q = entry.question;
  const meta = q?.sourceMeta || {};
  return String(meta.importBatchId || "").toUpperCase() === V8_BATCH &&
    Number(meta.imageVersion || 0) === 8 &&
    String(meta.imageHash || "").toLowerCase() === entry.hash &&
    String(q.imageUrl || "").includes("/" + entry.hash + ".webp");
}

async function uploadAndPatch(entry) {
  const intent = await request("POST", "/media/question-import-images/presign", {
    questionCode: entry.code,
    imageHash: entry.hash,
    sizeBytes: entry.sizeBytes,
  });
  let putResponse = null;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      putResponse = await fetch(intent.uploadUrl, {
        method: "PUT",
        headers: intent.headers || {},
        body: entry.bytes,
        signal: AbortSignal.timeout(60000),
      });
      if (putResponse.ok) break;
    } catch {}
    if (attempt < 3) await sleep(attempt * 1200);
  }
  if (!putResponse?.ok) throw new Error("R2 PUT failed for " + entry.code + " HTTP " + (putResponse?.status || "network"));

  const currentMeta = entry.question?.sourceMeta || {};
  const id = String(entry.question?.id || "").trim();
  if (!id) throw new Error("Missing question id for " + entry.code);
  const updated = await request("PATCH", "/quizzes/questions/" + encodeURIComponent(id), {
    imageUrl: intent.publicUrl,
    sourceMeta: {
      ...currentMeta,
      importBatchId: V8_BATCH,
      imageVersion: 8,
      imageHash: entry.hash,
    },
  });
  const updatedHash = String(updated?.sourceMeta?.imageHash || "").toLowerCase();
  const updatedBatch = String(updated?.sourceMeta?.importBatchId || "").toUpperCase();
  if (updatedHash !== entry.hash || updatedBatch !== V8_BATCH || String(updated?.imageUrl || "") !== String(intent.publicUrl || "")) {
    throw new Error("PATCH verification failed for " + entry.code);
  }
  return { questionCode: entry.code, id, hash: entry.hash, imageUrl: intent.publicUrl };
}

async function pool(items, worker, concurrency) {
  const results = new Array(items.length);
  let cursor = 0;
  let completed = 0;
  async function runner() {
    while (true) {
      const index = cursor++;
      if (index >= items.length) return;
      results[index] = await worker(items[index]);
      completed += 1;
      if (completed % 25 === 0 || completed === items.length) {
        console.log("COL26_V8_UPDATE_PROGRESS " + completed + "/" + items.length);
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length || 1) }, () => runner()));
  return results;
}

async function verifyLiveSamples(batch) {
  const questions = batch?.questions || [];
  const picks = new Set();
  if (questions.length) {
    for (let i = 0; i < 30; i += 1) picks.add(Math.floor(i * (questions.length - 1) / 29));
    picks.add(0); picks.add(questions.length - 1);
  }
  let verified = 0;
  for (const index of [...picks].sort((a,b) => a-b)) {
    const q = questions[index];
    if (!q?.imageUrl) throw new Error("Missing imageUrl in live sample " + index);
    const response = await fetch(q.imageUrl, { signal: AbortSignal.timeout(30000) });
    if (!response.ok) throw new Error("Live image GET failed " + q.questionCode + " HTTP " + response.status);
    const bytes = Buffer.from(await response.arrayBuffer());
    const hash = sha256(bytes);
    if (hash !== String(q?.sourceMeta?.imageHash || "").toLowerCase()) throw new Error("Live image hash mismatch " + q.questionCode);
    verified += 1;
  }
  return verified;
}

await ensureAuth();
const beforeV7 = await fetchBatch(V7_BATCH);
const beforeV8 = await fetchBatch(V8_BATCH);
if (Number(beforeV7?.linkedQuizCount || 0) !== 0 || Number(beforeV8?.linkedQuizCount || 0) !== 0) {
  throw new Error("COL26 update blocked: batch is linked to a quiz");
}
const byCode = canonicalMap(beforeV7, beforeV8);
if (byCode.size !== EXPECTED) throw new Error("Expected 1012 current COL26 records, found " + byCode.size);
for (const question of byCode.values()) {
  if (String(question?.approvalStatus || "") !== "draft") throw new Error("Non-draft COL26 record: " + question.questionCode);
}
const artifacts = [...byCode.values()].map(buildArtifact).sort((a,b) => a.code.localeCompare(b.code));
const uniqueHashes = new Set(artifacts.map((x) => x.hash));
if (uniqueHashes.size !== EXPECTED) throw new Error("Expected 1012 unique V8 image hashes, found " + uniqueHashes.size);
const pending = artifacts.filter((entry) => !alreadyV8(entry));
console.log("COL26_V8_CHECKPOINT total=1012 alreadyV8=" + (EXPECTED - pending.length) + " pending=" + pending.length);

const audit = {
  startedAt: new Date().toISOString(),
  total: EXPECTED,
  alreadyV8: EXPECTED - pending.length,
  pendingAtStart: pending.length,
  canary: [],
  updated: [],
};

if (pending.length > 0) {
  const canary = pending.slice(0, Math.min(5, pending.length));
  audit.canary = await pool(canary, uploadAndPatch, 1);
  const afterCanary = await fetchBatch(V8_BATCH);
  const canaryCodes = new Set(audit.canary.map((x) => x.questionCode));
  const verifiedCanary = (afterCanary?.questions || []).filter((q) => canaryCodes.has(String(q.questionCode || "").toUpperCase()));
  if (verifiedCanary.length !== canary.length || (afterCanary?.integrityIssues || []).some((x) => canaryCodes.has(String(x.questionCode || "").toUpperCase()))) {
    throw new Error("COL26 V8 canary verification failed");
  }
  console.log("COL26_V8_CANARY_PASS count=" + canary.length);

  const canarySet = new Set(canary.map((x) => x.code));
  const remaining = pending.filter((x) => !canarySet.has(x.code));
  audit.updated = await pool(remaining, uploadAndPatch, CONCURRENCY);
}

const finalV8 = await fetchBatch(V8_BATCH);
const finalV7 = await fetchBatch(V7_BATCH);
if (Number(finalV8?.count || 0) !== EXPECTED) throw new Error("Final V8 count mismatch: " + finalV8?.count);
if (Number(finalV8?.drafts || 0) !== EXPECTED || finalV8?.allDraft !== true) throw new Error("Final V8 draft gate failed");
if (Number(finalV8?.linkedQuizCount || 0) !== 0) throw new Error("Final V8 linkedQuizCount must be 0");
if (Array.isArray(finalV8?.integrityIssues) && finalV8.integrityIssues.length !== 0) throw new Error("Final V8 integrity issues: " + JSON.stringify(finalV8.integrityIssues).slice(0,1000));
if (Number(finalV7?.count || 0) !== 0) throw new Error("V7 residual records remain: " + finalV7?.count);

const liveSamplesVerified = await verifyLiveSamples(finalV8);
audit.finishedAt = new Date().toISOString();
audit.final = {
  status: finalV8.status,
  count: finalV8.count,
  drafts: finalV8.drafts,
  allDraft: finalV8.allDraft,
  linkedQuizCount: finalV8.linkedQuizCount,
  integrityIssues: finalV8.integrityIssues?.length || 0,
  oldV7Residual: finalV7.count,
  liveSamplesVerified,
  uniqueHashes: uniqueHashes.size,
  width: 518,
  imageVersion: 8,
};
fs.mkdirSync("audit-artifacts/col26-v8", { recursive: true });
fs.writeFileSync("audit-artifacts/col26-v8/update-report.json", JSON.stringify(audit, null, 2));
console.log("COL26_V8_PRODUCTION_PASS count=1012 drafts=1012 v7=0 liveSamples=" + liveSamplesVerified);
