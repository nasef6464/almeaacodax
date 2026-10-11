import dotenv from "dotenv";
dotenv.config({ path: ".env.codex.local" });
dotenv.config({ path: "../.env.codex.local" });
dotenv.config({ path: "./.env" });
dotenv.config({ path: "./server/.env" });
dotenv.config({ path: "../.env" });

import fs from "node:fs";
import path from "node:path";
import mongoose from "mongoose";

const PATH_ID = "p_1777779653351";
const SUBJECT_ID = "sub_1777784609152";
const NUM_STANDARD_TESTS = 26;
const IS_APPLY = process.argv.includes("--apply");

const ARABIC_ORDINALS = [
  "الأول",
  "الثاني",
  "الثالث",
  "الرابع",
  "الخامس",
  "السادس",
  "السابع",
  "الثامن",
  "التاسع",
  "العاشر",
  "الحادي عشر",
  "الثاني عشر",
  "الثالث عشر",
  "الرابع عشر",
  "الخامس عشر",
  "السادس عشر",
  "السابع عشر",
  "الثامن عشر",
  "التاسع عشر",
  "العشرون",
  "الحادي والعشرون",
  "الثاني والعشرون",
  "الثالث والعشرون",
  "الرابع والعشرون",
  "الخامس والعشرون",
  "السادس والعشرون",
];

const ARABIC_PARTS = [
  "الجزء الأول",
  "الجزء الثاني",
  "الجزء الثالث",
  "الجزء الرابع",
  "الجزء الخامس",
];

type SubSkill = {
  id: string;
  name: string;
  code: string;
  description: string;
  order: number;
};

type MainSkill = {
  _id: string;
  id: string;
  pathId: string;
  subjectId: string;
  sectionId: string;
  name: string;
  description: string;
  order: number;
  subSkills: SubSkill[];
};

type TaxonomyFile = {
  path: any;
  subject: any;
  sections: Array<{ _id: string; id: string; subjectId: string; name: string }>;
  skills: MainSkill[];
};

function locateTaxonomy(): string {
  const candidates = [
    path.resolve(process.cwd(), "tahsili_math_taxonomy.json"),
    path.resolve(process.cwd(), "../tahsili_math_taxonomy.json"),
    path.resolve(process.cwd(), "../../tahsili_math_taxonomy.json"),
  ];
  const found = candidates.find((p) => fs.existsSync(p));
  if (!found) throw new Error(`Taxonomy not found in: ${candidates.join(", ")}`);
  return found;
}

