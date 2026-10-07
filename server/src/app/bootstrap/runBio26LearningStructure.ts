import { QuestionModel } from "../../models/Question.js";
import { QuizModel } from "../../models/Quiz.js";
import { SkillModel } from "../../models/Skill.js";
import { TopicModel } from "../../models/Topic.js";
import {
  BATCH_ID,
  EXPECTED_MAIN_SKILLS,
  EXPECTED_QUESTIONS,
  EXPECTED_SUB_SKILLS,
  FREE_MAIN_SKILLS,
  PATH_ID,
  SPLIT_MAIN_AT,
  SUBJECT_ID,
  buildExpectedQuizzes,
  exactArray,
  expectedTopicIdForMain,
  expectedTopicIdForSub,
  fail,
  foundationQuizId,
  stableQuestionId,
  stringId,
  type ExpectedQuiz,
  type QuestionRef,
  type SkillDoc,
} from "./bio26LearningStructurePlan.js";

async function loadAndValidateSource() {
  const [questionCount, approvedCount, skills, topics, rawQuestions] = await Promise.all([
    QuestionModel.countDocuments({ "sourceMeta.importBatchId": BATCH_ID }),
    QuestionModel.countDocuments({ "sourceMeta.importBatchId": BATCH_ID, approvalStatus: "approved" }),
    SkillModel.find({ pathId: PATH_ID, subjectId: SUBJECT_ID }).sort({ order: 1 }).lean() as Promise<SkillDoc[]>,
    TopicModel.find({ pathId: PATH_ID, subjectId: SUBJECT_ID }).lean() as Promise<any[]>,
    QuestionModel.find({
      "sourceMeta.importBatchId": BATCH_ID,
      approvalStatus: "approved",
      pathId: PATH_ID,
      subjectId: SUBJECT_ID,
    })
      .select("_id id questionCode difficulty skillId subSkillId")
      .sort({ questionCode: 1 })
      .lean() as Promise<any[]>,
  ]);

  if (questionCount !== EXPECTED_QUESTIONS || approvedCount !== EXPECTED_QUESTIONS) {
    fail(`BIO26 source gate failed: total=${questionCount} approved=${approvedCount}`);
  }
  if (skills.length !== EXPECTED_MAIN_SKILLS) {
    fail(`BIO26 main taxonomy drift: expected ${EXPECTED_MAIN_SKILLS}, got ${skills.length}`);
  }
  const subCount = skills.reduce((sum, skill) => sum + (skill.subSkills?.length || 0), 0);
  if (subCount !== EXPECTED_SUB_SKILLS) {
    fail(`BIO26 sub taxonomy drift: expected ${EXPECTED_SUB_SKILLS}, got ${subCount}`);
  }
  if (topics.length !== EXPECTED_MAIN_SKILLS + EXPECTED_SUB_SKILLS) {
    fail(`BIO26 foundation topic count drift: expected 126, got ${topics.length}`);
  }

  const skillById = new Map(skills.map((skill) => [stringId(skill.id || skill._id), skill]));
  const subOwner = new Map<string, string>();
  for (const skill of skills) {
    const mainId = stringId(skill.id || skill._id);
    const expectedMainTopicId = expectedTopicIdForMain(mainId);
    const mainTopic = topics.find((topic) => stringId(topic.id || topic._id) === expectedMainTopicId);
    if (
      !mainTopic ||
      stringId(mainTopic.parentId) ||
      stringId(mainTopic.skillId) !== mainId ||
      !Array.isArray(mainTopic.skillIds) ||
      !mainTopic.skillIds.map(String).includes(mainId) ||
      stringId(mainTopic.sectionId) !== stringId(skill.sectionId)
    ) {
      fail(`BIO26 main topic link mismatch for ${mainId}`);
    }

    for (const subSkill of skill.subSkills || []) {
      subOwner.set(subSkill.id, mainId);
      const expectedSubTopicId = expectedTopicIdForSub(subSkill.id);
      const subTopic = topics.find((topic) => stringId(topic.id || topic._id) === expectedSubTopicId);
      if (
        !subTopic ||
        stringId(subTopic.parentId) !== expectedMainTopicId ||
        stringId(subTopic.skillId) !== subSkill.id ||
        !Array.isArray(subTopic.skillIds) ||
        !subTopic.skillIds.map(String).includes(mainId) ||
        !subTopic.skillIds.map(String).includes(subSkill.id) ||
        stringId(subTopic.sectionId) !== stringId(skill.sectionId)
      ) {
        fail(`BIO26 subtopic link mismatch for ${subSkill.id}`);
      }
    }
  }

  const questions: QuestionRef[] = rawQuestions.map((question) => {
    const id = stableQuestionId(question);
    const skillId = stringId(question.skillId);
    const subSkillId = stringId(question.subSkillId);
    if (!id || !skillById.has(skillId) || subOwner.get(subSkillId) !== skillId) {
      fail(`BIO26 approved question scope drift: ${stringId(question.questionCode || question._id)}`);
    }
    return {
      id,
      questionCode: stringId(question.questionCode),
      difficulty: stringId(question.difficulty),
      skillId,
      subSkillId,
    };
  });

  if (questions.length !== EXPECTED_QUESTIONS || new Set(questions.map((question) => question.id)).size !== EXPECTED_QUESTIONS) {
    fail("BIO26 question identity gate failed before learning-structure deployment");
  }

  return { skills, topics, questions };
}

