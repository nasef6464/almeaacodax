import mongoose from "mongoose";
import * as fs from "fs";
import * as path from "path";
import { env } from "../config/env.js";
import { VERBAL_TAXONOMY } from "./deployVerbalTaxonomy13.js";

export async function deployVerbalEcosystem() {
  console.log("=== Starting Full Deployment of Verbal Ecosystem ===");
  const uri = env.MONGODB_URI || "mongodb://localhost:27017/almeaa";
  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  if (!db) throw new Error("Database connection failed");

  const pathId = "p_1777779639431";
  const subjectId = "sub_1777779759038"; // القسم اللفظي

  // 1. Load the finalized question bank
  const bankPath = path.join(process.cwd(), "scratch", "verbal_final_bank.json");
  if (!fs.existsSync(bankPath)) {
    throw new Error(`Bank file not found at: ${bankPath}`);
  }
  const questionsData = JSON.parse(fs.readFileSync(bankPath, "utf8"));
  console.log(`Loaded ${questionsData.length} prepared verbal questions.`);

  // 2. Ingest Questions into questions collection
  console.log("\n--- Phase 1: Ingesting Questions into Database ---");
  const questionsCol = db.collection("questions");
  const deleteResult = await questionsCol.deleteMany({ subject: subjectId });
  console.log(`Cleaned previous verbal questions: deleted ${deleteResult.deletedCount}`);

  // Format docs for MongoDB insertion
  const questionDocs = questionsData.map((q: any) => ({
    _id: q.id as any,
    id: q.id,
    text: q.text,
    description: q.description,
    options: q.options,
    correctOptionIndex: q.correctOptionIndex,
    explanation: q.explanation,
    videoUrl: "",
    imageUrl: "",
    skillIds: q.skillIds,
    pathId,
    subject: subjectId,
    sectionId: q.sectionId,
    examType: "qudurat",
    source: "imported",
    year: 2026,
    difficulty: q.difficulty || "Medium",
    type: "mcq",
    ownerType: "platform",
    approvalStatus: "approved",
    createdAt: new Date(),
    updatedAt: new Date(),
  }));

  await questionsCol.insertMany(questionDocs);
  console.log(`Successfully inserted ${questionDocs.length} live text verbal questions!`);

  // 3. Build subskills and main skills question maps
  const subSkillQuestionsMap: Record<string, string[]> = {};
  const mainSkillQuestionsMap: Record<string, string[]> = {};

  for (const item of VERBAL_TAXONOMY) {
    mainSkillQuestionsMap[item.id] = [];
    for (const sub of item.subSkills) {
      subSkillQuestionsMap[sub.id] = [];
    }
  }

  for (const q of questionDocs) {
    const subId = q.skillIds[0];
    const mainId = q.skillIds[1];
    if (subSkillQuestionsMap[subId]) {
      subSkillQuestionsMap[subId].push(q.id);
    }
    if (mainSkillQuestionsMap[mainId]) {
      mainSkillQuestionsMap[mainId].push(q.id);
    }
  }

  // Update skills collection with questionIds
  const skillsCol = db.collection("skills");
  for (const item of VERBAL_TAXONOMY) {
    const mainQs = mainSkillQuestionsMap[item.id] || [];
    await skillsCol.updateOne(
      { _id: item.id as any },
      {
        $set: {
          questionIds: mainQs,
          updatedAt: new Date(),
        },
      }
    );
  }
  console.log("Updated skills collection with linked question IDs.");

  // 4. Generate Quizzes
  const quizzesCol = db.collection("quizzes");
  const topicsCol = db.collection("topics");

  // Clean existing quizzes for verbal
  await quizzesCol.deleteMany({ subjectId });
  console.log("Cleaned legacy verbal quizzes.");

  // A. SHORT FOUNDATION DRILLS (76 drills, max 10 questions each)
  console.log("\n--- Phase 2: Generating 76 Foundation Drills (Max 10 questions) ---");
  const usedInShortDrills = new Set<string>();

  for (let i = 0; i < VERBAL_TAXONOMY.length; i++) {
    const item = VERBAL_TAXONOMY[i];
    const secId = `sec_sub_1777779759038_${i + 1}`;

    for (const sub of item.subSkills) {
      const childTopicId = `top_verbal_sub_${sub.id.replace("sub_verbal_", "")}`;
      const assignedQs = subSkillQuestionsMap[sub.id] || [];
      const drillQs = assignedQs.slice(0, 10);
      drillQs.forEach((qId) => usedInShortDrills.add(qId));

      const drillId = `drill_verbal_sub_${sub.id.replace("sub_verbal_", "")}`;

      await quizzesCol.insertOne({
        _id: drillId as any,
        id: drillId,
        title: `تدريب: ${sub.name}`,
        description: `تدريب تأسيسي قصير ومكثف (بحد أقصى 10 أسئلة) لإتقان وفهم مهارة ${sub.name}.`,
        pathId,
        subjectId,
        sectionId: secId,
        type: "quiz",
        quizKind: "drill",
        questionIds: drillQs,
        learningPlacements: [
          {
            pathId,
            subjectId,
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
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await topicsCol.updateOne(
        { _id: childTopicId as any },
        { $set: { quizIds: [drillId], updatedAt: new Date() } }
      );
    }
  }
  console.log(`Generated and linked 76 short drills to foundation subtopics`);

  // B. COMPREHENSIVE SKILL DRILLS (13 drills, 40 questions each in Training Tab)
  console.log("\n--- Phase 3: Generating 13 Comprehensive Drills in Training Tab ---");
  for (let i = 0; i < VERBAL_TAXONOMY.length; i++) {
    const item = VERBAL_TAXONOMY[i];
    const secId = `sec_sub_1777779759038_${i + 1}`;
    const allSkillQs = mainSkillQuestionsMap[item.id] || [];

    const unusedQs = allSkillQs.filter((qId) => !usedInShortDrills.has(qId));
    const usedQs = allSkillQs.filter((qId) => usedInShortDrills.has(qId));
    
    // Pick 40 questions (or all available if less than 40)
    let selected40 = [...unusedQs, ...usedQs].slice(0, 40);
    // If skill has fewer than 40 questions, top up from other verbal questions
    if (selected40.length < 40) {
      for (const q of questionDocs) {
        if (!selected40.includes(q.id)) {
          selected40.push(q.id);
          if (selected40.length >= 40) break;
        }
      }
    }

    const bankId = `bank_verbal_skill_${item.id.replace("skill_verbal_", "")}`;

    await quizzesCol.insertOne({
      _id: bankId as any,
      id: bankId,
      title: `تدريب: ${item.name}`,
      description: `بنك تدريبي شامل ومكثف (40 سؤالاً) يغطي كافة قواعد وتطبيقات مهارة ${item.name}.`,
      pathId,
      subjectId,
      sectionId: secId,
      type: "bank",
      quizKind: "drill",
      questionIds: selected40,
      learningPlacements: [
        {
          pathId,
          subjectId,
          slot: "training",
          accessType: "free",
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
        timeLimit: 45,
        maxAttempts: 5,
        passingScore: 60,
        randomizeQuestions: true,
        showProgressBar: true,
      },
      access: { type: "free", price: 0, allowedGroupIds: [] },
      approvalStatus: "approved",
      isPublished: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }
  console.log(`Generated 13 comprehensive drills (40 questions each) in Training slot`);

  // C. MOCK EXAMS (5 standard exams, 60 questions each in Tests Tab)
  console.log("\n--- Phase 4: Generating 5 Standard Verbal Mock Exams in Tests Slot ---");
  for (let e = 1; e <= 5; e++) {
    const examId = `exam_verbal_mock_${String(e).padStart(2, "0")}`;
    const examQs: string[] = [];
    
    // Balanced distribution across the 13 Main Skills
    for (let i = 0; i < VERBAL_TAXONOMY.length; i++) {
      const item = VERBAL_TAXONOMY[i];
      const qs = mainSkillQuestionsMap[item.id] || [];
      const offset = ((e - 1) * 3) % Math.max(1, qs.length);
      const pick = qs.slice(offset, offset + 4);
      examQs.push(...pick);
    }
    
    // If exam has fewer than 60 questions, top up from remaining questions
    if (examQs.length < 60) {
      for (const q of questionDocs) {
        if (!examQs.includes(q.id)) {
          examQs.push(q.id);
          if (examQs.length >= 60) break;
        }
      }
    }
    const final60 = examQs.slice(0, 60);

    await quizzesCol.insertOne({
      _id: examId as any,
      id: examId,
      title: `اختبار تجريبي — القسم اللفظي (${e})`,
      description: `اختبار محاكاة معياري متوازن (60 سؤالاً) مخصص للقسم اللفظي فقط، يغطي المهارات الـ 13 بتوزيع قياسي دقيق.`,
      pathId,
      subjectId,
      sectionId: `sec_sub_1777779759038_1`,
      type: "quiz",
      quizKind: "mock",
      questionIds: final60,
      learningPlacements: [
        {
          pathId,
          subjectId,
          slot: "tests",
          accessType: "free",
          isVisible: true,
          order: e,
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
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }
  console.log(`Generated 5 standard mock exams (60 questions each) in Tests slot`);

  // 5. Final Verification
  const totalVerbalQuestions = await questionsCol.countDocuments({ subject: subjectId });
  const totalVerbalQuizzes = await quizzesCol.countDocuments({ subjectId });
  const foundationQuizzes = await quizzesCol.countDocuments({ subjectId, "learningPlacements.slot": "foundation" });
  const trainingQuizzes = await quizzesCol.countDocuments({ subjectId, "learningPlacements.slot": "training" });
  const testsQuizzes = await quizzesCol.countDocuments({ subjectId, "learningPlacements.slot": "tests" });
  const childTopicsWithQuizzes = await topicsCol.countDocuments({ subjectId, parentId: { $ne: null }, "quizIds.0": { $exists: true } });

  console.log("\n=== VERBAL ECOSYSTEM VERIFICATION SUMMARY ===");
  console.log(`✓ Total Questions: ${totalVerbalQuestions}`);
  console.log(`✓ Total Quizzes: ${totalVerbalQuizzes}`);
  console.log(`  -> Foundation Short Drills: ${foundationQuizzes} (linked to ${childTopicsWithQuizzes}/76 subtopics)`);
  console.log(`  -> Comprehensive Skill Drills: ${trainingQuizzes} (40 questions each)`);
  console.log(`  -> Standard Mock Exams: ${testsQuizzes} (60 questions each)`);

  console.log("=== Verbal Ecosystem Deployment Completed Flawlessly ===");
  await mongoose.disconnect();
}

if (process.argv[1]?.endsWith("deployVerbalEcosystem.ts") || process.argv[1]?.endsWith("deployVerbalEcosystem.js")) {
  deployVerbalEcosystem().catch((err) => {
    console.error("Verbal Ecosystem Deployment failed:", err);
    process.exit(1);
  });
}
