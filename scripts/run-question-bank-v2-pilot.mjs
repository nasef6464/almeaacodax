/**
 * Controlled ALMEAA Question Bank V2 Pilot runner.
 *
 * Modes:
 * - prepare: local file/hash verification only; no network.
 * - dry-run: obtains presign intents and validates the batch through the API; no R2 PUT and no DB write.
 * - canary: uploads/imports the first 5 questions.
 * - full: uploads/imports the remaining questions after the canary.
 *
 * External and write modes fail closed behind explicit owner-controlled env flags.
 */
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const required = (name) => {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
};

const mode = String(process.env.QUESTION_PILOT_MODE || "prepare").trim().toLowerCase();
if (!["prepare", "dry-run", "canary", "full"].includes(mode)) {
  throw new Error("QUESTION_PILOT_MODE must be prepare, dry-run, canary or full");
}

const payloadFile = required("QUESTION_PILOT_PAYLOAD_FILE");
const imageDir = required("QUESTION_PILOT_IMAGE_DIR");
const outputFile = required("QUESTION_PILOT_OUTPUT_FILE");
const raw = JSON.parse(await readFile(payloadFile, "utf8"));
const allItems = Array.isArray(raw) ? raw : Array.isArray(raw?.items) ? raw.items : null;
if (!allItems || allItems.length !== 40) {
  throw new Error("Pilot payload must contain exactly 40 items");
}

const batchId = String(raw?.batchId || process.env.QUESTION_PILOT_BATCH_ID || "QBANK-COL2627-PILOT40-20260922-V1")
  .trim()
  .toUpperCase();

const apiBase = mode === "prepare" ? "" : required("PILOT_API_BASE").replace(/\/$/, "");
const adminToken = mode === "prepare" ? "" : required("PILOT_ADMIN_TOKEN");

if (mode !== "prepare" && process.env.PILOT_ALLOW_EXTERNAL_RUN !== "YES") {
  throw new Error("External Pilot calls are fail-closed: set PILOT_ALLOW_EXTERNAL_RUN=YES only after owner authorization.");
}
if ((mode === "canary" || mode === "full") && process.env.PILOT_WRITE_AUTHORIZATION !== "YES") {
  throw new Error("Pilot writes are fail-closed: set PILOT_WRITE_AUTHORIZATION=YES only after owner authorization.");
}

const sha256 = (buffer) => createHash("sha256").update(buffer).digest("hex");
const normalize = (value) => String(value ?? "").trim();
const basenameOnly = (value) => path.basename(normalize(value));

const verified = [];
for (let index = 0; index < allItems.length; index += 1) {
  const item = allItems[index];
  const questionCode = normalize(item.questionCode).toUpperCase();
  const imageFileName = basenameOnly(item.imageFileName || item?.sourceMeta?.imageFileName);
  if (!questionCode) throw new Error(`Item ${index + 1} has no questionCode`);
  if (!imageFileName) throw new Error(`Item ${questionCode} has no imageFileName`);
  if (!/\.webp$/i.test(imageFileName)) throw new Error(`Item ${questionCode} must reference a WebP image`);

  const filePath = path.join(imageDir, imageFileName);
  const bytes = await readFile(filePath);
  const actualHash = sha256(bytes);
  const expectedHash = normalize(item?.sourceMeta?.imageHash || item.sha256).toLowerCase();
  if (!expectedHash || actualHash !== expectedHash) {
    throw new Error(`Image hash mismatch for ${questionCode}: expected ${expectedHash || "missing"}, received ${actualHash}`);
  }

  verified.push({
    index,
    item,
    questionCode,
    imageFileName,
    filePath,
    bytes,
    imageHash: actualHash,
  });
}

const duplicate = (values) => {
  const seen = new Set();
  const dup = new Set();
  for (const value of values) {
    if (seen.has(value)) dup.add(value);
    seen.add(value);
  }
  return [...dup];
};

const duplicateCodes = duplicate(verified.map((entry) => entry.questionCode));
const duplicateSourceIds = duplicate(verified.map((entry) => normalize(entry.item?.sourceMeta?.sourceItemId)));
if (duplicateCodes.length || duplicateSourceIds.length) {
  throw new Error(`Duplicate pilot identities: codes=${duplicateCodes.join(",")} sourceIds=${duplicateSourceIds.join(",")}`);
}

