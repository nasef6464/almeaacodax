import mongoose from "mongoose";
import { env } from "../config/env.js";
import { QuestionModel } from "../models/Question.js";
import { QuizModel } from "../models/Quiz.js";
import { SkillModel } from "../models/Skill.js";
import { SubjectModel } from "../models/Subject.js";

const BATCH_ID = "TAH-BIO-BIO26-FULL-V1";
const EXPECTED_COUNT = 2832;
const EXPECTED_MAIN = 29;
const EXPECTED_SUB = 98;
const EXPECTED_PATH_ID = "p_1777779653351";
const EXPECTED_SUBJECT_ID = "sub_tah_biology_bio26";
const PROTECTED_LEGACY_SUBJECT_ID = "sub_1784980740570";
const expectStatus = process.argv.includes("--approved") ? "approved" : "draft";
const PLACEHOLDER_OPTION_SEQUENCES = [
  ["A", "B", "C", "D"],
  ["أ", "ب", "ج", "د"],
] as const;

const fail = (message: string): never => { throw new Error(message); };
const unique = (values: unknown[]) => new Set(values.map((v) => String(v || "").trim()).filter(Boolean));

async function main() {
  await mongoose.connect(env.MONGODB_URI);
  try {
    const [questions, subject, legacy, taxonomy] = await Promise.all([
      QuestionModel.find({ "sourceMeta.importBatchId": BATCH_ID }).lean() as any,
      SubjectModel.findById(EXPECTED_SUBJECT_ID).lean() as any,
      SubjectModel.findById(PROTECTED_LEGACY_SUBJECT_ID).lean() as any,
      SkillModel.find({ pathId: EXPECTED_PATH_ID, subjectId: EXPECTED_SUBJECT_ID }).select("id sectionId subSkills").lean() as any,
    ]);
    if (!subject || String(subject.pathId || "") !== EXPECTED_PATH_ID || String(subject.name || "") !== "الأحياء") {
      fail("BIO26 dedicated subject integrity failed");
    }
    if (!legacy || !String(legacy.name || "").includes("البيئة")) fail("Protected علم البيئة subject integrity failed");
    if (questions.length !== EXPECTED_COUNT) fail(`BIO26 count mismatch: ${questions.length}`);
    const subCount = (taxonomy || []).reduce((s: number, x: any) => s + (Array.isArray(x.subSkills) ? x.subSkills.length : 0), 0);
    if ((taxonomy || []).length !== EXPECTED_MAIN || subCount !== EXPECTED_SUB) fail(`BIO26 taxonomy drift main=${taxonomy?.length || 0} sub=${subCount}`);

    const codes = unique(questions.map((q: any) => q.questionCode));
    const sourceIds = unique(questions.map((q: any) => q.sourceMeta?.sourceItemId));
    const hashes = unique(questions.map((q: any) => q.sourceMeta?.imageHash));
    if (codes.size !== EXPECTED_COUNT || sourceIds.size !== EXPECTED_COUNT || hashes.size !== EXPECTED_COUNT) {
      fail("BIO26 canonical identity uniqueness failed");
    }

    const scopeErrors: string[] = [];
    const machineErrors: string[] = [];
    const imageErrors: string[] = [];
    const reviewErrors: string[] = [];
    const statusErrors: string[] = [];
    const mainIds = new Set<string>();
    const subIds = new Set<string>();

    for (const q of questions) {
      const code = String(q.questionCode || "").toUpperCase();
      const main = String(q.skillId || "");
      const sub = String(q.subSkillId || "");
      const match = main.match(/^skill_tah_bio_(\d{2})$/);
      if (
        !/^TAH-BIO-BIO26-L\d{2}-Q\d{3}$/.test(code) ||
        String(q.pathId || "") !== EXPECTED_PATH_ID ||
        String(q.subject || "") !== EXPECTED_SUBJECT_ID ||
        String(q.subjectId || "") !== EXPECTED_SUBJECT_ID ||
        !match ||
        !sub.startsWith(`sub_tah_bio_${match?.[1] || ""}_`) ||
        String(q.sectionId || "") !== `sec_sub_biology_${Number(match?.[1] || 0)}`
      ) scopeErrors.push(code);
      const skillIds = Array.isArray(q.skillIds) ? q.skillIds.map(String) : [];
      if (!skillIds.includes(main) || !skillIds.includes(sub)) scopeErrors.push(code);
      mainIds.add(main); subIds.add(sub);

      const options = Array.isArray(q.options) ? q.options : [];
      const optionTexts = Array.isArray(q.aiContext?.optionTexts) ? q.aiContext.optionTexts : [];
      const normalizedOptionTexts = optionTexts.map((x: unknown) => String(x || "").trim());
      const normalizedUpper = normalizedOptionTexts.map((x: string) => x.toUpperCase());
      const isBarePlaceholderSequence = PLACEHOLDER_OPTION_SEQUENCES.some((sequence) =>
        sequence.every((value, index) => normalizedUpper[index] === value.toUpperCase()),
      );
      if (
        options.length !== 4 ||
        !Number.isInteger(q.correctOptionIndex) ||
        q.correctOptionIndex < 0 ||
        q.correctOptionIndex > 3 ||
        normalizedOptionTexts.length !== 4 ||
        normalizedOptionTexts.some((x: string) => !x) ||
        isBarePlaceholderSequence ||
        !String(q.aiContext?.readableText || "").trim() ||
        !String(q.aiContext?.visualDescription || "").trim() ||
        !String(q.explanation || "").trim()
      ) machineErrors.push(code);

      const hash = String(q.sourceMeta?.imageHash || "").toLowerCase();
      const imageUrl = String(q.imageUrl || "");
      if (!/^[a-f0-9]{64}$/.test(hash) || !imageUrl.includes(code) || !imageUrl.toLowerCase().includes(hash)) imageErrors.push(code);
      if (String(q.approvalStatus || "") !== expectStatus) statusErrors.push(code);
      if (expectStatus === "approved") {
        const note = String(q.reviewerNotes || "");
        if (!(/verified\s+visually/i.test(note) || /تم\s+التحقق.*بصري/i.test(note))) reviewErrors.push(code);
      }
    }
    if (scopeErrors.length) fail(`BIO26 scope errors=${new Set(scopeErrors).size}`);
    if (machineErrors.length) fail(`BIO26 machine-readable/AI errors=${new Set(machineErrors).size}`);
    if (imageErrors.length) fail(`BIO26 image identity errors=${new Set(imageErrors).size}`);
    if (statusErrors.length) fail(`BIO26 status mismatches=${new Set(statusErrors).size}`);
    if (reviewErrors.length) fail(`BIO26 visual reviewer-note errors=${new Set(reviewErrors).size}`);
    if (mainIds.size !== EXPECTED_MAIN || subIds.size !== EXPECTED_SUB) fail(`BIO26 imported skill coverage main=${mainIds.size} sub=${subIds.size}`);

    const ids = questions.map((q: any) => String(q.id || q._id || "")).filter(Boolean);
    const linkedQuizCount = await QuizModel.countDocuments({
      $or: [
        { questionIds: { $in: ids } },
        { "mockExam.sections.questionIds": { $in: ids } },
      ],
    });
    if (expectStatus === "draft" && linkedQuizCount !== 0) fail(`BIO26 drafts linked to quizzes=${linkedQuizCount}`);

    console.log(JSON.stringify({
      status: "PASS",
      project: "BIO26",
      batchId: BATCH_ID,
      expectedApprovalStatus: expectStatus,
      count: questions.length,
      uniqueQuestionCodes: codes.size,
      uniqueSourceItemIds: sourceIds.size,
      uniqueImageHashes: hashes.size,
      coveredMainSkills: mainIds.size,
      coveredSubSkills: subIds.size,
      productionMainSkills: taxonomy.length,
      productionSubSkills: subCount,
      linkedQuizCount,
      protectedLegacySubject: { id: PROTECTED_LEGACY_SUBJECT_ID, name: legacy.name },
    }, null, 2));
    console.log(expectStatus === "approved" ? "BIO26_POST_APPROVAL_GATE_PASS" : "BIO26_POST_IMPORT_DRAFT_GATE_PASS");
  } finally {
    await mongoose.disconnect();
  }
}
main().catch((error) => {
  console.error("BIO26_POST_IMPORT_VERIFY_FAILED", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
