import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { env } from "../../config/env.js";
import { QuestionModel } from "../../models/Question.js";
import { UserModel } from "../../models/User.js";
import { signAccessToken } from "../../utils/jwt.js";

const execFileAsync = promisify(execFile);
const COL26OLD_MODE = "col26old-import";
const DOCUMENT_CODE = "COL26OLD";
const CODE_PREFIX = "TAH-MATH-COL26OLD-";
let started = false;

type ManifestItem = Record<string, any> & {
  questionCode: string;
  imageFileName?: string;
  sourceMeta?: Record<string, any>;
};

const chunk = <T>(items: T[], size: number) =>
  Array.from({ length: Math.ceil(items.length / size) }, (_, index) =>
    items.slice(index * size, (index + 1) * size),
  );

const sha256 = (bytes: Buffer) => createHash("sha256").update(bytes).digest("hex");

const pool = async <T, R>(items: T[], concurrency: number, worker: (item: T) => Promise<R>) => {
  const results = new Array<R>(items.length);
  let cursor = 0;
  const run = async () => {
    while (true) {
      const index = cursor++;
      if (index >= items.length) return;
      results[index] = await worker(items[index]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, Math.max(1, items.length)) }, run));
  return results;
};

const requireEnv = (name: string) => {
  const value = String(process.env[name] || "").trim();
  if (!value) throw new Error(`${name} is required for COL26OLD import`);
  return value;
};

const parseCookie = (header: string, name: string) => {
  const match = String(header || "").match(new RegExp(`${name}=([^;]+)`));
  return String(match?.[1] || "").trim();
};

async function resolveAdminToken() {
  const admin = await UserModel.findOne({ role: "admin", isActive: { $ne: false } })
    .select("_id email name role schoolId groupIds linkedStudentIds managedPathIds managedSubjectIds")
    .lean() as any;
  if (!admin) throw new Error("No active admin account is available for controlled import");

  return signAccessToken({
    id: String(admin._id),
    email: String(admin.email || ""),
    role: "admin",
    name: String(admin.name || "Admin"),
    schoolId: admin.schoolId || undefined,
    groupIds: Array.isArray(admin.groupIds) ? admin.groupIds.map(String) : [],
    linkedStudentIds: Array.isArray(admin.linkedStudentIds) ? admin.linkedStudentIds.map(String) : [],
    managedPathIds: Array.isArray(admin.managedPathIds) ? admin.managedPathIds.map(String) : [],
    managedSubjectIds: Array.isArray(admin.managedSubjectIds) ? admin.managedSubjectIds.map(String) : [],
  });
}

