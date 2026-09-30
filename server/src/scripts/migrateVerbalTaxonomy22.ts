import mongoose from "mongoose";
import { env } from "../config/env.js";
import {
  VERBAL_PATH_ID,
  VERBAL_SUBJECT_ID,
  VERBAL_SUBSKILL_TO_MAIN,
  VERBAL_SUBSKILL_TO_SECTION,
  VERBAL_TAXONOMY,
  deploy as deployTaxonomy,
  validateVerbalTaxonomyV2,
} from "./deployVerbalTaxonomy22.js";

const idOf = (value: unknown) => String(value ?? "").trim();

const subskillFromQuestion = (question: any) => {
  const canonical = idOf(question?.subSkillId);
  if (canonical && VERBAL_SUBSKILL_TO_MAIN[canonical]) return canonical;
  return (Array.isArray(question?.skillIds) ? question.skillIds : [])
    .map(idOf)
    .find((id: string) => Boolean(VERBAL_SUBSKILL_TO_MAIN[id])) || "";
};

const settings = (timeLimit: number, maxAttempts: number, passingScore: number) => ({
  showExplanations: true,
  showAnswers: true,
  showResultsReport: true,
  timeLimit,
  maxAttempts,
  passingScore,
  randomizeQuestions: true,
  showProgressBar: true,
});

