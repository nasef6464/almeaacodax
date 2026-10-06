import mongoose from "mongoose";
import { env } from "../config/env.js";
import { QuestionModel } from "../models/Question.js";
import { QuizModel } from "../models/Quiz.js";
import { SkillModel } from "../models/Skill.js";

const BATCH_ID = "TAH-CHEM-CHEM26-FULL-V1";
const EXPECTED_COUNT = 1708;
const EXPECTED_MAIN = 27;
const EXPECTED_SUB = 99;
const EXPECTED_PATH_ID = "p_1777779653351";
const EXPECTED_SUBJECT_ID = "sub_1784980728386";
const expectStatus = process.argv.includes("--approved") ? "approved" : "draft";

const fail = (message: string): never => {
  throw new Error(message);
};

const uniqueStrings = (values: unknown[]) =>
  new Set(values.map((value) => String(value || "").trim()).filter(Boolean));

async function main() {
  await mongoose.connect(env.MONGODB_URI);
  try {
    const questions = await QuestionModel.find({ "sourceMeta.importBatchId": BATCH_ID }).lean() as any[];
    if (questions.length !== EXPECTED_COUNT) {
      fail(`CHEM26 count mismatch: expected ${EXPECTED_COUNT}, received ${questions.length}`);
    }

    const codes = uniqueStrings(questions.map((q) => q.questionCode));
    const sourceIds = uniqueStrings(questions.map((q) => q?.sourceMeta?.sourceItemId));
    const hashes = uniqueStrings(questions.map((q) => q?.sourceMeta?.imageHash));
    if (codes.size !== EXPECTED_COUNT || sourceIds.size !== EXPECTED_COUNT || hashes.size !== EXPECTED_COUNT) {
      fail("CHEM26 canonical identity uniqueness gate failed");
    }

    const statusMismatch = questions.filter((q) => String(q.approvalStatus || "") !== expectStatus);
    if (statusMismatch.length) {
      fail(`CHEM26 expected all ${expectStatus}; mismatches=${statusMismatch.length}`);
    }

    const scopeErrors: string[] = [];
    const optionErrors: string[] = [];
    const imageErrors: string[] = [];
    const aiErrors: string[] = [];
    const visualNoteErrors: string[] = [];
    const mainIds = new Set<string>();
    const subIds = new Set<string>();

    for (const q of questions) {
      const code = String(q.questionCode || "").trim().toUpperCase();
      const skillId = String(q.skillId || "").trim();
      const subSkillId = String(q.subSkillId || "").trim();
      const sectionId = String(q.sectionId || "").trim();
      const match = skillId.match(/^skill_tah_chem_(\d{2})$/);
      if (
        String(q.pathId || "") !== EXPECTED_PATH_ID ||
        String(q.subject || "") !== EXPECTED_SUBJECT_ID ||
        String(q.subjectId || "") !== EXPECTED_SUBJECT_ID ||
        !match
      ) {
        scopeErrors.push(code);
        continue;
      }
      const expectedSection = `sec_sub_chemistry_${Number(match[1])}`;
      if (sectionId !== expectedSection || !subSkillId.startsWith(`sub_tah_chem_${match[1]}_`)) {
        scopeErrors.push(code);
      }
      const skillIds = Array.isArray(q.skillIds) ? q.skillIds.map(String) : [];
      if (!skillIds.includes(skillId) || !skillIds.includes(subSkillId)) scopeErrors.push(code);
      mainIds.add(skillId);
      subIds.add(subSkillId);

      const options = Array.isArray(q.options) ? q.options : [];
      if (options.length !== 4 || !Number.isInteger(q.correctOptionIndex) || q.correctOptionIndex < 0 || q.correctOptionIndex > 3) {
        optionErrors.push(code);
      }
      const optionTexts = Array.isArray(q?.aiContext?.optionTexts) ? q.aiContext.optionTexts : [];
      if (optionTexts.length !== 4 || optionTexts.some((value: unknown) => !String(value || "").trim())) {
        aiErrors.push(code);
      }
      if (!String(q.explanation || "").trim()) aiErrors.push(code);

      const hash = String(q?.sourceMeta?.imageHash || "").trim().toLowerCase();
      const imageUrl = String(q.imageUrl || "").trim();
      if (
        !/^[a-f0-9]{64}$/.test(hash) ||
        !/^https:\/\//i.test(imageUrl) ||
        !imageUrl.includes(code) ||
        !imageUrl.toLowerCase().includes(hash)
      ) {
        imageErrors.push(code);
      }

      if (expectStatus === "approved") {
        const note = String(q.reviewerNotes || "");
        if (!(/verified\s+visually/i.test(note) || /تم\s+التحقق.*بصري/i.test(note))) {
          visualNoteErrors.push(code);
        }
      }
    }

    if (scopeErrors.length) fail(`CHEM26 taxonomy scope errors=${new Set(scopeErrors).size}`);
    if (optionErrors.length) fail(`CHEM26 A/B/C/D integrity errors=${new Set(optionErrors).size}`);
    if (imageErrors.length) fail(`CHEM26 image identity errors=${new Set(imageErrors).size}`);
    if (aiErrors.length) fail(`CHEM26 AI/explanation errors=${new Set(aiErrors).size}`);
    if (visualNoteErrors.length) fail(`CHEM26 approved questions missing visual QA note=${new Set(visualNoteErrors).size}`);

    const taxonomy = await SkillModel.find({
      pathId: EXPECTED_PATH_ID,
      subjectId: EXPECTED_SUBJECT_ID,
    }).select("id subSkills").lean() as any[];
    const taxonomyMain = taxonomy.map((item) => String(item.id || item._id || "")).filter(Boolean);
    const taxonomySub = taxonomy.flatMap((item) =>
      (Array.isArray(item.subSkills) ? item.subSkills : []).map((sub: any) => String(sub?.id || "")).filter(Boolean),
    );
    if (taxonomyMain.length !== EXPECTED_MAIN || taxonomySub.length !== EXPECTED_SUB) {
      fail(`CHEM26 production taxonomy drift: main=${taxonomyMain.length}, sub=${taxonomySub.length}`);
    }
    if (mainIds.size !== EXPECTED_MAIN || subIds.size !== EXPECTED_SUB) {
      fail(`CHEM26 imported coverage drift: main=${mainIds.size}, sub=${subIds.size}`);
    }

    const ids = questions.map((q) => String(q.id || q._id || "")).filter(Boolean);
    const linkedQuizCount = await QuizModel.countDocuments({
      $or: [
        { questionIds: { $in: ids } },
        { "mockExam.sections.questionIds": { $in: ids } },
      ],
    });
    if (expectStatus === "draft" && linkedQuizCount !== 0) {
      fail(`CHEM26 draft batch must not be linked to quizzes; linkedQuizCount=${linkedQuizCount}`);
    }

    console.log(JSON.stringify({
      status: "PASS",
      project: "CHEM26",
      batchId: BATCH_ID,
      expectedApprovalStatus: expectStatus,
      count: questions.length,
      uniqueQuestionCodes: codes.size,
      uniqueSourceItemIds: sourceIds.size,
      uniqueImageHashes: hashes.size,
      coveredMainSkills: mainIds.size,
      coveredSubSkills: subIds.size,
      productionMainSkills: taxonomyMain.length,
      productionSubSkills: taxonomySub.length,
      linkedQuizCount,
    }, null, 2));
    console.log(expectStatus === "approved" ? "CHEM26_POST_APPROVAL_GATE_PASS" : "CHEM26_POST_IMPORT_DRAFT_GATE_PASS");
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((error) => {
  console.error("CHEM26_POST_IMPORT_GATE_FAILED", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
