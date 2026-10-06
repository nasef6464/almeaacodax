import { createHash } from "node:crypto";
import { z } from "zod";
import { QuestionModel } from "../../../models/Question.js";
import { SkillModel } from "../../../models/Skill.js";
import {
  buildQuestionTokenIndex,
  candidateIndexesForQuestion,
  scoreQuestionSimilarity,
} from "./questionSimilarity.js";

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

const quizUpdateBaseSchema = z.object({
  targetQuizId: z.string().trim().min(1).max(180),
  mode: z.enum(["append", "replace"]).default("append"),
  questionIds: z.array(z.string().trim().min(1)).min(1).max(500),
  title: z.string().trim().min(1).max(240).optional(),
  requestId: z.string().trim().max(160).optional().default(""),
  idempotencyKey: z.string().trim().min(8).max(240).optional(),
});

export const quizUpdatePreviewSchema = quizUpdateBaseSchema.extend({
  expectedQuestionIdsHash: z.string().trim().regex(/^[a-f0-9]{64}$/i).optional(),
});

export const quizUpdateDraftSchema = quizUpdateBaseSchema.extend({
  expectedQuestionIdsHash: z.string().trim().regex(/^[a-f0-9]{64}$/i),
});

const normalizeText = (value: string) =>
  value
    .normalize("NFKC")
    .replace(/[\u064B-\u065F\u0670]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

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
  const existingTokenIndex = buildQuestionTokenIndex(existingQuestions);
  for (const existing of existingQuestions) {
    const normalized = normalizeText(String(existing.text || ""));
    if (normalized && !existingByNormalizedText.has(normalized)) {
      existingByNormalizedText.set(normalized, existing);
    }
  }

  const seenInBatch = new Map<string, number>();
  const issues: Array<{
    index: number;
    type: string;
    message: string;
    existingQuestionId?: string;
    similarity?: number;
  }> = [];
  const warnings: Array<{
    index: number;
    type: string;
    message: string;
    existingQuestionId?: string;
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

    const normalized = normalizeText(question.text);
    const liveDuplicate = existingByNormalizedText.get(normalized);
    if (liveDuplicate) {
      issues.push({
        index,
        type: "exact_duplicate_live",
        message: "An exact normalized question already exists in the live bank",
        existingQuestionId: String(liveDuplicate.id || liveDuplicate._id || ""),
      });
    } else {
      let bestCandidate:
        | { existingQuestionId: string; similarity: number }
        | undefined;
      for (const candidateIndex of candidateIndexesForQuestion(question.text, existingTokenIndex)) {
        const candidate = existingQuestions[candidateIndex];
        if (!candidate?.text) continue;
        const similarity = scoreQuestionSimilarity(question.text, String(candidate.text)).score;
        if (!bestCandidate || similarity > bestCandidate.similarity) {
          bestCandidate = {
            existingQuestionId: String(candidate.id || candidate._id || ""),
            similarity,
          };
        }
      }
      if (bestCandidate && bestCandidate.similarity >= 0.94) {
        issues.push({
          index,
          type: "near_duplicate_live",
          message: "A highly similar question already exists in the live bank",
          existingQuestionId: bestCandidate.existingQuestionId,
          similarity: bestCandidate.similarity,
        });
      } else if (bestCandidate && bestCandidate.similarity >= 0.82) {
        warnings.push({
          index,
          type: "possible_near_duplicate_live",
          message: "A similar live question should be reviewed before approval",
          existingQuestionId: bestCandidate.existingQuestionId,
          similarity: bestCandidate.similarity,
        });
      }
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
  });

  return {
    ok: issues.length === 0,
    issues,
    warnings,
    stats: {
      total: input.questions.length,
      uniqueMainSkills: skillIds.length,
      exactDuplicateCount: issues.filter((issue) =>
        issue.type === "exact_duplicate_live" || issue.type === "exact_duplicate_batch",
      ).length,
      nearDuplicateBlockCount: issues.filter((issue) => issue.type === "near_duplicate_live").length,
      nearDuplicateReviewCount: warnings.filter((warning) => warning.type === "possible_near_duplicate_live").length,
    },
  };
}

const hashQuestionIds = (questionIds: string[]) =>
  createHash("sha256").update(questionIds.join("\u0000")).digest("hex");

const uniqueInOrder = (values: string[]) => {
  const seen = new Set<string>();
  return values.filter((value) => {
    if (seen.has(value)) return false;
    seen.add(value);
    return true;
  });
};

