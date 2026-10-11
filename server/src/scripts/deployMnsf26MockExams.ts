import dotenv from "dotenv";
dotenv.config({ path: "./.env" });
dotenv.config({ path: "./server/.env" });
dotenv.config({ path: "../.env" });

import dns from "node:dns";
dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1"]);

import fs from "node:fs";
import path from "node:path";
import mongoose from "mongoose";
import { QUANT_TAXONOMY } from "./deployQuantTaxonomy25.js";

const SUBJECT_ID = "sub_1777779748206";
const PATH_ID = "p_1777779653351";
const SECTION_ID = "sec_sub_1777779748206_1";
const NUM_EXAMS = 5;
const QUESTIONS_PER_EXAM = 60;

export async function deployMnsf26MockExams() {
  const isApply = process.argv.includes("--apply");
  console.log("==================================================================");
  console.log(`MNSF26 EXCLUSIVE MOCK EXAMS GENERATOR (${isApply ? "LIVE APPLY" : "DRY RUN"})`);
  console.log("==================================================================\n");

  // 1. Load manifest and filter strictly MNSF26 approved questions
  const candidates = [
    path.resolve(process.cwd(), "docs/content/mnsf26/MNSF26_IMPORT_MANIFEST_READY_V1.json"),
    path.resolve(process.cwd(), "../docs/content/mnsf26/MNSF26_IMPORT_MANIFEST_READY_V1.json"),
  ];
  const manifestPath = candidates.find((p) => fs.existsSync(p));
  if (!manifestPath) {
    throw new Error(`Manifest file not found: ${candidates.join(", ")}`);
  }

  const manifestData = JSON.parse(fs.readFileSync(manifestPath, "utf-8")) as {
    records: Array<{
      sourceKey: string;
      questionCode: string;
      canonicalMainSkill: string;
      canonicalSubskill: string;
      importEligible: boolean;
      difficulty: string;
    }>;
  };

  const mnsfEligible = manifestData.records.filter((r) => r.importEligible === true);
  console.log(`[1] Loaded ${mnsfEligible.length} eligible questions strictly from MNSF26.`);

  // Map each question to its standard DB ID
  const toDbId = (r: { sourceKey: string }) =>
    `q_qdr_qnt_mnsf26_${r.sourceKey.toLowerCase().replace(/[^a-z0-9_]/g, "_")}`;

  // Group questions by main skill
  const skillToQuestions = new Map<string, string[]>();
  for (const s of QUANT_TAXONOMY) {
    skillToQuestions.set(s.id, []);
  }

  for (const r of mnsfEligible) {
    const list = skillToQuestions.get(r.canonicalMainSkill) || [];
    list.push(toDbId(r));
    skillToQuestions.set(r.canonicalMainSkill, list);
  }

  // 2. Build 5 balanced mock exams strictly from MNSF26 questions
  console.log(`\n[2] Building ${NUM_EXAMS} balanced mock exams (60 questions each) strictly from MNSF26:`);
  const exams: any[] = [];
  const usedAcrossAllExams = new Set<string>();

  for (let e = 1; e <= NUM_EXAMS; e++) {
    const examId = `exam_mnsf26_mock_${String(e).padStart(2, "0")}`;
    const examQuestions: string[] = [];

    // Step A: Pick 2 questions from each available main skill to ensure broad coverage
    for (const item of QUANT_TAXONOMY) {
      const pool = skillToQuestions.get(item.id) || [];
      if (pool.length === 0) continue;
      // Offset slice so each exam gets fresh questions
      const offset = ((e - 1) * 2) % Math.max(1, pool.length);
      const candidates = pool.slice(offset, offset + 2);
      for (const qId of candidates) {
        if (!examQuestions.includes(qId)) {
          examQuestions.push(qId);
        }
      }
    }

    // Step B: Fill remaining slots up to 60 using unused MNSF26 questions
    if (examQuestions.length < QUESTIONS_PER_EXAM) {
      for (const r of mnsfEligible) {
        const qId = toDbId(r);
        if (!examQuestions.includes(qId) && !usedAcrossAllExams.has(qId)) {
          examQuestions.push(qId);
          if (examQuestions.length >= QUESTIONS_PER_EXAM) break;
        }
      }
    }

    // Step C: If still under 60 (wrap-around fallback), pick from any eligible MNSF26
    if (examQuestions.length < QUESTIONS_PER_EXAM) {
      for (const r of mnsfEligible) {
        const qId = toDbId(r);
        if (!examQuestions.includes(qId)) {
          examQuestions.push(qId);
          if (examQuestions.length >= QUESTIONS_PER_EXAM) break;
        }
      }
    }

    const final60 = examQuestions.slice(0, QUESTIONS_PER_EXAM);
    final60.forEach((id) => usedAcrossAllExams.add(id));

    console.log(`    - Exam ${e} (${examId}): ${final60.length} questions (100% MNSF26)`);
    if (final60.length !== QUESTIONS_PER_EXAM) {
      throw new Error(`Exam ${examId} has ${final60.length} questions, expected ${QUESTIONS_PER_EXAM}`);
    }

    exams.push({
      id: examId,
      title: `اختبار المنصف التجريبي (${e}) — القسم الكمي`,
      description: `اختبار محاكاة معياري متوازن (60 سؤالاً) مخصص للقسم الكمي من بنك كتاب المنصف 26 حصرياً، يغطي المهارات الـ 25 بنسب قياسية دقيقة.`,
      pathId: PATH_ID,
      subjectId: SUBJECT_ID,
      sectionId: SECTION_ID,
      type: "quiz",
      quizKind: "mock",
      questionIds: final60,
      learningPlacements: [
        {
          pathId: PATH_ID,
          subjectId: SUBJECT_ID,
          slot: "tests",
          accessType: "free",
          isVisible: true,
          order: 100 + e, // Non-conflicting order to preserve existing exams
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ],
      settings: {
        showExplanations: true,
        showAnswers: true,
        showResultsReport: true,
        timeLimit: 60,
        maxAttempts: 3,
        passingScore: 65,
        randomizeQuestions: true,
        showProgressBar: true,
      },
      access: { type: "free", price: 0, allowedGroupIds: [] },
      approvalStatus: "approved",
      isPublished: true,
      sourceDocumentCode: "MNSF26",
    });
  }

  if (!isApply) {
    console.log("\n==================================================================");
    console.log("DRY RUN COMPLETED: All 5 MNSF26 exams validated successfully.");
    console.log("Existing quizzes and exams are 100% PRESERVED (no deletion).");
    console.log("To apply to live database, run with: --apply");
    console.log("==================================================================");
    return;
  }

  // 3. Connect to MongoDB Atlas and idempotent upsert ONLY
  const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI || "";
  if (!mongoUri) {
    throw new Error("MONGODB_URI not found in environment.");
  }

  console.log("\n[3] Connecting to MongoDB...");
  await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 15_000 });
  const db = mongoose.connection.db;
  if (!db) throw new Error("Database handle is null.");
  const quizzesCol = db.collection("quizzes");

  console.log("\n[4] Upserting 5 MNSF26 mock exams into database (WITHOUT deleting existing quizzes)...");
  for (const exam of exams) {
    await quizzesCol.updateOne(
      { id: exam.id },
      {
        $set: {
          ...exam,
          updatedAt: new Date(),
        },
        $setOnInsert: {
          _id: exam.id as any,
          createdAt: new Date(),
        },
      },
      { upsert: true }
    );
    console.log(`    ✓ Upserted: ${exam.title} (${exam.id})`);
  }

  await mongoose.disconnect();
  console.log("\n==================================================================");
  console.log("MNSF26 EXCLUSIVE MOCK EXAMS DEPLOYED SUCCESSFULLY!");
  console.log("Existing exams were preserved completely.");
  console.log("==================================================================");
}

if (process.argv[1] && process.argv[1].includes("deployMnsf26MockExams")) {
  deployMnsf26MockExams().catch((err) => {
    console.error("Exam generation failed:", err);
    process.exit(1);
  });
}
