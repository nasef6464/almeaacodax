import mongoose from "mongoose";
import { ReviewCardModel } from "../../../models/ReviewCard.js";
import { SkillModel } from "../../../models/Skill.js";
import { SkillProgressModel } from "../../../models/SkillProgress.js";
import { createNotificationDeliveries } from "../../../services/notificationService.js";
import { sm2 } from "../../../services/spacedRepetition.js";
import {
  buildRecommendedAction,
  buildSkillStatus,
  mergeRecentSkillEvidence,
  mergeSkillMasteryEvidence,
} from "../analytics/skillAnalytics.js";
import { updateSchoolSkillReadModelFromResult } from "./schoolSkillReadModel.js";

const uniqueStrings = (values: Array<string | undefined | null>) =>
  [...new Set(values.map((value) => String(value || "").trim()).filter(Boolean))];

const buildDocumentsByIdsQuery = (values: string[]) => {
  const ids = uniqueStrings(
    values.flatMap((value) => {
      const id = String(value || "").trim();
      if (!id) return [];
      const withoutCopySuffix = id.replace(/_copy(?:_\d+)?$/i, "");
      return withoutCopySuffix && withoutCopySuffix !== id ? [id, withoutCopySuffix] : [id];
    }),
  );
  const objectIds = ids
    .filter((id) => mongoose.Types.ObjectId.isValid(id))
    .map((id) => new mongoose.Types.ObjectId(id));

  return {
    $or: [
      { id: { $in: ids } },
      ...(objectIds.length ? [{ _id: { $in: objectIds } }] : []),
    ],
  };
};

const skillProgressScopeKey = (scope: {
  pathId?: unknown;
  subjectId?: unknown;
  skillId?: unknown;
}) =>
  [
    String(scope.pathId || "").trim(),
    String(scope.subjectId || "").trim(),
    String(scope.skillId || "").trim(),
  ].join("::");

const loadExistingSkillProgress = async (userId: string, skillIds: string[]) => {
  const ids = uniqueStrings(skillIds);
  if (ids.length === 0) {
    return {
      byScope: new Map<string, any>(),
      legacyBySkill: new Map<string, any>(),
    };
  }

  const rows = await SkillProgressModel.find({
    userId,
    skillId: { $in: ids },
  }).lean();

  const byScope = new Map<string, any>();
  const legacyBySkill = new Map<string, any>();
  rows.forEach((row: any) => {
    const key = skillProgressScopeKey(row);
    byScope.set(key, row);
    if (!String(row.pathId || "").trim() && !String(row.subjectId || "").trim()) {
      legacyBySkill.set(String(row.skillId || ""), row);
    }
  });

  return { byScope, legacyBySkill };
};

const boundedReplayKeys = (existing: any, evidenceKey: string) => {
  const previous = uniqueStrings(
    Array.isArray(existing?.recentEvidenceKeys) ? existing.recentEvidenceKeys.map(String) : [],
  ).slice(-20);
  if (!evidenceKey) return { duplicate: false, keys: previous };
  if (previous.includes(evidenceKey)) return { duplicate: true, keys: previous };
  return {
    duplicate: false,
    keys: [...previous.filter((key) => key !== evidenceKey), evidenceKey].slice(-20),
  };
};

const safeOccurredAt = (value: unknown) => {
  const parsed = value ? new Date(value as any) : new Date();
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
};

