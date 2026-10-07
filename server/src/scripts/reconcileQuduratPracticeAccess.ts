import mongoose from "mongoose";
import { env } from "../config/env.js";

const PATH_ID = "p_1777779639431";
const FREE_MAIN_TOPICS = 5;
const SUB_DRILL_MAX_QUESTIONS = 15;
const SUB_DRILL_TARGET_MIN = 10;
const MAIN_DRILL_MAX_QUESTIONS = 40;

const SUBJECTS = [
  {
    key: "quant",
    subjectId: "sub_1777779748206",
    skillPrefix: "skill_quant_",
    subSkillPrefix: "sub_quant_",
    mainTopicPrefix: "top_quant_main_",
    childTopicPrefix: "top_quant_sub_",
    subDrillPrefix: "drill_sub_quant_",
    mainBankPrefixes: ["bank_skill_quant_"],
  },
  {
    key: "verbal",
    subjectId: "sub_1777779759038",
    skillPrefix: "skill_verbal_",
    subSkillPrefix: "sub_verbal_",
    mainTopicPrefix: "top_verbal_main_",
    childTopicPrefix: "top_verbal_sub_",
    subDrillPrefix: "drill_sub_verbal_",
    mainBankPrefixes: ["bank_verbal_skill_"],
  },
] as const;

const idOf = (value: unknown) => String(value ?? "").trim();
const now = () => new Date();

function assertApplyGuard() {
  if (process.env.QUDURAT_PRACTICE_DRY_RUN !== "false") return false;
  if (process.env.ALLOW_QUDURAT_PRACTICE_APPLY !== "true") {
    throw new Error("Refusing write: ALLOW_QUDURAT_PRACTICE_APPLY=true is required.");
  }
  if (!idOf(process.env.QUDURAT_PRACTICE_BACKUP_REFERENCE)) {
    throw new Error("Refusing write: QUDURAT_PRACTICE_BACKUP_REFERENCE is required.");
  }
  return true;
}

const isApprovedQuestion = (question: any) => idOf(question?.approvalStatus).toLowerCase() === "approved";
const isTrainingOnly = (question: any) =>
  idOf(question?.sourceMeta?.documentCode) === "QUDURAT-PRACTICE" ||
  idOf(question?.sourceMeta?.importBatchId).startsWith("QUDURAT_PRACTICE_") ||
  idOf(question?.id || question?._id).startsWith("train_sub_");
const isQuantCanonicalSourceQuestion = (question: any) =>
  ["FND26", "COL2627"].includes(idOf(question?.sourceMeta?.documentCode));

const questionIdsForSubskill = (questions: any[], subSkillId: string, subjectKey: string) =>
  questions
    .filter((q) =>
      idOf(q.subSkillId) === subSkillId &&
      isApprovedQuestion(q) &&
      !isTrainingOnly(q) &&
      (subjectKey !== "quant" || isQuantCanonicalSourceQuestion(q)),
    )
    .map((q) => idOf(q.id || q._id))
    .filter(Boolean);

const helperQuestionIdsForSubskill = (questions: any[], subSkillId: string) =>
  questions
    .filter((q) => idOf(q.subSkillId) === subSkillId && isApprovedQuestion(q) && isTrainingOnly(q))
    .map((q) => idOf(q.id || q._id))
    .filter(Boolean);

const questionIdsForMain = (questions: any[], mainSkillId: string) =>
  questions
    .filter((q) => idOf(q.skillId) === mainSkillId && isApprovedQuestion(q) && !isTrainingOnly(q))
    .map((q) => idOf(q.id || q._id))
    .filter(Boolean);

const accessForFree = (isFree: boolean) => ({
  type: isFree ? "free" : "paid",
  price: 0,
  allowedGroupIds: [],
});

