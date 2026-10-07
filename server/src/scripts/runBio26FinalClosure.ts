import mongoose from "mongoose";
import { env } from "../config/env.js";
import { QuestionModel } from "../models/Question.js";
import { QuizModel } from "../models/Quiz.js";
import { SkillModel } from "../models/Skill.js";
import { SubjectModel } from "../models/Subject.js";
import {
  createLocalApiClient,
  verifyLiveImages,
} from "../app/bootstrap/questionPilotPackageImportSupport.js";

const BATCH_ID = "TAH-BIO-BIO26-FULL-V1";
const EXPECTED_COUNT = 2832;
const EXPECTED_MAIN = 29;
const EXPECTED_SUB = 98;
const EXPECTED_PATH_ID = "p_1777779653351";
const EXPECTED_SUBJECT_ID = "sub_tah_biology_bio26";
const PROTECTED_LEGACY_SUBJECT_ID = "sub_1784980740570";
const SAMPLE_CODE = "TAH-BIO-BIO26-L01-Q001";
const AUTHORIZATION = "BIO26_APPROVE_2832";
const APPROVER = "BIO26_FULL_CLOSURE_2026_10_07";
const REVIEW_NOTE_PATTERN = /تم\s+التحقق.*بصري|verified\s+visually/i;

let started = false;

const fail = (message: string): never => {
  throw new Error(message);
};

const unique = (values: unknown[]) =>
  new Set(values.map((value) => String(value || "").trim()).filter(Boolean));

const publicQuestionUrl = () => {
  const query = new URLSearchParams({
    subject: EXPECTED_SUBJECT_ID,
    search: SAMPLE_CODE,
    summary: "true",
    noTotal: "true",
    limit: "5",
  });
  return `http://127.0.0.1:${env.PORT}/api/quizzes/questions?${query.toString()}`;
};

