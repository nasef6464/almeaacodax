import { QuestionModel } from "../../models/Question.js";
import { QuizModel } from "../../models/Quiz.js";
import { SkillModel } from "../../models/Skill.js";
import { TopicModel } from "../../models/Topic.js";

const PATH_ID = "p_1777779653351";
const SUBJECT_ID = "sub_1784980728386";
const BATCH_ID = "TAH-CHEM-CHEM26-FULL-V1";
const EXPECTED_QUESTIONS = 1708;
const EXPECTED_MAIN_SKILLS = 27;
const EXPECTED_SUB_SKILLS = 99;
const FREE_MAIN_SKILLS = 5;
const FOUNDATION_LIMIT = 10;
const SPLIT_MAIN_AT = 60;
const MAIN_PART_MAX = 40;

type SkillDoc = {
  _id: unknown;
  id?: string;
  name: string;
  order: number;
  sectionId: string;
  subSkills?: Array<{ id: string; name: string; code?: string; order?: number }>;
};

type QuestionRef = {
  id: string;
  questionCode: string;
  difficulty: string;
  skillId: string;
  subSkillId: string;
};

type ExpectedQuiz = {
  id: string;
  title: string;
  description: string;
  pathId: string;
  subjectId: string;
  sectionId: string;
  type: "quiz" | "bank";
  quizKind: "drill";
  placement?: "training";
  showInTraining?: boolean;
  showInMock?: boolean;
  learningPlacements: Array<{
    pathId: string;
    subjectId: string;
    slot: "foundation" | "training";
    accessType: "free" | "package";
    isVisible: true;
    order: number;
    topicId?: string;
    createdAt: number;
    updatedAt: number;
  }>;
  settings: {
    showExplanations: true;
    showAnswers: true;
    showResultsReport: true;
    returnToSourceOnFinish: true;
    timeLimit: number;
    maxAttempts: number;
    passingScore: number;
    randomizeQuestions: true;
    showProgressBar: true;
  };
  access: { type: "free" | "paid"; price: number; allowedGroupIds: string[] };
  questionIds: string[];
  skillIds: string[];
  isPublished: true;
  showOnPlatform: true;
  ownerType: "platform";
  ownerId: "";
  createdBy: "CHEM26_LEARNING_STRUCTURE_V1";
  approvalStatus: "approved";
  approvedBy: "CHEM26_LEARNING_STRUCTURE_V1";
  reviewerNotes: string;
};

const fail = (message: string): never => {
  throw new Error(message);
};

const stringId = (value: unknown) => String(value ?? "").trim();
const exactArray = (left: unknown, right: string[]) =>
  Array.isArray(left) && left.length === right.length && left.every((value, index) => String(value) === right[index]);

const stableQuestionId = (question: any) => stringId(question.id || question._id);

const difficultyRank = (value: string) => {
  const normalized = value.toLowerCase();
  if (normalized === "easy") return 0;
  if (normalized === "medium") return 1;
  if (normalized === "hard") return 2;
  return 3;
};

function interleaveDifficulties(items: QuestionRef[]) {
  const groups = new Map<number, QuestionRef[]>([
    [0, []],
    [1, []],
    [2, []],
    [3, []],
  ]);
  for (const item of [...items].sort((a, b) => a.questionCode.localeCompare(b.questionCode))) {
    groups.get(difficultyRank(item.difficulty))!.push(item);
  }

  const out: QuestionRef[] = [];
  let cursor = 0;
  while ([...groups.values()].some((group) => cursor < group.length)) {
    for (const rank of [0, 1, 2, 3]) {
      const item = groups.get(rank)![cursor];
      if (item) out.push(item);
    }
    cursor += 1;
  }
  return out;
}

function roundRobin(queues: QuestionRef[][]) {
  const out: QuestionRef[] = [];
  const offsets = queues.map(() => 0);
  while (true) {
    let added = false;
    for (let index = 0; index < queues.length; index += 1) {
      const item = queues[index][offsets[index]];
      if (!item) continue;
      out.push(item);
      offsets[index] += 1;
      added = true;
    }
    if (!added) return out;
  }
}

function mainPartSizes(total: number) {
  if (total >= SPLIT_MAIN_AT) {
    const usable = Math.min(total, MAIN_PART_MAX * 2);
    return [Math.ceil(usable / 2), Math.floor(usable / 2)];
  }
  return [Math.min(total, MAIN_PART_MAX)];
}

function foundationQuizId(subSkillId: string) {
  return `chem26_foundation_${subSkillId.replace(/^sub_tah_chem_/, "")}`;
}

function trainingQuizId(mainSkillId: string, part: number, totalParts: number) {
  const base = `chem26_training_${mainSkillId.replace(/^skill_tah_chem_/, "")}`;
  return totalParts > 1 ? `${base}_p${part}` : base;
}

function expectedTopicIdForMain(skillId: string) {
  const suffix = skillId.replace(/^skill_tah_chem_/, "");
  return `top_tah_chem_main_${suffix}`;
}

