import { z } from "zod";
import { QuestionModel } from "../../../models/Question.js";
import { QuizModel } from "../../../models/Quiz.js";
import {
  MIN_NEAR_DUPLICATE_TOKENS,
  NEAR_DUPLICATE_THRESHOLD,
  normalizeQuestionSimilarityText,
  questionSimilarityTokens,
  questionTokenSimilarity,
} from "./questionQuizDraftTools.js";

export const quizQuestionUpdateDraftSchema = z.object({
  targetQuizId: z.string().trim().min(1),
  candidateQuestionIds: z.array(z.string().trim().min(1)).min(1).max(1000),
  mode: z.enum(["add", "replace"]).default("add"),
  title: z.string().trim().min(1).max(240).optional(),
  requestId: z.string().trim().max(160).optional().default(""),
  idempotencyKey: z.string().trim().min(8).max(240).optional(),
});

const questionIdentity = (question: any) =>
  String(question?.id || question?._id || "").trim();

export async function planQuizQuestionUpdate(
  input: z.infer<typeof quizQuestionUpdateDraftSchema>,
) {
  const quiz = await QuizModel.findOne({
    $or: [{ _id: input.targetQuizId }, { id: input.targetQuizId }],
  })
    .select(
      "_id id title description pathId subjectId questionIds skillIds settings isPublished showOnPlatform approvalStatus quizKind type placement ownerType ownerId",
    )
    .lean();

  if (!quiz) {
    return {
      ok: false,
      issues: [{ type: "quiz_not_found", message: "Target quiz was not found" }],
      quiz: null,
      diff: null,
    };
  }

  const currentIds = [
    ...new Set((Array.isArray(quiz.questionIds) ? quiz.questionIds : []).map(String).filter(Boolean)),
  ];
  const candidateIds = [...new Set(input.candidateQuestionIds.map(String).filter(Boolean))];
  const allIds = [...new Set([...currentIds, ...candidateIds])];

  const questions = await QuestionModel.find({
    $or: [
      { id: { $in: allIds } },
      ...(allIds.every((id) => /^[a-f\d]{24}$/i.test(id))
        ? [{ _id: { $in: allIds } }]
        : []),
    ],
  })
    .select(
      "_id id text pathId subjectId sectionId skillId subSkillId subSkillIds skillIds approvalStatus",
    )
    .lean();

  const byId = new Map<string, any>();
  for (const question of questions) {
    const aliases = [questionIdentity(question), String(question._id || "")].filter(Boolean);
    for (const alias of aliases) byId.set(alias, question);
  }

  const missingCandidateIds = candidateIds.filter((id) => !byId.has(id));
  const unusableCandidateIds: string[] = [];
  const scopeMismatchIds: string[] = [];
  const exactExistingIds: string[] = [];
  const nearDuplicateCandidates: Array<{
    candidateQuestionId: string;
    existingQuestionId: string;
    similarity: number;
  }> = [];
  const acceptedAdditions: string[] = [];

  const currentQuestions = currentIds
    .map((id) => byId.get(id))
    .filter(Boolean);
  const currentSimilarity = currentQuestions.map((question) => ({
    id: questionIdentity(question),
    normalized: normalizeQuestionSimilarityText(String(question.text || "")),
    tokens: questionSimilarityTokens(String(question.text || "")),
  }));

  for (const candidateId of candidateIds) {
    const candidate = byId.get(candidateId);
    if (!candidate) continue;

    if (
      String(candidate.pathId || "") !== String(quiz.pathId || "") ||
      String(candidate.subjectId || "") !== String(quiz.subjectId || "")
    ) {
      scopeMismatchIds.push(candidateId);
      continue;
    }

    if (String(candidate.approvalStatus || "") !== "approved") {
      unusableCandidateIds.push(candidateId);
      continue;
    }

    const canonicalId = questionIdentity(candidate);
    if (
      currentIds.includes(candidateId) ||
      currentIds.includes(canonicalId) ||
      currentQuestions.some((question) => String(question._id || "") === candidateId)
    ) {
      exactExistingIds.push(candidateId);
      continue;
    }

    const normalized = normalizeQuestionSimilarityText(String(candidate.text || ""));
    const tokens = questionSimilarityTokens(String(candidate.text || ""));
    let best: { id: string; score: number } | null = null;
    if (tokens.size >= MIN_NEAR_DUPLICATE_TOKENS) {
      for (const existing of currentSimilarity) {
        if (
          !existing.normalized ||
          existing.normalized === normalized ||
          existing.tokens.size < MIN_NEAR_DUPLICATE_TOKENS
        ) {
          if (existing.normalized === normalized && existing.id) {
            best = { id: existing.id, score: 1 };
          }
          continue;
        }
        const score = questionTokenSimilarity(tokens, existing.tokens);
        if (score >= NEAR_DUPLICATE_THRESHOLD && (!best || score > best.score)) {
          best = { id: existing.id, score };
        }
      }
    }
    if (best) {
      nearDuplicateCandidates.push({
        candidateQuestionId: candidateId,
        existingQuestionId: best.id,
        similarity: Number(best.score.toFixed(4)),
      });
      continue;
    }

    acceptedAdditions.push(canonicalId || candidateId);
  }

  const baseIds = input.mode === "replace" ? [] : currentIds;
  const finalQuestionIds = [...new Set([...baseIds, ...acceptedAdditions])];

  const finalQuestions = finalQuestionIds.map((id) => byId.get(id)).filter(Boolean);
  const beforeSkillIds = [
    ...new Set(
      currentQuestions.flatMap((question) =>
        [
          question.skillId,
          question.subSkillId,
          ...(Array.isArray(question.subSkillIds) ? question.subSkillIds : []),
          ...(Array.isArray(question.skillIds) ? question.skillIds : []),
        ]
          .filter(Boolean)
          .map(String),
      ),
    ),
  ];
  const afterSkillIds = [
    ...new Set(
      finalQuestions.flatMap((question) =>
        [
          question.skillId,
          question.subSkillId,
          ...(Array.isArray(question.subSkillIds) ? question.subSkillIds : []),
          ...(Array.isArray(question.skillIds) ? question.skillIds : []),
        ]
          .filter(Boolean)
          .map(String),
      ),
    ),
  ];

  const issues = [
    ...missingCandidateIds.map((id) => ({
      type: "candidate_not_found",
      questionId: id,
      message: "Candidate question was not found",
    })),
    ...unusableCandidateIds.map((id) => ({
      type: "candidate_not_approved",
      questionId: id,
      message: "Candidate question is not approved for quiz use",
    })),
    ...scopeMismatchIds.map((id) => ({
      type: "candidate_scope_mismatch",
      questionId: id,
      message: "Candidate question does not match target quiz path/subject",
    })),
  ];

  return {
    ok: issues.length === 0,
    issues,
    quiz: {
      id: String(quiz.id || quiz._id || ""),
      mongoId: String(quiz._id || ""),
      title: String(quiz.title || ""),
      pathId: String(quiz.pathId || ""),
      subjectId: String(quiz.subjectId || ""),
      isPublished: Boolean(quiz.isPublished),
      showOnPlatform: Boolean(quiz.showOnPlatform),
      approvalStatus: String(quiz.approvalStatus || ""),
    },
    diff: {
      mode: input.mode,
      currentCount: currentIds.length,
      candidateCount: candidateIds.length,
      acceptedAdditionCount: acceptedAdditions.length,
      exactExistingCount: exactExistingIds.length,
      nearDuplicateCount: nearDuplicateCandidates.length,
      missingCount: missingCandidateIds.length,
      unusableCount: unusableCandidateIds.length,
      scopeMismatchCount: scopeMismatchIds.length,
      finalCount: finalQuestionIds.length,
      acceptedAdditions,
      exactExistingIds,
      nearDuplicateCandidates,
      missingCandidateIds,
      unusableCandidateIds,
      scopeMismatchIds,
      currentQuestionIds: currentIds,
      finalQuestionIds,
      removedQuestionIds:
        input.mode === "replace"
          ? currentIds.filter((id) => !finalQuestionIds.includes(id))
          : [],
      beforeSkillIds,
      afterSkillIds,
      addedSkillIds: afterSkillIds.filter((id) => !beforeSkillIds.includes(id)),
    },
    targetSnapshot: quiz,
  };
}

