import { QuizModel } from "../../../models/Quiz.js";
import { stableToken, type ApplyResult, type CommandDraftLike } from "./draftApplyTypes.js";
import { quizQuestionIdsHash } from "./quizUpdateDraftTools.js";

export async function applyQuizUpdateDraft(
  draft: CommandDraftLike,
  actorId: string,
): Promise<ApplyResult> {
  const payload = (draft.payload || {}) as Record<string, unknown>;
  const targetQuizId = String(payload.targetQuizId || "").trim();
  const baselineQuestionIdsHash = String(payload.baselineQuestionIdsHash || "").trim();
  const nextQuestionIds = Array.isArray(payload.nextQuestionIds)
    ? payload.nextQuestionIds.map(String)
    : [];
  const nextSkillIds = Array.isArray(payload.nextSkillIds)
    ? payload.nextSkillIds.map(String)
    : [];

  if (!targetQuizId || !baselineQuestionIdsHash || nextQuestionIds.length === 0) {
    throw Object.assign(new Error("Quiz update draft payload is incomplete"), { statusCode: 422 });
  }

  const quiz = await QuizModel.findOne({
    $or: [{ _id: targetQuizId }, { id: targetQuizId }],
  }).lean();
  if (!quiz) {
    throw Object.assign(new Error("Target quiz no longer exists"), { statusCode: 404 });
  }

  const currentQuestionIds = Array.isArray((quiz as any).questionIds)
    ? (quiz as any).questionIds.map(String)
    : [];
  const currentHash = quizQuestionIdsHash(currentQuestionIds);
  const targetPublished = Boolean((quiz as any).isPublished);

  if (!targetPublished) {
    const currentSkillIds = Array.isArray((quiz as any).skillIds)
      ? (quiz as any).skillIds.map(String)
      : [];
    const alreadyApplied =
      quizQuestionIdsHash(nextQuestionIds) === currentHash &&
      nextSkillIds.every((id) => currentSkillIds.includes(id));

    if (alreadyApplied) {
      return {
        resourceType: "quiz",
        resourceId: String((quiz as any).id || (quiz as any)._id),
        summary: {
          idempotentReplay: true,
          questionCount: nextQuestionIds.length,
          published: false,
        },
      };
    }
  }

  if (currentHash !== baselineQuestionIdsHash) {
    throw Object.assign(
      new Error("Target quiz changed after draft creation; generate a fresh diff before applying"),
      { statusCode: 409 },
    );
  }

  if (targetPublished) {
    const draftId = String(draft._id);
    const replacementId = `cc_quiz_revision_${stableToken(draftId, 20)}`;
    const existingReplacement = await QuizModel.findById(replacementId).lean();
    if (!existingReplacement) {
      const clone: Record<string, unknown> = { ...(quiz as any) };
      delete clone._id;
      delete clone.__v;
      delete clone.createdAt;
      delete clone.updatedAt;
      await QuizModel.create({
        ...clone,
        _id: replacementId,
        id: replacementId,
        title: `${String((quiz as any).title || "اختبار")} — تحديث`,
        questionIds: nextQuestionIds,
        skillIds: nextSkillIds,
        isPublished: false,
        showOnPlatform: false,
        approvalStatus: "approved",
        approvedBy: actorId,
        approvedAt: Date.now(),
        createdBy: actorId,
        reviewerNotes: `Replacement created from Command Center draft ${draftId}; original published quiz was left unchanged.`,
      });
    }

    return {
      resourceType: "quiz_replacement",
      resourceId: replacementId,
      summary: {
        idempotentReplay: Boolean(existingReplacement),
        originalQuizId: String((quiz as any).id || (quiz as any)._id),
        originalPublishedQuizUnchanged: true,
        questionCount: nextQuestionIds.length,
        published: false,
        showOnPlatform: false,
      },
    };
  }

  await QuizModel.updateOne(
    { _id: (quiz as any)._id },
    {
      $set: {
        questionIds: nextQuestionIds,
        skillIds: nextSkillIds,
        reviewerNotes: `Updated from Command Center draft ${String(draft._id)} by ${actorId}`,
        isPublished: false,
      },
    },
    { runValidators: true },
  );

  return {
    resourceType: "quiz",
    resourceId: String((quiz as any).id || (quiz as any)._id),
    summary: {
      idempotentReplay: false,
      questionCount: nextQuestionIds.length,
      published: false,
      originalPublishedQuizUnchanged: false,
    },
  };
}