const safeReport = {
  mode,
  batchId,
  payloadFile,
  imageDir,
  totalItems: verified.length,
  hashMismatches: 0,
  selected: 0,
  presignValidated: 0,
  uploaded: 0,
  apiDryRun: null,
  apiWrite: null,
  questions: [],
};

if (mode === "prepare") {
  safeReport.selected = verified.length;
  safeReport.questions = verified.map((entry) => ({
    questionCode: entry.questionCode,
    imageFileName: entry.imageFileName,
    imageHash: entry.imageHash,
  }));
  await writeFile(outputFile, `${JSON.stringify(safeReport, null, 2)}\n`, "utf8");
  console.log(JSON.stringify({ status: "PASS", ...safeReport, questions: undefined }, null, 2));
  process.exit(0);
}

const request = async (requestPath, options = {}) => {
  const response = await fetch(`${apiBase}${requestPath}`, {
    ...options,
    headers: {
      accept: "application/json",
      authorization: `Bearer ${adminToken}`,
      ...(options.body ? { "content-type": "application/json" } : {}),
      ...(options.headers || {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
    signal: AbortSignal.timeout(30_000),
  });
  const text = await response.text();
  let body = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = { raw: text.slice(0, 500) }; }
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ${requestPath}: ${JSON.stringify(body)}`);
  }
  return body;
};

const selected = mode === "canary"
  ? verified.slice(0, 5)
  : mode === "full"
    ? verified.slice(5)
    : verified;
safeReport.selected = selected.length;

const preparedItems = [];
for (const entry of selected) {
  const intent = await request("/media/question-import-images/presign", {
    method: "POST",
    body: {
      questionCode: entry.questionCode,
      imageHash: entry.imageHash,
      sizeBytes: entry.bytes.length,
    },
  });
  safeReport.presignValidated += 1;

  if (mode === "canary" || mode === "full") {
    const upload = await fetch(intent.uploadUrl, {
      method: "PUT",
      headers: intent.headers,
      body: entry.bytes,
      signal: AbortSignal.timeout(60_000),
    });
    if (!upload.ok) {
      throw new Error(`R2 upload failed for ${entry.questionCode}: HTTP ${upload.status}`);
    }
    safeReport.uploaded += 1;
  }

  const { imageFileName: _imageFileName, sha256: _sha256, ...payload } = entry.item;
  preparedItems.push({
    ...payload,
    questionCode: entry.questionCode,
    imageUrl: intent.publicUrl,
    sourceMeta: {
      ...(payload.sourceMeta || {}),
      imageHash: entry.imageHash,
      importBatchId: batchId,
    },
  });
  safeReport.questions.push({
    questionCode: entry.questionCode,
    imageFileName: entry.imageFileName,
    imageHash: entry.imageHash,
    publicUrl: intent.publicUrl,
  });
}

const dryRunResult = await request("/quizzes/questions/import-batch", {
  method: "POST",
  body: { batchId, dryRun: true, items: preparedItems },
});
safeReport.apiDryRun = {
  status: dryRunResult?.status || null,
  mode: dryRunResult?.mode || null,
  requested: dryRunResult?.requested ?? null,
  prepared: dryRunResult?.prepared ?? null,
};

if (mode === "canary" || mode === "full") {
  const writeResult = await request("/quizzes/questions/import-batch", {
    method: "POST",
    body: { batchId, dryRun: false, items: preparedItems },
  });
  safeReport.apiWrite = {
    status: writeResult?.status || null,
    mode: writeResult?.mode || null,
    requested: writeResult?.requested ?? null,
    inserted: writeResult?.inserted ?? null,
    questions: Array.isArray(writeResult?.questions) ? writeResult.questions : [],
  };
}

await writeFile(outputFile, `${JSON.stringify(safeReport, null, 2)}\n`, "utf8");
console.log(JSON.stringify({
  status: "PASS",
  mode,
  batchId,
  totalItems: safeReport.totalItems,
  selected: safeReport.selected,
  presignValidated: safeReport.presignValidated,
  uploaded: safeReport.uploaded,
  apiDryRun: safeReport.apiDryRun,
  apiWrite: safeReport.apiWrite,
  outputFile,
}, null, 2));