export async function migrateVerbalTaxonomy22() {
  validateVerbalTaxonomyV2();
  await mongoose.connect(env.MONGODB_URI || "mongodb://localhost:27017/almeaa");
  let db = mongoose.connection.db;
  if (!db) throw new Error("Database connection failed");

  const questions = db.collection("questions");
  const quizzes = db.collection("quizzes");

  const verbalFilter = {
    $or: [{ subject: VERBAL_SUBJECT_ID }, { subjectId: VERBAL_SUBJECT_ID }],
  };

  const beforeQuestions = await questions.countDocuments(verbalFilter);
  const beforeMocks = await quizzes.countDocuments({
    subjectId: VERBAL_SUBJECT_ID,
    id: { $regex: /^exam_verbal_mock_/ },
  });

  if (beforeQuestions === 0) {
    throw new Error(
      "Refusing migration: no verbal questions found. Restore the canonical verbal bank before taxonomy migration.",
    );
  }

  // Taxonomy deployment changes taxonomy/topics only. Student result/mastery collections are never rewritten.
  await mongoose.disconnect();
  await deployTaxonomy();
  await mongoose.connect(env.MONGODB_URI || "mongodb://localhost:27017/almeaa");
  db = mongoose.connection.db;
  if (!db) throw new Error("Database reconnection failed");

  const qCol = db.collection("questions");
  const quizCol = db.collection("quizzes");
  const skillCol = db.collection("skills");
  const topicCol = db.collection("topics");

  const verbalQuestions = await qCol.find(verbalFilter).toArray();
  const unmapped: string[] = [];

  const mainQuestionIds = new Map<string, string[]>();
  const subQuestionIds = new Map<string, string[]>();
  for (const main of VERBAL_TAXONOMY) {
    mainQuestionIds.set(main.id, []);
    for (const sub of main.subSkills) subQuestionIds.set(sub.id, []);
  }

  const questionOps: any[] = [];
  for (const question of verbalQuestions) {
    const subSkillId = subskillFromQuestion(question);
    if (!subSkillId) {
      unmapped.push(idOf(question.id || question._id));
      continue;
    }

    const mainSkillId = VERBAL_SUBSKILL_TO_MAIN[subSkillId];
    const sectionId = VERBAL_SUBSKILL_TO_SECTION[subSkillId];
    const questionId = idOf(question.id || question._id);
    if (!questionId) {
      unmapped.push("(missing-id)");
      continue;
    }

    mainQuestionIds.get(mainSkillId)?.push(questionId);
    subQuestionIds.get(subSkillId)?.push(questionId);

    questionOps.push({
      updateOne: {
        filter: { _id: question._id },
        update: {
          $set: {
            pathId: VERBAL_PATH_ID,
            subject: VERBAL_SUBJECT_ID,
            subjectId: VERBAL_SUBJECT_ID,
            sectionId,
            skillId: mainSkillId,
            subSkillId,
            skillIds: [mainSkillId, subSkillId],
            updatedAt: new Date(),
          },
        },
      },
    });
  }

  if (unmapped.length > 0) {
    throw new Error(
      `Refusing migration: ${unmapped.length} verbal questions have no recognized subskill. First IDs: ${unmapped.slice(0, 10).join(", ")}`,
    );
  }
  if (questionOps.length !== beforeQuestions) {
    throw new Error(`Refusing migration: question mapping count changed (${questionOps.length}/${beforeQuestions})`);
  }

  if (questionOps.length) await qCol.bulkWrite(questionOps, { ordered: true });

  for (const main of VERBAL_TAXONOMY) {
    await skillCol.updateOne(
      { id: main.id, subjectId: VERBAL_SUBJECT_ID },
      { $set: { questionIds: mainQuestionIds.get(main.id) || [], updatedAt: new Date() } },
    );
  }

  // The production DB may have lost generated verbal quizzes. Rebuild/upsert all 76 foundation drills
  // from canonical question/subskill evidence while preserving stable quiz IDs.
  for (const main of VERBAL_TAXONOMY) {
    const sectionId = `sec_${VERBAL_SUBJECT_ID}_${Number(main.num)}`;
    for (const sub of main.subSkills) {
      const drillId = `drill_verbal_sub_${sub.id.replace("sub_verbal_", "")}`;
      const childTopicId = `top_verbal_sub_${sub.id.replace("sub_verbal_", "")}`;
      const questionIds = (subQuestionIds.get(sub.id) || []).slice(0, 10);
      const now = new Date();

      await quizCol.updateOne(
        { id: drillId },
        {
          $set: {
            id: drillId,
            title: `تدريب: ${sub.name}`,
            description: `تدريب تأسيسي قصير على مهارة ${sub.name}.`,
            pathId: VERBAL_PATH_ID,
            subjectId: VERBAL_SUBJECT_ID,
            sectionId,
            type: "quiz",
            quizKind: "drill",
            questionIds,
            skillIds: [sub.id],
            learningPlacements: [{
              pathId: VERBAL_PATH_ID,
              subjectId: VERBAL_SUBJECT_ID,
              slot: "foundation",
              accessType: "inherit",
              topicId: childTopicId,
              isVisible: true,
              order: sub.order,
              createdAt: Date.now(),
              updatedAt: Date.now(),
            }],
            settings: settings(15, 5, 60),
            access: { type: "free", price: 0, allowedGroupIds: [] },
            approvalStatus: "approved",
            isPublished: true,
            updatedAt: now,
          },
          $setOnInsert: { createdAt: now },
        },
        { upsert: true },
      );

      await topicCol.updateOne(
        { id: childTopicId, subjectId: VERBAL_SUBJECT_ID },
        {
          $set: {
            skillId: sub.id,
            sectionId,
            quizIds: [drillId],
            updatedAt: now,
          },
        },
      );
    }
  }

  // Rebuild generated main-skill banks only; no user-created quiz is deleted.
  await quizCol.deleteMany({
    subjectId: VERBAL_SUBJECT_ID,
    id: { $regex: /^bank_verbal_skill_/ },
  });

  for (const main of VERBAL_TAXONOMY) {
    const sectionId = `sec_${VERBAL_SUBJECT_ID}_${Number(main.num)}`;
    const questionIds = (mainQuestionIds.get(main.id) || []).slice(0, 40);
    const bankId = `bank_verbal_skill_${main.num.padStart(2, "0")}`;
    await quizCol.insertOne({
      id: bankId,
      title: `تدريب: ${main.name}`,
      description: `تدريب شامل على ${main.name} من أسئلة المهارات الفرعية التابعة لها فقط.`,
      pathId: VERBAL_PATH_ID,
      subjectId: VERBAL_SUBJECT_ID,
      sectionId,
      type: "bank",
      quizKind: "drill",
      questionIds,
      skillIds: [main.id],
      learningPlacements: [{
        pathId: VERBAL_PATH_ID,
        subjectId: VERBAL_SUBJECT_ID,
        slot: "training",
        accessType: "free",
        isVisible: true,
        order: Number(main.num),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }],
      settings: settings(45, 5, 60),
      access: { type: "free", price: 0, allowedGroupIds: [] },
      approvalStatus: "approved",
      isPublished: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  // Keep stable mock IDs. If the collection was lost, recreate five balanced mocks.
  for (let examNo = 1; examNo <= 5; examNo++) {
    const examId = `exam_verbal_mock_${String(examNo).padStart(2, "0")}`;
    const selected: string[] = [];

    for (const main of VERBAL_TAXONOMY) {
      const pool = mainQuestionIds.get(main.id) || [];
      if (!pool.length) continue;
      const offset = ((examNo - 1) * 3) % pool.length;
      for (let j = 0; j < Math.min(3, pool.length); j++) {
        const id = pool[(offset + j) % pool.length];
        if (id && !selected.includes(id)) selected.push(id);
      }
    }
    for (const question of verbalQuestions) {
      const id = idOf(question.id || question._id);
      if (id && !selected.includes(id)) selected.push(id);
      if (selected.length >= 60) break;
    }

    await quizCol.updateOne(
      { id: examId },
      {
        $set: {
          id: examId,
          title: `اختبار تجريبي — القسم اللفظي (${examNo})`,
          description: "اختبار محاكاة معياري متوازن للقسم اللفظي.",
          pathId: VERBAL_PATH_ID,
          subjectId: VERBAL_SUBJECT_ID,
          sectionId: `sec_${VERBAL_SUBJECT_ID}_1`,
          type: "quiz",
          quizKind: "mock",
          questionIds: selected.slice(0, 60),
          skillIds: [],
          learningPlacements: [{
            pathId: VERBAL_PATH_ID,
            subjectId: VERBAL_SUBJECT_ID,
            slot: "tests",
            accessType: "free",
            isVisible: true,
            order: examNo,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          }],
          settings: settings(60, 3, 65),
          access: { type: "free", price: 0, allowedGroupIds: [] },
          approvalStatus: "approved",
          isPublished: true,
          updatedAt: new Date(),
        },
        $setOnInsert: { createdAt: new Date() },
      },
      { upsert: true },
    );
  }

  const afterQuestions = await qCol.countDocuments(verbalFilter);
  const mainSkills = await skillCol.countDocuments({ subjectId: VERBAL_SUBJECT_ID });
  const parentTopics = await topicCol.countDocuments({ subjectId: VERBAL_SUBJECT_ID, parentId: null });
  const childTopics = await topicCol.countDocuments({ subjectId: VERBAL_SUBJECT_ID, parentId: { $ne: null } });
  const foundationDrills = await quizCol.countDocuments({
    subjectId: VERBAL_SUBJECT_ID,
    id: { $regex: /^drill_verbal_sub_/ },
  });
  const trainingDrills = await quizCol.countDocuments({
    subjectId: VERBAL_SUBJECT_ID,
    id: { $regex: /^bank_verbal_skill_/ },
  });
  const mockExams = await quizCol.countDocuments({
    subjectId: VERBAL_SUBJECT_ID,
    id: { $regex: /^exam_verbal_mock_/ },
  });
  const canonicalQuestions = await qCol.countDocuments({
    ...verbalFilter,
    skillId: { $in: VERBAL_TAXONOMY.map((main) => main.id) },
    subSkillId: { $in: Object.keys(VERBAL_SUBSKILL_TO_MAIN) },
  });
  const emptyFoundation = await quizCol.countDocuments({
    subjectId: VERBAL_SUBJECT_ID,
    id: { $regex: /^drill_verbal_sub_/ },
    questionIds: { $size: 0 },
  });

  const failures = [
    afterQuestions !== beforeQuestions && `question count changed ${beforeQuestions} -> ${afterQuestions}`,
    canonicalQuestions !== afterQuestions && `canonical question coverage is ${canonicalQuestions}/${afterQuestions}`,
    mainSkills !== 22 && `main skills = ${mainSkills}`,
    parentTopics !== 22 && `parent topics = ${parentTopics}`,
    childTopics !== 76 && `child topics = ${childTopics}`,
    foundationDrills !== 76 && `foundation drills = ${foundationDrills}`,
    trainingDrills !== 22 && `training drills = ${trainingDrills}`,
    mockExams !== 5 && `mock exams = ${mockExams}`,
    emptyFoundation > 0 && `foundation drills without questions = ${emptyFoundation}`,
  ].filter(Boolean);

  if (failures.length) throw new Error(`V2 verification failed: ${failures.join("; ")}`);

  console.log(JSON.stringify({
    status: "PASS",
    questions: afterQuestions,
    canonicalQuestions,
    mainSkills,
    subSkills: Object.keys(VERBAL_SUBSKILL_TO_MAIN).length,
    parentTopics,
    childTopics,
    foundationDrills,
    trainingDrills,
    mockExams,
    previousMockCount: beforeMocks,
    note: "QuizResult and SkillProgress collections were intentionally not rewritten.",
  }, null, 2));

  await mongoose.disconnect();
}

migrateVerbalTaxonomy22().catch(async (error) => {
  console.error("Verbal taxonomy V2 migration failed:", error);
  try { await mongoose.disconnect(); } catch {}
  process.exit(1);
});