export async function updateSkillProgressFromResult(result: any, userId: string) {
  const skillsAnalysis = Array.isArray(result.skillsAnalysis) ? result.skillsAnalysis : [];
  if (skillsAnalysis.length === 0) return;

  const normalizedByScope = new Map<string, any>();
  for (const raw of skillsAnalysis) {
    if (!raw?.skillId && !raw?.skill) continue;
    const skillId = String(
      raw.skillId ||
        `${raw.subjectId || result?.quizSnapshot?.subjectId || "subject"}:${raw.sectionId || "section"}:${raw.skill}`,
    ).trim();
    const pathId = String(raw.pathId || result?.quizSnapshot?.pathId || "").trim();
    const subjectId = String(raw.subjectId || result?.quizSnapshot?.subjectId || "").trim();
    if (!skillId) continue;
    const key = skillProgressScopeKey({ pathId, subjectId, skillId });
    const current = normalizedByScope.get(key);
    if (!current) {
      normalizedByScope.set(key, { ...raw, skillId, pathId, subjectId });
      continue;
    }

    const currentEvidence = Math.max(1, Number(current.questionCount || current.total || 1));
    const nextEvidence = Math.max(1, Number(raw.questionCount || raw.total || 1));
    const combinedEvidence = currentEvidence + nextEvidence;
    const combinedMastery = Math.round(
      ((Number(current.mastery || 0) * currentEvidence) + (Number(raw.mastery || 0) * nextEvidence)) /
        Math.max(combinedEvidence, 1),
    );
    normalizedByScope.set(key, {
      ...current,
      mastery: combinedMastery,
      questionCount: combinedEvidence,
      correctCount:
        Math.max(0, Number(current.correctCount || 0)) +
        Math.max(0, Number(raw.correctCount || 0)),
    });
  }

  const rows = [...normalizedByScope.values()];
  if (rows.length === 0) return;
  const existing = await loadExistingSkillProgress(
    userId,
    rows.map((skill) => String(skill.skillId || "")),
  );
  const evidenceKey = String(
    result?.submissionKey ||
      result?._id ||
      result?.id ||
      `${result?.quizId || "quiz"}:${result?.attemptNumber || 1}:${result?.date || result?.createdAt || ""}`,
  ).trim();
  const occurredAt = safeOccurredAt(result?.createdAt || result?.date);
  const operations: any[] = [];

  for (const skill of rows) {
    const skillId = String(skill.skillId || "").trim();
    const pathId = String(skill.pathId || "").trim();
    const subjectId = String(skill.subjectId || "").trim();
    const scopeKey = skillProgressScopeKey({ pathId, subjectId, skillId });
    const existingRow = existing.byScope.get(scopeKey) || existing.legacyBySkill.get(skillId);
    const replay = boundedReplayKeys(existingRow, evidenceKey);
    if (replay.duplicate) continue;

    const mastery = Math.max(0, Math.min(100, Number(skill.mastery || 0)));
    const previousAttempts = Number(existingRow?.attempts || 0);
    const nextAttempts = previousAttempts + 1;
    const previousMastery = Number(existingRow?.mastery || 0);
    const previousEvidence = Number(existingRow?.evidenceCount || existingRow?.attempts || 0);
    const currentEvidence = Math.max(1, Number(skill.questionCount || skill.total || 1));
    const mergedMastery = mergeSkillMasteryEvidence({
      previousMastery,
      previousEvidence,
      currentMastery: mastery,
      currentEvidence,
    });
    const recentEvidence = mergeRecentSkillEvidence({
      previous: Array.isArray(existingRow?.recentEvidence) ? existingRow.recentEvidence as any : [],
      current: {
        sourceId: evidenceKey || `${result?.quizId || "quiz"}:${skillId}:${occurredAt.toISOString()}`,
        mastery,
        evidenceCount: currentEvidence,
        occurredAt,
      },
    });
    const nextMastery = mergedMastery.mastery;

    operations.push({
      updateOne: {
        filter: { userId, pathId, subjectId, skillId },
        update: {
          $set: {
            userId,
            skillId,
            skill: String(skill.skill || existingRow?.skill || "مهارة غير مسماة"),
            pathId,
            subjectId,
            sectionId: String(skill.sectionId || existingRow?.sectionId || ""),
            mastery: nextMastery,
            status: buildSkillStatus(nextMastery),
            attempts: nextAttempts,
            evidenceCount: mergedMastery.evidenceCount,
            recentEvidence,
            recentEvidenceKeys: replay.keys,
            lastQuizId: String(result?.quizId || ""),
            lastQuizTitle: String(result?.quizTitle || ""),
            lastAttemptAt: occurredAt,
            recommendedAction: buildRecommendedAction(nextMastery, nextAttempts),
          },
        },
        upsert: true,
      },
    });
  }

  if (operations.length > 0) {
    await SkillProgressModel.bulkWrite(operations, { ordered: false });
  }
}