async function publicQuestionLookup() {
  const response = await fetch(publicQuestionUrl(), {
    headers: { accept: "application/json" },
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) fail(`BIO26 learner question lookup HTTP ${response.status}`);
  const payload = await response.json() as unknown;
  if (!Array.isArray(payload)) fail("BIO26 learner question lookup returned a non-array payload");
  return payload as Array<Record<string, unknown>>;
}

async function verifyDatabase(expectedStatus: "draft" | "approved") {
  const [questions, subject, legacy, taxonomy] = await Promise.all([
    QuestionModel.find({ "sourceMeta.importBatchId": BATCH_ID }).sort({ createdAt: 1 }).lean() as Promise<any[]>,
    SubjectModel.findById(EXPECTED_SUBJECT_ID).lean() as Promise<any>,
    SubjectModel.findById(PROTECTED_LEGACY_SUBJECT_ID).lean() as Promise<any>,
    SkillModel.find({ pathId: EXPECTED_PATH_ID, subjectId: EXPECTED_SUBJECT_ID })
      .select("id sectionId subSkills")
      .lean() as Promise<any[]>,
  ]);

  if (!subject || String(subject.pathId || "") !== EXPECTED_PATH_ID || String(subject.name || "") !== "الأحياء") {
    fail("BIO26 dedicated subject integrity failed");
  }
  if (!legacy || !String(legacy.name || "").includes("البيئة")) {
    fail("BIO26 protected علم البيئة subject integrity failed");
  }
  if (questions.length !== EXPECTED_COUNT) {
    fail(`BIO26 count mismatch expected=${EXPECTED_COUNT} got=${questions.length}`);
  }

  const productionSubCount = taxonomy.reduce(
    (sum, skill) => sum + (Array.isArray(skill.subSkills) ? skill.subSkills.length : 0),
    0,
  );
  if (taxonomy.length !== EXPECTED_MAIN || productionSubCount !== EXPECTED_SUB) {
    fail(`BIO26 taxonomy drift main=${taxonomy.length} sub=${productionSubCount}`);
  }

  const codes = unique(questions.map((q) => q.questionCode));
  const sourceIds = unique(questions.map((q) => q.sourceMeta?.sourceItemId));
  const hashes = unique(questions.map((q) => q.sourceMeta?.imageHash));
  if (codes.size !== EXPECTED_COUNT || sourceIds.size !== EXPECTED_COUNT || hashes.size !== EXPECTED_COUNT) {
    fail("BIO26 canonical identity uniqueness failed");
  }

  const mainIds = new Set<string>();
  const subIds = new Set<string>();
  const errors: string[] = [];

  for (const q of questions) {
    const code = String(q.questionCode || "").toUpperCase();
    const main = String(q.skillId || "");
    const sub = String(q.subSkillId || "");
    const mainMatch = main.match(/^skill_tah_bio_(\d{2})$/);
    const skillIds = Array.isArray(q.skillIds) ? q.skillIds.map(String) : [];
    const options = Array.isArray(q.options) ? q.options : [];
    const optionTexts = Array.isArray(q.aiContext?.optionTexts)
      ? q.aiContext.optionTexts.map((value: unknown) => String(value || "").trim())
      : [];
    const hash = String(q.sourceMeta?.imageHash || "").trim().toLowerCase();
    const imageUrl = String(q.imageUrl || "").trim();

    if (
      !/^TAH-BIO-BIO26-L\d{2}-Q\d{3}$/.test(code) ||
      String(q.pathId || "") !== EXPECTED_PATH_ID ||
      String(q.subject || "") !== EXPECTED_SUBJECT_ID ||
      String(q.subjectId || "") !== EXPECTED_SUBJECT_ID ||
      String(q.sourceMeta?.documentCode || "").toUpperCase() !== "BIO26" ||
      !/^BIO26-PDF\d{3}-L\d{2}-S\d+-Q\d{3}$/.test(String(q.sourceMeta?.sourceItemId || "").toUpperCase()) ||
      !mainMatch ||
      !sub.startsWith(`sub_tah_bio_${mainMatch?.[1] || ""}_`) ||
      String(q.sectionId || "") !== `sec_sub_biology_${Number(mainMatch?.[1] || 0)}` ||
      !skillIds.includes(main) ||
      !skillIds.includes(sub) ||
      options.length !== 4 ||
      !Number.isInteger(q.correctOptionIndex) ||
      q.correctOptionIndex < 0 ||
      q.correctOptionIndex > 3 ||
      optionTexts.length !== 4 ||
      optionTexts.some((value: string) => !value) ||
      String(q.aiContext?.optionTextsSource || "").trim().toUpperCase() !== "SOURCE_PDF" ||
      q.aiContext?.optionTextsVerified !== true ||
      !String(q.aiContext?.readableText || "").trim() ||
      !String(q.aiContext?.visualDescription || "").trim() ||
      !String(q.explanation || "").trim() ||
      !/^[a-f0-9]{64}$/.test(hash) ||
      !imageUrl.startsWith("https://") ||
      !imageUrl.includes(code) ||
      !imageUrl.toLowerCase().includes(hash) ||
      String(q.approvalStatus || "") !== expectedStatus
    ) {
      errors.push(code);
    }

    if (expectedStatus === "approved") {
      if (
        String(q.approvedBy || "") !== APPROVER ||
        !Number.isFinite(Number(q.approvedAt)) ||
        Number(q.approvedAt) <= 0 ||
        !REVIEW_NOTE_PATTERN.test(String(q.reviewerNotes || ""))
      ) {
        errors.push(code);
      }
    }

    mainIds.add(main);
    subIds.add(sub);
  }

  if (errors.length) fail(`BIO26 integrity mismatches=${new Set(errors).size}`);
  if (mainIds.size !== EXPECTED_MAIN || subIds.size !== EXPECTED_SUB) {
    fail(`BIO26 imported skill coverage main=${mainIds.size} sub=${subIds.size}`);
  }

  const ids = questions.map((q) => String(q.id || q._id || "")).filter(Boolean);
  const linkedQuizCount = await QuizModel.countDocuments({
    $or: [
      { questionIds: { $in: ids } },
      { "mockExam.sections.questionIds": { $in: ids } },
    ],
  });
  if (linkedQuizCount !== 0) {
    fail(`BIO26 closure requires an unlinked canonical batch; linkedQuizCount=${linkedQuizCount}`);
  }

  return {
    questions,
    count: questions.length,
    uniqueQuestionCodes: codes.size,
    uniqueSourceItemIds: sourceIds.size,
    uniqueImageHashes: hashes.size,
    coveredMainSkills: mainIds.size,
    coveredSubSkills: subIds.size,
    linkedQuizCount,
  };
}

async function verifyStaffSample(expectedStatus: "draft" | "approved") {
  const api = await createLocalApiClient();
  const query = new URLSearchParams({
    subject: EXPECTED_SUBJECT_ID,
    search: SAMPLE_CODE,
    approvalStatus: expectedStatus,
    limit: "5",
  });
  const payload = await api("GET", `/quizzes/questions?${query.toString()}`);
  if (!Array.isArray(payload) || payload.length !== 1 || String(payload[0]?.questionCode || "") !== SAMPLE_CODE) {
    fail(`BIO26 staff API sample lookup failed for status=${expectedStatus}`);
  }
  return payload[0];
}

async function verifyDraftLiveE2E(questions: any[]) {
  await verifyStaffSample("draft");
  const learnerItems = await publicQuestionLookup();
  if (learnerItems.some((item) => String(item.questionCode || "") === SAMPLE_CODE)) {
    fail("BIO26 draft leaked through learner question API");
  }
  const liveImageSamples = await verifyLiveImages(questions);
  console.log(`BIO26_LIVE_E2E_DRAFT_PASS learnerHidden=1 liveImageSamples=${liveImageSamples}`);
}

async function verifyApprovedLiveE2E(questions: any[]) {
  await verifyStaffSample("approved");
  const learnerItems = await publicQuestionLookup();
  const sample = learnerItems.find((item) => String(item.questionCode || "") === SAMPLE_CODE);
  if (!sample) throw new Error("BIO26 approved sample is not learner-visible");
  for (const forbidden of [
    "correctOptionIndex",
    "explanation",
    "hint",
    "solvingStrategy",
    "aiContext",
    "voiceExplanation",
    "sourceMeta",
    "reviewerNotes",
  ]) {
    if (Object.prototype.hasOwnProperty.call(sample, forbidden)) {
      fail(`BIO26 learner answer/provenance leak field=${forbidden}`);
    }
  }
  if (!String(sample.imageUrl || "").startsWith("https://")) {
    fail("BIO26 learner sample is missing its live image URL");
  }
  const liveImageSamples = await verifyLiveImages(questions);
  console.log(`BIO26_LIVE_E2E_APPROVED_PASS learnerVisible=1 answerLeak=0 liveImageSamples=${liveImageSamples}`);
}

async function approveAtomically() {
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const [total, drafts, approved] = await Promise.all([
        QuestionModel.countDocuments({ "sourceMeta.importBatchId": BATCH_ID }).session(session),
        QuestionModel.countDocuments({
          "sourceMeta.importBatchId": BATCH_ID,
          approvalStatus: "draft",
        }).session(session),
        QuestionModel.countDocuments({
          "sourceMeta.importBatchId": BATCH_ID,
          approvalStatus: "approved",
        }).session(session),
      ]);
      if (total !== EXPECTED_COUNT || drafts !== EXPECTED_COUNT || approved !== 0) {
        fail(`BIO26 approval precondition drift total=${total} drafts=${drafts} approved=${approved}`);
      }

      const now = Date.now();
      const result = await QuestionModel.updateMany(
        {
          "sourceMeta.importBatchId": BATCH_ID,
          approvalStatus: "draft",
        },
        {
          $set: {
            approvalStatus: "approved",
            approvedBy: APPROVER,
            approvedAt: now,
          },
        },
        { session },
      );
      if (result.matchedCount !== EXPECTED_COUNT || result.modifiedCount !== EXPECTED_COUNT) {
        fail(`BIO26 approval write mismatch matched=${result.matchedCount} modified=${result.modifiedCount}`);
      }

      const post = await QuestionModel.countDocuments({
        "sourceMeta.importBatchId": BATCH_ID,
        approvalStatus: "approved",
        approvedBy: APPROVER,
      }).session(session);
      if (post !== EXPECTED_COUNT) {
        fail(`BIO26 transaction post-count mismatch approved=${post}`);
      }
    }, {
      readConcern: { level: "snapshot" },
      writeConcern: { w: "majority" },
    });
  } finally {
    await session.endSession();
  }
}

