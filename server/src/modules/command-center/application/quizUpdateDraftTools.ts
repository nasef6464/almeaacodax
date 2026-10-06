import { createHash } from "node:crypto";
import { z } from "zod";
import { QuizModel } from "../../../models/Quiz.js";
import { QuestionModel } from "../../../models/Question.js";
import { questionSimilarity } from "./questionSimilarity.js";

export const quizUpdateDraftSchema = z.object({
  targetQuizId: z.string().trim().min(1),
  questionIds: z.array(z.string().trim().min(1)).min(1).max(500),
  mode: z.enum(["replace", "append"]).default("replace"),
  requestId: z.string().trim().max(160).optional().default(""),
  idempotencyKey: z.string().trim().min(8).max(240).optional(),
});

const hashQuestionIds = (ids: string[]) =>
  createHash("sha256").update(JSON.stringify(ids)).digest("hex");

const normalizeText = (value: unknown) =>
  String(value || "")
    .normalize("NFKC")
    .replace(/[\u064B-\u065F\u0670]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

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
  const allQuestionIds = [...new Set([...currentQuestionIds, ...requestedQuestionIds])];
  const questions = await QuestionModel.find({
    id: { $in: allQuestionIds },
    pathId: quiz.pathId,
    subjectId: quiz.subjectId,
  })
    .select("id text skillId subSkillId subSkillIds skillIds approvalStatus")
    .lean();

  const byId = new Map(
    questions.map((question) => [String(question.id || ""), question]),
  );
  const requestedQuestions = requestedQuestionIds
    .map((id) => byId.get(id))
    .filter(Boolean) as any[];
  const foundRequested = new Set(requestedQuestions.map((question) => String(question.id || "")));
  const missingQuestionIds = requestedQuestionIds.filter((id) => !foundRequested.has(id));
  const unapprovedQuestionIds = requestedQuestions
    .filter((question) => String(question.approvalStatus || "") !== "approved")
    .map((question) => String(question.id || ""));

  if (missingQuestionIds.length > 0 || unapprovedQuestionIds.length > 0) {
    return {
      ok: false,
      issues: [
        ...(missingQuestionIds.length
          ? [{
              type: "question_scope_or_missing",
              message: "Some requested questions are missing or outside the quiz path/subject",
              questionIds: missingQuestionIds,
            }]
          : []),
        ...(unapprovedQuestionIds.length
          ? [{
              type: "question_not_approved",
              message: "Quiz updates may only add approved questions",
              questionIds: unapprovedQuestionIds,
            }]
          : []),
      ],
      diff: null,
    };
  }

  const currentSet = new Set(currentQuestionIds);
  const seedIds = input.mode === "append" ? [...currentQuestionIds] : [];
  const acceptedIds = [...seedIds];
  const acceptedQuestions = acceptedIds
    .map((id) => byId.get(id))
    .filter(Boolean) as any[];
  const exactDuplicateQuestionIds: string[] = [];
  const nearDuplicateMatches: Array<{
    questionId: string;
    existingQuestionId: string;
    similarity: number;
  }> = [];

  for (const questionId of requestedQuestionIds) {
    if (input.mode === "append" && currentSet.has(questionId)) {
      exactDuplicateQuestionIds.push(questionId);
      continue;
    }
    const candidate = byId.get(questionId);
    if (!candidate) continue;

    const candidateText = normalizeText(candidate.text);
    let duplicate: { id: string; similarity: number } | null = null;
    for (const existing of acceptedQuestions) {
      const existingId = String(existing.id || "");
      const existingText = normalizeText(existing.text);
      if (!candidateText || !existingText) continue;
      if (candidateText === existingText) {
        duplicate = { id: existingId, similarity: 1 };
        break;
      }
      const similarity = questionSimilarity(candidateText, existingText);
      if (similarity >= 0.92 && (!duplicate || similarity > duplicate.similarity)) {
        duplicate = { id: existingId, similarity };
      }
    }
    if (duplicate) {
      nearDuplicateMatches.push({
        questionId,
        existingQuestionId: duplicate.id,
        similarity: Number(duplicate.similarity.toFixed(4)),
      });
      continue;
    }

    acceptedIds.push(questionId);
    acceptedQuestions.push(candidate);
  }

  const nextQuestionIds = [...new Set(acceptedIds)];
  const nextSet = new Set(nextQuestionIds);
  const addedQuestionIds = nextQuestionIds.filter((id) => !currentSet.has(id));
  const removedQuestionIds = currentQuestionIds.filter((id) => !nextSet.has(id));
  const retainedQuestionIds = nextQuestionIds.filter((id) => currentSet.has(id));
  const nextQuestions = nextQuestionIds.map((id) => byId.get(id)).filter(Boolean);
  const skillIds = [
    ...new Set([
      ...(input.mode === "append" && Array.isArray(quiz.skillIds)
        ? quiz.skillIds.map(String)
        : []),
      ...nextQuestions.flatMap((question: any) =>
        [
          question.skillId,
          question.subSkillId,
          ...(Array.isArray(question.subSkillIds) ? question.subSkillIds : []),
          ...(Array.isArray(question.skillIds) ? question.skillIds : []),
        ]
          .filter(Boolean)
          .map(String),
      ),
    ]),
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
      exactDuplicateQuestionIds,
      nearDuplicateMatches,
      nearDuplicateCount: nearDuplicateMatches.length,
      nextQuestionIds,
      nextSkillIds: skillIds,
      baselineQuestionIdsHash: hashQuestionIds(currentQuestionIds),
    },
  };
}

export const quizQuestionIdsHash = hashQuestionIds;
