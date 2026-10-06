import { z } from "zod";
import { QuestionModel } from "../../../models/Question.js";
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

const normalizeText = (value: string) =>
  value
    .normalize("NFKC")
    .replace(/[\u064B-\u065F\u0670]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

const similarityTokens = (value: string) =>
  new Set(
    normalizeText(value)
      .split(" ")
      .map((token) => token.trim())
      .filter((token) => token.length >= 2),
  );

const jaccardSimilarity = (left: Set<string>, right: Set<string>) => {
  if (!left.size || !right.size) return 0;
  let intersection = 0;
  for (const token of left) {
    if (right.has(token)) intersection += 1;
  }
  const union = left.size + right.size - intersection;
  return union > 0 ? intersection / union : 0;
};

const NEAR_DUPLICATE_THRESHOLD = 0.88;
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
    const normalized = normalizeText(String(existing.text || ""));
    if (normalized && !existingByNormalizedText.has(normalized)) {
      existingByNormalizedText.set(normalized, existing);
    }
    return {
      question: existing,
      normalized,
      tokens: similarityTokens(String(existing.text || "")),
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

    const normalized = normalizeText(question.text);
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

    const tokens = similarityTokens(question.text);
    if (!liveDuplicate && tokens.size >= MIN_NEAR_DUPLICATE_TOKENS) {
      let bestLive: { id: string; score: number } | null = null;
      for (const candidate of existingSimilarity) {
        if (
          candidate.normalized === normalized ||
          candidate.tokens.size < MIN_NEAR_DUPLICATE_TOKENS
        ) {
          continue;
        }
        const score = jaccardSimilarity(tokens, candidate.tokens);
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
        const score = jaccardSimilarity(tokens, candidate.tokens);
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
