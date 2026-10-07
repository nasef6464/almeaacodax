export const PATH_ID = "p_1777779653351";
export const SUBJECT_ID = "sub_tah_biology_bio26";
export const BATCH_ID = "TAH-CHEM-BIO26-FULL-V1";
export const EXPECTED_SOURCE_QUESTIONS = 2832;
export const TEST_COUNT = 71;
export const FREE_TEST_COUNT = 5;
export const TEST_SIZES = Array.from({ length: TEST_COUNT }, (_, index) => index < 63 ? 40 : 39);
export const TOTAL_TEST_QUESTION_REFS = TEST_SIZES.reduce((sum, size) => sum + size, 0);

export type Bio26TestQuestion = {
  id: string;
  questionCode: string;
  skillId: string;
  subSkillId: string;
};

export type ExpectedBio26Test = {
  id: string;
  title: string;
  description: string;
  pathId: string;
  subjectId: string;
  sectionId: null;
  type: "quiz";
  quizKind: "test";
  placement: "mock";
  showInTraining: false;
  showInMock: true;
  learningPlacements: Array<{
    pathId: string;
    subjectId: string;
    slot: "tests";
    accessType: "free" | "package";
    isVisible: true;
    order: number;
    courseId: null;
    lessonId: null;
    topicId: null;
    createdAt: number;
    updatedAt: number;
  }>;
  mode: "regular";
  settings: {
    showExplanations: true;
    showAnswers: true;
    showResultsReport: true;
    returnToSourceOnFinish: false;
    maxAttempts: 3;
    passingScore: 60;
    timeLimit: 60;
    randomizeQuestions: false;
    randomizeOptions: false;
    showProgressBar: true;
    requireAnswerBeforeNext: false;
    allowQuestionReview: true;
    optionLayout: "auto";
  };
  access: { type: "free" | "paid"; price: number; allowedGroupIds: string[] };
  questionIds: string[];
  skillIds: string[];
  isPublished: true;
  showOnPlatform: true;
  ownerType: "platform";
  ownerId: "";
  createdBy: "BIO26_STANDARD_TESTS_V1";
  approvalStatus: "approved";
  approvedBy: "BIO26_STANDARD_TESTS_V1";
  reviewerNotes: string;
};

const byCode = (a: Bio26TestQuestion, b: Bio26TestQuestion) =>
  a.questionCode.localeCompare(b.questionCode);

function roundRobinSubskills(items: Bio26TestQuestion[]) {
  const grouped = new Map<string, Bio26TestQuestion[]>();
  for (const item of [...items].sort(byCode)) {
    if (!grouped.has(item.subSkillId)) grouped.set(item.subSkillId, []);
    grouped.get(item.subSkillId)!.push(item);
  }
  const keys = [...grouped.keys()].sort();
  const offsets = new Map(keys.map((key) => [key, 0]));
  const out: Bio26TestQuestion[] = [];
  while (true) {
    let added = false;
    for (const key of keys) {
      const index = offsets.get(key)!;
      const item = grouped.get(key)![index];
      if (!item) continue;
      out.push(item);
      offsets.set(key, index + 1);
      added = true;
    }
    if (!added) return out;
  }
}

function sourceSkillRows(questions: Bio26TestQuestion[]) {
  const grouped = new Map<string, Bio26TestQuestion[]>();
  for (const question of questions) {
    if (!grouped.has(question.skillId)) grouped.set(question.skillId, []);
    grouped.get(question.skillId)!.push(question);
  }
  return [...grouped.entries()]
    .map(([skillId, items]) => ({ skillId, available: items.length, quota: items.length }))
    .sort((a, b) => a.skillId.localeCompare(b.skillId));
}