export async function buildQuizUpdatePlan(
  input: z.infer<typeof quizUpdatePreviewSchema>,
) {
  const target = await QuizModel.findOne({
    $or: [{ _id: input.targetQuizId }, { id: input.targetQuizId }],
  })
    .select("_id id title pathId subjectId sectionId questionIds skillIds settings isPublished showOnPlatform approvalStatus ownerType ownerId")
    .lean();

  if (!target) {
    return {
      ok: false,
      issues: [{ type: "target_quiz_not_found", message: "Target quiz does not exist" }],
      target: null,
    };
  }

  const currentQuestionIds = uniqueInOrder(
    (Array.isArray(target.questionIds) ? target.questionIds : []).map(String),
  );
  const currentQuestionIdsHash = hashQuestionIds(currentQuestionIds);
  const staleSource = Boolean(input.expectedQuestionIdsHash) && currentQuestionIdsHash !== input.expectedQuestionIdsHash;
  const requestedIds = uniqueInOrder(input.questionIds);
  const duplicateRequestedIds = input.questionIds.filter(
    (id, index) => input.questionIds.indexOf(id) !== index,
  );

  const requestedQuestions = await QuestionModel.find({
    id: { $in: requestedIds },
    pathId: String(target.pathId || ""),
    subjectId: String(target.subjectId || ""),
  })
    .select("id text skillId subSkillId skillIds")
    .lean();
  const requestedById = new Map(
    requestedQuestions.map((question) => [String(question.id || ""), question]),
  );
  const missingQuestionIds = requestedIds.filter((id) => !requestedById.has(id));

  const currentQuestions = currentQuestionIds.length
    ? await QuestionModel.find({ id: { $in: currentQuestionIds } })
        .select("id text skillId subSkillId skillIds")
        .lean()
    : [];
  const currentById = new Map(
    currentQuestions.map((question) => [String(question.id || ""), question]),
  );
  const currentTokenIndex = buildQuestionTokenIndex(currentQuestions);

  const alreadyPresentIds: string[] = [];
  const highSimilarityMatches: Array<{
    questionId: string;
    existingQuestionId: string;
    similarity: number;
  }> = [];
  const reviewSimilarityMatches: Array<{
    questionId: string;
    existingQuestionId: string;
    similarity: number;
  }> = [];
  const acceptedRequestedIds: string[] = [];

  for (const questionId of requestedIds) {
    if (!requestedById.has(questionId)) continue;
    if (currentById.has(questionId)) {
      alreadyPresentIds.push(questionId);
      continue;
    }

    const question = requestedById.get(questionId)!;
    let best:
      | { existingQuestionId: string; similarity: number }
      | undefined;
    for (const candidateIndex of candidateIndexesForQuestion(
      String(question.text || ""),
      currentTokenIndex,
    )) {
      const candidate = currentQuestions[candidateIndex];
      if (!candidate?.text) continue;
      const similarity = scoreQuestionSimilarity(
        String(question.text || ""),
        String(candidate.text || ""),
      ).score;
      if (!best || similarity > best.similarity) {
        best = {
          existingQuestionId: String(candidate.id || ""),
          similarity,
        };
      }
    }

    if (best && best.similarity >= 0.94) {
      highSimilarityMatches.push({
        questionId,
        existingQuestionId: best.existingQuestionId,
        similarity: best.similarity,
      });
      continue;
    }
    if (best && best.similarity >= 0.82) {
      reviewSimilarityMatches.push({
        questionId,
        existingQuestionId: best.existingQuestionId,
        similarity: best.similarity,
      });
    }
    acceptedRequestedIds.push(questionId);
  }

  const finalQuestionIds =
    input.mode === "append"
      ? uniqueInOrder([...currentQuestionIds, ...acceptedRequestedIds])
      : uniqueInOrder(
          requestedIds.filter(
            (id) =>
              requestedById.has(id) &&
              !highSimilarityMatches.some((match) => match.questionId === id),
          ),
        );

  const finalQuestions = await QuestionModel.find({
    id: { $in: finalQuestionIds },
  })
    .select("id skillId subSkillId skillIds")
    .lean();

  const finalSkillIds = [
    ...new Set(
      finalQuestions.flatMap((question) =>
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

  const additions = finalQuestionIds.filter((id) => !currentQuestionIds.includes(id));
  const removals = currentQuestionIds.filter((id) => !finalQuestionIds.includes(id));
  const issues = [
    ...(staleSource
      ? [{
          type: "quiz_changed_since_preview",
          message: "Target quiz changed after the preview; rebuild the diff before creating a draft",
        }]
      : []),
    ...(missingQuestionIds.length
      ? [{
          type: "missing_questions",
          message: "Some requested questions do not exist in the target quiz scope",
          questionIds: missingQuestionIds,
        }]
      : []),
  ];

  return {
    ok: issues.length === 0,
    issues,
    target: {
      quizId: String(target.id || target._id || ""),
      title: String(target.title || ""),
      pathId: String(target.pathId || ""),
      subjectId: String(target.subjectId || ""),
      sectionId: String(target.sectionId || ""),
      isPublished: Boolean(target.isPublished),
      showOnPlatform: Boolean(target.showOnPlatform),
      approvalStatus: String(target.approvalStatus || ""),
      currentQuestionIds,
      currentQuestionIdsHash,
    },
    diff: {
      mode: input.mode,
      requested: requestedIds.length,
      duplicateRequestedIds: [...new Set(duplicateRequestedIds)],
      alreadyPresentIds,
      highSimilarityMatches,
      reviewSimilarityMatches,
      additions,
      removals,
      finalQuestionIds,
      finalSkillIds,
      finalQuestionCount: finalQuestionIds.length,
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
