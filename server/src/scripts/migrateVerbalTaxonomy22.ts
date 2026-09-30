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

export async function migrateVerbalTaxonomy22() {
  validateVerbalTaxonomyV2();
  await mongoose.connect(env.MONGODB_URI || "mongodb://localhost:27017/almeaa");
  let db = mongoose.connection.db;
  if (!db) throw new Error("Database connection failed");

  const questions = db.collection("questions");
  const quizzes = db.collection("quizzes");
  const skills = db.collection("skills");
  const topics = db.collection("topics");

  const beforeQuestions = await questions.countDocuments({
    $or: [{ subject: VERBAL_SUBJECT_ID }, { subjectId: VERBAL_SUBJECT_ID }],
  });
  const beforeFoundation = await quizzes.countDocuments({
    subjectId: VERBAL_SUBJECT_ID,
    "learningPlacements.slot": "foundation",
  });
  const beforeMocks = await quizzes.countDocuments({
    subjectId: VERBAL_SUBJECT_ID,
    "learningPlacements.slot": "tests",
  });

  if (beforeQuestions === 0) throw new Error("Refusing migration: no verbal questions found");
  if (beforeFoundation !== 76) {
    throw new Error(`Refusing migration: expected 76 foundation drills, found ${beforeFoundation}`);
  }

  // Taxonomy deployment reconnects internally; disconnect this preflight connection first.
  await mongoose.disconnect();
  await deployTaxonomy();
  await mongoose.connect(env.MONGODB_URI || "mongodb://localhost:27017/almeaa");
  db = mongoose.connection.db;
  if (!db) throw new Error("Database reconnection failed");

  const qCol = db.collection("questions");
  const quizCol = db.collection("quizzes");
  const skillCol = db.collection("skills");
  const topicCol = db.collection("topics");

  const verbalQuestions = await qCol.find({
    $or: [{ subject: VERBAL_SUBJECT_ID }, { subjectId: VERBAL_SUBJECT_ID }],
  }).toArray();

  const unmapped: string[] = [];
  const mainQuestionIds = new Map<string, string[]>();
  for (const main of VERBAL_TAXONOMY) mainQuestionIds.set(main.id, []);

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
    mainQuestionIds.get(mainSkillId)?.push(questionId);
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
            skillIds: [subSkillId, mainSkillId],
            updatedAt: new Date(),
          },
        },
      },
    });
  }

  if (unmapped.length > 0) {
    throw new Error(`Refusing migration: ${unmapped.length} verbal questions have no recognized subskill. First IDs: ${unmapped.slice(0, 10).join(", ")}`);
  }
  if (questionOps.length !== beforeQuestions) {
    throw new Error(`Refusing migration: question mapping count changed (${questionOps.length}/${beforeQuestions})`);
  }

  if (questionOps.length) await qCol.bulkWrite(questionOps, { ordered: true });

  // Update parent skill questionIds from the actual canonical question evidence.
  for (const main of VERBAL_TAXONOMY) {
    await skillCol.updateOne(
      { _id: main.id as any },
      { $set: { questionIds: mainQuestionIds.get(main.id) || [], updatedAt: new Date() } },
    );
  }

  // Preserve all 76 existing foundation drill IDs/questionIds; only realign their section and canonical skill.
  for (const main of VERBAL_TAXONOMY) {
    const sectionId = `sec_${VERBAL_SUBJECT_ID}_${Number(main.num)}`;
    for (const sub of main.subSkills) {
      const drillId = `drill_verbal_sub_${sub.id.replace("sub_verbal_", "")}`;
      const childTopicId = `top_verbal_sub_${sub.id.replace("sub_verbal_", "")}`;
      await quizCol.updateOne(
        { _id: drillId as any, subjectId: VERBAL_SUBJECT_ID },
        { $set: {
          sectionId,
          skillIds: [sub.id],
          learningPlacements: [{
            pathId: VERBAL_PATH_ID,
            subjectId: VERBAL_SUBJECT_ID,
            slot: "foundation",
            accessType: "inherit",
            topicId: childTopicId,
            isVisible: true,
            order: sub.order,
            updatedAt: Date.now(),
          }],
          updatedAt: new Date(),
        } },
      );
      await topicCol.updateOne(
        { _id: childTopicId as any },
        { $addToSet: { quizIds: drillId }, $set: { skillId: sub.id, updatedAt: new Date() } },
      );
    }
  }

  // Replace only the generated main-skill training banks. User-created quizzes and all mock exams are untouched.
  await quizCol.deleteMany({
    subjectId: VERBAL_SUBJECT_ID,
    _id: { $regex: /^bank_verbal_skill_/ },
  });

  for (const main of VERBAL_TAXONOMY) {
    const sectionId = `sec_${VERBAL_SUBJECT_ID}_${Number(main.num)}`;
    const questionIds = (mainQuestionIds.get(main.id) || []).slice(0, 40);
    const bankId = `bank_verbal_skill_${main.num.padStart(2, "0")}`;
    await quizCol.insertOne({
      _id: bankId as any,
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

  const afterQuestions = await qCol.countDocuments({
    $or: [{ subject: VERBAL_SUBJECT_ID }, { subjectId: VERBAL_SUBJECT_ID }],
  });
  const mainSkills = await skillCol.countDocuments({ subjectId: VERBAL_SUBJECT_ID });
  const parentTopics = await topicCol.countDocuments({ subjectId: VERBAL_SUBJECT_ID, parentId: null });
  const childTopics = await topicCol.countDocuments({ subjectId: VERBAL_SUBJECT_ID, parentId: { $ne: null } });
  const foundationDrills = await quizCol.countDocuments({ subjectId: VERBAL_SUBJECT_ID, "learningPlacements.slot": "foundation" });
  const trainingDrills = await quizCol.countDocuments({ subjectId: VERBAL_SUBJECT_ID, "learningPlacements.slot": "training" });
  const mockExams = await quizCol.countDocuments({ subjectId: VERBAL_SUBJECT_ID, "learningPlacements.slot": "tests" });
  const canonicalQuestions = await qCol.countDocuments({
    $or: [{ subject: VERBAL_SUBJECT_ID }, { subjectId: VERBAL_SUBJECT_ID }],
    skillId: { $in: VERBAL_TAXONOMY.map((main) => main.id) },
    subSkillId: { $in: Object.keys(VERBAL_SUBSKILL_TO_MAIN) },
  });

  const failures = [
    afterQuestions !== beforeQuestions && `question count changed ${beforeQuestions} -> ${afterQuestions}`,
    canonicalQuestions !== afterQuestions && `canonical question coverage is ${canonicalQuestions}/${afterQuestions}`,
    mainSkills !== 22 && `main skills = ${mainSkills}`,
    parentTopics !== 22 && `parent topics = ${parentTopics}`,
    childTopics !== 76 && `child topics = ${childTopics}`,
    foundationDrills !== 76 && `foundation drills = ${foundationDrills}`,
    trainingDrills !== 22 && `training drills = ${trainingDrills}`,
    mockExams !== beforeMocks && `mock exams changed ${beforeMocks} -> ${mockExams}`,
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
    note: "QuizResult and SkillProgress collections were intentionally not rewritten.",
  }, null, 2));

  await mongoose.disconnect();
}

migrateVerbalTaxonomy22().catch(async (error) => {
  console.error("Verbal taxonomy V2 migration failed:", error);
  try { await mongoose.disconnect(); } catch {}
  process.exit(1);
});
