import dotenv from "dotenv";
dotenv.config({ path: "./.env" });
dotenv.config({ path: "./server/.env" });
dotenv.config({ path: "../.env" });

import dns from "node:dns";
dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1"]);

import fs from "node:fs";
import path from "node:path";
import mongoose from "mongoose";

const SUBJECT_ID = "sub_1777779748206";
const PATH_ID = "p_1777779653351";
const SECTION_ID = "sec_sub_1777779748206_1";
const QUESTIONS_PER_EXAM = 50;

const EXAM_TITLES = [
  "الاختبار الأول",
  "الاختبار الثاني",
  "الاختبار الثالث",
  "الاختبار الرابع",
  "الاختبار الخامس",
  "الاختبار السادس",
  "الاختبار السابع",
  "الاختبار الثامن",
  "الاختبار التاسع",
  "الاختبار العاشر",
];

// Mathematical domains for standardized 50-question quantitative distribution
const DOMAIN_MAP = {
  // المجال الأول: الحساب والأعداد والعمليات والكسور والعشري والأسس (15 سؤالاً)
  d1_arithmetic: [
    "skill_quant_01",
    "skill_quant_02",
    "skill_quant_03",
    "skill_quant_04",
    "skill_quant_05",
  ],
  // المجال الثاني: الجبر والتناسب والنسبة والمعادلات والأعمار والسرعة (12 سؤالاً)
  d2_algebra: [
    "skill_quant_07",
    "skill_quant_08",
    "skill_quant_09",
    "skill_quant_10",
    "skill_quant_12",
    "skill_quant_13",
    "skill_quant_14",
  ],
  // المجال الثالث: الإحصاء والاحتمالات وتفسير البيانات والمنطق (5 أسئلة)
  d3_stats_logic: [
    "skill_quant_15",
    "skill_quant_16",
    "skill_quant_17",
    "skill_quant_18",
  ],
  // المجال الرابع: الهندسة والزوايا والمثلثات والأشكال الرباعية والدائرة والمجسمات (18 سؤالاً)
  d4_geometry: [
    "skill_quant_19",
    "skill_quant_20",
    "skill_quant_21",
    "skill_quant_22",
    "skill_quant_23",
    "skill_quant_24",
    "skill_quant_25",
  ],
};

const DOMAIN_TARGETS = {
  d1_arithmetic: 15,
  d2_algebra: 12,
  d3_stats_logic: 5,
  d4_geometry: 18,
};

export async function deployMnsf26MockExams() {
  const isApply = process.argv.includes("--apply");
  console.log("==================================================================");
  console.log(`MNSF26 BALANCED 50-QUESTION EXAMS GENERATOR (${isApply ? "LIVE APPLY" : "DRY RUN"})`);
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

  // Partition questions into the 4 mathematical domains
  const domainPools: Record<string, typeof mnsfEligible> = {
    d1_arithmetic: [],
    d2_algebra: [],
    d3_stats_logic: [],
    d4_geometry: [],
  };

  for (const r of mnsfEligible) {
    for (const [dom, skills] of Object.entries(DOMAIN_MAP)) {
      if (skills.includes(r.canonicalMainSkill)) {
        domainPools[dom].push(r);
        break;
      }
    }
  }

  console.log("    Available question pool by domain:");
  console.log(`      - الحساب والأعداد (d1):   ${domainPools.d1_arithmetic.length} سؤالاً`);
  console.log(`      - الجبر والمسائل (d2):    ${domainPools.d2_algebra.length} سؤالاً`);
  console.log(`      - الإحصاء والمنطق (d3):    ${domainPools.d3_stats_logic.length} سؤالاً`);
  console.log(`      - الهندسة والقياس (d4):   ${domainPools.d4_geometry.length} سؤالاً`);

  // 2. Build 10 balanced exams of 50 questions each
  console.log(`\n[2] Building ${EXAM_TITLES.length} balanced exams (50 questions each) distributed across all skills:`);
  const exams: any[] = [];
  const usedQuestionKeys = new Set<string>();

  for (let e = 1; e <= EXAM_TITLES.length; e++) {
    const examTitle = EXAM_TITLES[e - 1];
    const examId = `exam_mnsf26_mock_${String(e).padStart(2, "0")}`;
    const examQuestionIds: string[] = [];

    for (const [dom, targetCount] of Object.entries(DOMAIN_TARGETS)) {
      let picked = 0;
      for (const r of domainPools[dom]) {
        if (!usedQuestionKeys.has(r.sourceKey)) {
          examQuestionIds.push(toDbId(r));
          usedQuestionKeys.add(r.sourceKey);
          picked++;
          if (picked === targetCount) break;
        }
      }
      if (picked < targetCount) {
        throw new Error(`Shortage in domain ${dom} for ${examTitle}: picked ${picked}, expected ${targetCount}`);
      }
    }

    if (examQuestionIds.length !== QUESTIONS_PER_EXAM) {
      throw new Error(`${examTitle} has ${examQuestionIds.length} questions, expected ${QUESTIONS_PER_EXAM}`);
    }

    console.log(`    ✓ ${examTitle} (${examId}): 50 سؤالاً متوازنة (15 حساب + 12 جبر + 5 إحصاء + 18 هندسة)`);

    exams.push({
      id: examId,
      title: examTitle,
      description: `اختبار محاكاة معياري متوازن (50 سؤالاً) للقسم الكمي من كتاب المنصف 26، موزع بدقة على كافة المهارات الرياضية (حساب، جبر، إحصاء، هندسة).`,
      pathId: PATH_ID,
      subjectId: SUBJECT_ID,
      sectionId: SECTION_ID,
      type: "quiz",
      quizKind: "mock",
      questionIds: examQuestionIds,
      learningPlacements: [
        {
          pathId: PATH_ID,
          subjectId: SUBJECT_ID,
          slot: "tests",
          accessType: "free",
          isVisible: true,
          order: 200 + e, // Non-conflicting order to preserve all existing quizzes
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ],
      settings: {
        showExplanations: true,
        showAnswers: true,
        showResultsReport: true,
        timeLimit: 50, // 50 minutes for 50 questions
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

  console.log(`\n    إجمالي الأسئلة المستقلة المستخدمة في الـ 10 اختبارات: ${usedQuestionKeys.size} سؤالاً بدون أي تكرار بين الاختبارات.`);

  if (!isApply) {
    console.log("\n==================================================================");
    console.log("DRY RUN COMPLETED: All 10 exams (50 questions each) validated successfully.");
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

  console.log("\n[4] Upserting 10 MNSF26 mock exams into database (PRESERVING existing quizzes)...");
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
  console.log("ALL 10 MNSF26 EXAMS DEPLOYED SUCCESSFULLY!");
  console.log("Existing quizzes and exams were preserved completely.");
  console.log("==================================================================");
}

if (process.argv[1] && process.argv[1].includes("deployMnsf26MockExams")) {
  deployMnsf26MockExams().catch((err) => {
    console.error("Exam generation failed:", err);
    process.exit(1);
  });
}