function expectedTopicIdForSub(subSkillId: string) {
  const suffix = subSkillId.replace(/^sub_tah_chem_/, "");
  return `top_tah_chem_sub_${suffix}`;
}

function buildExpectedQuizzes(skills: SkillDoc[], questions: QuestionRef[]) {
  const bySub = new Map<string, QuestionRef[]>();
  const byMain = new Map<string, QuestionRef[]>();
  for (const question of questions) {
    if (!bySub.has(question.subSkillId)) bySub.set(question.subSkillId, []);
    if (!byMain.has(question.skillId)) byMain.set(question.skillId, []);
    bySub.get(question.subSkillId)!.push(question);
    byMain.get(question.skillId)!.push(question);
  }

  const now = Date.now();
  const foundationQuizzes: ExpectedQuiz[] = [];
  const trainingQuizzes: ExpectedQuiz[] = [];
  const foundationUsed = new Set<string>();
  const shortages: Array<{ subSkillId: string; available: number }> = [];

  for (const skill of skills) {
    const mainId = stringId(skill.id || skill._id);
    const free = Number(skill.order) <= FREE_MAIN_SKILLS;
    const mainTopicId = expectedTopicIdForMain(mainId);
    const subSkills = [...(skill.subSkills || [])].sort((a, b) => Number(a.order || 0) - Number(b.order || 0));

    for (const subSkill of subSkills) {
      const source = interleaveDifficulties(bySub.get(subSkill.id) || []);
      const selected = source.slice(0, FOUNDATION_LIMIT);
      if (selected.length < FOUNDATION_LIMIT) {
        shortages.push({ subSkillId: subSkill.id, available: selected.length });
      }
      selected.forEach((item) => foundationUsed.add(item.id));
      const quizId = foundationQuizId(subSkill.id);
      const topicId = expectedTopicIdForSub(subSkill.id);

      foundationQuizzes.push({
        id: quizId,
        title: `تدريب تأسيسي: ${subSkill.name}`,
        description:
          selected.length === FOUNDATION_LIMIT
            ? `10 أسئلة تأسيسية مرتبطة مباشرة بمهارة ${subSkill.name}.`
            : `تدريب تأسيسي بجميع الأسئلة المصدرية الفريدة المتاحة حاليًا لمهارة ${subSkill.name} (${selected.length} سؤالًا).`,
        pathId: PATH_ID,
        subjectId: SUBJECT_ID,
        sectionId: skill.sectionId,
        type: "quiz",
        quizKind: "drill",
        learningPlacements: [
          {
            pathId: PATH_ID,
            subjectId: SUBJECT_ID,
            slot: "foundation",
            accessType: free ? "free" : "package",
            isVisible: true,
            order: Number(subSkill.order || 0),
            topicId,
            createdAt: now,
            updatedAt: now,
          },
        ],
        settings: {
          showExplanations: true,
          showAnswers: true,
          showResultsReport: true,
          returnToSourceOnFinish: true,
          timeLimit: Math.max(10, selected.length * 2),
          maxAttempts: 5,
          passingScore: 60,
          randomizeQuestions: true,
          showProgressBar: true,
        },
        access: { type: free ? "free" : "paid", price: 0, allowedGroupIds: [] },
        questionIds: selected.map((item) => item.id),
        skillIds: [mainId, subSkill.id],
        isPublished: true,
        showOnPlatform: true,
        ownerType: "platform",
        ownerId: "",
        createdBy: "CHEM26_LEARNING_STRUCTURE_V1",
        approvalStatus: "approved",
        approvedBy: "CHEM26_LEARNING_STRUCTURE_V1",
        reviewerNotes: "CHEM26 foundation drill generated from approved source questions with exact subskill scope.",
      });
    }

    const subQueues = subSkills.map((subSkill) => {
      const all = interleaveDifficulties(bySub.get(subSkill.id) || []);
      return {
        unused: all.filter((item) => !foundationUsed.has(item.id)),
        reused: all.filter((item) => foundationUsed.has(item.id)),
      };
    });
    const ordered = [
      ...roundRobin(subQueues.map((queue) => queue.unused)),
      ...roundRobin(subQueues.map((queue) => queue.reused)),
    ];
    const uniqueOrdered = ordered.filter((item, index, array) => array.findIndex((candidate) => candidate.id === item.id) === index);
    const expectedMainCount = byMain.get(mainId)?.length || 0;
    if (uniqueOrdered.length !== expectedMainCount) {
      fail(`CHEM26 main-skill selection drift for ${mainId}: expected ${expectedMainCount}, resolved ${uniqueOrdered.length}`);
    }

    const sizes = mainPartSizes(uniqueOrdered.length);
    let offset = 0;
    sizes.forEach((size, partIndex) => {
      const selected = uniqueOrdered.slice(offset, offset + size);
      offset += size;
      const partNumber = partIndex + 1;
      const quizId = trainingQuizId(mainId, partNumber, sizes.length);
      trainingQuizzes.push({
        id: quizId,
        title: sizes.length > 1 ? `تدريب: ${skill.name} — الجزء ${partNumber}` : `تدريب: ${skill.name}`,
        description:
          uniqueOrdered.length < 30
            ? `تدريب شامل بجميع الأسئلة المصدرية الفريدة المتاحة لمهارة ${skill.name} (${selected.length} سؤالًا).`
            : `تدريب متوازن يغطي المهارات الفرعية التابعة لـ ${skill.name} (${selected.length} سؤالًا).`,
        pathId: PATH_ID,
        subjectId: SUBJECT_ID,
        sectionId: skill.sectionId,
        type: "bank",
        quizKind: "drill",
        placement: "training",
        showInTraining: true,
        showInMock: false,
        learningPlacements: [
          {
            pathId: PATH_ID,
            subjectId: SUBJECT_ID,
            slot: "training",
            accessType: free ? "free" : "package",
            isVisible: true,
            order: Number(skill.order) * 10 + partIndex,
            createdAt: now,
            updatedAt: now,
          },
        ],
        settings: {
          showExplanations: true,
          showAnswers: true,
          showResultsReport: true,
          returnToSourceOnFinish: true,
          timeLimit: Math.max(30, selected.length),
          maxAttempts: 5,
          passingScore: 60,
          randomizeQuestions: true,
          showProgressBar: true,
        },
        access: { type: free ? "free" : "paid", price: 0, allowedGroupIds: [] },
        questionIds: selected.map((item) => item.id),
        skillIds: [mainId],
        isPublished: true,
        showOnPlatform: true,
        ownerType: "platform",
        ownerId: "",
        createdBy: "CHEM26_LEARNING_STRUCTURE_V1",
        approvalStatus: "approved",
        approvedBy: "CHEM26_LEARNING_STRUCTURE_V1",
        reviewerNotes: "CHEM26 main-skill training generated with balanced subskill coverage; source questions remain unchanged.",
      });
    });

    if (!mainTopicId) fail(`CHEM26 missing main topic id for ${mainId}`);
  }

  return { foundationQuizzes, trainingQuizzes, shortages };
}

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
    fail(`CHEM26 source gate failed: total=${questionCount} approved=${approvedCount}`);
  }
  if (skills.length !== EXPECTED_MAIN_SKILLS) {
    fail(`CHEM26 main taxonomy drift: expected ${EXPECTED_MAIN_SKILLS}, got ${skills.length}`);
  }
  const subCount = skills.reduce((sum, skill) => sum + (skill.subSkills?.length || 0), 0);
  if (subCount !== EXPECTED_SUB_SKILLS) {
    fail(`CHEM26 sub taxonomy drift: expected ${EXPECTED_SUB_SKILLS}, got ${subCount}`);
  }
  if (topics.length !== EXPECTED_MAIN_SKILLS + EXPECTED_SUB_SKILLS) {
    fail(`CHEM26 foundation topic count drift: expected 126, got ${topics.length}`);
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
      fail(`CHEM26 main topic link mismatch for ${mainId}`);
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
        fail(`CHEM26 subtopic link mismatch for ${subSkill.id}`);
      }
    }
  }

  const questions: QuestionRef[] = rawQuestions.map((question) => {
    const id = stableQuestionId(question);
    const skillId = stringId(question.skillId);
    const subSkillId = stringId(question.subSkillId);
    if (!id || !skillById.has(skillId) || subOwner.get(subSkillId) !== skillId) {
      fail(`CHEM26 approved question scope drift: ${stringId(question.questionCode || question._id)}`);
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
    fail("CHEM26 question identity gate failed before learning-structure deployment");
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

export async function runChem26LearningStructureIfNeeded() {
  const source = await loadAndValidateSource();
  const expected = buildExpectedQuizzes(source.skills, source.questions);
  if (expected.foundationQuizzes.length !== EXPECTED_SUB_SKILLS) {
    fail(`CHEM26 expected 99 foundation drills, got ${expected.foundationQuizzes.length}`);
  }
  if (expected.trainingQuizzes.length !== 40) {
    fail(`CHEM26 expected 40 main-skill training drills, got ${expected.trainingQuizzes.length}`);
  }

  const before = await verifyExpected(source.skills, source.topics, expected);
  if (before.ok) {
    console.log(
      "CHEM26_LEARNING_STRUCTURE_NOOP",
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
  if (!after.ok) fail(`CHEM26 learning structure post-write verification failed: ${after.reason}`);

  console.log(
    "CHEM26_LEARNING_STRUCTURE_PASS",
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

export async function verifyChem26LearningStructure() {
  const source = await loadAndValidateSource();
  const expected = buildExpectedQuizzes(source.skills, source.questions);
  const result = await verifyExpected(source.skills, source.topics, expected);
  if (!result.ok) fail(`CHEM26_LEARNING_STRUCTURE_VERIFY_FAILED ${result.reason}`);
  console.log(
    "CHEM26_LEARNING_STRUCTURE_VERIFY_PASS",
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