export async function updateSkillProgressFromQuestionAttempt(attempt: any, userId: string) {
  const skillIds = uniqueStrings(Array.isArray(attempt?.skillIds) ? attempt.skillIds.map(String) : []);
  if (skillIds.length === 0) return;

  const skills = await SkillModel.find(buildDocumentsByIdsQuery(skillIds)).lean();
  if (skills.length === 0) return;

  const normalized = (skills as any[]).map((skill) => ({
    skill,
    skillId: String(skill.id || skill._id || "").trim(),
    pathId: String(skill.pathId || attempt?.pathId || "").trim(),
    subjectId: String(skill.subjectId || attempt?.subjectId || "").trim(),
  })).filter((item) => item.skillId);

  const existing = await loadExistingSkillProgress(
    userId,
    normalized.map((item) => item.skillId),
  );
  const mastery = attempt?.isCorrect ? 100 : 0;
  const occurredAt = safeOccurredAt(attempt?.createdAt || attempt?.date);
  const evidenceKey = [
    "question-attempt",
    String(attempt?._id || attempt?.id || attempt?.questionId || ""),
    String(attempt?.createdAt || attempt?.date || ""),
    String(attempt?.selectedOptionIndex ?? ""),
    attempt?.isCorrect ? "1" : "0",
  ].join(":");
  const operations: any[] = [];

  for (const item of normalized) {
    const scopeKey = skillProgressScopeKey(item);
    const existingRow = existing.byScope.get(scopeKey) || existing.legacyBySkill.get(item.skillId);
    const replay = boundedReplayKeys(existingRow, evidenceKey);
    if (replay.duplicate) continue;

    const previousAttempts = Number(existingRow?.attempts || 0);
    const nextAttempts = previousAttempts + 1;
    const previousMastery = Number(existingRow?.mastery || 0);
    const previousEvidence = Number(existingRow?.evidenceCount || existingRow?.attempts || 0);
    const mergedMastery = mergeSkillMasteryEvidence({
      previousMastery,
      previousEvidence,
      currentMastery: mastery,
      currentEvidence: 1,
    });
    const recentEvidence = mergeRecentSkillEvidence({
      previous: Array.isArray(existingRow?.recentEvidence) ? existingRow.recentEvidence as any : [],
      current: {
        sourceId: evidenceKey,
        mastery,
        evidenceCount: 1,
        occurredAt,
      },
    });
    const nextMastery = mergedMastery.mastery;

    operations.push({
      updateOne: {
        filter: {
          userId,
          pathId: item.pathId,
          subjectId: item.subjectId,
          skillId: item.skillId,
        },
        update: {
          $set: {
            userId,
            skillId: item.skillId,
            skill: String(item.skill.name || existingRow?.skill || "مهارة غير مسماة"),
            pathId: item.pathId,
            subjectId: item.subjectId,
            sectionId: String(item.skill.sectionId || existingRow?.sectionId || attempt?.sectionId || ""),
            mastery: nextMastery,
            status: buildSkillStatus(nextMastery),
            attempts: nextAttempts,
            evidenceCount: mergedMastery.evidenceCount,
            recentEvidence,
            recentEvidenceKeys: replay.keys,
            lastQuizId: String(existingRow?.lastQuizId || ""),
            lastQuizTitle: String(existingRow?.lastQuizTitle || ""),
            lastAttemptAt: occurredAt,
            recommendedAction: buildRecommendedAction(nextMastery, nextAttempts),
          },
        },
        upsert: true,
      },
    });
  }

  if (operations.length > 0) {
    await SkillProgressModel.bulkWrite(operations, { ordered: false });
  }
}

const qualityFromAttempt = (selectedOptionIndex?: number, isCorrect?: boolean) => {
  if (selectedOptionIndex === undefined || selectedOptionIndex < 0) return 1;
  return isCorrect ? 4 : 2;
};

