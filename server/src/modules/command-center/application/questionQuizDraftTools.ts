import { z } from "zod";
import { QuestionModel } from "../../../models/Question.js";
import { QuizModel } from "../../../models/Quiz.js";
import { SkillModel } from "../../../models/Skill.js";

export const questionDraftItemSchema = z.object({
  text: z.string().trim().min(1),
  options: z.array(z.string().trim().min(1)).min(2).max(8),
  correctOptionIndex: z.number().int().min(0),
  explanation: z.string().optional().default(""),
  hint: z.string().optional().default(""),
  solvingStrategy: z.string().optional().default(""),
  pathId: z.string().trim().min(1),
  subjectId: z.string().trim().min(1),
  sectionId: z.string().trim().min(1),
  skillId: z.string().trim().min(1),
  subSkillIds: z.array(z.string().trim().min(1)).min(1).max(20),
  difficulty: z.enum(["Easy", "Medium", "Hard"]).default("Medium"),
  type: z.enum(["mcq", "true_false", "essay"]).default("mcq"),
  imageUrl: z.string().optional().default(""),
  videoUrl: z.string().optional().default(""),
  sourceMeta: z.record(z.any()).optional().default({}),
}).superRefine((value, ctx) => {
  if (value.correctOptionIndex >= value.options.length) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["correctOptionIndex"],
      message: "correctOptionIndex must point to an existing option",
    });
  }
});

export const questionDraftBatchSchema = z.object({
  title: z.string().trim().min(1).max(240),
  questions: z.array(questionDraftItemSchema).min(1).max(500),
  requestId: z.string().trim().max(160).optional().default(""),
  idempotencyKey: z.string().trim().min(8).max(240).optional(),
});

export const quizDraftSchema = z.object({
  title: z.string().trim().min(1).max(240),
  description: z.string().optional().default(""),
  pathId: z.string().trim().min(1),
  subjectId: z.string().trim().min(1),
  questionIds: z.array(z.string().trim().min(1)).min(1).max(500),
  skillIds: z.array(z.string().trim().min(1)).max(100).optional().default([]),
  settings: z.record(z.any()).optional().default({}),
  requestId: z.string().trim().max(160).optional().default(""),
  idempotencyKey: z.string().trim().min(8).max(240).optional(),
});

