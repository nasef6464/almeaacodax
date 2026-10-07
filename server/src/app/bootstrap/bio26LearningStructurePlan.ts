export const PATH_ID = "p_1777779653351";
export const SUBJECT_ID = "sub_tah_biology_bio26";
export const BATCH_ID = "TAH-CHEM-BIO26-FULL-V1";
export const EXPECTED_QUESTIONS = 2832;
export const EXPECTED_MAIN_SKILLS = 29;
export const EXPECTED_SUB_SKILLS = 98;
export const FREE_MAIN_SKILLS = 5;
const FOUNDATION_LIMIT = 10;
export const SPLIT_MAIN_AT = 60;
const MAIN_PART_MAX = 40;

export type SkillDoc = {
  _id: unknown;
  id?: string;
  name: string;
  order: number;
  sectionId: string;
  subSkills?: Array<{ id: string; name: string; code?: string; order?: number }>;
};

export type QuestionRef = {
  id: string;
  questionCode: string;
  difficulty: string;
  skillId: string;
  subSkillId: string;
};

export type ExpectedQuiz = {
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
  createdBy: "BIO26_LEARNING_STRUCTURE_V1";
  approvalStatus: "approved";
  approvedBy: "BIO26_LEARNING_STRUCTURE_V1";
  reviewerNotes: string;
};

export const fail = (message: string): never => {
  throw new Error(message);
};

export const stringId = (value: unknown) => String(value ?? "").trim();
export const exactArray = (left: unknown, right: string[]) =>
  Array.isArray(left) && left.length === right.length && left.every((value, index) => String(value) === right[index]);

export const stableQuestionId = (question: any) => stringId(question.id || question._id);

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

export function foundationQuizId(subSkillId: string) {
  return `bio26_foundation_${subSkillId.replace(/^sub_tah_bio_/, "")}`;
}

function trainingQuizId(mainSkillId: string, part: number, totalParts: number) {
  const base = `bio26_training_${mainSkillId.replace(/^skill_tah_bio_/, "")}`;
  return totalParts > 1 ? `${base}_p${part}` : base;
}

export function expectedTopicIdForMain(skillId: string) {
  const suffix = skillId.replace(/^skill_tah_bio_/, "");
  return `top_tah_bio_main_${suffix}`;
}

export function expectedTopicIdForSub(subSkillId: string) {
  const suffix = subSkillId.replace(/^sub_tah_bio_/, "");
  return `top_tah_bio_sub_${suffix}`;
}

export function buildExpectedQuizzes(skills: SkillDoc[], questions: QuestionRef[]) {
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
        createdBy: "BIO26_LEARNING_STRUCTURE_V1",
        approvalStatus: "approved",
        approvedBy: "BIO26_LEARNING_STRUCTURE_V1",
        reviewerNotes: "BIO26 foundation drill generated from approved source questions with exact subskill scope.",
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
      fail(`BIO26 main-skill selection drift for ${mainId}: expected ${expectedMainCount}, resolved ${uniqueOrdered.length}`);
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
        createdBy: "BIO26_LEARNING_STRUCTURE_V1",
        approvalStatus: "approved",
        approvedBy: "BIO26_LEARNING_STRUCTURE_V1",
        reviewerNotes: "BIO26 main-skill training generated with balanced subskill coverage; source questions remain unchanged.",
      });
    });

    if (!mainTopicId) fail(`BIO26 missing main topic id for ${mainId}`);
  }

  return { foundationQuizzes, trainingQuizzes, shortages };
}
