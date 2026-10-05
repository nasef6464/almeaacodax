import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { env } from "../../config/env.js";
import { QuestionModel } from "../../models/Question.js";
import {
  chunk,
  createLocalApiClient,
  pool,
  requireEnv,
  sha256,
  verifyLiveImages,
} from "./questionPilotPackageImportSupport.js";

const execFileAsync = promisify(execFile);

const CHEM26_MODE = "chem26-import";
const DOCUMENT_CODE = "CHEM26";
const CODE_PREFIX = "TAH-CHEM-CHEM26-";
const BATCH_ID = "TAH-CHEM-CHEM26-S1S2-V1";
const EXPECTED_COUNT = 1708;
let started = false;

type ManifestItem = Record<string, any> & {
  questionCode: string;
  imageFileName?: string;
  sourceMeta?: Record<string, any>;
};

export async function runChem26PackageImportIfRequested() {
  const modeRaw = String(process.env.QUESTION_PILOT_MODE || "").trim();
  if (started || !modeRaw.toLowerCase().startsWith(`${CHEM26_MODE}.`)) return;
  started = true;

  if (
    process.env.PILOT_ALLOW_EXTERNAL_RUN !== "YES" ||
    process.env.PILOT_WRITE_AUTHORIZATION !== "YES"
  ) {
    console.error("CHEM26_IMPORT_BLOCKED authorization flags are not enabled");
    return;
  }

  const batchId = requireEnv("QUESTION_PILOT_BATCH_ID").toUpperCase();
  const expectedCount = Number.parseInt(requireEnv("QUESTION_PILOT_EXPECTED_COUNT"), 10);
  if (batchId !== BATCH_ID) throw new Error(`Unexpected CHEM26 batch id: ${batchId}`);
  if (expectedCount !== EXPECTED_COUNT) {
    throw new Error(`CHEM26 canonical import must contain exactly ${EXPECTED_COUNT} new records`);
  }

  const transportEncoded = modeRaw.slice(CHEM26_MODE.length + 1);
  let transport: { packageUrl?: string; packageSha256?: string } = {};
  try {
    transport = JSON.parse(Buffer.from(transportEncoded, "base64url").toString("utf8"));
  } catch {
    throw new Error("Invalid CHEM26 transport envelope");
  }

  const packageUrl = String(transport.packageUrl || "").trim();
  const packageSha = String(transport.packageSha256 || "").trim().toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(packageSha)) throw new Error("Invalid CHEM26 package SHA-256");

  const parsedUrl = new URL(packageUrl);
  if (parsedUrl.protocol !== "https:" || !parsedUrl.hostname.endsWith(".oaiusercontent.com")) {
    throw new Error("CHEM26 package URL must be a short-lived HTTPS oaiusercontent URL");
  }

  const foreignCount = await QuestionModel.countDocuments({
    questionCode: { $regex: "^TAH-CHEM-CHEM26-" },
    "sourceMeta.importBatchId": { $ne: batchId },
  });
  if (foreignCount !== 0) throw new Error(`CHEM26 foreign records already exist: ${foreignCount}`);

  const work = await mkdtemp(path.join(tmpdir(), "chem26-import-"));
  try {
    const zipPath = path.join(work, "package.zip");
    const packageResponse = await fetch(packageUrl, { signal: AbortSignal.timeout(120_000) });
    if (!packageResponse.ok) throw new Error(`Package download HTTP ${packageResponse.status}`);

    const packageBytes = Buffer.from(await packageResponse.arrayBuffer());
    const actualPackageSha = sha256(packageBytes);
    if (actualPackageSha !== packageSha) throw new Error("CHEM26 package SHA-256 mismatch");
    await writeFile(zipPath, packageBytes);

    const extractDir = path.join(work, "payload");
    await execFileAsync("unzip", ["-oq", zipPath, "-d", extractDir], { timeout: 120_000 });

    const manifestPath = path.join(extractDir, "CHEM26_IMPORT_MANIFEST_READY.json");
    const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
    const items: ManifestItem[] = Array.isArray(manifest) ? manifest : manifest.items;
    if (!Array.isArray(items) || items.length !== expectedCount) {
      throw new Error(
        `CHEM26 manifest count mismatch: expected ${expectedCount}, received ${Array.isArray(items) ? items.length : "invalid"}`,
      );
    }

    const manifestBatchId = String(manifest?.batchId || "").trim().toUpperCase();
    if (manifestBatchId && manifestBatchId !== batchId) {
      throw new Error(`CHEM26 manifest batch mismatch: ${manifestBatchId}`);
    }
    if (Number(manifest?.canonicalImportCount || expectedCount) !== expectedCount) {
      throw new Error("CHEM26 canonicalImportCount mismatch");
    }
    if (Number(manifest?.sourceCoverage || 1709) !== 1709) {
      throw new Error("CHEM26 source coverage must remain 1709");
    }

    const codes = new Set<string>();
    const sourceIds = new Set<string>();
    const hashes = new Set<string>();
    const verified = [] as Array<{
      item: ManifestItem;
      code: string;
      sourceItemId: string;
      hash: string;
      bytes: Buffer;
    }>;

    for (const item of items) {
      const code = String(item.questionCode || "").trim().toUpperCase();
      const sourceMeta = item.sourceMeta || {};
      const sourceItemId = String(sourceMeta.sourceItemId || "").trim().toUpperCase();
      const fileName = path.basename(String(item.imageFileName || "").trim());
      const expectedHash = String(sourceMeta.imageHash || "").trim().toLowerCase();

      if (!code.startsWith(CODE_PREFIX)) throw new Error(`Invalid CHEM26 code: ${code}`);
      if (String(sourceMeta.documentCode || "").trim().toUpperCase() !== DOCUMENT_CODE) {
        throw new Error(`Invalid CHEM26 documentCode for ${code}`);
      }
      if (!sourceItemId.startsWith("CHEM26-PDF")) {
        throw new Error(`Invalid CHEM26 sourceItemId for ${code}`);
      }
      if (!/\.webp$/i.test(fileName)) throw new Error(`Invalid CHEM26 image filename for ${code}`);
      if (String(item.pathId || "") !== "p_1777779653351") {
        throw new Error(`Invalid CHEM26 path for ${code}`);
      }
      if (
        String(item.subject || "") !== "sub_1784980728386" ||
        String(item.subjectId || "") !== "sub_1784980728386"
      ) {
        throw new Error(`Invalid CHEM26 subject for ${code}`);
      }
      if (!String(item.sectionId || "").startsWith("sec_sub_chemistry_")) {
        throw new Error(`Invalid CHEM26 section for ${code}`);
      }
      if (
        !Array.isArray(item.skillIds) ||
        item.skillIds.length < 2 ||
        !String(item.skillId || "").startsWith("skill_tah_chem_") ||
        !String(item.subSkillId || "").startsWith("sub_tah_chem_")
      ) {
        throw new Error(`Invalid CHEM26 skill linkage for ${code}`);
      }
      if (
        item.optionsEmbeddedInImage !== true ||
        !Array.isArray(item.options) ||
        item.options.join("|") !== "A|B|C|D" ||
        !Array.isArray(item?.aiContext?.optionTexts) ||
        item.aiContext.optionTexts.length !== 4 ||
        item.aiContext.optionTexts.some((value: unknown) => !String(value || "").trim())
      ) {
        throw new Error(`Incomplete CHEM26 option context for ${code}`);
      }
      if (!String(item.explanation || "").trim()) {
        throw new Error(`Missing CHEM26 explanation for ${code}`);
      }

      const bytes = await readFile(path.join(extractDir, "images", fileName));
      const actualHash = sha256(bytes);
      if (actualHash !== expectedHash) throw new Error(`Image hash mismatch for ${code}`);
      if (codes.has(code) || sourceIds.has(sourceItemId) || hashes.has(actualHash)) {
        throw new Error(`Duplicate CHEM26 canonical identity detected for ${code}`);
      }

      codes.add(code);
      sourceIds.add(sourceItemId);
      hashes.add(actualHash);
      verified.push({ item, code, sourceItemId, hash: actualHash, bytes });
    }

    const current = (await QuestionModel.find({ "sourceMeta.importBatchId": batchId })
      .select("questionCode approvalStatus sourceMeta.sourceItemId sourceMeta.imageHash")
      .lean()) as any[];

    if (current.some((q: any) => q.approvalStatus !== "draft")) {
      throw new Error("CHEM26 import batch contains non-draft records before closure");
    }

    const currentCodes = new Set(
      current.map((q: any) => String(q.questionCode || "").trim().toUpperCase()),
    );
    const unknownCurrent = [...currentCodes].filter((code) => !codes.has(code));
    if (unknownCurrent.length) {
      throw new Error(`Unexpected existing CHEM26 codes: ${unknownCurrent.slice(0, 5).join(",")}`);
    }

    const api = await createLocalApiClient();

    if (current.length === expectedCount) {
      const finalBatch = await api(
        "GET",
        `/quizzes/questions/import-batch/${encodeURIComponent(batchId)}`,
      );
      if (
        finalBatch?.status !== "PASS" ||
        Number(finalBatch?.count) !== expectedCount ||
        Number(finalBatch?.drafts) !== expectedCount
      ) {
        throw new Error("Existing CHEM26 batch does not satisfy final draft gate");
      }
      const liveSamples = await verifyLiveImages(finalBatch.questions || []);
      console.log(
        `CHEM26_IMPORT_ALREADY_COMPLETE count=${expectedCount} liveSamples=${liveSamples}`,
      );
      return;
    }

    const pending = verified.filter((entry) => !currentCodes.has(entry.code));
    if (current.length + pending.length !== expectedCount) {
      throw new Error("CHEM26 resume accounting mismatch");
    }

    const publicBase = env.R2_PUBLIC_BASE_URL.replace(/\/+$/, "");

    const payloadFor = (entry: (typeof verified)[number], imageUrl: string) => {
      const {
        imageFileName: _imageFileName,
        importReadiness: _importReadiness,
        ...payload
      } = entry.item;
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
        throw new Error(
          `CHEM26 dry-run chunk failed: ${JSON.stringify(result).slice(0, 1000)}`,
        );
      }
      dryPrepared += group.length;
    }
    console.log(`CHEM26_DRY_RUN_PASS pending=${pending.length} prepared=${dryPrepared}`);

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
              body: Uint8Array.from(entry.bytes),
              signal: AbortSignal.timeout(60_000),
            });
            lastStatus = upload.status;
            if (upload.ok) return;
          } catch {
            lastStatus = 0;
          }
          await new Promise((resolve) => setTimeout(resolve, attempt * 750));
        }
        throw new Error(
          `CHEM26 R2 upload failed for ${entry.code}: HTTP ${lastStatus || "network"}`,
        );
      });

      const result = await api("POST", "/quizzes/questions/import-batch", {
        batchId,
        dryRun: false,
        items: prepared.map((item) => item.payload),
      });
      if (result?.status !== "IMPORTED" || Number(result?.inserted || 0) !== group.length) {
        throw new Error(
          `CHEM26 write chunk failed: ${JSON.stringify(result).slice(0, 1000)}`,
        );
      }
      return group.length;
    };

    let insertedThisRun = 0;
    const canaryNeeded = Math.max(0, 5 - current.length);
    if (canaryNeeded > 0) {
      const canary = pending.slice(0, canaryNeeded);
      insertedThisRun += await writeGroup(canary);
      const canaryBatch = await api(
        "GET",
        `/quizzes/questions/import-batch/${encodeURIComponent(batchId)}`,
      );
      if (
        Number(canaryBatch?.count || 0) < 5 ||
        (Array.isArray(canaryBatch?.integrityIssues) &&
          canaryBatch.integrityIssues.length > 0)
      ) {
        throw new Error("CHEM26 canary verification failed");
      }
      console.log(`CHEM26_CANARY_PASS count=${canaryBatch.count}`);
    }

    const alreadyWritten = new Set(
      (
        (await QuestionModel.find({ "sourceMeta.importBatchId": batchId })
          .select("questionCode")
          .lean()) as any[]
      ).map((q: any) => String(q.questionCode || "").trim().toUpperCase()),
    );

    const remaining = verified.filter((entry) => !alreadyWritten.has(entry.code));
    let processed = 0;
    for (const group of chunk(remaining, 100)) {
      insertedThisRun += await writeGroup(group);
      processed += group.length;
      console.log(
        `CHEM26_IMPORT_PROGRESS ${alreadyWritten.size + processed}/${expectedCount}`,
      );
    }

    const finalBatch = await api(
      "GET",
      `/quizzes/questions/import-batch/${encodeURIComponent(batchId)}`,
    );
    if (
      finalBatch?.status !== "PASS" ||
      Number(finalBatch?.count || 0) !== expectedCount ||
      Number(finalBatch?.drafts || 0) !== expectedCount ||
      finalBatch?.allDraft !== true ||
      Number(finalBatch?.linkedQuizCount || 0) !== 0 ||
      (Array.isArray(finalBatch?.integrityIssues) &&
        finalBatch.integrityIssues.length !== 0)
    ) {
      throw new Error(
        `CHEM26 final batch gate failed: ${JSON.stringify({
          status: finalBatch?.status,
          count: finalBatch?.count,
          drafts: finalBatch?.drafts,
          linkedQuizCount: finalBatch?.linkedQuizCount,
          integrityIssues: finalBatch?.integrityIssues?.length,
        })}`,
      );
    }

    const liveSamples = await verifyLiveImages(finalBatch.questions || []);
    console.log(
      `CHEM26_IMPORT_PASS count=${expectedCount} drafts=${expectedCount} insertedThisRun=${insertedThisRun} liveSamples=${liveSamples}`,
    );
  } finally {
    await rm(work, { recursive: true, force: true }).catch(() => undefined);
  }
}
