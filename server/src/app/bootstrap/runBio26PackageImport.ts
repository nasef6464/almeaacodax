import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import mongoose from "mongoose";
import { env } from "../../config/env.js";
import { QuestionModel } from "../../models/Question.js";
import { SkillModel } from "../../models/Skill.js";
import { SubjectModel } from "../../models/Subject.js";
import { UserModel } from "../../models/User.js";
import { questionSchema } from "../../modules/quizzes/http/questionQuerySchemas.js";
import { createR2PresignedPutUrl } from "../../modules/media/infrastructure/r2PresignedPut.js";
import { pool, sha256 } from "./questionPilotPackageImportSupport.js";

const execFileAsync = promisify(execFile);
const MODE_PREFIX = "bio26-import";
const BATCH_ID = "TAH-BIO-BIO26-FULL-V1";
const EXPECTED_COUNT = 2832;
const EXPECTED_PATH_ID = "p_1777779653351";
const EXPECTED_SUBJECT_ID = "sub_tah_biology_bio26";
const PROTECTED_LEGACY_SUBJECT_ID = "sub_1784980740570";
const EXPECTED_MAIN = 29;
const EXPECTED_SUB = 98;
const CODE_REGEX = /^TAH-BIO-BIO26-L\d{2}-Q\d{3}$/;
const PLACEHOLDER_OPTION_LABELS = new Set(["A", "B", "C", "D", "أ", "ب", "ج", "د"]);
let started = false;

type ManifestItem = Record<string, any> & {
  questionCode: string;
  imageFileName: string;
  sourceMeta: Record<string, any>;
};

const requireR2 = () => {
  if (
    !env.R2_UPLOAD_ENABLED ||
    !env.R2_ACCOUNT_ID ||
    !env.R2_BUCKET ||
    !env.R2_ACCESS_KEY_ID ||
    !env.R2_SECRET_ACCESS_KEY ||
    !env.R2_PUBLIC_BASE_URL
  ) throw new Error("BIO26 R2 upload is not fully configured");
};

const publicUrlFor = (code: string, hash: string) =>
  `${env.R2_PUBLIC_BASE_URL.replace(/\/+$/, "")}/questions/v2/${code}/${hash}.webp`;

const validateMachineReadable = (item: ManifestItem, code: string) => {
  const options = Array.isArray(item.options) ? item.options : [];
  const optionTexts = Array.isArray(item?.aiContext?.optionTexts) ? item.aiContext.optionTexts : [];
  if (options.length !== 4 || !Number.isInteger(item.correctOptionIndex) || item.correctOptionIndex < 0 || item.correctOptionIndex > 3) {
    throw new Error(`BIO26 A/B/C/D integrity missing for ${code}`);
  }
  const normalizedOptionTexts = optionTexts.map((x: unknown) => String(x || "").trim());
  if (normalizedOptionTexts.length !== 4 || normalizedOptionTexts.some((x: string) => !x)) {
    throw new Error(`BIO26 machine-readable optionTexts missing for ${code}`);
  }
  const optionTextsSource = String(item?.aiContext?.optionTextsSource || "").trim().toUpperCase();
  if (optionTextsSource !== "SOURCE_PDF" || item?.aiContext?.optionTextsVerified !== true) {
    throw new Error(`BIO26 machine-readable optionTexts provenance missing for ${code}`);
  }
  if (!String(item?.aiContext?.readableText || "").trim()) throw new Error(`BIO26 readableText missing for ${code}`);
  if (!String(item?.aiContext?.visualDescription || "").trim()) throw new Error(`BIO26 visualDescription missing for ${code}`);
  if (!String(item.explanation || "").trim()) throw new Error(`BIO26 explanation missing for ${code}`);
  const note = String(item.reviewerNotes || "");
  if (!(/verified\s+visually/i.test(note) || /تم\s+التحقق.*بصري/i.test(note))) {
    throw new Error(`BIO26 visual QA reviewer note missing for ${code}`);
  }
};

