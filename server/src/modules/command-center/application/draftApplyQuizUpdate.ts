import { QuizModel } from "../../../models/Quiz.js";
import type { ApplyResult, CommandDraftLike } from "./draftApplyTypes.js";
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
  }).select("_id id questionIds skillIds isPublished showOnPlatform");
  if (!quiz) {
    throw Object.assign(new Error("Target quiz no longer exists"), { statusCode: 404 });
  }

  const currentQuestionIds = Array.isArray(quiz.questionIds)
    ? quiz.questionIds.map(String)
    : [];
  const currentHash = quizQuestionIdsHash(currentQuestionIds);

  const alreadyApplied =
    quizQuestionIdsHash(nextQuestionIds) === currentHash &&
    nextSkillIds.every((id) => (quiz.skillIds || []).map(String).includes(id));

  if (alreadyApplied) {
    return {
      resourceType: "quiz",
      resourceId: String(quiz.id || quiz._id),
      summary: {
        idempotentReplay: true,
        questionCount: nextQuestionIds.length,
        publishedStatePreserved: Boolean(quiz.isPublished),
      },
    };
  }

  if (currentHash !== baselineQuestionIdsHash) {
    throw Object.assign(
      new Error("Target quiz changed after draft creation; generate a fresh diff before applying"),
      { statusCode: 409 },
    );
  }

  quiz.questionIds = nextQuestionIds as any;
  quiz.skillIds = nextSkillIds as any;
  quiz.reviewerNotes = `Updated from Command Center draft ${String(draft._id)} by ${actorId}`;
  await quiz.save();

  return {
    resourceType: "quiz",
    resourceId: String(quiz.id || quiz._id),
    summary: {
      idempotentReplay: false,
      questionCount: nextQuestionIds.length,
      publishedStatePreserved: Boolean(quiz.isPublished),
      visibilityPreserved: quiz.showOnPlatform !== false,
    },
  };
}