async function reconcileSubject(db: any, config: (typeof SUBJECTS)[number], apply: boolean) {
  const subjectsCol = db.collection("subjects");
  const skillsCol = db.collection("skills");
  const topicsCol = db.collection("topics");
  const questionsCol = db.collection("questions");
  const quizzesCol = db.collection("quizzes");

  if (apply) {
    await subjectsCol.updateOne(
      { _id: config.subjectId },
      { $set: { "settings.lockSkillsForNonSubscribers": false, "settings.lockBanksForNonSubscribers": false } },
    );
  }

  const skills = await skillsCol.find({ subjectId: config.subjectId }).sort({ order: 1, id: 1 }).toArray();
  const questions = await questionsCol
    .find({ $or: [{ subject: config.subjectId }, { subjectId: config.subjectId }] })
    .sort({ canonicalId: 1, id: 1 })
    .toArray();
  const topics = await topicsCol.find({ subjectId: config.subjectId }).sort({ order: 1, id: 1 }).toArray();

  const canonicalSkills = skills
    .filter((skill: any) => idOf(skill.id || skill._id).startsWith(config.skillPrefix))
    .sort((a: any, b: any) => Number(a.order || 0) - Number(b.order || 0) || idOf(a.id).localeCompare(idOf(b.id)));

  if (canonicalSkills.length === 0) throw new Error(`${config.key}: no canonical skills found`);

  const parentTopics = topics.filter((topic: any) => !topic.parentId);
  const parentTopicBySection = new Map(parentTopics.map((topic: any) => [idOf(topic.sectionId), topic]));
  const topicById = new Map(topics.map((topic: any) => [idOf(topic.id || topic._id), topic]));
  const topicOps: any[] = [];
  const quizOps: any[] = [];
  const subskillGaps: Array<{ subSkillId: string; questionCount: number }> = [];
  let sourceBackedSubDrills = 0;

  for (let mainIndex = 0; mainIndex < canonicalSkills.length; mainIndex++) {
    const skill: any = canonicalSkills[mainIndex];
    const mainSkillId = idOf(skill.id || skill._id);
    const isFreeMainTopic = mainIndex < FREE_MAIN_TOPICS;
    const sectionId = idOf(skill.sectionId);
    const parentTopic: any = parentTopicBySection.get(sectionId);

    if (parentTopic) {
      topicOps.push({
        updateOne: {
          filter: { _id: parentTopic._id },
          update: { $set: { isLocked: !isFreeMainTopic, showOnPlatform: true, updatedAt: now() } },
        },
      });
    }

    const subSkills = Array.isArray(skill.subSkills) ? skill.subSkills : [];
    for (const subSkill of subSkills) {
      const subSkillId = idOf(subSkill.id);
      const childTopic = topics.find((topic: any) => idOf(topic.parentId) === idOf(parentTopic?.id || parentTopic?._id) && idOf(topic.title) === idOf(subSkill.name))
        || topics.find((topic: any) => Array.isArray(topic.skillIds) && topic.skillIds.map(idOf).includes(subSkillId))
        || topics.find((topic: any) => idOf(topic.id || topic._id).includes(subSkillId.replace("sub_", "")));
      const sourceIds = questionIdsForSubskill(questions, subSkillId, config.key);
      const sourceDrillIds = sourceIds.slice(0, SUB_DRILL_MAX_QUESTIONS);
      const helperIds = helperQuestionIdsForSubskill(questions, subSkillId);
      const helperNeeded = Math.max(
        0,
        Math.min(SUB_DRILL_TARGET_MIN - sourceDrillIds.length, SUB_DRILL_MAX_QUESTIONS - sourceDrillIds.length),
      );
      const drillIds = [...sourceDrillIds, ...helperIds.slice(0, helperNeeded)];

      if (childTopic) {
        topicOps.push({
          updateOne: {
            filter: { _id: childTopic._id },
            update: { $set: { isLocked: !isFreeMainTopic, showOnPlatform: true, updatedAt: now() } },
          },
        });
      }

      if (sourceIds.length < SUB_DRILL_TARGET_MIN) {
        subskillGaps.push({ subSkillId, questionCount: sourceIds.length });
      }
      if (drillIds.length === 0 || !childTopic) continue;

      sourceBackedSubDrills += 1;
      const drillId = `drill_sub_${subSkillId.replace("sub_", "")}`;
      const placement = {
        pathId: PATH_ID,
        subjectId: config.subjectId,
        slot: "foundation",
        accessType: isFreeMainTopic ? "free" : "paid",
        isVisible: true,
        order: Number(subSkill.order || 0),
        courseId: null,
        lessonId: null,
        topicId: idOf(childTopic.id || childTopic._id),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      quizOps.push({
        updateOne: {
          filter: { id: drillId },
          update: {
            $set: {
              id: drillId,
              title: `تدريب: ${idOf(subSkill.name)}`,
              description: `تدريب تأسيسي مصدره بنك الأسئلة المعتمد لمهارة ${idOf(subSkill.name)}.`,
              pathId: PATH_ID,
              subjectId: config.subjectId,
              sectionId,
              type: "quiz",
              quizKind: "drill",
              mode: "regular",
              questionIds: drillIds,
              skillIds: [subSkillId],
              learningPlacements: [placement],
              settings: {
                showExplanations: true,
                showAnswers: true,
                showResultsReport: true,
                returnToSourceOnFinish: true,
                maxAttempts: 5,
                passingScore: 60,
                timeLimit: 20,
                randomizeQuestions: true,
                randomizeOptions: false,
                showProgressBar: true,
                requireAnswerBeforeNext: false,
                allowQuestionReview: true,
                optionLayout: "auto",
              },
              access: accessForFree(isFreeMainTopic),
              targetGroupIds: [],
              targetUserIds: [],
              dueDate: null,
              supervisorMessage: null,
              isPublished: true,
              showOnPlatform: true,
              ownerType: "platform",
              ownerId: "",
              createdBy: "",
              assignedTeacherId: "",
              approvalStatus: "approved",
              reviewerNotes: "Source-backed Qudurat subskill practice reconciliation.",
              updatedAt: now(),
            },
            $setOnInsert: { _id: drillId, createdAt: now() },
          },
          upsert: true,
        },
      });

      topicOps.push({
        updateOne: {
          filter: { _id: childTopic._id },
          update: { $set: { quizIds: [drillId], updatedAt: now() } },
        },
      });
    }
  }

  if (config.key === "verbal") {
    for (let mainIndex = 0; mainIndex < canonicalSkills.length; mainIndex++) {
      const skill: any = canonicalSkills[mainIndex];
      const mainSkillId = idOf(skill.id || skill._id);
      const mainIds = questionIdsForMain(questions, mainSkillId).slice(0, MAIN_DRILL_MAX_QUESTIONS);
      if (mainIds.length === 0) continue;
      const bankId = `bank_verbal_skill_${mainSkillId.replace("skill_verbal_", "")}`;
      const isFree = mainIndex < FREE_MAIN_TOPICS;
      quizOps.push({
        updateOne: {
          filter: { id: bankId },
          update: {
            $set: {
              id: bankId,
              title: `تدريب: ${idOf(skill.name)}`,
              description: `تدريب شامل على المهارة الرئيسية ${idOf(skill.name)} من بنك VERBAL26 المعتمد.`,
              pathId: PATH_ID,
              subjectId: config.subjectId,
              sectionId: idOf(skill.sectionId),
              type: "bank",
              quizKind: "drill",
              placement: "training",
              showInTraining: true,
              showInMock: false,
              mode: "regular",
              questionIds: mainIds,
              skillIds: [mainSkillId],
              learningPlacements: [{
                pathId: PATH_ID,
                subjectId: config.subjectId,
                slot: "training",
                accessType: isFree ? "free" : "paid",
                isVisible: true,
                order: (mainIndex + 1) * 10,
                courseId: null,
                lessonId: null,
                topicId: null,
                createdAt: Date.now(),
                updatedAt: Date.now(),
              }],
              settings: {
                showExplanations: true,
                showAnswers: true,
                showResultsReport: true,
                returnToSourceOnFinish: true,
                maxAttempts: 5,
                passingScore: 60,
                timeLimit: 45,
                randomizeQuestions: true,
                randomizeOptions: false,
                showProgressBar: true,
                requireAnswerBeforeNext: false,
                allowQuestionReview: true,
                optionLayout: "auto",
              },
              access: accessForFree(isFree),
              isPublished: true,
              showOnPlatform: true,
              ownerType: "platform",
              approvalStatus: "approved",
              reviewerNotes: "Owner-authorized VERBAL26 main-skill training.",
              updatedAt: now(),
            },
            $setOnInsert: { _id: bankId, createdAt: now() },
          },
          upsert: true,
        },
      });
    }
  }

  if (apply) {
    if (topicOps.length) await topicsCol.bulkWrite(topicOps, { ordered: true });
    if (quizOps.length) await quizzesCol.bulkWrite(quizOps, { ordered: true });
  }

  return {
    subject: config.key,
    questions: questions.length,
    mainSkills: canonicalSkills.length,
    sourceBackedSubDrills,
    subskillsBelowTen: subskillGaps.length,
    zeroQuestionSubskills: subskillGaps.filter((item) => item.questionCount === 0).length,
    gaps: subskillGaps,
  };
}

export async function reconcileQuduratPracticeAccess() {
  const apply = assertApplyGuard();
  await mongoose.connect(env.MONGODB_URI || "mongodb://localhost:27017/almeaa");
  const db = mongoose.connection.db;
  if (!db) throw new Error("Database connection failed");
  try {
    const report = [];
    for (const config of SUBJECTS) report.push(await reconcileSubject(db, config, apply));
    console.log(JSON.stringify({ status: apply ? "APPLY_PASS" : "DRY_RUN_PASS", freeMainTopics: FREE_MAIN_TOPICS, subDrillMaxQuestions: SUB_DRILL_MAX_QUESTIONS, report }, null, 2));
  } finally {
    await mongoose.disconnect();
  }
}

if (process.argv[1]?.endsWith("reconcileQuduratPracticeAccess.ts") || process.argv[1]?.endsWith("reconcileQuduratPracticeAccess.js")) {
  reconcileQuduratPracticeAccess().catch(async (error) => {
    console.error(error);
    try { await mongoose.disconnect(); } catch {}
    process.exit(1);
  });
}
