import assert from "node:assert/strict";
import mongoose from "mongoose";
import { connectToDatabase } from "../config/db.js";
import { QuestionModel } from "../models/Question.js";
import { QuizModel } from "../models/Quiz.js";
import { loadLearnerSafeQuizCatalogPage } from "../modules/quizzes/application/learnerQuizCatalog.js";

const marker = `learner-catalog-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const pathId = `${marker}-path`;
const subjectId = `${marker}-subject`;

async function run() {
  await connectToDatabase();

  try {
    const question = await QuestionModel.create({
      id: `${marker}-question-alias`,
      text: "Learner catalog pagination integrity question",
      options: ["A", "B", "C", "D"],
      correctOptionIndex: 0,
      subject: subjectId,
      subjectId,
      pathId,
      approvalStatus: "approved",
    });
    const referencedObjectId = String(question._id);

    const validQuizzes = Array.from({ length: 205 }, (_, index) => ({
      _id: `${marker}-valid-${String(index).padStart(3, "0")}`,
      title: `Valid learner quiz ${index}`,
      pathId,
      subjectId,
      type: "quiz",
      quizKind: "drill",
      questionIds: [referencedObjectId, `${marker}-stale-question-${index}`],
      approvalStatus: "approved",
      isPublished: true,
      showOnPlatform: true,
    }));
    await QuizModel.insertMany(validQuizzes);

    // Keep invalid raw records newer than the valid catalog. A correct learner
    // page must scan past them instead of paginating the raw Mongo result first.
    await new Promise((resolve) => setTimeout(resolve, 15));
    const invalidQuizzes = Array.from({ length: 205 }, (_, index) => ({
      _id: `${marker}-invalid-${String(index).padStart(3, "0")}`,
      title: `Invalid learner quiz ${index}`,
      pathId,
      subjectId,
      type: "quiz",
      quizKind: "drill",
      questionIds: [`${marker}-missing-question-${index}`],
      approvalStatus: "approved",
      isPublished: true,
      showOnPlatform: true,
    }));
    await QuizModel.insertMany(invalidQuizzes);

    const filter = { pathId, subjectId, isPublished: true, approvalStatus: "approved" };
    const firstPage = await loadLearnerSafeQuizCatalogPage({
      filter,
      page: 1,
      limit: 200,
      noTotal: true,
      learnerAudience: { id: `${marker}-student`, groupIds: [] },
    });

    assert.equal(firstPage.items.length, 200, "learner page 1 must remain full after raw safety filtering");
    assert.equal(firstPage.hasMore, true, "learner page 1 must report the remaining valid quizzes");
    assert.ok(
      firstPage.items.every((quiz) => String(quiz._id).includes(`${marker}-valid-`)),
      "learner page 1 leaked an unusable raw quiz",
    );
    assert.ok(
      firstPage.items.every(
        (quiz) =>
          Array.isArray(quiz.questionIds) &&
          quiz.questionIds.length === 1 &&
          String(quiz.questionIds[0]) === referencedObjectId,
      ),
      "learner page leaked stale question references after eligibility filtering",
    );

    const secondPage = await loadLearnerSafeQuizCatalogPage({
      filter,
      page: 2,
      limit: 200,
      noTotal: true,
      learnerAudience: { id: `${marker}-student`, groupIds: [] },
    });

    assert.equal(secondPage.items.length, 5, "learner page 2 must contain the final five valid quizzes");
    assert.equal(secondPage.hasMore, false, "learner page 2 must terminate the safe catalog");

    const exactPage = await loadLearnerSafeQuizCatalogPage({
      filter,
      page: 1,
      limit: 25,
      noTotal: false,
      learnerAudience: { id: `${marker}-student`, groupIds: [] },
    });
    assert.equal(exactPage.total, 205, "exact learner total must count safe quizzes, not raw Mongo records");
    assert.equal(exactPage.items.length, 25, "exact learner page must preserve the requested page size");

    const mockSubjectId = `${subjectId}-mock`;
    await QuizModel.create({
      _id: `${marker}-mock`,
      title: "Learner mock sanitation",
      pathId,
      subjectId: mockSubjectId,
      type: "quiz",
      quizKind: "mock",
      questionIds: [referencedObjectId, `${marker}-mock-stale-top-level`],
      mockExam: {
        enabled: true,
        pathId,
        sections: [
          {
            id: "section-valid",
            title: "Valid section",
            subjectId: mockSubjectId,
            questionIds: [referencedObjectId, `${marker}-mock-stale-section`],
          },
          {
            id: "section-empty-after-sanitize",
            title: "Empty section",
            subjectId: mockSubjectId,
            questionIds: [`${marker}-missing-only`],
          },
        ],
      },
      approvalStatus: "approved",
      isPublished: true,
      showOnPlatform: true,
    });

    const mockPage = await loadLearnerSafeQuizCatalogPage({
      filter: { pathId, subjectId: mockSubjectId, isPublished: true, approvalStatus: "approved" },
      page: 1,
      limit: 10,
      noTotal: false,
      learnerAudience: { id: `${marker}-student`, groupIds: [] },
    });

    assert.equal(mockPage.items.length, 1, "sanitized learner mock must remain visible with valid questions");
    assert.deepEqual(
      mockPage.items[0].questionIds,
      [referencedObjectId],
      "mock top-level questionIds must contain only usable references",
    );
    assert.equal(
      mockPage.items[0].mockExam?.sections?.length,
      1,
      "mock sections with zero usable questions must be removed from learner response",
    );
    assert.deepEqual(
      mockPage.items[0].mockExam?.sections?.[0]?.questionIds,
      [referencedObjectId],
      "mock section questionIds must contain only usable references",
    );

    console.log("PASS learner quiz catalog pagination gate");
  } finally {
    await QuizModel.deleteMany({ pathId });
    await QuestionModel.deleteMany({ pathId });
    await mongoose.disconnect();
  }
}

run().catch((error) => {
  console.error("FAIL learner quiz catalog pagination gate", error);
  process.exitCode = 1;
});