export async function deployMath26LearningSuite() {
  console.log("==================================================================");
  console.log(`TAHSILI MATHEMATICS 2026 LEARNING SUITE (${IS_APPLY ? "LIVE APPLY" : "DRY RUN"})`);
  console.log("==================================================================\n");

  const taxPath = locateTaxonomy();
  const tax = JSON.parse(fs.readFileSync(taxPath, "utf-8")) as TaxonomyFile;

  // Sort skills strictly by order (1..22)
  const sortedSkills = [...tax.skills].sort((a, b) => a.order - b.order);
  console.log(`[1] Loaded taxonomy: ${sortedSkills.length} main skills, 22 sections.`);

  const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI || "";
  if (!mongoUri) throw new Error("No MONGODB_URI configured");

  await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 15000 });
  const db = mongoose.connection.db;
  if (!db) throw new Error("No DB handle");

  const questionsCol = db.collection("questions");
  const topicsCol = db.collection("topics");
  const quizzesCol = db.collection("quizzes");
  const skillsCol = db.collection("skills");
  const sectionsCol = db.collection("sections");

  // Fetch all math questions
  const allQuestions = await questionsCol
    .find({ $or: [{ subjectId: SUBJECT_ID }, { subject: SUBJECT_ID }] })
    .toArray();

  console.log(`[2] Loaded ${allQuestions.length} questions from database.`);

  // Categorize questions into:
  // - Banks 1 & 2 (YLM26 + COL26): For Foundation Drills & Main Skill Training Drills
  // - Bank 3 (COL26OLD): Exclusively for Standard All-Bank Tests
  const drillQuestions = allQuestions.filter(
    (q) =>
      String(q.questionCode || "").startsWith("TAH-MATH-YLM26-") ||
      (String(q.questionCode || "").startsWith("TAH-MATH-COL26-") &&
        !String(q.questionCode || "").startsWith("TAH-MATH-COL26OLD-")),
  );

  const testQuestions = allQuestions.filter((q) =>
    String(q.questionCode || "").startsWith("TAH-MATH-COL26OLD-"),
  );

  console.log(`    - Banks 1 & 2 (YLM26 + COL26) for Drills: ${drillQuestions.length} questions`);
  console.log(`    - Bank 3 (COL26OLD) for Standard Tests: ${testQuestions.length} questions`);

  if (drillQuestions.length !== 1338) {
    throw new Error(`Expected exactly 1,338 drill questions (B1+B2), got ${drillQuestions.length}`);
  }
  if (testQuestions.length !== 1257) {
    throw new Error(`Expected exactly 1,257 test questions (B3), got ${testQuestions.length}`);
  }

  // Group drill questions by subskill and main skill
  const drillQsBySubskill: Record<string, typeof drillQuestions> = {};
  const drillQsByMainSkill: Record<string, typeof drillQuestions> = {};

  for (const q of drillQuestions) {
    const subId = String(q.subSkillId || "").trim();
    const mainId = String(q.skillId || "").trim();

    if (!drillQsBySubskill[subId]) drillQsBySubskill[subId] = [];
    drillQsBySubskill[subId].push(q);

    if (!drillQsByMainSkill[mainId]) drillQsByMainSkill[mainId] = [];
    drillQsByMainSkill[mainId].push(q);
  }

  // =====================================================================
  // PHASE A: FOUNDATION DRILLS (70 Subskills)
  // =====================================================================
  console.log("\n[3] Generating 70 Foundation Subskill Drills (Max 10 questions each)...");
  const foundationQuizzes: any[] = [];
  const foundationQuizIdBySubskill: Record<string, string> = {};
  let totalFoundationQs = 0;

  for (const skill of sortedSkills) {
    const sortedSubskills = [...skill.subSkills].sort((a, b) => a.order - b.order);

    for (const sub of sortedSubskills) {
      const subSuffix = sub.id.replace("sub_tah_math_", "");
      const drillId = `math26_foundation_${subSuffix}`;
      const childTopicId = `top_tah_math_sub_${subSuffix}`;

      // Pick up to 10 questions from Banks 1 + 2 for this subskill
      const available = drillQsBySubskill[sub.id] || [];
      if (available.length === 0) {
        throw new Error(`Subskill ${sub.id} has 0 questions in Banks 1 + 2!`);
      }

      // Coordinate between YLM and COL: sort so both sources are represented
      const ylmQs = available.filter((q) => String(q.questionCode || "").startsWith("TAH-MATH-YLM26-"));
      const colQs = available.filter((q) => !String(q.questionCode || "").startsWith("TAH-MATH-YLM26-"));

      const picked: typeof available = [];
      let yIdx = 0;
      let cIdx = 0;
      while (picked.length < 10 && (yIdx < ylmQs.length || cIdx < colQs.length)) {
        if (yIdx < ylmQs.length && picked.length < 10) picked.push(ylmQs[yIdx++]);
        if (cIdx < colQs.length && picked.length < 10) picked.push(colQs[cIdx++]);
      }

      const questionIds = picked.map((q) => String(q.id || q._id));
      totalFoundationQs += questionIds.length;
      foundationQuizIdBySubskill[sub.id] = drillId;

      foundationQuizzes.push({
        _id: drillId,
        id: drillId,
        title: `تدريب تأسيسي: ${sub.name}`,
        description: `تدريب تأسيسي مكثف ومباشر على مهارة (${sub.name}) لترسيخ المفاهيم والقوانين الأساسية.`,
        pathId: PATH_ID,
        subjectId: SUBJECT_ID,
        sectionId: skill.sectionId,
        skillIds: [skill.id, sub.id],
        type: "quiz",
        quizKind: "drill",
        questionIds,
        learningPlacements: [
          {
            pathId: PATH_ID,
            subjectId: SUBJECT_ID,
            slot: "foundation",
            accessType: "inherit",
            topicId: childTopicId,
            isVisible: true,
            order: sub.order,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          },
        ],
        settings: {
          showExplanations: true,
          showAnswers: true,
          showResultsReport: true,
          timeLimit: 15,
          maxAttempts: 5,
          passingScore: 60,
          randomizeQuestions: true,
          showProgressBar: true,
        },
        access: { type: "free", price: 0, allowedGroupIds: [] },
        approvalStatus: "approved",
        isPublished: true,
        showOnPlatform: true,
        sourceDocumentCode: "MATH26",
      });
    }
  }

  console.log(`    ✓ Created ${foundationQuizzes.length} foundation drills consuming ${totalFoundationQs} question instances.`);

  // =====================================================================
  // PHASE B: MAIN SKILL TRAINING DRILLS (22 Main Skills with splits)
  // =====================================================================
  console.log("\n[4] Generating Main Skill Training Drills (30-40 questions per drill)...");
  const trainingQuizzes: any[] = [];
  const trainingQuizIdsByMainSkill: Record<string, string[]> = {};
  let trainingOrder = 1;

  for (const skill of sortedSkills) {
    const skillNum = String(skill.order).padStart(2, "0");
    const parentTopicId = `top_tah_math_main_${skillNum}`;
    const allQs = drillQsByMainSkill[skill.id] || [];
    trainingQuizIdsByMainSkill[skill.id] = [];

    // Chunk questions into parts of 30-40 questions
    // If total questions <= 40, exactly 1 part
    // If total questions > 40, split evenly so each part is in [25..40] range
    let partsCount = 1;
    if (allQs.length > 40) {
      partsCount = Math.ceil(allQs.length / 40);
    }

    const chunkSize = Math.ceil(allQs.length / partsCount);
    for (let p = 0; p < partsCount; p++) {
      const partSlice = allQs.slice(p * chunkSize, (p + 1) * chunkSize);
      const drillId =
        partsCount === 1
          ? `math26_training_${skillNum}`
          : `math26_training_${skillNum}_p${p + 1}`;
      const title =
        partsCount === 1
          ? `تدريب شامل: ${skill.name}`
          : `تدريب: ${skill.name} (${ARABIC_PARTS[p]})`;

      const questionIds = partSlice.map((q) => String(q.id || q._id));
      trainingQuizIdsByMainSkill[skill.id].push(drillId);

      trainingQuizzes.push({
        _id: drillId,
        id: drillId,
        title,
        description: `بنك تدريبي شامل ومكثف يغطي كافة جوانب وقواعد مهارة ${skill.name}.`,
        pathId: PATH_ID,
        subjectId: SUBJECT_ID,
        sectionId: skill.sectionId,
        skillIds: [skill.id],
        type: "bank",
        quizKind: "drill",
        questionIds,
        learningPlacements: [
          {
            pathId: PATH_ID,
            subjectId: SUBJECT_ID,
            slot: "training",
            accessType: "free",
            topicId: parentTopicId,
            isVisible: true,
            order: trainingOrder++,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          },
        ],
        settings: {
          showExplanations: true,
          showAnswers: true,
          showResultsReport: true,
          timeLimit: 45,
          maxAttempts: 5,
          passingScore: 60,
          randomizeQuestions: true,
          showProgressBar: true,
        },
        access: { type: "free", price: 0, allowedGroupIds: [] },
        approvalStatus: "approved",
        isPublished: true,
        showOnPlatform: true,
        sourceDocumentCode: "MATH26",
      });
    }

    console.log(
      `    ✓ Skill ${skillNum} (${skill.name}): ${allQs.length} Qs -> ${partsCount} drill(s) (${trainingQuizIdsByMainSkill[skill.id].join(", ")})`,
    );
  }

  console.log(`    ✓ Total training drills generated: ${trainingQuizzes.length}`);

  // =====================================================================
  // PHASE C: STANDARD ALL-BANK TESTS (From Bank 3: 1,257 questions)
  // =====================================================================
  console.log("\n[5] Generating 26 Standard All-Bank Tests strictly from Bank 3 (COL26OLD)...");

  // Partition Bank 3 questions across the 26 tests in balanced round-robin by main skill
  // Target sizes: 17 tests with 48 questions + 9 tests with 49 questions = 1,257 questions!
  const targetSizes: number[] = Array.from({ length: NUM_STANDARD_TESTS }, (_, i) =>
    i < 9 ? 49 : 48,
  );
  const totalTargetQs = targetSizes.reduce((a, b) => a + b, 0);
  if (totalTargetQs !== 1257) {
    throw new Error(`Target test size sum mismatch: expected 1257, got ${totalTargetQs}`);
  }

  // Group Bank 3 questions by main skill
  const b3BySkill: Record<string, typeof testQuestions> = {};
  for (const q of testQuestions) {
    const sId = String(q.skillId || "unassigned");
    if (!b3BySkill[sId]) b3BySkill[sId] = [];
    b3BySkill[sId].push(q);
  }

  const standardTestsQuestions: string[][] = Array.from(
    { length: NUM_STANDARD_TESTS },
    () => [],
  );

  // Distribute skill-by-skill round-robin across the 26 tests
  let currentTestIndex = 0;
  for (const sId of Object.keys(b3BySkill)) {
    const pool = b3BySkill[sId];
    for (const q of pool) {
      // Find the next test that hasn't reached its target size
      let placed = false;
      for (let attempt = 0; attempt < NUM_STANDARD_TESTS; attempt++) {
        const testIdx = (currentTestIndex + attempt) % NUM_STANDARD_TESTS;
        if (standardTestsQuestions[testIdx].length < targetSizes[testIdx]) {
          standardTestsQuestions[testIdx].push(String(q.id || q._id));
          currentTestIndex = (testIdx + 1) % NUM_STANDARD_TESTS;
          placed = true;
          break;
        }
      }
      if (!placed) {
        throw new Error(`Could not place question ${q.questionCode} into any test`);
      }
    }
  }

  // Verify all 26 tests have exact target sizes
  for (let i = 0; i < NUM_STANDARD_TESTS; i++) {
    if (standardTestsQuestions[i].length !== targetSizes[i]) {
      throw new Error(
        `Test ${i + 1} size mismatch: expected ${targetSizes[i]}, got ${standardTestsQuestions[i].length}`,
      );
    }
  }

  // Verify uniqueness and 100% coverage of Bank 3
  const allTestQuestionRefs = standardTestsQuestions.flat();
  if (allTestQuestionRefs.length !== 1257) {
    throw new Error(`Standard tests total questions mismatch: expected 1257, got ${allTestQuestionRefs.length}`);
  }
  const uniqueTestQuestionRefs = new Set(allTestQuestionRefs);
  if (uniqueTestQuestionRefs.size !== 1257) {
    throw new Error(`Standard tests contain duplicate questions! Unique: ${uniqueTestQuestionRefs.size}`);
  }

  const standardTestQuizzes: any[] = [];
  for (let i = 0; i < NUM_STANDARD_TESTS; i++) {
    const testId = `math26_standard_test_${String(i + 1).padStart(2, "0")}`;
    const title = `الاختبار المعياري ${ARABIC_ORDINALS[i]}`;
    const isFree = i < 5; // First 5 tests free, remainder paid package

    standardTestQuizzes.push({
      _id: testId,
      id: testId,
      title,
      description: `اختبار معياري شامل يحاكي اختبار التحصيلي الفعلي في الرياضيات (تجميعات الأعوام السابقة)، يغطي مهارات المنهج بتوزيع قياسي متوازن.`,
      pathId: PATH_ID,
      subjectId: SUBJECT_ID,
      sectionId: "sec_tah_math_01",
      type: "quiz",
      quizKind: "test",
      questionIds: standardTestsQuestions[i],
      learningPlacements: [
        {
          pathId: PATH_ID,
          subjectId: SUBJECT_ID,
          slot: "tests",
          accessType: isFree ? "free" : "paid",
          isVisible: true,
          order: i + 1,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ],
      settings: {
        showExplanations: true,
        showAnswers: true,
        showResultsReport: true,
        timeLimit: 50,
        maxAttempts: 3,
        passingScore: 65,
        randomizeQuestions: true,
        showProgressBar: true,
      },
      access: { type: isFree ? "free" : "paid", price: 0, allowedGroupIds: [] },
      approvalStatus: "approved",
      isPublished: true,
      showOnPlatform: true,
      sourceDocumentCode: "MATH26",
    });

    console.log(
      `    ✓ ${title} (${testId}): ${standardTestsQuestions[i].length} Qs [${isFree ? "FREE" : "PACKAGE"}]`,
    );
  }

  console.log(`    ✓ Total standard tests generated: ${standardTestQuizzes.length} (100% of Bank 3, zero overlap)`);

  // =====================================================================
  // PHASE D: TOPICS & LOCKING SYNC
  // =====================================================================
  console.log("\n[6] Preparing Topic Synchronization...");
  const timestamp = new Date();

  // Parent topics: 22 topics, first 5 free (isLocked: false), 17 locked (isLocked: true)
  const parentTopicDocs = sortedSkills.map((skill, index) => {
    const skillNum = String(skill.order).padStart(2, "0");
    const parentTopicId = `top_tah_math_main_${skillNum}`;
    const isLocked = index >= 5; // First 5 free, remaining locked

    return {
      _id: parentTopicId,
      id: parentTopicId,
      title: skill.name,
      description: skill.description,
      pathId: PATH_ID,
      subjectId: SUBJECT_ID,
      sectionId: skill.sectionId,
      skillId: skill.id,
      skillIds: [skill.id],
      parentId: null,
      order: skill.order,
      showOnPlatform: true,
      isLocked,
      lessonIds: [],
      quizIds: trainingQuizIdsByMainSkill[skill.id] || [],
      libraryItemIds: [],
      updatedAt: timestamp,
    };
  });

  // Child topics: 70 topics linked to foundation drills
  const childTopicDocs: any[] = [];
  for (const skill of sortedSkills) {
    const skillNum = String(skill.order).padStart(2, "0");
    const parentTopicId = `top_tah_math_main_${skillNum}`;

    for (const sub of skill.subSkills) {
      const subSuffix = sub.id.replace("sub_tah_math_", "");
      const childTopicId = `top_tah_math_sub_${subSuffix}`;
      const drillId = foundationQuizIdBySubskill[sub.id];

      childTopicDocs.push({
        _id: childTopicId,
        id: childTopicId,
        title: sub.name,
        description: `شرح وتدريبات مركزة على ${sub.name}`,
        pathId: PATH_ID,
        subjectId: SUBJECT_ID,
        sectionId: skill.sectionId,
        skillId: sub.id,
        skillIds: [skill.id, sub.id],
        parentId: parentTopicId,
        order: sub.order,
        showOnPlatform: true,
        isLocked: false,
        lessonIds: [],
        quizIds: [drillId],
        libraryItemIds: [],
        updatedAt: timestamp,
      });
    }
  }

  console.log(`    ✓ Prepared 22 parent topics (5 free / 17 locked) linked to training drills`);
  console.log(`    ✓ Prepared 70 child topics linked to foundation drills`);

  // =====================================================================
  // DRY RUN SUMMARY OR LIVE APPLY
  // =====================================================================
  const totalQuizzesToDeploy =
    foundationQuizzes.length + trainingQuizzes.length + standardTestQuizzes.length;

  console.log("\n==================================================================");
  console.log("DEPLOYMENT AUDIT SUMMARY:");
  console.log(`- Foundation Drills (slot: foundation): ${foundationQuizzes.length}`);
  console.log(`- Main Skill Training Drills (slot: training): ${trainingQuizzes.length}`);
  console.log(`- Standard All-Bank Tests (slot: tests): ${standardTestQuizzes.length}`);
  console.log(`- Total Quizzes: ${totalQuizzesToDeploy}`);
  console.log(`- Bank 3 Coverage in Standard Tests: 1,257 / 1,257 (100.0%)`);
  console.log(`- Standard Test Duplicate Questions: 0`);
  console.log(`- Free Standard Tests: 5 (Tests 01–05)`);
  console.log(`- Package Standard Tests: 21 (Tests 06–26)`);
  console.log(`- Parent Topics: 22 (5 Free / 17 Locked)`);
  console.log(`- Child Topics: 70 (100% linked to foundation drills)`);
  console.log("==================================================================");

  if (!IS_APPLY) {
    console.log("\n>>> DRY RUN COMPLETED SUCCESSFULLY. Run with --apply to execute live. <<<");
    await mongoose.disconnect();
    return;
  }

  // =====================================================================
  // LIVE APPLY PHASE
  // =====================================================================
  console.log("\n[7] Applying changes to MongoDB Atlas...");

  // 1. Upsert Parent Topics
  console.log("    Upserting 22 parent topics...");
  for (const doc of parentTopicDocs) {
    await topicsCol.updateOne(
      { _id: doc._id as any },
      {
        $set: { ...doc },
        $setOnInsert: { createdAt: timestamp },
      },
      { upsert: true },
    );
  }

  // 2. Upsert Child Topics
  console.log("    Upserting 70 child topics...");
  for (const doc of childTopicDocs) {
    await topicsCol.updateOne(
      { _id: doc._id as any },
      {
        $set: { ...doc },
        $setOnInsert: { createdAt: timestamp },
      },
      { upsert: true },
    );
  }

  // 3. Upsert Foundation Drills
  console.log(`    Upserting ${foundationQuizzes.length} foundation drills...`);
  for (const doc of foundationQuizzes) {
    await quizzesCol.updateOne(
      { _id: doc._id as any },
      {
        $set: { ...doc, updatedAt: timestamp },
        $setOnInsert: { createdAt: timestamp },
      },
      { upsert: true },
    );
  }

  // 4. Upsert Training Drills
  console.log(`    Upserting ${trainingQuizzes.length} main training drills...`);
  for (const doc of trainingQuizzes) {
    await quizzesCol.updateOne(
      { _id: doc._id as any },
      {
        $set: { ...doc, updatedAt: timestamp },
        $setOnInsert: { createdAt: timestamp },
      },
      { upsert: true },
    );
  }

  // 5. Upsert Standard Tests
  console.log(`    Upserting ${standardTestQuizzes.length} standard all-bank tests...`);
  for (const doc of standardTestQuizzes) {
    await quizzesCol.updateOne(
      { _id: doc._id as any },
      {
        $set: { ...doc, updatedAt: timestamp },
        $setOnInsert: { createdAt: timestamp },
      },
      { upsert: true },
    );
  }

  console.log("\n==================================================================");
  console.log("TAHSILI MATHEMATICS 2026 LIVE APPLY COMPLETED SUCCESSFULLY!");
  console.log("==================================================================");

  await mongoose.disconnect();
}

deployMath26LearningSuite().catch((err) => {
  console.error("Deployment failed:", err);
  process.exit(1);
});
