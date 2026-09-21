import mongoose from "mongoose";
import { ReviewCardModel } from "../../../models/ReviewCard.js";
import { SkillModel } from "../../../models/Skill.js";
import { SkillProgressModel } from "../../../models/SkillProgress.js";
import { createNotificationDeliveries } from "../../../services/notificationService.js";
import { sm2 } from "../../../services/spacedRepetition.js";
import { buildRecommendedAction, buildSkillStatus, mergeRecentSkillEvidence, mergeSkillMasteryEvidence } from "../analytics/skillAnalytics.js";

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

export async function updateSkillProgressFromResult(result: any, userId: string) {
  const skillsAnalysis = Array.isArray(result.skillsAnalysis) ? result.skillsAnalysis : [];
  if (skillsAnalysis.length === 0) return;

  await Promise.all(
    skillsAnalysis
      .filter((skill: any) => skill?.skillId || skill?.skill)
      .map(async (skill: any) => {
        const skillId = String(skill.skillId || `${skill.subjectId || "subject"}:${skill.sectionId || "section"}:${skill.skill}`);
        const mastery = Math.max(0, Math.min(100, Number(skill.mastery || 0)));
        const pathId = String(skill.pathId || "");
        const subjectId = String(skill.subjectId || "");
        const existing = await SkillProgressModel.findOne({ userId, pathId, subjectId, skillId });
        const previousAttempts = Number(existing?.attempts || 0);
        const nextAttempts = previousAttempts + 1;
        const previousMastery = Number(existing?.mastery || 0);
        const previousEvidence = Number(existing?.evidenceCount || existing?.attempts || 0);
        const currentEvidence = Math.max(1, Number(skill.questionCount || skill.total || 1));
        const mergedMastery = mergeSkillMasteryEvidence({
          previousMastery,
          previousEvidence,
          currentMastery: mastery,
          currentEvidence,
        });
        const nextMastery = mergedMastery.mastery;
        const recentEvidence = mergeRecentSkillEvidence({
          previous: Array.isArray(existing?.recentEvidence) ? existing.recentEvidence as any : [],
          current: {
            sourceId: String(result.submissionKey || result._id || result.id || `${result.quizId || "quiz"}:${result.attemptNumber || 1}`),
            mastery,
            evidenceCount: currentEvidence,
            occurredAt: new Date(result.createdAt || new Date()),
          },
        });

        await SkillProgressModel.findOneAndUpdate(
          { userId, pathId, subjectId, skillId },
          {
            userId,
            skillId,
            skill: String(skill.skill || existing?.skill || "مهارة غير مسماة"),
            pathId,
            subjectId,
            sectionId: String(skill.sectionId || existing?.sectionId || ""),
            mastery: nextMastery,
            status: buildSkillStatus(nextMastery),
            attempts: nextAttempts,
            evidenceCount: mergedMastery.evidenceCount,
            recentEvidence,
            lastQuizId: String(result.quizId || ""),
            lastQuizTitle: String(result.quizTitle || ""),
            lastAttemptAt: new Date(),
            recommendedAction: buildRecommendedAction(nextMastery, nextAttempts),
          },
          { new: true, upsert: true },
        );
      }),
  );
}

export async function updateSkillProgressFromQuestionAttempt(attempt: any, userId: string) {
  const skillIds = uniqueStrings(Array.isArray(attempt.skillIds) ? attempt.skillIds.map(String) : []);
  if (skillIds.length === 0) return;

  const skills = await SkillModel.find(buildDocumentsByIdsQuery(skillIds));
  const mastery = attempt.isCorrect ? 100 : 0;

  await Promise.all(
    skills.map(async (skill) => {
      const skillId = String(skill.id || skill._id);
      const pathId = String(skill.pathId || attempt.pathId || "");
      const subjectId = String(skill.subjectId || attempt.subjectId || "");
      const existing = await SkillProgressModel.findOne({ userId, pathId, subjectId, skillId });
      const previousAttempts = Number(existing?.attempts || 0);
      const nextAttempts = previousAttempts + 1;
      const previousMastery = Number(existing?.mastery || 0);
      const previousEvidence = Number(existing?.evidenceCount || existing?.attempts || 0);
      const mergedMastery = mergeSkillMasteryEvidence({
        previousMastery,
        previousEvidence,
        currentMastery: mastery,
        currentEvidence: 1,
      });
      const nextMastery = mergedMastery.mastery;
      const recentEvidence = mergeRecentSkillEvidence({
        previous: Array.isArray(existing?.recentEvidence) ? existing.recentEvidence as any : [],
        current: {
          sourceId: String(attempt._id || attempt.id || `${attempt.questionId || "question"}:${attempt.createdAt || Date.now()}`),
          mastery,
          evidenceCount: 1,
          occurredAt: new Date(attempt.createdAt || new Date()),
        },
      });

      await SkillProgressModel.findOneAndUpdate(
        { userId, pathId, subjectId, skillId },
        {
          userId,
          skillId,
          skill: String(skill.name || existing?.skill || "مهارة غير مسماة"),
          pathId,
          subjectId,
          sectionId: String(skill.sectionId || existing?.sectionId || attempt.sectionId || ""),
          mastery: nextMastery,
          status: buildSkillStatus(nextMastery),
          attempts: nextAttempts,
          evidenceCount: mergedMastery.evidenceCount,
          recentEvidence,
          lastQuizId: String(existing?.lastQuizId || ""),
          lastQuizTitle: String(existing?.lastQuizTitle || ""),
          lastAttemptAt: new Date(),
          recommendedAction: buildRecommendedAction(nextMastery, nextAttempts),
        },
        { new: true, upsert: true },
      );
    }),
  );
}

const qualityFromAttempt = (selectedOptionIndex?: number, isCorrect?: boolean) => {
  if (selectedOptionIndex === undefined || selectedOptionIndex < 0) return 1;
  return isCorrect ? 4 : 2;
};

const upsertReviewCardsFromQuestionReview = async (args: {
  userId: string;
  questionReview: Array<{ questionId: string; selectedOptionIndex?: number; isCorrect?: boolean }>;
  questionById: Map<string, any>;
}) => {
  const operations = args.questionReview
    .map((item) => {
      const question = args.questionById.get(String(item.questionId || ""));
      if (!question) return null;
      const skillId = Array.isArray(question.skillIds) && question.skillIds.length > 0 ? String(question.skillIds[0]) : "";
      const previous = sm2({ easeFactor: 2.5, interval: 1, repetitions: 0 }, qualityFromAttempt(item.selectedOptionIndex, item.isCorrect));
      return {
        updateOne: {
          filter: { userId: args.userId, questionId: String(item.questionId || "") },
          update: {
            $setOnInsert: { userId: args.userId, questionId: String(item.questionId || ""), skillId },
            $set: { skillId, easeFactor: previous.easeFactor, interval: previous.interval, repetitions: previous.repetitions, nextReviewDate: previous.nextReviewDate, lastQuality: qualityFromAttempt(item.selectedOptionIndex, item.isCorrect) },
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
    upsertReviewCardsFromQuestionReview(args),
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
    const sideEffect = index === 0 ? "skill-progress" : index === 1 ? "review-cards" : "notification";
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
