import dotenv from "dotenv";
dotenv.config({ path: ".env.codex.local" });
dotenv.config({ path: "../.env.codex.local" });
dotenv.config({ path: "./.env" });
dotenv.config({ path: "./server/.env" });
dotenv.config({ path: "../.env" });

import fs from "node:fs";
import path from "node:path";
import mongoose from "mongoose";

const SUBJECT_ID = "sub_1777779748206";
const PATH_ID = "p_1777779639431";
const SECTION_ID = "sec_sub_1777779748206_1";
const QUESTIONS_PER_EXAM = 50;
const NUM_EXAMS = 40;

const ARABIC_ORDINAL_TITLES = [
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
  "الاختبار الحادي عشر",
  "الاختبار الثاني عشر",
  "الاختبار الثالث عشر",
  "الاختبار الرابع عشر",
  "الاختبار الخامس عشر",
  "الاختبار السادس عشر",
  "الاختبار السابع عشر",
  "الاختبار الثامن عشر",
  "الاختبار التاسع عشر",
  "الاختبار العشرون",
  "الاختبار الحادي والعشرون",
  "الاختبار الثاني والعشرون",
  "الاختبار الثالث والعشرون",
  "الاختبار الرابع والعشرون",
  "الاختبار الخامس والعشرون",
  "الاختبار السادس والعشرون",
  "الاختبار السابع والعشرون",
  "الاختبار الثامن والعشرون",
  "الاختبار التاسع والعشرون",
  "الاختبار الثلاثون",
  "الاختبار الحادي والثلاثون",
  "الاختبار الثاني والثلاثون",
  "الاختبار الثالث والثلاثون",
  "الاختبار الرابع والثلاثون",
  "الاختبار الخامس والثلاثون",
  "الاختبار السادس والثلاثون",
  "الاختبار السابع والثلاثون",
  "الاختبار الثامن والثلاثون",
  "الاختبار التاسع والثلاثون",
  "الاختبار الأربعون",
];

const DOMAIN_MAP: Record<string, string[]> = {
  arithmetic: [
    "skill_quant_01",
    "skill_quant_02",
    "skill_quant_03",
    "skill_quant_04",
    "skill_quant_05",
  ],
  algebra: [
    "skill_quant_07",
    "skill_quant_08",
    "skill_quant_09",
    "skill_quant_10",
    "skill_quant_12",
    "skill_quant_13",
    "skill_quant_14",
  ],
  stats: [
    "skill_quant_15",
    "skill_quant_16",
    "skill_quant_17",
    "skill_quant_18",
  ],
  geometry: [
    "skill_quant_19",
    "skill_quant_20",
    "skill_quant_21",
    "skill_quant_22",
    "skill_quant_23",
    "skill_quant_24",
    "skill_quant_25",
  ],
};

function getDomain(mainSkill: string): string {
  for (const [dom, skills] of Object.entries(DOMAIN_MAP)) {
    if (skills.includes(mainSkill)) return dom;
  }
  return "arithmetic";
}