async function verifyExpected(
  skills: SkillDoc[],
  topics: any[],
  expected: ReturnType<typeof buildExpectedQuizzes>,
) {
  const expectedQuizzes = [...expected.foundationQuizzes, ...expected.trainingQuizzes];
  const existing = await QuizModel.find({ _id: { $in: expectedQuizzes.map((quiz) => quiz.id) } }).lean() as any[];
  if (existing.length !== expectedQuizzes.length) {
    return { ok: false, reason: `quiz count ${existing.length}/${expectedQuizzes.length}` };
  }

  const existingById = new Map(existing.map((quiz) => [stringId(quiz.id || quiz._id), quiz]));
  for (const wanted of expectedQuizzes) {
    const actual = existingById.get(wanted.id);
    const placement = Array.isArray(actual?.learningPlacements)
      ? actual.learningPlacements.find((item: any) => item.slot === wanted.learningPlacements[0].slot)
      : null;
    if (
      !actual ||
      stringId(actual.pathId) !== PATH_ID ||
      stringId(actual.subjectId) !== SUBJECT_ID ||
      stringId(actual.sectionId) !== wanted.sectionId ||
      actual.approvalStatus !== "approved" ||
      actual.isPublished !== true ||
      actual.showOnPlatform === false ||
      !exactArray(actual.questionIds, wanted.questionIds) ||
      !exactArray(actual.skillIds, wanted.skillIds) ||
      !placement ||
      placement.accessType !== wanted.learningPlacements[0].accessType ||
      placement.isVisible === false ||
      stringId(placement.topicId) !== stringId(wanted.learningPlacements[0].topicId)
    ) {
      return { ok: false, reason: `quiz mismatch ${wanted.id}` };
    }
  }

  const topicById = new Map(topics.map((topic) => [stringId(topic.id || topic._id), topic]));
  for (const skill of skills) {
    const mainId = stringId(skill.id || skill._id);
    const free = Number(skill.order) <= FREE_MAIN_SKILLS;
    const mainTopic = topicById.get(expectedTopicIdForMain(mainId));
    if (!mainTopic || Boolean(mainTopic.isLocked) === free) {
      return { ok: false, reason: `main topic access mismatch ${mainId}` };
    }
    for (const subSkill of skill.subSkills || []) {
      const subTopic = topicById.get(expectedTopicIdForSub(subSkill.id));
      if (
        !subTopic ||
        Boolean(subTopic.isLocked) === free ||
        !Array.isArray(subTopic.quizIds) ||
        !subTopic.quizIds.map(String).includes(foundationQuizId(subSkill.id))
      ) {
        return { ok: false, reason: `subtopic access/link mismatch ${subSkill.id}` };
      }
    }
  }

  const trainingBySkill = new Map<string, ExpectedQuiz[]>();
  for (const quiz of expected.trainingQuizzes) {
    const mainId = quiz.skillIds[0];
    if (!trainingBySkill.has(mainId)) trainingBySkill.set(mainId, []);
    trainingBySkill.get(mainId)!.push(quiz);
  }
  for (const quizzes of trainingBySkill.values()) {
    const seen = new Set<string>();
    for (const quiz of quizzes) {
      for (const id of quiz.questionIds) {
        if (seen.has(id)) return { ok: false, reason: `duplicate question across main-skill parts: ${id}` };
        seen.add(id);
      }
    }
  }

  return { ok: true, reason: "PASS" };
}

