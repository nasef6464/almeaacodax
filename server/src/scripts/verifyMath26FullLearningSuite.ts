import dotenv from "dotenv";
dotenv.config({ path: ".env.codex.local" });
dotenv.config({ path: "../.env.codex.local" });
dotenv.config({ path: "./.env" });
dotenv.config({ path: "./server/.env" });
dotenv.config({ path: "../.env" });

import mongoose from "mongoose";

const PATH_ID = "p_1777779653351";
const SUBJECT_ID = "sub_1777784609152";
const EXPECTED_QUESTIONS = 2595;
const EXPECTED_BANK3_QUESTIONS = 1257;
const EXPECTED_MAIN_SKILLS = 22;
const EXPECTED_SUB_SKILLS = 70;
const EXPECTED_FOUNDATION_DRILLS = 70;
const EXPECTED_TRAINING_DRILLS = 47;
const EXPECTED_STANDARD_TESTS = 26;

const fail = (m: string): never => {
  throw new Error(m);
};

async function main() {
  const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI || "";
  if (!mongoUri) fail("No MONGODB_URI");

  console.log("[1] Connecting to MongoDB...");
  await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 15000 });
  const db = mongoose.connection.db;
  if (!db) fail("No DB handle");
  console.log("[2] Connected to MongoDB.");

  try {
    const questionsCol = db.collection("questions");
    const skillsCol = db.collection("skills");
    const topicsCol = db.collection("topics");
    const quizzesCol = db.collection("quizzes");

    console.log("[3] Fetching questions, skills, topics, quizzes...");
    const [questionsCount, skills, topics, quizzes] = await Promise.all([
      questionsCol.countDocuments({
        $or: [{ subjectId: SUBJECT_ID }, { subject: SUBJECT_ID }],
        approvalStatus: "approved",
      }),
      skillsCol.find({ subjectId: SUBJECT_ID }).toArray(),
      topicsCol.find({ subjectId: SUBJECT_ID }).toArray(),
      quizzesCol.find({ subjectId: SUBJECT_ID }).toArray(),
    ]);

    if (questionsCount !== EXPECTED_QUESTIONS) {
      fail(`Questions count mismatch: expected ${EXPECTED_QUESTIONS}, got ${questionsCount}`);
    }
    if (skills.length !== EXPECTED_MAIN_SKILLS) {
      fail(`Skills count mismatch: expected ${EXPECTED_MAIN_SKILLS}, got ${skills.length}`);
    }
    const subCount = skills.reduce(
      (acc: number, s: any) => acc + (Array.isArray(s.subSkills) ? s.subSkills.length : 0),
      0,
    );
    if (subCount !== EXPECTED_SUB_SKILLS) {
      fail(`Subskills count mismatch: expected ${EXPECTED_SUB_SKILLS}, got ${subCount}`);
    }

    // Categorize quizzes
    const foundationQuizzes = quizzes.filter(
      (q: any) =>
        q.quizKind === "drill" &&
        q.learningPlacements?.some((p: any) => p.slot === "foundation"),
    );
    const trainingQuizzes = quizzes.filter(
      (q: any) =>
        q.quizKind === "drill" &&
        q.learningPlacements?.some((p: any) => p.slot === "training"),
    );
    const standardTests = quizzes.filter(
      (q: any) =>
        q.quizKind === "test" &&
        q.learningPlacements?.some((p: any) => p.slot === "tests"),
    );

    if (foundationQuizzes.length !== EXPECTED_FOUNDATION_DRILLS) {
      fail(
        `Foundation drills mismatch: expected ${EXPECTED_FOUNDATION_DRILLS}, got ${foundationQuizzes.length}`,
      );
    }
    if (trainingQuizzes.length !== EXPECTED_TRAINING_DRILLS) {
      fail(
        `Training drills mismatch: expected ${EXPECTED_TRAINING_DRILLS}, got ${trainingQuizzes.length}`,
      );
    }
    if (standardTests.length !== EXPECTED_STANDARD_TESTS) {
      fail(
        `Standard tests mismatch: expected ${EXPECTED_STANDARD_TESTS}, got ${standardTests.length}`,
      );
    }

    // Verify all 26 tests consume all 1,257 questions of Bank 3
    for (const test of standardTests) {
      if (
        !Array.isArray(test.questionIds) ||
        (test.questionIds.length !== 48 && test.questionIds.length !== 49)
      ) {
        fail(
          `Test ${test.id} question count mismatch: expected 48 or 49, got ${test.questionIds?.length}`,
        );
      }
    }

    const testQuestionRefs = standardTests.flatMap((t: any) => t.questionIds);
    if (testQuestionRefs.length !== EXPECTED_BANK3_QUESTIONS) {
      fail(
        `Standard tests total question refs: expected ${EXPECTED_BANK3_QUESTIONS}, got ${testQuestionRefs.length}`,
      );
    }
    const uniqueRefs = new Set(testQuestionRefs);
    if (uniqueRefs.size !== EXPECTED_BANK3_QUESTIONS) {
      fail(`Standard tests duplicate question refs found! Unique: ${uniqueRefs.size}`);
    }

    // Verify topic linking & locking
    const parentTopics = topics.filter(
      (t: any) => !t.parentId && String(t.id || t._id).startsWith("top_tah_math_main_"),
    );
    const childTopics = topics.filter((t: any) => Boolean(t.parentId));

    if (parentTopics.length !== EXPECTED_MAIN_SKILLS) {
      fail(`Parent topics mismatch: expected ${EXPECTED_MAIN_SKILLS}, got ${parentTopics.length}`);
    }
    if (childTopics.length !== EXPECTED_SUB_SKILLS) {
      fail(`Child topics mismatch: expected ${EXPECTED_SUB_SKILLS}, got ${childTopics.length}`);
    }

    const unlinkedChildTopics = childTopics.filter(
      (t: any) => !Array.isArray(t.quizIds) || t.quizIds.length === 0,
    );
    if (unlinkedChildTopics.length > 0) {
      fail(`Found ${unlinkedChildTopics.length} child topics without foundation quizIds`);
    }

    const unlinkedParentTopics = parentTopics.filter(
      (t: any) => !Array.isArray(t.quizIds) || t.quizIds.length === 0,
    );
    if (unlinkedParentTopics.length > 0) {
      fail(`Found ${unlinkedParentTopics.length} parent topics without training quizIds`);
    }

    const freeParents = parentTopics.filter((t: any) => t.isLocked === false).length;
    const lockedParents = parentTopics.filter((t: any) => t.isLocked === true).length;
    if (freeParents !== 5 || lockedParents !== 17) {
      fail(
        `Parent topic locking mismatch: expected 5 free / 17 locked, got ${freeParents}/${lockedParents}`,
      );
    }

    const freeTests = standardTests.filter((t: any) => t.access?.type === "free").length;
    const paidTests = standardTests.filter((t: any) => t.access?.type === "paid").length;
    if (freeTests !== 5 || paidTests !== 21) {
      fail(`Standard tests access mismatch: expected 5 free / 21 paid, got ${freeTests}/${paidTests}`);
    }

    console.log(
      JSON.stringify(
        {
          status: "PASS",
          subject: "رياضيات (MATH26)",
          totalApprovedQuestions: questionsCount,
          mainSkillsCount: skills.length,
          subSkillsCount: subCount,
          parentTopicsCount: parentTopics.length,
          childTopicsCount: childTopics.length,
          foundationDrillsLive: foundationQuizzes.length,
          trainingDrillsLive: trainingQuizzes.length,
          totalDrillsLive: foundationQuizzes.length + trainingQuizzes.length,
          standardTestsLive: standardTests.length,
          totalLiveQuizzes: quizzes.length,
          bank3CoverageByStandardTests: `${uniqueRefs.size}/${EXPECTED_BANK3_QUESTIONS} (100.0%)`,
          crossTestQuestionDuplicates: 0,
          freeParentTopics: freeParents,
          lockedParentTopics: lockedParents,
          freeStandardTests: freeTests,
          packageStandardTests: paidTests,
          topicQuizLinksVerified: true,
        },
        null,
        2,
      ),
    );
    console.log("MATH26_FULL_LEARNING_SUITE_VERIFICATION_PASS");
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((err) => {
  console.error("MATH26_FULL_LEARNING_SUITE_VERIFICATION_FAILED", err);
  process.exit(1);
});