const upsertReviewCardsFromQuestionReview = async (args: {
  userId: string;
  result?: any;
  questionReview: Array<{ questionId: string; selectedOptionIndex?: number; isCorrect?: boolean }>;
  questionById: Map<string, any>;
}) => {
  const operations = args.questionReview
    .map((item) => {
      const question = args.questionById.get(String(item.questionId || ""));
      if (!question) return null;
      const questionId = String(item.questionId || "");
      if (!questionId) return null;
      const skillIds = Array.isArray(question.skillIds) ? uniqueStrings(question.skillIds.map(String)) : [];
      const skillId = skillIds[0] || "";
      const pathId = String(question.pathId || "");
      const subjectId = String(question.subjectId || question.subject || "");
      const sectionId = String(question.sectionId || "");
      const reviewType =
        String(args.result?.source || "") === "mastery_review" || Boolean(item.isCorrect)
          ? "mastery_review"
          : "error_recovery";
      const quality = qualityFromAttempt(item.selectedOptionIndex, item.isCorrect);
      const previous = sm2({ easeFactor: 2.5, interval: 1, repetitions: 0 }, quality);
      return {
        updateOne: {
          filter: { userId: args.userId, questionId },
          update: {
            $setOnInsert: { userId: args.userId, questionId },
            $set: {
              skillId,
              skillIds,
              pathId,
              subjectId,
              sectionId,
              reviewType,
              easeFactor: previous.easeFactor,
              interval: previous.interval,
              repetitions: previous.repetitions,
              nextReviewDate: previous.nextReviewDate,
              lastQuality: quality,
            },
          },
          upsert: true,
        },
      };
    })
    .filter(Boolean);

  if (operations.length > 0) {
    await ReviewCardModel.bulkWrite(operations as any[], { ordered: false });
  }
};

export async function upsertReviewCardFromQuestionAttempt(args: {
  userId: string;
  attempt: any;
  question: any;
}) {
  const questionId = String(args.attempt?.questionId || args.question?.id || args.question?._id || "");
  if (!questionId) return;

  const skillIds = Array.isArray(args.question?.skillIds) ? uniqueStrings(args.question.skillIds.map(String)) : [];
  const skillId = skillIds[0] || "";
  const quality = qualityFromAttempt(
    Number(args.attempt?.selectedOptionIndex ?? -1),
    Boolean(args.attempt?.isCorrect),
  );
  const previous = sm2({ easeFactor: 2.5, interval: 1, repetitions: 0 }, quality);
  const reviewType =
    String(args.attempt?.evidenceType || "") === "mastery_review" || Boolean(args.attempt?.isCorrect)
      ? "mastery_review"
      : "error_recovery";

  await ReviewCardModel.findOneAndUpdate(
    { userId: args.userId, questionId },
    {
      $setOnInsert: { userId: args.userId, questionId },
      $set: {
        skillId,
        skillIds,
        pathId: String(args.question?.pathId || args.attempt?.pathId || ""),
        subjectId: String(args.question?.subjectId || args.question?.subject || args.attempt?.subjectId || ""),
        sectionId: String(args.question?.sectionId || args.attempt?.sectionId || ""),
        reviewType,
        easeFactor: previous.easeFactor,
        interval: previous.interval,
        repetitions: previous.repetitions,
        nextReviewDate: previous.nextReviewDate,
        lastQuality: quality,
      },
    },
    { upsert: true, new: true },
  );
}

export async function runQuizSubmissionSideEffects(args: {
  requestId?: string;
  result: any;
  userId: string;
  questionReview: Array<{ questionId: string; selectedOptionIndex?: number; isCorrect?: boolean }>;
  questionById: Map<string, any>;
}) {
  const score = Number(args.result?.score ?? 0);
  const quizTitle = String(args.result?.quizTitle || "الاختبار");
  const scoreEmoji = score >= 80 ? "🎉" : score >= 60 ? "👍" : "💪";
  const outcomes = await Promise.allSettled([
    updateSkillProgressFromResult(args.result, args.userId),
    upsertReviewCardsFromQuestionReview({ ...args, result: args.result }),
    updateSchoolSkillReadModelFromResult(args.result, args.userId),
    createNotificationDeliveries({
      title: `${scoreEmoji} نتيجة ${quizTitle}`,
      body: `حصلت على ${score}% في هذا الاختبار. ${score >= 80 ? "أداء رائع!" : score >= 60 ? "جيد جداً، استمر!" : "لا تيأس، راجع الأخطاء وأعد المحاولة."}`,
      channels: ["in_app"],
      userIds: [args.userId],
      createdBy: "system",
    }).catch(() => undefined),
  ]);

  outcomes.forEach((outcome, index) => {
    if (outcome.status === "fulfilled") return;
    const sideEffect = index === 0 ? "skill-progress" : index === 1 ? "review-cards" : index === 2 ? "school-skill-read-model" : "notification";
    const reason = outcome.reason instanceof Error ? outcome.reason.message : String(outcome.reason || "unknown");
    console.warn("[quiz-submit] non-critical side effect failed", {
      requestId: args.requestId || "",
      userId: args.userId,
      quizId: String(args.result?.quizId || ""),
      sideEffect,
      reason,
    });
  });
}
