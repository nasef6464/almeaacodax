import assert from "node:assert/strict";
import mongoose from "mongoose";
import { connectToDatabase } from "../config/db.js";
import { BackupActivityModel } from "../models/BackupActivity.js";
import { BackupSnapshotModel } from "../models/BackupSnapshot.js";
import { QuestionModel } from "../models/Question.js";
import { QuizModel } from "../models/Quiz.js";
import { TopicModel } from "../models/Topic.js";
import {
  LEARNER_REFERENCE_REPAIR_CONFIRM_TEXT,
  repairLearnerReferenceIntegrity,
} from "../modules/quizzes/application/learnerReferenceRepair.js";
import { restoreLearningBackup } from "../services/learningBackup.js";

const marker = `learner-reference-repair-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const pathId = `${marker}-path`;
const subjectId = `${marker}-subject`;
const validQuestionId = `${marker}-question`;
const partialQuizId = `${marker}-partial`;
const zeroQuizId = `${marker}-zero`;
const mockQuizId = `${marker}-mock`;
const partialTopicId = `${marker}-topic-partial`;
const mockTopicId = `${marker}-topic-mock`;
const snapshotTitle = `${marker}-safety-snapshot`;

async function run() {
  await connectToDatabase();

  try {
    const question = await QuestionModel.create({
      id: validQuestionId,
      text: "Valid learner reference repair question",
      options: ["A", "B", "C", "D"],
      correctOptionIndex: 0,
      pathId,
      subjectId,
      subject: subjectId,
      approvalStatus: "approved",
    });
    const validObjectId = String(question._id);

    await QuizModel.insertMany([
      {
        _id: partialQuizId,
        id: partialQuizId,
        title: "Partial stale quiz",
        pathId,
        subjectId,
        type: "quiz",
        quizKind: "drill",
        questionIds: [validObjectId, `${marker}-missing-partial`],
        approvalStatus: "approved",
        isPublished: true,
        showOnPlatform: true,
      },
      {
        _id: zeroQuizId,
        id: zeroQuizId,
        title: "Zero usable quiz",
        pathId,
        subjectId,
        type: "quiz",
        quizKind: "drill",
        questionIds: [`${marker}-missing-zero`],
        approvalStatus: "approved",
        isPublished: true,
        showOnPlatform: true,
      },
      {
        _id: mockQuizId,
        id: mockQuizId,
        title: "Mock stale quiz",
        pathId,
        subjectId,
        type: "quiz",
        quizKind: "mock",
        questionIds: [validObjectId, `${marker}-missing-top`],
        mockExam: {
          enabled: true,
          pathId,
          sections: [
            {
              id: "valid-section",
              title: "Valid section",
              subjectId,
              questionIds: [validObjectId, `${marker}-missing-section`],
            },
            {
              id: "dead-section",
              title: "Dead section",
              subjectId,
              questionIds: [`${marker}-missing-only`],
            },
          ],
        },
        approvalStatus: "approved",
        isPublished: true,
        showOnPlatform: true,
      },
    ]);

    await TopicModel.insertMany([
      {
        id: partialTopicId,
        title: "Partial topic",
        pathId,
        subjectId,
        quizIds: [partialQuizId, zeroQuizId],
        showOnPlatform: true,
      },
      {
        id: mockTopicId,
        title: "Mock topic",
        pathId,
        subjectId,
        quizIds: [mockQuizId, `${marker}-missing-quiz`],
        showOnPlatform: true,
      },
    ]);

    const dryRun = await repairLearnerReferenceIntegrity();
    assert.equal(dryRun.mode, "DRY_RUN");
    assert.equal(dryRun.totals.changedQuizzes, 3);
    assert.equal(dryRun.totals.hiddenQuizzes, 1);
    assert.equal(dryRun.totals.changedTopics, 2);
    assert.ok(dryRun.totals.removedQuestionRefs >= 4);
    assert.equal(dryRun.safetySnapshotId, "");

    const beforeApplyPartial = await QuizModel.findById(partialQuizId).lean();
    assert.deepEqual(
      beforeApplyPartial?.questionIds?.map(String),
      [validObjectId, `${marker}-missing-partial`],
      "dry-run must not mutate quiz references",
    );

    await assert.rejects(
      () => repairLearnerReferenceIntegrity({ apply: true, confirmText: "WRONG" }),
      /Refusing learner reference repair apply/,
    );

    const applied = await repairLearnerReferenceIntegrity({
      apply: true,
      confirmText: LEARNER_REFERENCE_REPAIR_CONFIRM_TEXT,
      actorId: "ci",
      snapshotTitle,
    });
    assert.equal(applied.mode, "APPLY");
    assert.ok(applied.safetySnapshotId, "apply must create a safety snapshot");

    const [partialQuiz, zeroQuiz, mockQuiz, partialTopic, mockTopic, snapshot] = await Promise.all([
      QuizModel.findById(partialQuizId).lean(),
      QuizModel.findById(zeroQuizId).lean(),
      QuizModel.findById(mockQuizId).lean(),
      TopicModel.findOne({ id: partialTopicId }).lean(),
      TopicModel.findOne({ id: mockTopicId }).lean(),
      BackupSnapshotModel.findById(applied.safetySnapshotId).lean(),
    ]);

    assert.deepEqual(partialQuiz?.questionIds?.map(String), [validObjectId]);
    assert.equal(zeroQuiz?.showOnPlatform, false, "zero-usable quiz must be hidden from learners");
    assert.deepEqual(mockQuiz?.questionIds?.map(String), [validObjectId]);
    assert.equal(mockQuiz?.mockExam?.sections?.length, 1);
    assert.deepEqual(mockQuiz?.mockExam?.sections?.[0]?.questionIds?.map(String), [validObjectId]);
    assert.deepEqual(partialTopic?.quizIds?.map(String), [partialQuizId]);
    assert.deepEqual(mockTopic?.quizIds?.map(String), [mockQuizId]);

    assert.ok(snapshot, "safety snapshot must exist");
    assert.equal(snapshot?.title, snapshotTitle);
    assert.equal(snapshot?.summary?.quizzes, 3);
    assert.equal(snapshot?.summary?.topics, 2);

    await restoreLearningBackup(snapshot?.payload, { apply: true, replace: false });

    const [restoredPartial, restoredZero, restoredMock, restoredPartialTopic, restoredMockTopic] = await Promise.all([
      QuizModel.findById(partialQuizId).lean(),
      QuizModel.findById(zeroQuizId).lean(),
      QuizModel.findById(mockQuizId).lean(),
      TopicModel.findOne({ id: partialTopicId }).lean(),
      TopicModel.findOne({ id: mockTopicId }).lean(),
    ]);

    assert.deepEqual(
      restoredPartial?.questionIds?.map(String),
      [validObjectId, `${marker}-missing-partial`],
      "safety snapshot must restore original partial quiz refs",
    );
    assert.equal(restoredZero?.showOnPlatform, true, "safety snapshot must restore zero quiz visibility");
    assert.equal(restoredMock?.mockExam?.sections?.length, 2, "safety snapshot must restore mock sections");
    assert.deepEqual(restoredPartialTopic?.quizIds?.map(String), [partialQuizId, zeroQuizId]);
    assert.deepEqual(restoredMockTopic?.quizIds?.map(String), [mockQuizId, `${marker}-missing-quiz`]);

    console.log("PASS learner reference repair gate");
  } finally {
    await BackupActivityModel.deleteMany({ title: snapshotTitle });
    await BackupSnapshotModel.deleteMany({ title: snapshotTitle });
    await TopicModel.deleteMany({ pathId });
    await QuizModel.deleteMany({ pathId });
    await QuestionModel.deleteMany({ pathId });
    await mongoose.disconnect();
  }
}

run().catch((error) => {
  console.error("FAIL learner reference repair gate", error);
  process.exitCode = 1;
});