async function createLocalApiClient(token: string) {
  const base = `http://127.0.0.1:${env.PORT}/api`;
  let csrfToken = "";
  let csrfCookie = "";

  const refreshCsrf = async () => {
    const response = await fetch(`${base}/auth/csrf-token`, {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) throw new Error(`CSRF HTTP ${response.status}`);
    const body = await response.json() as any;
    csrfToken = String(body?.csrfToken || "").trim();
    csrfCookie = parseCookie(response.headers.get("set-cookie") || "", "almeaa_csrf_token");
    if (!csrfToken || !csrfCookie) throw new Error("CSRF context unavailable");
  };

  await refreshCsrf();

  return async (method: string, route: string, body?: unknown) => {
    const upper = method.toUpperCase();
    const write = !["GET", "HEAD", "OPTIONS"].includes(upper);
    const headers: Record<string, string> = {
      accept: "application/json",
      authorization: `Bearer ${token}`,
    };
    if (body !== undefined) headers["content-type"] = "application/json";
    if (write) {
      headers["x-csrf-token"] = csrfToken;
      headers.cookie = `almeaa_csrf_token=${csrfCookie}`;
    }

    let response = await fetch(`${base}${route}`, {
      method: upper,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(90_000),
    });

    if (response.status === 403 && write) {
      await refreshCsrf();
      headers["x-csrf-token"] = csrfToken;
      headers.cookie = `almeaa_csrf_token=${csrfCookie}`;
      response = await fetch(`${base}${route}`, {
        method: upper,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(90_000),
      });
    }

    const raw = await response.text();
    let payload: any = null;
    try { payload = raw ? JSON.parse(raw) : null; } catch { payload = { raw: raw.slice(0, 500) }; }
    if (!response.ok) {
      throw new Error(`${upper} ${route} HTTP ${response.status}: ${JSON.stringify(payload).slice(0, 1200)}`);
    }
    return payload;
  };
}

async function verifyLiveImages(questions: any[]) {
  if (!questions.length) return 0;
  const indexes = new Set<number>();
  const samples = Math.min(30, questions.length);
  for (let i = 0; i < samples; i += 1) {
    indexes.add(Math.floor(i * (questions.length - 1) / Math.max(1, samples - 1)));
  }

  let verified = 0;
  for (const index of [...indexes].sort((a, b) => a - b)) {
    const question = questions[index];
    const url = String(question?.imageUrl || "");
    const expectedHash = String(question?.sourceMeta?.imageHash || "").toLowerCase();
    if (!url || !expectedHash) throw new Error(`Missing live image identity for ${question?.questionCode || index}`);
    const response = await fetch(url, { signal: AbortSignal.timeout(30_000) });
    if (!response.ok) throw new Error(`Live image GET failed for ${question.questionCode}: HTTP ${response.status}`);
    const actualHash = sha256(Buffer.from(await response.arrayBuffer()));
    if (actualHash !== expectedHash) throw new Error(`Live image hash mismatch for ${question.questionCode}`);
    verified += 1;
  }
  return verified;
}

export async function runQuestionPilotPackageImportIfRequested() {
  if (started || String(process.env.QUESTION_PILOT_MODE || "").trim().toLowerCase() !== COL26OLD_MODE) return;
  started = true;

  if (process.env.PILOT_ALLOW_EXTERNAL_RUN !== "YES" || process.env.PILOT_WRITE_AUTHORIZATION !== "YES") {
    console.error("COL26OLD_IMPORT_BLOCKED authorization flags are not enabled");
    return;
  }

  const batchId = requireEnv("QUESTION_PILOT_BATCH_ID").toUpperCase();
  const expectedCount = Number.parseInt(requireEnv("QUESTION_PILOT_EXPECTED_COUNT"), 10);
  const packageUrl = requireEnv("QUESTION_PILOT_PACKAGE_URL");
  const packageSha = requireEnv("QUESTION_PILOT_PACKAGE_SHA256").toLowerCase();

  if (batchId !== "TAH-MATH-COL26OLD-SEC2-V1") throw new Error("Unexpected COL26OLD batch id");
  if (expectedCount !== 1257) throw new Error("COL26OLD canonical import must contain exactly 1257 new records");
  if (!/^[a-f0-9]{64}$/.test(packageSha)) throw new Error("Invalid package SHA-256");
  const parsedUrl = new URL(packageUrl);
  if (parsedUrl.protocol !== "https:" || !parsedUrl.hostname.endsWith(".oaiusercontent.com")) {
    throw new Error("COL26OLD package URL must be a short-lived HTTPS oaiusercontent URL");
  }

  const foreignCount = await QuestionModel.countDocuments({
    questionCode: { $regex: "^TAH-MATH-COL26OLD-" },
    "sourceMeta.importBatchId": { $ne: batchId },
  });
  if (foreignCount !== 0) throw new Error(`COL26OLD foreign records already exist: ${foreignCount}`);

  const work = await mkdtemp(path.join(tmpdir(), "col26old-import-"));
  try {
    const zipPath = path.join(work, "package.zip");
    const packageResponse = await fetch(packageUrl, { signal: AbortSignal.timeout(120_000) });
    if (!packageResponse.ok) throw new Error(`Package download HTTP ${packageResponse.status}`);
    const packageBytes = Buffer.from(await packageResponse.arrayBuffer());
    const actualPackageSha = sha256(packageBytes);
    if (actualPackageSha !== packageSha) throw new Error("COL26OLD package SHA-256 mismatch");
    await writeFile(zipPath, packageBytes);

    const extractDir = path.join(work, "payload");
    await execFileAsync("unzip", ["-oq", zipPath, "-d", extractDir], { timeout: 120_000 });

    const manifestPath = path.join(extractDir, "COL26OLD_IMPORT_MANIFEST_READY.json");
    const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
    const items: ManifestItem[] = Array.isArray(manifest) ? manifest : manifest.items;
    if (!Array.isArray(items) || items.length !== expectedCount) {
      throw new Error(`Manifest count mismatch: expected ${expectedCount}, received ${Array.isArray(items) ? items.length : "invalid"}`);
    }

    const codes = new Set<string>();
    const sourceIds = new Set<string>();
    const hashes = new Set<string>();
    const verified = [] as Array<{ item: ManifestItem; code: string; sourceItemId: string; hash: string; bytes: Buffer }>;

    for (const item of items) {
      const code = String(item.questionCode || "").trim().toUpperCase();
      const sourceMeta = item.sourceMeta || {};
      const sourceItemId = String(sourceMeta.sourceItemId || "").trim().toUpperCase();
      const fileName = path.basename(String(item.imageFileName || "").trim());
      const expectedHash = String(sourceMeta.imageHash || "").trim().toLowerCase();
      if (!code.startsWith(CODE_PREFIX)) throw new Error(`Invalid COL26OLD code: ${code}`);
      if (String(sourceMeta.documentCode || "").trim().toUpperCase() !== DOCUMENT_CODE) {
        throw new Error(`Invalid documentCode for ${code}`);
      }
      if (!sourceItemId.startsWith("COL26OLD-PDF")) throw new Error(`Invalid sourceItemId for ${code}`);
      if (!/\.webp$/i.test(fileName)) throw new Error(`Invalid image filename for ${code}`);
      const bytes = await readFile(path.join(extractDir, "images", fileName));
      const actualHash = sha256(bytes);
      if (actualHash !== expectedHash) throw new Error(`Image hash mismatch for ${code}`);
      if (codes.has(code) || sourceIds.has(sourceItemId) || hashes.has(actualHash)) {
        throw new Error(`Duplicate canonical identity detected for ${code}`);
      }
      codes.add(code); sourceIds.add(sourceItemId); hashes.add(actualHash);
      verified.push({ item, code, sourceItemId, hash: actualHash, bytes });
    }

    const current = await QuestionModel.find({ "sourceMeta.importBatchId": batchId })
      .select("questionCode approvalStatus sourceMeta.sourceItemId sourceMeta.imageHash")
      .lean() as any[];
    if (current.some((q: any) => q.approvalStatus !== "draft")) {
      throw new Error("COL26OLD import batch contains non-draft records before closure");
    }
    const currentCodes = new Set(current.map((q: any) => String(q.questionCode || "").toUpperCase()));
    const unknownCurrent = [...currentCodes].filter((code) => !codes.has(code));
    if (unknownCurrent.length) throw new Error(`Unexpected existing COL26OLD codes: ${unknownCurrent.slice(0, 5).join(",")}`);

    if (current.length === expectedCount) {
      const token = await resolveAdminToken();
      const api = await createLocalApiClient(token);
      const finalBatch = await api("GET", `/quizzes/questions/import-batch/${encodeURIComponent(batchId)}`);
      if (finalBatch?.status !== "PASS" || Number(finalBatch?.count) !== expectedCount || Number(finalBatch?.drafts) !== expectedCount) {
        throw new Error("Existing COL26OLD batch does not satisfy final draft gate");
      }
      const liveSamples = await verifyLiveImages(finalBatch.questions || []);
      console.log(`COL26OLD_IMPORT_ALREADY_COMPLETE count=${expectedCount} liveSamples=${liveSamples}`);
      return;
    }

    const pending = verified.filter((entry) => !currentCodes.has(entry.code));
    if (current.length + pending.length !== expectedCount) throw new Error("COL26OLD resume accounting mismatch");

    const token = await resolveAdminToken();
    const api = await createLocalApiClient(token);
    const publicBase = env.R2_PUBLIC_BASE_URL.replace(/\/+$/, "");

    const payloadFor = (entry: typeof verified[number], imageUrl: string) => {
      const { imageFileName: _imageFileName, sha256: _sha256, ...payload } = entry.item;
      return {
        ...payload,
        questionCode: entry.code,
        imageUrl,
        sourceMeta: {
          ...(payload.sourceMeta || {}),
          documentCode: DOCUMENT_CODE,
          sourceItemId: entry.sourceItemId,
          imageHash: entry.hash,
          importBatchId: batchId,
        },
      };
    };

    // Full API dry-run first, in schema-bounded chunks, without any R2 write.
    let dryPrepared = 0;
    for (const group of chunk(pending, 100)) {
      const dryItems = group.map((entry) =>
        payloadFor(entry, `${publicBase}/questions/v2/${entry.code}/${entry.hash}.webp`),
      );
      const result = await api("POST", "/quizzes/questions/import-batch", {
        batchId,
        dryRun: true,
        items: dryItems,
      });
      if (result?.status !== "PASS" || Number(result?.prepared || 0) !== group.length) {
        throw new Error(`COL26OLD dry-run chunk failed: ${JSON.stringify(result).slice(0, 1000)}`);
      }
      dryPrepared += group.length;
    }
    console.log(`COL26OLD_DRY_RUN_PASS pending=${pending.length} prepared=${dryPrepared}`);

    const writeGroup = async (group: typeof verified) => {
      const prepared = await pool(group, 12, async (entry) => {
        const intent = await api("POST", "/media/question-import-images/presign", {
          questionCode: entry.code,
          imageHash: entry.hash,
          sizeBytes: entry.bytes.length,
        });
        const expectedUrl = `${publicBase}/questions/v2/${entry.code}/${entry.hash}.webp`;
        if (String(intent?.publicUrl || "") !== expectedUrl) {
          throw new Error(`Presign public URL mismatch for ${entry.code}`);
        }
        return { entry, intent, payload: payloadFor(entry, expectedUrl) };
      });

      await pool(prepared, 8, async ({ entry, intent }) => {
        let lastStatus = 0;
        for (let attempt = 1; attempt <= 3; attempt += 1) {
          try {
            const upload = await fetch(intent.uploadUrl, {
              method: "PUT",
              headers: intent.headers || {},
              body: entry.bytes,
              signal: AbortSignal.timeout(60_000),
            });
            lastStatus = upload.status;
            if (upload.ok) return;
          } catch {
            lastStatus = 0;
          }
          await new Promise((resolve) => setTimeout(resolve, attempt * 750));
        }
        throw new Error(`R2 upload failed for ${entry.code}: HTTP ${lastStatus || "network"}`);
      });

      const result = await api("POST", "/quizzes/questions/import-batch", {
        batchId,
        dryRun: false,
        items: prepared.map((item) => item.payload),
      });
      if (result?.status !== "IMPORTED" || Number(result?.inserted || 0) !== group.length) {
        throw new Error(`COL26OLD write chunk failed: ${JSON.stringify(result).slice(0, 1000)}`);
      }
      return group.length;
    };

    let insertedThisRun = 0;
    const canaryNeeded = Math.max(0, 5 - current.length);
    if (canaryNeeded > 0) {
      const canary = pending.slice(0, canaryNeeded);
      insertedThisRun += await writeGroup(canary);
      const canaryBatch = await api("GET", `/quizzes/questions/import-batch/${encodeURIComponent(batchId)}`);
      if (Number(canaryBatch?.count || 0) < 5 || canaryBatch?.integrityIssues?.length) {
        throw new Error("COL26OLD canary verification failed");
      }
      console.log(`COL26OLD_CANARY_PASS count=${canaryBatch.count}`);
    }

    const alreadyWritten = new Set(
      (await QuestionModel.find({ "sourceMeta.importBatchId": batchId }).select("questionCode").lean() as any[])
        .map((q: any) => String(q.questionCode || "").toUpperCase()),
    );
    const remaining = verified.filter((entry) => !alreadyWritten.has(entry.code));
    let processed = 0;
    for (const group of chunk(remaining, 100)) {
      insertedThisRun += await writeGroup(group);
      processed += group.length;
      console.log(`COL26OLD_IMPORT_PROGRESS ${alreadyWritten.size + processed}/${expectedCount}`);
    }

    const finalBatch = await api("GET", `/quizzes/questions/import-batch/${encodeURIComponent(batchId)}`);
    if (
      finalBatch?.status !== "PASS" ||
      Number(finalBatch?.count || 0) !== expectedCount ||
      Number(finalBatch?.drafts || 0) !== expectedCount ||
      finalBatch?.allDraft !== true ||
      Number(finalBatch?.linkedQuizCount || 0) !== 0 ||
      (Array.isArray(finalBatch?.integrityIssues) && finalBatch.integrityIssues.length !== 0)
    ) {
      throw new Error(`COL26OLD final batch gate failed: ${JSON.stringify({
        status: finalBatch?.status,
        count: finalBatch?.count,
        drafts: finalBatch?.drafts,
        linkedQuizCount: finalBatch?.linkedQuizCount,
        integrityIssues: finalBatch?.integrityIssues?.length,
      })}`);
    }

    const liveSamples = await verifyLiveImages(finalBatch.questions || []);
    console.log(
      `COL26OLD_IMPORT_PASS count=${expectedCount} drafts=${expectedCount} insertedThisRun=${insertedThisRun} liveSamples=${liveSamples}`,
    );
  } finally {
    await rm(work, { recursive: true, force: true }).catch(() => undefined);
  }
}
