import { QuestionModel } from "../../models/Question.js";
import { QuizModel } from "../../models/Quiz.js";
import {
  BATCH_ID,
  EXPECTED_SOURCE_QUESTIONS,
  FREE_TEST_COUNT,
  PATH_ID,
  TEST_SIZES,
  SUBJECT_ID,
  TEST_COUNT,
  TOTAL_TEST_QUESTION_REFS,
  buildChem26StandardTests,
  type Chem26TestQuestion,
} from "./chem26StandardTestsPlan.js";

const stringId = (value: unknown) => String(value ?? "").trim();

async function loadSourceQuestions() {
  const [total, approved, raw] = await Promise.all([
    QuestionModel.countDocuments({ "sourceMeta.importBatchId": BATCH_ID }),
    QuestionModel.countDocuments({ "sourceMeta.importBatchId": BATCH_ID, approvalStatus: "approved" }),
    QuestionModel.find({
      "sourceMeta.importBatchId": BATCH_ID,
      approvalStatus: "approved",
      pathId: PATH_ID,
      subjectId: SUBJECT_ID,
    })
      .select("_id id questionCode skillId subSkillId")
      .sort({ questionCode: 1 })
      .lean() as Promise<any[]>,
  ]);

  if (total !== EXPECTED_SOURCE_QUESTIONS || approved !== EXPECTED_SOURCE_QUESTIONS || raw.length !== EXPECTED_SOURCE_QUESTIONS) {
    throw new Error(`CHEM26 standard tests source gate failed: total=${total} approved=${approved} loaded=${raw.length}`);
  }

  const questions: Chem26TestQuestion[] = raw.map((question) => ({
    id: stringId(question.id || question._id),
    questionCode: stringId(question.questionCode),
    skillId: stringId(question.skillId),
    subSkillId: stringId(question.subSkillId),
  }));

  if (questions.some((question) => !question.id || !question.questionCode || !question.skillId || !question.subSkillId)) {
    throw new Error("CHEM26 standard tests source has incomplete question identity or taxonomy fields");
  }

  return questions;
}

async function verifyExpected(tests: ReturnType<typeof buildChem26StandardTests>["tests"]) {
  const expectedIds = tests.map((test) => test.id);
  const existing = await QuizModel.find({ _id: { $in: expectedIds } }).lean() as any[];
  if (existing.length !== TEST_COUNT) {
    return { ok: false, reason: `test count ${existing.length}/${TEST_COUNT}` };
  }

  const byId = new Map(existing.map((quiz) => [stringId(quiz.id || quiz._id), quiz]));
  const crossSeen = new Set<string>();

  for (const expected of tests) {
    const actual = byId.get(expected.id);
    const placement = Array.isArray(actual?.learningPlacements)
      ? actual.learningPlacements.find((item: any) => item.slot === "tests")
      : null;
    const number = Number(expected.id.slice(-2));
    const shouldBeFree = number <= FREE_TEST_COUNT;

    if (
      !actual ||
      actual.approvalStatus !== "approved" ||
      actual.isPublished !== true ||
      actual.showOnPlatform !== true ||
      actual.quizKind !== "test" ||
      actual.placement !== "mock" ||
      actual.showInMock !== true ||
      actual.showInTraining !== false ||
      stringId(actual.pathId) !== PATH_ID ||
      stringId(actual.subjectId) !== SUBJECT_ID ||
      !Array.isArray(actual.questionIds) ||
      actual.questionIds.length !== TEST_SIZES[number - 1] ||
      actual.questionIds.some((id: unknown, index: number) => stringId(id) !== expected.questionIds[index]) ||
      actual.access?.type !== (shouldBeFree ? "free" : "paid") ||
      !placement ||
      placement.isVisible === false ||
      placement.accessType !== (shouldBeFree ? "free" : "package")
    ) {
      return { ok: false, reason: `test mismatch ${expected.id}` };
    }

    for (const questionId of actual.questionIds.map(String)) {
      if (crossSeen.has(questionId)) return { ok: false, reason: `cross-test duplicate ${questionId}` };
      crossSeen.add(questionId);
    }
  }

  if (crossSeen.size !== TOTAL_TEST_QUESTION_REFS) {
    return { ok: false, reason: `unique question refs ${crossSeen.size}/${TOTAL_TEST_QUESTION_REFS}` };
  }

  return { ok: true, reason: "PASS" };
}