async function rollbackThisRunApproval(reason: unknown) {
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const ownedApproved = await QuestionModel.countDocuments({
        "sourceMeta.importBatchId": BATCH_ID,
        approvalStatus: "approved",
        approvedBy: APPROVER,
      }).session(session);
      if (ownedApproved !== EXPECTED_COUNT) {
        fail(`BIO26 rollback refused because owned approved count=${ownedApproved}`);
      }
      const result = await QuestionModel.updateMany(
        {
          "sourceMeta.importBatchId": BATCH_ID,
          approvalStatus: "approved",
          approvedBy: APPROVER,
        },
        {
          $set: {
            approvalStatus: "draft",
            approvedBy: "",
            approvedAt: null,
          },
        },
        { session },
      );
      if (result.matchedCount !== EXPECTED_COUNT || result.modifiedCount !== EXPECTED_COUNT) {
        fail(`BIO26 rollback write mismatch matched=${result.matchedCount} modified=${result.modifiedCount}`);
      }
    }, {
      readConcern: { level: "snapshot" },
      writeConcern: { w: "majority" },
    });
    const restored = await QuestionModel.countDocuments({
      "sourceMeta.importBatchId": BATCH_ID,
      approvalStatus: "draft",
    });
    if (restored !== EXPECTED_COUNT) fail(`BIO26 rollback verification failed drafts=${restored}`);
    console.log(
      `BIO26_APPROVAL_ROLLBACK_PASS drafts=${restored} reason=${reason instanceof Error ? reason.message : String(reason)}`,
    );
  } finally {
    await session.endSession();
  }
}

