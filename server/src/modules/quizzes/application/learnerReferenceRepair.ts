import mongoose from "mongoose";
import { BackupActivityModel } from "../../../models/BackupActivity.js";
import { BackupSnapshotModel } from "../../../models/BackupSnapshot.js";
import { QuestionModel } from "../../../models/Question.js";
import { QuizModel } from "../../../models/Quiz.js";
import { TopicModel } from "../../../models/Topic.js";
import { getQuizQuestionIds } from "./quizQuestionSelection.js";
import { buildDocumentsByIdsQuery, uniqueStrings } from "../infrastructure/quizDocumentQuery.js";
import { isQuestionContentUsable } from "../presentation/questionPresentation.js";

export const LEARNER_REFERENCE_REPAIR_CONFIRM_TEXT = "REMOVE_MISSING_LEARNER_REFS";

type RepairOptions = {
  apply?: boolean;
  confirmText?: string;
  actorId?: string;
  actorEmail?: string;
  snapshotTitle?: string;
};

type QuizRepairPlan = {
  quizId: string;
  title: string;
  beforeRefs: number;
  afterRefs: number;
  removedRefs: number;
  hiddenAfterRepair: boolean;
  changed: boolean;
  before: any;
  after: any;
};

type TopicRepairPlan = {
  topicId: string;
  title: string;
  beforeQuizIds: string[];
  afterQuizIds: string[];
  removedQuizIds: string[];
  changed: boolean;
  before: any;
};

const refVariants = (value: unknown) => {
  const id = String(value || "").trim();
  if (!id) return [];
  const withoutCopySuffix = id.replace(/_copy(?:_\d+)?$/i, "");
  return uniqueStrings(withoutCopySuffix && withoutCopySuffix !== id ? [id, withoutCopySuffix] : [id]);
};

const getStoredQuestionIds = (quiz: any) => {
  const regular = Array.isArray(quiz?.questionIds) ? quiz.questionIds.map(String) : [];
  const sections = Array.isArray(quiz?.mockExam?.sections) ? quiz.mockExam.sections : [];
  const mock = sections.flatMap((section: any) =>
    Array.isArray(section?.questionIds) ? section.questionIds.map(String) : [],
  );
  return uniqueStrings([...regular, ...mock]);
};

const buildQuestionUsabilityMap = async (quizzes: any[]) => {
  const refs = uniqueStrings(quizzes.flatMap((quiz) => getStoredQuestionIds(quiz)));
  if (refs.length === 0) return new Map<string, boolean>();

  const questions = await QuestionModel.find(buildDocumentsByIdsQuery(refs))
    .select("id text imageUrl options type")
    .lean();

  const usability = new Map<string, boolean>();
  questions.forEach((question: any) => {
    const usable = isQuestionContentUsable(question);
    uniqueStrings([
      question.id ? String(question.id) : "",
      question._id ? String(question._id) : "",
    ]).forEach((alias) => {
      refVariants(alias).forEach((variant) => usability.set(variant, usable));
    });
  });

  return usability;
};

const isRefUsable = (value: unknown, usability: Map<string, boolean>) =>
  refVariants(value).some((variant) => usability.get(variant) === true);

const sanitizeStoredQuizReferences = (quiz: any, usability: Map<string, boolean>) => {
  const topLevelIds = uniqueStrings(
    (Array.isArray(quiz?.questionIds) ? quiz.questionIds : [])
      .map(String)
      .filter((id: string) => isRefUsable(id, usability)),
  );

  const originalSections = Array.isArray(quiz?.mockExam?.sections) ? quiz.mockExam.sections : [];
  const sections = quiz?.mockExam?.enabled === true
    ? originalSections
        .map((section: any) => ({
          ...section,
          questionIds: uniqueStrings(
            (Array.isArray(section?.questionIds) ? section.questionIds : [])
              .map(String)
              .filter((id: string) => isRefUsable(id, usability)),
          ),
        }))
        .filter((section: any) => section.questionIds.length > 0)
    : originalSections;

  return {
    ...quiz,
    questionIds: topLevelIds,
    ...(quiz?.mockExam
      ? {
          mockExam: {
            ...quiz.mockExam,
            sections,
          },
        }
      : {}),
  };
};