const validateScope = (item: ManifestItem, code: string) => {
  if (!CODE_REGEX.test(code)) throw new Error(`Invalid BIO26 question code: ${code}`);
  if (String(item.pathId || "") !== EXPECTED_PATH_ID) throw new Error(`Invalid BIO26 path for ${code}`);
  if (String(item.subject || "") !== EXPECTED_SUBJECT_ID || String(item.subjectId || "") !== EXPECTED_SUBJECT_ID) {
    throw new Error(`Invalid BIO26 subject scope for ${code}`);
  }
  const sourceMeta = item.sourceMeta || {};
  if (String(sourceMeta.documentCode || "").trim().toUpperCase() !== "BIO26") throw new Error(`Invalid documentCode for ${code}`);
  if (!String(sourceMeta.sourceItemId || "").trim().toUpperCase().startsWith("BIO26-PDF")) {
    throw new Error(`Invalid sourceItemId for ${code}`);
  }
  const main = String(item.skillId || "");
  const sub = String(item.subSkillId || "");
  const mainMatch = main.match(/^skill_tah_bio_(\d{2})$/);
  if (!mainMatch) throw new Error(`Invalid BIO26 main skill for ${code}: ${main}`);
  if (!sub.startsWith(`sub_tah_bio_${mainMatch[1]}_`)) throw new Error(`BIO26 subskill/main mismatch for ${code}`);
  const expectedSection = `sec_sub_biology_${Number(mainMatch[1])}`;
  if (String(item.sectionId || "") !== expectedSection) throw new Error(`BIO26 section/main mismatch for ${code}`);
  const skillIds = Array.isArray(item.skillIds) ? item.skillIds.map(String) : [];
  if (!skillIds.includes(main) || !skillIds.includes(sub)) throw new Error(`BIO26 skillIds incomplete for ${code}`);
};

const getOwnerAdminId = async () => {
  const admin = await UserModel.findOne({ role: "admin", isActive: { $ne: false } }).select("_id").lean() as any;
  if (!admin?._id) throw new Error("No active admin available for BIO26 import ownership");
  return String(admin._id);
};