export async function runChem26StandardTestsIfNeeded() {
  const questions = await loadSourceQuestions();
  const expected = buildChem26StandardTests(questions);

  const before = await verifyExpected(expected.tests);
  if (before.ok) {
    console.log(
      "CHEM26_STANDARD_TESTS_NOOP",
      JSON.stringify({
        tests: TEST_COUNT,
        minQuestionsPerTest: Math.min(...TEST_SIZES),
        maxQuestionsPerTest: Math.max(...TEST_SIZES),
        uniqueQuestionRefs: expected.usedQuestionCount,
        reserveQuestions: expected.reserveQuestionCount,
        freeTests: FREE_TEST_COUNT,
      }),
    );
    return;
  }

  const now = Date.now();
  const ops = expected.tests.map((test) => ({
    updateOne: {
      filter: { _id: test.id },
      update: {
        $set: {
          id: test.id,
          title: test.title,
          description: test.description,
          pathId: test.pathId,
          subjectId: test.subjectId,
          sectionId: null,
          type: test.type,
          quizKind: test.quizKind,
          placement: test.placement,
          showInTraining: test.showInTraining,
          showInMock: test.showInMock,
          learningPlacements: test.learningPlacements,
          mode: test.mode,
          settings: test.settings,
          access: test.access,
          questionIds: test.questionIds,
          skillIds: test.skillIds,
          isPublished: test.isPublished,
          showOnPlatform: test.showOnPlatform,
          ownerType: test.ownerType,
          ownerId: test.ownerId,
          createdBy: test.createdBy,
          approvalStatus: test.approvalStatus,
          approvedBy: test.approvedBy,
          approvedAt: now,
          reviewerNotes: test.reviewerNotes,
          updatedAt: new Date(),
        },
        $setOnInsert: { createdAt: new Date() },
      },
      upsert: true,
    },
  }));

  const write = await QuizModel.bulkWrite(ops as any);
  const after = await verifyExpected(expected.tests);
  if (!after.ok) throw new Error(`CHEM26 standard tests post-write verification failed: ${after.reason}`);

  console.log(
    "CHEM26_STANDARD_TESTS_PASS",
    JSON.stringify({
      tests: TEST_COUNT,
      minQuestionsPerTest: Math.min(...TEST_SIZES),
      maxQuestionsPerTest: Math.max(...TEST_SIZES),
      uniqueQuestionRefs: expected.usedQuestionCount,
      reserveQuestions: expected.reserveQuestionCount,
      freeTests: FREE_TEST_COUNT,
      paidTests: TEST_COUNT - FREE_TEST_COUNT,
      matched: write.matchedCount,
      upserted: write.upsertedCount,
      minMainSkillsPerTest: Math.min(...expected.tests.map((test) => test.skillIds.length)),
      maxMainSkillsPerTest: Math.max(...expected.tests.map((test) => test.skillIds.length)),
    }),
  );
}

export async function verifyChem26StandardTests() {
  const questions = await loadSourceQuestions();
  const expected = buildChem26StandardTests(questions);
  const result = await verifyExpected(expected.tests);
  if (!result.ok) throw new Error(`CHEM26_STANDARD_TESTS_VERIFY_FAILED ${result.reason}`);

  console.log(
    "CHEM26_STANDARD_TESTS_VERIFY_PASS",
    JSON.stringify({
      tests: TEST_COUNT,
      minQuestionsPerTest: Math.min(...TEST_SIZES),
      maxQuestionsPerTest: Math.max(...TEST_SIZES),
      uniqueQuestionRefs: expected.usedQuestionCount,
      reserveQuestions: expected.reserveQuestionCount,
      freeTests: FREE_TEST_COUNT,
      paidTests: TEST_COUNT - FREE_TEST_COUNT,
      minMainSkillsPerTest: Math.min(...expected.tests.map((test) => test.skillIds.length)),
      maxMainSkillsPerTest: Math.max(...expected.tests.map((test) => test.skillIds.length)),
      quotaTotal: expected.quotas.reduce((sum, row) => sum + row.quota, 0),
    }),
  );
}