const sameStringArray = (left: unknown[], right: unknown[]) =>
  left.length === right.length && left.every((value, index) => String(value) === String(right[index]));

const totalDocumentsFromSummary = (summary: Record<string, number>) =>
  Object.values(summary).reduce((total, count) => total + Number(count || 0), 0);

async function createRepairSafetySnapshot(
  quizzes: any[],
  topics: any[],
  options: Pick<RepairOptions, "actorId" | "actorEmail" | "snapshotTitle">,
) {
  const createdAt = new Date().toISOString();
  const summary = {
    quizzes: quizzes.length,
    topics: topics.length,
  };
  const payload = {
    schemaVersion: 1 as const,
    kind: "almeaa-learning-content-backup" as const,
    createdAt,
    database: mongoose.connection.db?.databaseName || "unknown",
    collections: [
      { name: "quizzes", documents: quizzes },
      { name: "topics", documents: topics },
    ],
    summary,
  };
  const title =
    options.snapshotTitle ||
    `Safety snapshot before learner reference repair - ${createdAt}`;

  const snapshot = await BackupSnapshotModel.create({
    kind: "learning-content",
    title,
    createdBy: options.actorId || "system",
    createdByEmail: options.actorEmail || "",
    database: payload.database,
    summary,
    totalDocuments: totalDocumentsFromSummary(summary),
    payload,
  });

  await BackupActivityModel.create({
    kind: "learning-content",
    action: "restore-safety-snapshot",
    title,
    actorId: options.actorId || "system",
    actorEmail: options.actorEmail || "",
    snapshotId: String(snapshot._id),
    source: "system",
    applied: false,
    replaced: false,
    summary,
    totalDocuments: totalDocumentsFromSummary(summary),
  });

  return snapshot;
}