export async function runBio26PackageImportIfRequested() {
  const modeRaw = String(process.env.QUESTION_PILOT_MODE || "").trim();
  if (started || !modeRaw.toLowerCase().startsWith(`${MODE_PREFIX}.`)) return;
  started = true;

  if (process.env.PILOT_ALLOW_EXTERNAL_RUN !== "YES") {
    console.error("BIO26_IMPORT_BLOCKED external-run flag is not enabled");
    return;
  }

  let transport: { packageUrl?: string; packageSha256?: string; phase?: string } = {};
  try {
    transport = JSON.parse(Buffer.from(modeRaw.slice(MODE_PREFIX.length + 1), "base64url").toString("utf8"));
  } catch {
    throw new Error("Invalid BIO26 transport envelope");
  }
  const phase = String(transport.phase || "verify").trim().toLowerCase();
  if (!["r2", "dry-run", "canary", "full", "verify"].includes(phase)) throw new Error("Invalid BIO26 import phase");
  const writes = ["r2", "canary", "full"].includes(phase);
  if (writes && process.env.PILOT_WRITE_AUTHORIZATION !== "YES") {
    throw new Error("BIO26 write phase is fail-closed without PILOT_WRITE_AUTHORIZATION=YES");
  }

  const expectedCount = Number.parseInt(String(process.env.QUESTION_PILOT_EXPECTED_COUNT || EXPECTED_COUNT), 10);
  const batchId = String(process.env.QUESTION_PILOT_BATCH_ID || BATCH_ID).trim().toUpperCase();
  if (expectedCount !== EXPECTED_COUNT || batchId !== BATCH_ID) throw new Error("Unexpected BIO26 import contract");

  const packageUrl = String(transport.packageUrl || "").trim();
  const packageSha = String(transport.packageSha256 || "").trim().toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(packageSha)) throw new Error("Invalid BIO26 package SHA-256");
  const parsedUrl = new URL(packageUrl);
  const approvedPackageHosts = [".oaiusercontent.com", ".r2.dev"];
  if (
    parsedUrl.protocol !== "https:" ||
    !approvedPackageHosts.some((suffix) => parsedUrl.hostname.toLowerCase().endsWith(suffix))
  ) {
    throw new Error("BIO26 package URL must use an approved HTTPS transport host");
  }

  const [subject, protectedLegacy, skills, foreignCodes] = await Promise.all([
    SubjectModel.findById(EXPECTED_SUBJECT_ID).lean() as any,
    SubjectModel.findById(PROTECTED_LEGACY_SUBJECT_ID).lean() as any,
    SkillModel.find({ pathId: EXPECTED_PATH_ID, subjectId: EXPECTED_SUBJECT_ID }).lean() as any,
    QuestionModel.countDocuments({
      questionCode: { $regex: "^TAH-BIO-BIO26-" },
      "sourceMeta.importBatchId": { $ne: BATCH_ID },
    }),
  ]);
  if (!subject || String(subject.pathId || "") !== EXPECTED_PATH_ID || String(subject.name || "") !== "الأحياء") {
    throw new Error("BIO26 dedicated production subject is not ready");
  }
  if (!protectedLegacy || !String(protectedLegacy.name || "").includes("البيئة")) {
    throw new Error("Protected علم البيئة subject is missing or changed");
  }
  const subCount = (skills || []).reduce((sum: number, s: any) => sum + (Array.isArray(s.subSkills) ? s.subSkills.length : 0), 0);
  if ((skills || []).length !== EXPECTED_MAIN || subCount !== EXPECTED_SUB) {
    throw new Error(`BIO26 taxonomy not ready: main=${skills?.length || 0}, sub=${subCount}`);
  }
  if (foreignCodes !== 0) throw new Error(`BIO26 foreign-code records exist: ${foreignCodes}`);

  const work = await mkdtemp(path.join(tmpdir(), "bio26-import-"));
  try {
    const zipPath = path.join(work, "package.zip");
    const response = await fetch(packageUrl, { signal: AbortSignal.timeout(120_000) });
    if (!response.ok) throw new Error(`BIO26 package download HTTP ${response.status}`);
    const packageBytes = Buffer.from(await response.arrayBuffer());
    if (sha256(packageBytes) !== packageSha) throw new Error("BIO26 package SHA-256 mismatch");
    await writeFile(zipPath, packageBytes);

    const extractDir = path.join(work, "payload");
    await execFileAsync("unzip", ["-oq", zipPath, "-d", extractDir], { timeout: 120_000 });
    const raw = JSON.parse(await readFile(path.join(extractDir, "BIO26_IMPORT_MANIFEST_READY.json"), "utf8"));
    const items: ManifestItem[] = Array.isArray(raw) ? raw : raw.items;
    if (!Array.isArray(items) || items.length !== EXPECTED_COUNT) {
      throw new Error(`BIO26 manifest count mismatch: ${Array.isArray(items) ? items.length : "invalid"}`);
    }

    const codes = new Set<string>();
    const sourceIds = new Set<string>();
    const hashes = new Set<string>();
    const verified: Array<{ item: ManifestItem; code: string; sourceItemId: string; hash: string; bytes: Buffer }> = [];

    for (const item of items) {
      const code = String(item.questionCode || "").trim().toUpperCase();
      validateScope(item, code);
      validateMachineReadable(item, code);
      const sourceItemId = String(item.sourceMeta?.sourceItemId || "").trim().toUpperCase();
      const expectedHash = String(item.sourceMeta?.imageHash || "").trim().toLowerCase();
      const fileName = path.basename(String(item.imageFileName || "").trim());
      if (!/^[a-f0-9]{64}$/.test(expectedHash) || !/\.webp$/i.test(fileName)) {
        throw new Error(`BIO26 image identity invalid for ${code}`);
      }
      const bytes = await readFile(path.join(extractDir, "images", fileName));
      const actualHash = sha256(bytes);
      if (actualHash !== expectedHash) throw new Error(`BIO26 image hash mismatch for ${code}`);
      if (codes.has(code) || sourceIds.has(sourceItemId) || hashes.has(actualHash)) {
        throw new Error(`BIO26 duplicate canonical identity: ${code}`);
      }
      codes.add(code); sourceIds.add(sourceItemId); hashes.add(actualHash);
      verified.push({ item, code, sourceItemId, hash: actualHash, bytes });
    }
    if (codes.size !== EXPECTED_COUNT || sourceIds.size !== EXPECTED_COUNT || hashes.size !== EXPECTED_COUNT) {
      throw new Error("BIO26 canonical uniqueness gate failed");
    }

    const ownerId = await getOwnerAdminId();
    const skillMap = new Map<string, any>();
    for (const main of skills || []) {
      skillMap.set(String(main.id || main._id || ""), main);
      for (const sub of main.subSkills || []) skillMap.set(String(sub.id || ""), sub);
    }

    const toDraft = (entry: typeof verified[number]) => {
      if (!skillMap.has(String(entry.item.skillId || "")) || !skillMap.has(String(entry.item.subSkillId || ""))) {
        throw new Error(`BIO26 taxonomy lookup failed for ${entry.code}`);
      }
      return questionSchema.parse({
        ...entry.item,
        id: `q_${new mongoose.Types.ObjectId()}`,
        questionCode: entry.code,
        imageUrl: publicUrlFor(entry.code, entry.hash),
        source: "imported",
        approvalStatus: "draft",
        ownerType: "platform",
        ownerId,
        createdBy: ownerId,
        approvedBy: "",
        approvedAt: null,
        sourceMeta: {
          ...(entry.item.sourceMeta || {}),
          documentCode: "BIO26",
          sourceItemId: entry.sourceItemId,
          imageHash: entry.hash,
          importBatchId: BATCH_ID,
        },
      });
    };

    const parsedDrafts = verified.map(toDraft);
    console.log(`BIO26_PACKAGE_QA_PASS count=${parsedDrafts.length} phase=${phase}`);

    const current = await QuestionModel.find({ "sourceMeta.importBatchId": BATCH_ID })
      .select("questionCode approvalStatus sourceMeta.imageHash imageUrl")
      .sort({ createdAt: 1 })
      .lean() as any[];
    if (current.some((q: any) => String(q.approvalStatus || "") !== "draft")) {
      throw new Error("BIO26 batch contains non-draft rows before approval gate");
    }
    const currentCodes = new Set(current.map((q: any) => String(q.questionCode || "").toUpperCase()));
    if ([...currentCodes].some((code) => !codes.has(code))) throw new Error("BIO26 batch contains an unknown question code");

    const verifyRemote = async (entry: typeof verified[number]) => {
      const url = publicUrlFor(entry.code, entry.hash);
      const r = await fetch(url, { signal: AbortSignal.timeout(30_000) });
      if (!r.ok) throw new Error(`BIO26 live R2 GET failed ${entry.code}: HTTP ${r.status}`);
      const actual = sha256(Buffer.from(await r.arrayBuffer()));
      if (actual !== entry.hash) throw new Error(`BIO26 live R2 hash mismatch for ${entry.code}`);
      return true;
    };

    if (phase === "r2") {
      if (current.length !== 0) throw new Error("BIO26 R2 phase requires zero imported questions");
      requireR2();
      await pool(verified, 10, async (entry) => {
        const key = `questions/v2/${entry.code}/${entry.hash}.webp`;
        const uploadUrl = createR2PresignedPutUrl({
          accountId: env.R2_ACCOUNT_ID,
          bucket: env.R2_BUCKET,
          key,
          accessKeyId: env.R2_ACCESS_KEY_ID,
          secretAccessKey: env.R2_SECRET_ACCESS_KEY,
          contentType: "image/webp",
          expiresSeconds: env.R2_PRESIGN_EXPIRES_SECONDS,
        });
        let ok = false;
        for (let attempt = 1; attempt <= 3 && !ok; attempt += 1) {
          try {
            const put = await fetch(uploadUrl, {
              method: "PUT",
              headers: { "Content-Type": "image/webp" },
              body: Uint8Array.from(entry.bytes),
              signal: AbortSignal.timeout(60_000),
            });
            ok = put.ok;
          } catch {
            ok = false;
          }
          if (!ok) await new Promise((resolve) => setTimeout(resolve, attempt * 700));
        }
        if (!ok) throw new Error(`BIO26 R2 PUT failed for ${entry.code}`);
      });
      await pool(verified, 12, verifyRemote);
      console.log(`BIO26_R2_VERIFIED_PASS count=${EXPECTED_COUNT}`);
      return;
    }

    if (phase === "dry-run") {
      if (current.length !== 0) throw new Error("BIO26 dry-run phase requires zero imported questions");
      const samples = verified.filter((_, i) => i % Math.max(1, Math.floor(verified.length / 30)) === 0).slice(0, 30);
      await pool(samples, 10, verifyRemote);
      console.log(`BIO26_DRY_RUN_PASS count=${EXPECTED_COUNT} liveImageSamples=${samples.length}`);
      return;
    }

    const insertEntries = async (entries: typeof verified) => {
      const docs = entries.map(toDraft);
      if (!docs.length) return 0;
      const created = await QuestionModel.insertMany(docs, { ordered: true });
      return created.length;
    };

    if (phase === "canary") {
      const canary = verified.slice(0, 5);
      const canaryCodes = new Set(canary.map((entry) => entry.code));
      if (current.length > 5 || current.some((q: any) => !canaryCodes.has(String(q.questionCode || "").toUpperCase()))) {
        throw new Error(`BIO26 canary contains unexpected resume state; found ${current.length}`);
      }
      await pool(canary, 5, verifyRemote);
      const missing = canary.filter((entry) => !currentCodes.has(entry.code));
      if (missing.length) await insertEntries(missing);
      const check = await QuestionModel.find({ "sourceMeta.importBatchId": BATCH_ID }).select("questionCode approvalStatus").lean() as any[];
      const checkCodes = new Set(check.map((q: any) => String(q.questionCode || "").toUpperCase()));
      if (
        check.length !== 5 ||
        checkCodes.size !== 5 ||
        [...canaryCodes].some((code) => !checkCodes.has(code)) ||
        check.some((q: any) => q.approvalStatus !== "draft")
      ) {
        throw new Error("BIO26 canary verification failed");
      }
      console.log(`BIO26_CANARY_PASS count=5 drafts=5 insertedThisRun=${missing.length}`);
      return;
    }

    if (phase === "full") {
      if (current.length < 5 || current.length > EXPECTED_COUNT) {
        throw new Error(`BIO26 full phase requires completed canary/resume state; current=${current.length}`);
      }
      const pending = verified.filter((entry) => !currentCodes.has(entry.code));
      let done = current.length;
      for (let i = 0; i < pending.length; i += 100) {
        const group = pending.slice(i, i + 100);
        await pool(group.filter((_, idx) => idx % 10 === 0), 8, verifyRemote);
        done += await insertEntries(group);
        console.log(`BIO26_IMPORT_PROGRESS ${done}/${EXPECTED_COUNT}`);
      }
    }

    const final = await QuestionModel.find({ "sourceMeta.importBatchId": BATCH_ID })
      .select("questionCode approvalStatus imageUrl sourceMeta")
      .sort({ createdAt: 1 })
      .lean() as any[];
    const finalCodes = new Set(final.map((q: any) => String(q.questionCode || "").toUpperCase()));
    const finalHashes = new Set(final.map((q: any) => String(q.sourceMeta?.imageHash || "").toLowerCase()));
    const finalSourceIds = new Set(final.map((q: any) => String(q.sourceMeta?.sourceItemId || "").toUpperCase()));
    if (
      final.length !== EXPECTED_COUNT ||
      finalCodes.size !== EXPECTED_COUNT ||
      finalHashes.size !== EXPECTED_COUNT ||
      finalSourceIds.size !== EXPECTED_COUNT ||
      final.some((q: any) => q.approvalStatus !== "draft")
    ) throw new Error("BIO26 final draft integrity gate failed");

    const finalSamples = verified.filter((_, i) => i % Math.max(1, Math.floor(verified.length / 30)) === 0).slice(0, 30);
    await pool(finalSamples, 10, verifyRemote);
    console.log(`BIO26_IMPORT_DRAFT_PASS count=${EXPECTED_COUNT} drafts=${EXPECTED_COUNT} liveImageSamples=${finalSamples.length}`);
  } finally {
    await rm(work, { recursive: true, force: true }).catch(() => undefined);
  }
}
