import mongoose from "mongoose";
import { env } from "../config/env.js";
import { QuizModel } from "../models/Quiz.js";
import { TopicModel } from "../models/Topic.js";
import { SkillModel } from "../models/Skill.js";
import { QuestionModel } from "../models/Question.js";

const PATH_ID = "p_1777779653351";
const SUBJECT_ID = "sub_1784980706034";
const EXPECTED_QUESTIONS = 2064;
const EXPECTED_MAIN_SKILLS = 25;
const EXPECTED_SUB_SKILLS = 92;
const EXPECTED_FOUNDATION_DRILLS = 92;
const EXPECTED_TRAINING_DRILLS = 57;
const EXPECTED_STANDARD_TESTS = 43;

const fail = (m: string): never => {
  throw new Error(m);
};

async function main() {
  await mongoose.connect(env.MONGODB_URI);
  try {
    const [questionsCount, skills, topics, quizzes] = await Promise.all([
      QuestionModel.countDocuments({ pathId: PATH_ID, subjectId: SUBJECT_ID, approvalStatus: "approved" }),
      SkillModel.find({ pathId: PATH_ID, subjectId: SUBJECT_ID }).lean() as any[],
      TopicModel.find({ pathId: PATH_ID, subjectId: SUBJECT_ID }).lean() as any[],
      QuizModel.find({ pathId: PATH_ID, subjectId: SUBJECT_ID }).lean() as any[],
    ]);

    if (questionsCount !== EXPECTED_QUESTIONS) {
      fail(`Questions count mismatch: expected ${EXPECTED_QUESTIONS}, got ${questionsCount}`);
    }
    if (skills.length !== EXPECTED_MAIN_SKILLS) {
      fail(`Skills count mismatch: expected ${EXPECTED_MAIN_SKILLS}, got ${skills.length}`);
    }
    const subCount = skills.reduce((acc, s) => acc + (Array.isArray(s.subSkills) ? s.subSkills.length : 0), 0);
    if (subCount !== EXPECTED_SUB_SKILLS) {
      fail(`Subskills count mismatch: expected ${EXPECTED_SUB_SKILLS}, got ${subCount}`);
    }

    // Categorize quizzes
    const foundationQuizzes = quizzes.filter(
      (q) => q.quizKind === "drill" && q.learningPlacements?.some((p: any) => p.slot === "foundation"),
    );
    const trainingQuizzes = quizzes.filter(
      (q) => q.quizKind === "drill" && q.learningPlacements?.some((p: any) => p.slot === "training"),
    );
    const standardTests = quizzes.filter(
      (q) => q.quizKind === "test" && q.learningPlacements?.some((p: any) => p.slot === "tests"),
    );

    if (foundationQuizzes.length !== EXPECTED_FOUNDATION_DRILLS) {
      fail(`Foundation drills mismatch: expected ${EXPECTED_FOUNDATION_DRILLS}, got ${foundationQuizzes.length}`);
    }
    if (trainingQuizzes.length !== EXPECTED_TRAINING_DRILLS) {
      fail(`Training drills mismatch: expected ${EXPECTED_TRAINING_DRILLS}, got ${trainingQuizzes.length}`);
    }
    if (standardTests.length !== EXPECTED_STANDARD_TESTS) {
      fail(`Standard tests mismatch: expected ${EXPECTED_STANDARD_TESTS}, got ${standardTests.length}`);
    }

    // Verify all 43 tests have 48 questions each and consume all 2,064 questions
    for (const test of standardTests) {
      if (!Array.isArray(test.questionIds) || test.questionIds.length !== 48) {
        fail(`Test ${test.id} question count mismatch: expected 48, got ${test.questionIds?.length}`);
      }
    }

    const testQuestionRefs = standardTests.flatMap((t) => t.questionIds);
    if (testQuestionRefs.length !== EXPECTED_QUESTIONS) {
      fail(`Standard tests total question refs: expected ${EXPECTED_QUESTIONS}, got ${testQuestionRefs.length}`);
    }
    const uniqueRefs = new Set(testQuestionRefs);
    if (uniqueRefs.size !== EXPECTED_QUESTIONS) {
      fail(`Standard tests duplicate question refs found! Unique: ${uniqueRefs.size}`);
    }

    // Verify topic linking & locking
    const parentTopics = topics.filter((t) => !t.parentId);
    const childTopics = topics.filter((t) => Boolean(t.parentId));

    if (parentTopics.length !== EXPECTED_MAIN_SKILLS) {
      fail(`Parent topics mismatch: expected ${EXPECTED_MAIN_SKILLS}, got ${parentTopics.length}`);
    }
    if (childTopics.length !== EXPECTED_SUB_SKILLS) {
      fail(`Child topics mismatch: expected ${EXPECTED_SUB_SKILLS}, got ${childTopics.length}`);
    }

    const unlinkedChildTopics = childTopics.filter(
      (t) => !Array.isArray(t.quizIds) || t.quizIds.length === 0,
    );
    if (unlinkedChildTopics.length > 0) {
      fail(`Found ${unlinkedChildTopics.length} child topics without foundation quizIds`);
    }

    const unlinkedParentTopics = parentTopics.filter(
      (t) => !Array.isArray(t.quizIds) || t.quizIds.length === 0,
    );
    if (unlinkedParentTopics.length > 0) {
      fail(`Found ${unlinkedParentTopics.length} parent topics without training quizIds`);
    }

    const freeParents = parentTopics.filter((t) => t.isLocked === false).length;
    const lockedParents = parentTopics.filter((t) => t.isLocked === true).length;
    if (freeParents !== 5 || lockedParents !== 20) {
      fail(`Parent topic locking mismatch: expected 5 free / 20 locked, got ${freeParents}/${lockedParents}`);
    }

    console.log(
      JSON.stringify(
        {
          status: "PASS",
          totalQuestions: questionsCount,
          mainSkillsCount: skills.length,
          subSkillsCount: subCount,
          parentTopicsCount: parentTopics.length,
          childTopicsCount: childTopics.length,
          foundationDrillsLive: foundationQuizzes.length,
          trainingDrillsLive: trainingQuizzes.length,
          totalDrillsLive: foundationQuizzes.length + trainingQuizzes.length,
          standardTestsLive: standardTests.length,
          questionsPerStandardTest: 48,
          bankCoverageByStandardTests: `${uniqueRefs.size}/${EXPECTED_QUESTIONS} (100.0%)`,
          crossTestQuestionDuplicates: 0,
          freeParentTopics: freeParents,
          lockedParentTopics: lockedParents,
          freeStandardTests: standardTests.filter((t) => t.access?.type === "free").length,
          packageStandardTests: standardTests.filter((t) => t.access?.type === "paid").length,
          topicQuizLinksVerified: true,
        },
        null,
        2,
      ),
    );
    console.log("PHYS26_FULL_LEARNING_SUITE_VERIFICATION_PASS");
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((err) => {
  console.error("PHYS26_FULL_LEARNING_SUITE_VERIFICATION_FAILED", err);
  process.exit(1);
});