export async function deployMnsf26MockExams() {
  const isApply = process.argv.includes("--apply");
  console.log("==================================================================");
  console.log(`MNSF26 FULL-BANK 40 EXAMS GENERATOR (${isApply ? "LIVE APPLY" : "DRY RUN"})`);
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
  console.log(`    Converting entire bank into ${NUM_EXAMS} standardized Qiyas-style exams (50 questions each).`);

  const toDbId = (r: { sourceKey: string }) =>
    `q_qdr_qnt_mnsf26_${r.sourceKey.toLowerCase().replace(/[^a-z0-9_]/g, "_")}`;

  // 2. Partition questions by domain and subskill to ensure maximal subskill diversity
  const subskillsByDomain: Record<string, Record<string, typeof mnsfEligible>> = {
    arithmetic: {},
    algebra: {},
    stats: {},
    geometry: {},
  };

  for (const q of mnsfEligible) {
    const dom = getDomain(q.canonicalMainSkill);
    if (!subskillsByDomain[dom][q.canonicalSubskill]) {
      subskillsByDomain[dom][q.canonicalSubskill] = [];
    }
    subskillsByDomain[dom][q.canonicalSubskill].push(q);
  }

  const exams: Array<{ id: string; title: string; questions: string[] }> = Array.from(
    { length: NUM_EXAMS },
    (_, idx) => ({
      id: `exam_mnsf26_mock_${String(idx + 1).padStart(2, "0")}`,
      title: ARABIC_ORDINAL_TITLES[idx],
      questions: [],
    })
  );

  const qDomainMap = new Map<string, string>();
  const qSubskillMap = new Map<string, string>();
  for (const q of mnsfEligible) {
    const id = toDbId(q);
    qDomainMap.set(id, getDomain(q.canonicalMainSkill));
    qSubskillMap.set(id, q.canonicalSubskill);
  }

  const examDomainCounts: Array<Record<string, number>> = Array.from(
    { length: NUM_EXAMS },
    () => ({ arithmetic: 0, algebra: 0, stats: 0, geometry: 0 })
  );

  // Distribute all 1,989 questions across the 40 exams
  for (const dom of ["arithmetic", "algebra", "stats", "geometry"]) {
    const subMap = subskillsByDomain[dom];
    const subs = Object.keys(subMap).sort((a, b) => subMap[b].length - subMap[a].length);

    for (const sub of subs) {
      const pool = subMap[sub];
      for (let i = 0; i < pool.length; i++) {
        let bestExam = 0;
        let minDomCount = Infinity;
        for (let e = 0; e < NUM_EXAMS; e++) {
          const domCount = examDomainCounts[e][dom];

          if (
            domCount < minDomCount ||
            (domCount === minDomCount && exams[e].questions.length < exams[bestExam].questions.length)
          ) {
            minDomCount = domCount;
            bestExam = e;
          }
        }
        const qId = toDbId(pool[i]);
        exams[bestExam].questions.push(qId);
        examDomainCounts[bestExam][dom]++;
      }
    }
  }

  // Top up any exam that has 49 questions to exactly 50 questions
  for (let e = 0; e < NUM_EXAMS; e++) {
    if (exams[e].questions.length < QUESTIONS_PER_EXAM) {
      for (const q of mnsfEligible) {
        const qId = toDbId(q);
        if (!exams[e].questions.includes(qId)) {
          exams[e].questions.push(qId);
          if (exams[e].questions.length === QUESTIONS_PER_EXAM) break;
        }
      }
    }
  }

  console.log(`\n[2] Validating all ${NUM_EXAMS} generated exams (50 questions each):`);
  const examDocs: any[] = [];
  for (let idx = 0; idx < exams.length; idx++) {
    const ex = exams[idx];
    if (ex.questions.length !== QUESTIONS_PER_EXAM) {
      throw new Error(`Exam ${ex.title} has ${ex.questions.length} questions, expected ${QUESTIONS_PER_EXAM}`);
    }

    // Inspect subskills in this exam
    const examSubskills = new Set<string>();
    for (const qId of ex.questions) {
      const sub = qSubskillMap.get(qId);
      if (sub) examSubskills.add(sub);
    }

    if (idx < 5 || idx >= 35) {
      console.log(`    ✓ ${ex.title} (${ex.id}): 50 سؤالاً (يغطي ${examSubskills.size} مهارة فرعية متنوعة)`);
    } else if (idx === 5) {
      console.log(`    ... [الاختبارات 6 إلى 35 مستمرة بنفس النمط القياسي والتوزيع الشامل] ...`);
    }

    examDocs.push({
      id: ex.id,
      title: ex.title,
      description: `اختبار محاكاة معياري متوازن (50 سؤالاً) للقسم الكمي من كتاب المنصف 26، يغطي المهارات الفرعية والرئيسية بنسب قياس الدقيقة.`,
      pathId: PATH_ID,
      subjectId: SUBJECT_ID,
      sectionId: SECTION_ID,
      type: "quiz",
      quizKind: "mock",
      questionIds: ex.questions,
      learningPlacements: [
        {
          pathId: PATH_ID,
          subjectId: SUBJECT_ID,
          slot: "tests",
          accessType: "free",
          isVisible: true,
          order: 200 + (idx + 1), // Non-conflicting order to preserve all existing quizzes
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ],
      settings: {
        showExplanations: true,
        showAnswers: true,
        showResultsReport: true,
        timeLimit: 50, // 50 minutes for 50 questions (1 minute per question as in Qiyas)
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

  console.log(`\n    إجمالي بنك المنصف (1,989 سؤالاً) تم تحويله بالكامل إلى ${NUM_EXAMS} اختباراً معيارياً!`);

  if (!isApply) {
    console.log("\n==================================================================");
    console.log(`DRY RUN COMPLETED: All ${NUM_EXAMS} exams (50 questions each) validated successfully.`);
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

  console.log(`\n[4] Upserting ${examDocs.length} MNSF26 mock exams into database (PRESERVING existing quizzes)...`);
  for (const doc of examDocs) {
    await quizzesCol.updateOne(
      { id: doc.id },
      {
        $set: {
          ...doc,
          updatedAt: new Date(),
        },
        $setOnInsert: {
          _id: doc.id as any,
          createdAt: new Date(),
        },
      },
      { upsert: true }
    );
    console.log(`    ✓ Upserted: ${doc.title} (${doc.id})`);
  }

  await mongoose.disconnect();
  console.log("\n==================================================================");
  console.log(`ALL ${examDocs.length} MNSF26 EXAMS DEPLOYED SUCCESSFULLY!`);
  console.log("Existing quizzes and exams were preserved completely.");
  console.log("==================================================================");
}

deployMnsf26MockExams().catch((err) => {
  console.error("Exam generation failed:", err);
  process.exit(1);
});