export async function runBio26LearningStructureIfNeeded() {
  const source = await loadAndValidateSource();
  const expected = buildExpectedQuizzes(source.skills, source.questions);
  if (expected.foundationQuizzes.length !== EXPECTED_SUB_SKILLS) {
    fail(`BIO26 expected 98 foundation drills, got ${expected.foundationQuizzes.length}`);
  }
  if (expected.trainingQuizzes.length !== 40) {
    fail(`BIO26 expected 40 main-skill training drills, got ${expected.trainingQuizzes.length}`);
  }

  const before = await verifyExpected(source.skills, source.topics, expected);
  if (before.ok) {
    console.log(
      "BIO26_LEARNING_STRUCTURE_NOOP",
      JSON.stringify({
        mainTopics: EXPECTED_MAIN_SKILLS,
        subTopics: EXPECTED_SUB_SKILLS,
        foundationDrills: expected.foundationQuizzes.length,
        trainingDrills: expected.trainingQuizzes.length,
        freeMainSkills: FREE_MAIN_SKILLS,
        shortFoundationSubskills: expected.shortages.length,
      }),
    );
    return;
  }

  const expectedQuizzes = [...expected.foundationQuizzes, ...expected.trainingQuizzes];
  const quizOps = expectedQuizzes.map((quiz) => ({
    updateOne: {
      filter: { _id: quiz.id },
      update: {
        $set: {
          id: quiz.id,
          title: quiz.title,
          description: quiz.description,
          pathId: quiz.pathId,
          subjectId: quiz.subjectId,
          sectionId: quiz.sectionId,
          type: quiz.type,
          quizKind: quiz.quizKind,
          placement: quiz.placement,
          showInTraining: quiz.showInTraining,
          showInMock: quiz.showInMock,
          learningPlacements: quiz.learningPlacements,
          settings: quiz.settings,
          access: quiz.access,
          questionIds: quiz.questionIds,
          skillIds: quiz.skillIds,
          isPublished: quiz.isPublished,
          showOnPlatform: quiz.showOnPlatform,
          ownerType: quiz.ownerType,
          ownerId: quiz.ownerId,
          createdBy: quiz.createdBy,
          approvalStatus: quiz.approvalStatus,
          approvedBy: quiz.approvedBy,
          approvedAt: Date.now(),
          reviewerNotes: quiz.reviewerNotes,
          updatedAt: new Date(),
        },
        $setOnInsert: { createdAt: new Date() },
      },
      upsert: true,
    },
  }));

  const topicOps: any[] = [];
  for (const skill of source.skills) {
    const mainId = stringId(skill.id || skill._id);
    const free = Number(skill.order) <= FREE_MAIN_SKILLS;
    topicOps.push({
      updateOne: {
        filter: { id: expectedTopicIdForMain(mainId), pathId: PATH_ID, subjectId: SUBJECT_ID },
        update: { $set: { isLocked: !free, showOnPlatform: true, updatedAt: new Date() } },
      },
    });
    for (const subSkill of skill.subSkills || []) {
      topicOps.push({
        updateOne: {
          filter: { id: expectedTopicIdForSub(subSkill.id), pathId: PATH_ID, subjectId: SUBJECT_ID },
          update: {
            $set: { isLocked: !free, showOnPlatform: true, updatedAt: new Date() },
            $addToSet: { quizIds: foundationQuizId(subSkill.id) },
          },
        },
      });
    }
  }

  const [quizWrite, topicWrite] = await Promise.all([
    QuizModel.bulkWrite(quizOps as any),
    TopicModel.bulkWrite(topicOps as any),
  ]);

  const refreshedTopics = await TopicModel.find({ pathId: PATH_ID, subjectId: SUBJECT_ID }).lean() as any[];
  const after = await verifyExpected(source.skills, refreshedTopics, expected);
  if (!after.ok) fail(`BIO26 learning structure post-write verification failed: ${after.reason}`);

  console.log(
    "BIO26_LEARNING_STRUCTURE_PASS",
    JSON.stringify({
      sourceQuestions: EXPECTED_QUESTIONS,
      mainTopics: EXPECTED_MAIN_SKILLS,
      subTopics: EXPECTED_SUB_SKILLS,
      freeMainTopics: FREE_MAIN_SKILLS,
      freeSubTopics: source.skills
        .filter((skill) => Number(skill.order) <= FREE_MAIN_SKILLS)
        .reduce((sum, skill) => sum + (skill.subSkills?.length || 0), 0),
      foundationDrills: expected.foundationQuizzes.length,
      foundationDrillsWith10: expected.foundationQuizzes.length - expected.shortages.length,
      foundationDrillsUnder10: expected.shortages.length,
      trainingDrills: expected.trainingQuizzes.length,
      splitMainSkills: source.skills.filter((skill) => {
        const mainId = stringId(skill.id || skill._id);
        return source.questions.filter((question) => question.skillId === mainId).length >= SPLIT_MAIN_AT;
      }).length,
      quizMatched: quizWrite.matchedCount,
      quizUpserted: quizWrite.upsertedCount,
      topicMatched: topicWrite.matchedCount,
    }),
  );
}

export async function verifyBio26LearningStructure() {
  const source = await loadAndValidateSource();
  const expected = buildExpectedQuizzes(source.skills, source.questions);
  const result = await verifyExpected(source.skills, source.topics, expected);
  if (!result.ok) fail(`BIO26_LEARNING_STRUCTURE_VERIFY_FAILED ${result.reason}`);
  console.log(
    "BIO26_LEARNING_STRUCTURE_VERIFY_PASS",
    JSON.stringify({
      questions: EXPECTED_QUESTIONS,
      mainTopics: EXPECTED_MAIN_SKILLS,
      subTopics: EXPECTED_SUB_SKILLS,
      foundationDrills: expected.foundationQuizzes.length,
      trainingDrills: expected.trainingQuizzes.length,
      freeMainSkills: FREE_MAIN_SKILLS,
      foundationDrillsUnder10: expected.shortages.length,
    }),
  );
}