export async function runBio26FinalClosureIfRequested() {
  if (started || process.env.BIO26_FINAL_CLOSURE_AUTHORIZATION !== AUTHORIZATION) return;
  started = true;

  const [total, drafts, approved] = await Promise.all([
    QuestionModel.countDocuments({ "sourceMeta.importBatchId": BATCH_ID }),
    QuestionModel.countDocuments({ "sourceMeta.importBatchId": BATCH_ID, approvalStatus: "draft" }),
    QuestionModel.countDocuments({ "sourceMeta.importBatchId": BATCH_ID, approvalStatus: "approved" }),
  ]);

  if (total !== EXPECTED_COUNT) fail(`BIO26 closure count mismatch total=${total}`);
  if (approved === EXPECTED_COUNT && drafts === 0) {
    const post = await verifyDatabase("approved");
    await verifyApprovedLiveE2E(post.questions);
    console.log(`BIO26_POST_APPROVAL_GATE_PASS count=${post.count} main=${post.coveredMainSkills} sub=${post.coveredSubSkills}`);
    return;
  }
  if (approved !== 0 || drafts !== EXPECTED_COUNT) {
    fail(`BIO26 partial approval state refused drafts=${drafts} approved=${approved}`);
  }

  const pre = await verifyDatabase("draft");
  console.log(
    `BIO26_POST_IMPORT_DRAFT_GATE_PASS count=${pre.count} main=${pre.coveredMainSkills} sub=${pre.coveredSubSkills} linked=${pre.linkedQuizCount}`,
  );
  await verifyDraftLiveE2E(pre.questions);

  let wroteApprovalThisRun = false;
  try {
    await approveAtomically();
    wroteApprovalThisRun = true;
    console.log(`BIO26_APPROVAL_WRITE_PASS count=${EXPECTED_COUNT} approver=${APPROVER}`);

    const post = await verifyDatabase("approved");
    await verifyApprovedLiveE2E(post.questions);
    console.log(
      `BIO26_POST_APPROVAL_GATE_PASS count=${post.count} main=${post.coveredMainSkills} sub=${post.coveredSubSkills} linked=${post.linkedQuizCount}`,
    );
  } catch (error) {
    if (wroteApprovalThisRun) {
      try {
        await rollbackThisRunApproval(error);
      } catch (rollbackError) {
        throw new Error(
          `BIO26 post-approval failure AND rollback failure: original=${error instanceof Error ? error.message : String(error)}; rollback=${rollbackError instanceof Error ? rollbackError.message : String(rollbackError)}`,
        );
      }
    }
    throw error;
  }
}