function mixTest(items: Bio26TestQuestion[], testIndex: number) {
  const grouped = new Map<string, Bio26TestQuestion[]>();
  for (const item of items) {
    if (!grouped.has(item.skillId)) grouped.set(item.skillId, []);
    grouped.get(item.skillId)!.push(item);
  }
  for (const group of grouped.values()) group.sort(byCode);
  const skillIds = [...grouped.keys()].sort();
  const rotation = skillIds.length ? testIndex % skillIds.length : 0;
  const rotated = [...skillIds.slice(rotation), ...skillIds.slice(0, rotation)];
  const offsets = new Map(rotated.map((skillId) => [skillId, 0]));
  const out: Bio26TestQuestion[] = [];
  while (true) {
    let added = false;
    for (const skillId of rotated) {
      const index = offsets.get(skillId)!;
      const item = grouped.get(skillId)![index];
      if (!item) continue;
      out.push(item);
      offsets.set(skillId, index + 1);
      added = true;
    }
    if (!added) return out;
  }
}

export function buildBio26StandardTests(questions: Bio26TestQuestion[]) {
  if (questions.length !== EXPECTED_SOURCE_QUESTIONS) {
    throw new Error(`BIO26 standard tests source drift: expected ${EXPECTED_SOURCE_QUESTIONS}, got ${questions.length}`);
  }
  if (new Set(questions.map((q) => q.id)).size !== EXPECTED_SOURCE_QUESTIONS) {
    throw new Error("BIO26 standard tests source identity is not unique");
  }

  const byMain = new Map<string, Bio26TestQuestion[]>();
  for (const question of questions) {
    if (!byMain.has(question.skillId)) byMain.set(question.skillId, []);
    byMain.get(question.skillId)!.push(question);
  }
  if (byMain.size !== 29) throw new Error(`BIO26 expected 29 main skills, got ${byMain.size}`);

  const quotas = sourceSkillRows(questions);
  const selectedByMain = new Map<string, Bio26TestQuestion[]>();
  for (const row of quotas) {
    const ordered = roundRobinSubskills(byMain.get(row.skillId) || []);
    selectedByMain.set(row.skillId, ordered);
  }

  if (TOTAL_TEST_QUESTION_REFS !== EXPECTED_SOURCE_QUESTIONS) {
    throw new Error(`BIO26 test capacity mismatch: tests=${TOTAL_TEST_QUESTION_REFS} source=${EXPECTED_SOURCE_QUESTIONS}`);
  }

  const buckets: Bio26TestQuestion[][] = Array.from({ length: TEST_COUNT }, () => []);
  const perTestMainCounts = Array.from({ length: TEST_COUNT }, () => new Map<string, number>());
  const orderedSkills = [...quotas].sort((a, b) => b.quota - a.quota || a.skillId.localeCompare(b.skillId));

  orderedSkills.forEach((row, skillIndex) => {
    const selected = selectedByMain.get(row.skillId) || [];
    selected.forEach((question, questionIndex) => {
      const start = (skillIndex * 11 + questionIndex * 5) % TEST_COUNT;
      const candidates = Array.from({ length: TEST_COUNT }, (_, index) => index)
        .filter((index) => buckets[index].length < TEST_SIZES[index]);

      if (candidates.length === 0) {
        throw new Error(`BIO26 no remaining test capacity while assigning ${question.questionCode}`);
      }

      candidates.sort((left, right) => {
        const leftSkill = perTestMainCounts[left].get(row.skillId) || 0;
        const rightSkill = perTestMainCounts[right].get(row.skillId) || 0;
        if (leftSkill !== rightSkill) return leftSkill - rightSkill;

        const leftFill = buckets[left].length / TEST_SIZES[left];
        const rightFill = buckets[right].length / TEST_SIZES[right];
        if (leftFill !== rightFill) return leftFill - rightFill;

        if (buckets[left].length !== buckets[right].length) return buckets[left].length - buckets[right].length;
        return ((left - start + TEST_COUNT) % TEST_COUNT) - ((right - start + TEST_COUNT) % TEST_COUNT);
      });

      const target = candidates[0];
      buckets[target].push(question);
      perTestMainCounts[target].set(row.skillId, (perTestMainCounts[target].get(row.skillId) || 0) + 1);
    });
  });

  const now = Date.now();
  const tests: ExpectedBio26Test[] = buckets.map((raw, index) => {
    const expectedSize = TEST_SIZES[index];
    if (raw.length !== expectedSize) {
      throw new Error(`BIO26 test ${index + 1} size mismatch: expected ${expectedSize}, got ${raw.length}`);
    }
    const mixed = mixTest(raw, index);
    const distinctMain = new Set(mixed.map((item) => item.skillId));
    const distinctSub = new Set(mixed.map((item) => item.subSkillId));
    if (distinctMain.size < 20) {
      throw new Error(`BIO26 test ${index + 1} main-skill coverage too low: ${distinctMain.size}`);
    }
    if (distinctSub.size < 20) {
      throw new Error(`BIO26 test ${index + 1} subskill diversity too low: ${distinctSub.size}`);
    }

    const number = index + 1;
    const free = number <= FREE_TEST_COUNT;
    const id = `bio26_standard_test_${String(number).padStart(2, "0")}`;
    return {
      id,
      title: `اختبار الكيمياء القياسي — ${String(number).padStart(2, "0")}`,
      description: `اختبار شامل من ${expectedSize} سؤالًا من بنك BIO26 ويغطي ${distinctMain.size} مهارة رئيسية و${distinctSub.size} مهارة فرعية بدون تكرار أي سؤال بين النماذج الـ71.`,
      pathId: PATH_ID,
      subjectId: SUBJECT_ID,
      sectionId: null,
      type: "quiz",
      quizKind: "test",
      placement: "mock",
      showInTraining: false,
      showInMock: true,
      learningPlacements: [{
        pathId: PATH_ID,
        subjectId: SUBJECT_ID,
        slot: "tests",
        accessType: free ? "free" : "package",
        isVisible: true,
        order: number,
        courseId: null,
        lessonId: null,
        topicId: null,
        createdAt: now,
        updatedAt: now,
      }],
      mode: "regular",
      settings: {
        showExplanations: true,
        showAnswers: true,
        showResultsReport: true,
        returnToSourceOnFinish: false,
        maxAttempts: 3,
        passingScore: 60,
        timeLimit: 60,
        randomizeQuestions: false,
        randomizeOptions: false,
        showProgressBar: true,
        requireAnswerBeforeNext: false,
        allowQuestionReview: true,
        optionLayout: "auto",
      },
      access: { type: free ? "free" : "paid", price: 0, allowedGroupIds: [] },
      questionIds: mixed.map((item) => item.id),
      skillIds: [...distinctMain].sort(),
      isPublished: true,
      showOnPlatform: true,
      ownerType: "platform",
      ownerId: "",
      createdBy: "BIO26_STANDARD_TESTS_V1",
      approvalStatus: "approved",
      approvedBy: "BIO26_STANDARD_TESTS_V1",
      reviewerNotes: "BIO26 standardized test generated from approved source bank using proportional main-skill quotas and deterministic subskill-balanced selection.",
    };
  });

  const allIds = tests.flatMap((test) => test.questionIds);
  if (allIds.length !== TOTAL_TEST_QUESTION_REFS || new Set(allIds).size !== TOTAL_TEST_QUESTION_REFS) {
    throw new Error(`BIO26 standard tests must use all ${EXPECTED_SOURCE_QUESTIONS} unique question references with zero cross-test overlap`);
  }

  const tranches = Array.from({ length: Math.floor(TEST_COUNT / 5) }, (_, index) => tests.slice(index * 5, index * 5 + 5));
  for (const [index, tranche] of tranches.entries()) {
    const skills = new Set(tranche.flatMap((test) => test.skillIds));
    if (skills.size !== 29) {
      throw new Error(`BIO26 five-test tranche ${index + 1} does not cover all 29 main skills`);
    }
  }

  return {
    tests,
    quotas,
    usedQuestionCount: allIds.length,
    reserveQuestionCount: 0,
  };
}
