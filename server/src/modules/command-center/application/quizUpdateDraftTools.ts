import { createHash } from "node:crypto";
import { z } from "zod";
import { QuizModel } from "../../../models/Quiz.js";
import { QuestionModel } from "../../../models/Question.js";

export const quizUpdateDraftSchema = z.object({
  targetQuizId: z.string().trim().min(1),
  questionIds: z.array(z.string().trim().min(1)).min(1).max(500),
  mode: z.enum(["replace", "append"]).default("replace"),
  requestId: z.string().trim().max(160).optional().default(""),
  idempotencyKey: z.string().trim().min(8).max(240).optional(),
});

const hashQuestionIds = (ids: string[]) =>
  createHash("sha256").update(JSON.stringify(ids)).digest("hex");

export async function buildQuizUpdateDiff(
  input: z.infer<typeof quizUpdateDraftSchema>,
) {
  const quiz = await QuizModel.findOne({
    $or: [{ _id: input.targetQuizId }, { id: input.targetQuizId }],
  })
    .select("_id id title pathId subjectId questionIds skillIds isPublished showOnPlatform updatedAt __v")
    .lean();

  if (!quiz) {
    return {
      ok: false,
      issues: [{ type: "quiz_not_found", message: "Target quiz was not found" }],
      diff: null,
    };
  }

  const currentQuestionIds = Array.isArray(quiz.questionIds) ? quiz.questionIds.map(String) : [];
  const requestedQuestionIds = [...new Set(input.questionIds.map(String))];
  const questions = await QuestionModel.find({
    id: { $in: requestedQuestionIds },
    pathId: quiz.pathId,
    subjectId: quiz.subjectId,
  })
    .select("id skillId subSkillId skillIds approvalStatus")
    .lean();

  const found = new Set(questions.map((question) => String(question.id || "")));
  const missingQuestionIds = requestedQuestionIds.filter((id) => !found.has(id));
  if (missingQuestionIds.length > 0) {
    return {
      ok: false,
      issues: [{
        type: "question_scope_or_missing",
        message: "Some requested questions are missing or outside the quiz path/subject",
        questionIds: missingQuestionIds,
      }],
      diff: null,
    };
  }

  const nextQuestionIds = input.mode === "append"
    ? [...new Set([...currentQuestionIds, ...requestedQuestionIds])]
    : requestedQuestionIds;
  const currentSet = new Set(currentQuestionIds);
  const nextSet = new Set(nextQuestionIds);

  const addedQuestionIds = nextQuestionIds.filter((id) => !currentSet.has(id));
  const removedQuestionIds = currentQuestionIds.filter((id) => !nextSet.has(id));
  const retainedQuestionIds = nextQuestionIds.filter((id) => currentSet.has(id));
  const skillIds = [
    ...new Set(
      questions.flatMap((question) =>
        [
          question.skillId,
          question.subSkillId,
          ...(Array.isArray(question.skillIds) ? question.skillIds : []),
        ]
          .filter(Boolean)
          .map(String),
      ),
    ),
  ];

  return {
    ok: true,
    issues: [],
    quiz: {
      id: String(quiz.id || quiz._id),
      title: String(quiz.title || ""),
      pathId: String(quiz.pathId || ""),
      subjectId: String(quiz.subjectId || ""),
      isPublished: Boolean(quiz.isPublished),
      showOnPlatform: quiz.showOnPlatform !== false,
      version: Number((quiz as any).__v || 0),
      updatedAt: (quiz as any).updatedAt || null,
    },
    diff: {
      mode: input.mode,
      beforeCount: currentQuestionIds.length,
      afterCount: nextQuestionIds.length,
      addedQuestionIds,
      removedQuestionIds,
      retainedQuestionIds,
      nextQuestionIds,
      nextSkillIds: skillIds,
      baselineQuestionIdsHash: hashQuestionIds(currentQuestionIds),
    },
  };
}

export const quizQuestionIdsHash = hashQuestionIds;