export async function repairLearnerReferenceIntegrity(options: RepairOptions = {}) {
  const shouldApply = options.apply === true;
  if (shouldApply && options.confirmText !== LEARNER_REFERENCE_REPAIR_CONFIRM_TEXT) {
    throw new Error(
      `Refusing learner reference repair apply. Pass confirmText="${LEARNER_REFERENCE_REPAIR_CONFIRM_TEXT}".`,
    );
  }

  const quizzes = await QuizModel.find({
    isPublished: true,
    showOnPlatform: { $ne: false },
    approvalStatus: "approved",
  }).lean();

  const usability = await buildQuestionUsabilityMap(quizzes);
  const quizPlans: QuizRepairPlan[] = quizzes.map((quiz: any) => {
    const sanitized = sanitizeStoredQuizReferences(quiz, usability);
    const beforeStored = getStoredQuestionIds(quiz);
    const afterStored = getStoredQuestionIds(sanitized);
    const afterLearnerRefs = getQuizQuestionIds(sanitized);
    const regularChanged = !sameStringArray(
      Array.isArray(quiz.questionIds) ? quiz.questionIds.map(String) : [],
      sanitized.questionIds.map(String),
    );
    const sectionChanged =
      JSON.stringify(Array.isArray(quiz?.mockExam?.sections) ? quiz.mockExam.sections : []) !==
      JSON.stringify(Array.isArray(sanitized?.mockExam?.sections) ? sanitized.mockExam.sections : []);
    const hiddenAfterRepair = afterLearnerRefs.length === 0;

    return {
      quizId: String(quiz.id || quiz._id || ""),
      title: String(quiz.title || ""),
      beforeRefs: beforeStored.length,
      afterRefs: afterStored.length,
      removedRefs: Math.max(0, beforeStored.length - afterStored.length),
      hiddenAfterRepair,
      changed: regularChanged || sectionChanged || hiddenAfterRepair,
      before: quiz,
      after: {
        ...sanitized,
        showOnPlatform: hiddenAfterRepair ? false : quiz.showOnPlatform,
      },
    };
  });

  const learnerAvailableQuizAliases = new Set<string>();
  quizPlans.forEach((plan) => {
    if (plan.hiddenAfterRepair) return;
    uniqueStrings([
      plan.before?.id ? String(plan.before.id) : "",
      plan.before?._id ? String(plan.before._id) : "",
    ]).forEach((alias) => learnerAvailableQuizAliases.add(alias));
  });

  const topics = await TopicModel.find({ showOnPlatform: { $ne: false } }).lean();
  const topicPlans: TopicRepairPlan[] = topics.map((topic: any) => {
    const beforeQuizIds = uniqueStrings(
      (Array.isArray(topic.quizIds) ? topic.quizIds : []).map(String),
    );
    const afterQuizIds = beforeQuizIds.filter((quizId) => learnerAvailableQuizAliases.has(quizId));
    const removedQuizIds = beforeQuizIds.filter((quizId) => !learnerAvailableQuizAliases.has(quizId));

    return {
      topicId: String(topic.id || topic._id || ""),
      title: String(topic.title || ""),
      beforeQuizIds,
      afterQuizIds,
      removedQuizIds,
      changed: !sameStringArray(beforeQuizIds, afterQuizIds),
      before: topic,
    };
  });

  const changedQuizzes = quizPlans.filter((plan) => plan.changed);
  const changedTopics = topicPlans.filter((plan) => plan.changed);
  const removedQuestionRefs = changedQuizzes.reduce((sum, plan) => sum + plan.removedRefs, 0);
  const hiddenQuizzes = changedQuizzes.filter((plan) => plan.hiddenAfterRepair).length;
  const detachedTopicQuizRefs = changedTopics.reduce(
    (sum, plan) => sum + plan.removedQuizIds.length,
    0,
  );

  let safetySnapshotId = "";

  if (shouldApply && (changedQuizzes.length > 0 || changedTopics.length > 0)) {
    const safetySnapshot = await createRepairSafetySnapshot(
      changedQuizzes.map((plan) => plan.before),
      changedTopics.map((plan) => plan.before),
      options,
    );
    safetySnapshotId = String(safetySnapshot._id);

    for (const plan of changedQuizzes) {
      const update: Record<string, unknown> = {
        questionIds: plan.after.questionIds,
        showOnPlatform: plan.after.showOnPlatform,
      };
      if (plan.before?.mockExam) {
        update["mockExam.sections"] = plan.after.mockExam?.sections || [];
      }
      await QuizModel.updateOne({ _id: plan.before._id }, { $set: update });
    }

    for (const plan of changedTopics) {
      await TopicModel.updateOne(
        { _id: plan.before._id },
        { $set: { quizIds: plan.afterQuizIds } },
      );
    }
  }

  return {
    mode: shouldApply ? "APPLY" : "DRY_RUN",
    database: mongoose.connection.db?.databaseName || "unknown",
    safetySnapshotId,
    totals: {
      inspectedQuizzes: quizzes.length,
      changedQuizzes: changedQuizzes.length,
      removedQuestionRefs,
      hiddenQuizzes,
      inspectedTopics: topics.length,
      changedTopics: changedTopics.length,
      detachedTopicQuizRefs,
    },
    quizzes: changedQuizzes.map((plan) => ({
      quizId: plan.quizId,
      title: plan.title,
      beforeRefs: plan.beforeRefs,
      afterRefs: plan.afterRefs,
      removedRefs: plan.removedRefs,
      hiddenAfterRepair: plan.hiddenAfterRepair,
    })),
    topics: changedTopics.map((plan) => ({
      topicId: plan.topicId,
      title: plan.title,
      beforeQuizIds: plan.beforeQuizIds,
      afterQuizIds: plan.afterQuizIds,
      removedQuizIds: plan.removedQuizIds,
    })),
  };
}