export const normalizeQuestionSimilarityText = (value: string) =>
  value
    .normalize("NFKC")
    .replace(/[\u064B-\u065F\u0670]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

export const questionSimilarityTokens = (value: string) =>
  new Set(
    normalizeQuestionSimilarityText(value)
      .split(" ")
      .map((token) => token.trim())
      .filter((token) => token.length >= 2),
  );

export const questionTokenSimilarity = (left: Set<string>, right: Set<string>) => {
  if (!left.size || !right.size) return 0;
  let intersection = 0;
  for (const token of left) {
    if (right.has(token)) intersection += 1;
  }
  const union = left.size + right.size - intersection;
  return union > 0 ? intersection / union : 0;
};

export const NEAR_DUPLICATE_THRESHOLD = 0.88;
const MIN_NEAR_DUPLICATE_TOKENS = 5;

export async function validateQuestionDraftBatch(
  input: z.infer<typeof questionDraftBatchSchema>,
) {
  const skillIds = [...new Set(input.questions.map((question) => question.skillId))];
  const skills = await SkillModel.find({ _id: { $in: skillIds } })
    .select("_id pathId subjectId sectionId subSkills")
    .lean();
  const skillById = new Map(skills.map((skill) => [String(skill._id), skill]));

  const subjectIds = [...new Set(input.questions.map((question) => question.subjectId))];
  const existingQuestions = await QuestionModel.find({ subjectId: { $in: subjectIds } })
    .select("id text subjectId skillId subSkillId skillIds")
    .lean();
  const existingByNormalizedText = new Map<string, typeof existingQuestions[number]>();
  const existingSimilarity = existingQuestions.map((existing) => {
    const normalized = normalizeQuestionSimilarityText(String(existing.text || ""));
    if (normalized && !existingByNormalizedText.has(normalized)) {
      existingByNormalizedText.set(normalized, existing);
    }
    return {
      question: existing,
      normalized,
      tokens: questionSimilarityTokens(String(existing.text || "")),
    };
  });

  const seenInBatch = new Map<string, number>();
  const batchSimilarity: Array<{ index: number; normalized: string; tokens: Set<string> }> = [];
  const issues: Array<{
    index: number;
    type: string;
    message: string;
    existingQuestionId?: string;
    duplicateBatchIndex?: number;
    similarity?: number;
  }> = [];

  input.questions.forEach((question, index) => {
    const skill = skillById.get(question.skillId);
    if (!skill) {
      issues.push({ index, type: "skill_not_found", message: "Main skill does not exist" });
      return;
    }
    if (
      String(skill.pathId) !== question.pathId ||
      String(skill.subjectId) !== question.subjectId ||
      String(skill.sectionId) !== question.sectionId
    ) {
      issues.push({
        index,
        type: "skill_scope_mismatch",
        message: "Main skill does not belong to the requested path/subject/section",
      });
    }

    const allowedSubSkills = new Set(
      (skill.subSkills || []).map((subSkill: { id?: string }) => String(subSkill.id || "")),
    );
    for (const subSkillId of question.subSkillIds) {
      if (!allowedSubSkills.has(subSkillId)) {
        issues.push({
          index,
          type: "subskill_scope_mismatch",
          message: "A selected sub-skill does not belong to the selected main skill",
        });
      }
    }

    const normalized = normalizeQuestionSimilarityText(question.text);
    const liveDuplicate = existingByNormalizedText.get(normalized);
    if (liveDuplicate) {
      issues.push({
        index,
        type: "exact_duplicate_live",
        message: "An exact normalized question already exists in the live bank",
        existingQuestionId: String(liveDuplicate.id || liveDuplicate._id || ""),
      });
    }
    if (seenInBatch.has(normalized)) {
      issues.push({
        index,
        type: "exact_duplicate_batch",
        message: `Duplicates question at batch index ${seenInBatch.get(normalized)}`,
      });
    } else {
      seenInBatch.set(normalized, index);
    }

    const tokens = questionSimilarityTokens(question.text);
    if (!liveDuplicate && tokens.size >= MIN_NEAR_DUPLICATE_TOKENS) {
      let bestLive: { id: string; score: number } | null = null;
      for (const candidate of existingSimilarity) {
        if (
          candidate.normalized === normalized ||
          candidate.tokens.size < MIN_NEAR_DUPLICATE_TOKENS
        ) {
          continue;
        }
        const score = questionTokenSimilarity(tokens, candidate.tokens);
        if (score >= NEAR_DUPLICATE_THRESHOLD && (!bestLive || score > bestLive.score)) {
          bestLive = {
            id: String(candidate.question.id || candidate.question._id || ""),
            score,
          };
        }
      }
      if (bestLive) {
        issues.push({
          index,
          type: "near_duplicate_live",
          message: "A highly similar question already exists in the live bank",
          existingQuestionId: bestLive.id,
          similarity: Number(bestLive.score.toFixed(4)),
        });
      }
    }

    if (tokens.size >= MIN_NEAR_DUPLICATE_TOKENS) {
      let bestBatch: { index: number; score: number } | null = null;
      for (const candidate of batchSimilarity) {
        if (candidate.normalized === normalized) continue;
        const score = questionTokenSimilarity(tokens, candidate.tokens);
        if (score >= NEAR_DUPLICATE_THRESHOLD && (!bestBatch || score > bestBatch.score)) {
          bestBatch = { index: candidate.index, score };
        }
      }
      if (bestBatch) {
        issues.push({
          index,
          type: "near_duplicate_batch",
          message: `Highly similar to batch index ${bestBatch.index}`,
          duplicateBatchIndex: bestBatch.index,
          similarity: Number(bestBatch.score.toFixed(4)),
        });
      }
    }
    batchSimilarity.push({ index, normalized, tokens });
  });

  return {
    ok: issues.length === 0,
    issues,
    stats: {
      total: input.questions.length,
      uniqueMainSkills: skillIds.length,
      exactDuplicateCount: issues.filter((issue) =>
        issue.type === "exact_duplicate_live" || issue.type === "exact_duplicate_batch",
      ).length,
      nearDuplicateCount: issues.filter((issue) =>
        issue.type === "near_duplicate_live" || issue.type === "near_duplicate_batch",
      ).length,
      nearDuplicateThreshold: NEAR_DUPLICATE_THRESHOLD,
    },
  };
}

export async function validateQuizDraft(
  input: z.infer<typeof quizDraftSchema>,
) {
  const questions = await QuestionModel.find({
    id: { $in: input.questionIds },
    subjectId: input.subjectId,
    pathId: input.pathId,
  })
    .select("id skillId subSkillId skillIds approvalStatus")
    .lean();
  const foundIds = new Set(questions.map((question) => String(question.id || "")));
  const missingQuestionIds = input.questionIds.filter((id) => !foundIds.has(id));

  return {
    ok: missingQuestionIds.length === 0,
    missingQuestionIds,
    questionCount: questions.length,
    skillIds: [
      ...new Set(
        questions.flatMap((question) =>
          [
            question.skillId,
            question.subSkillId,
            ...(Array.isArray(question.skillIds) ? question.skillIds : []),
          ].filter(Boolean).map(String),
        ),
      ),
    ],
  };
}


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
