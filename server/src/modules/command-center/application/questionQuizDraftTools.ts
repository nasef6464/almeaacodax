import { z } from "zod";
import { QuestionModel } from "../../../models/Question.js";
import { SkillModel } from "../../../models/Skill.js";
import { questionSimilarity } from "./questionSimilarity.js";

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
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

export async function validateQuestionDraftBatch(
  input: z.infer<typeof questionDraftBatchSchema>,
  options: { excludeQuestionIds?: string[] } = {},
) {
  const skillIds = [...new Set(input.questions.map((question) => question.skillId))];
  const skills = await SkillModel.find({ _id: { $in: skillIds } })
    .select("_id pathId subjectId sectionId subSkills")
    .lean();
  const skillById = new Map(skills.map((skill) => [String(skill._id), skill]));

  const subjectIds = [...new Set(input.questions.map((question) => question.subjectId))];
  const excludedQuestionIds = [...new Set((options.excludeQuestionIds || []).map(String).filter(Boolean))];
  const existingQuestions = await QuestionModel.find({
    subjectId: { $in: subjectIds },
    ...(excludedQuestionIds.length ? { id: { $nin: excludedQuestionIds } } : {}),
  })
    .select("id text subjectId skillId subSkillId skillIds")
    .lean();
  const existingByNormalizedText = new Map<string, typeof existingQuestions[number]>();
  const searchableExisting = existingQuestions
    .map((existing) => ({
      existing,
      normalized: normalizeText(String(existing.text || "")),
    }))
    .filter((item) => item.normalized.length >= 24);
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
        similarity: 1,
      });
    } else if (normalized.length >= 24) {
      let bestMatch: { existing: typeof existingQuestions[number]; similarity: number } | null = null;
      for (const candidate of searchableExisting) {
        if (String(candidate.existing.subjectId || "") !== question.subjectId) continue;
        const similarity = questionSimilarity(normalized, candidate.normalized);
        if (similarity < 0.92) continue;
        if (!bestMatch || similarity > bestMatch.similarity) {
          bestMatch = { existing: candidate.existing, similarity };
        }
      }
      if (bestMatch) {
        issues.push({
          index,
          type: "near_duplicate_live",
          message: "A highly similar question already exists in the live bank",
          existingQuestionId: String(bestMatch.existing.id || bestMatch.existing._id || ""),
          similarity: Number(bestMatch.similarity.toFixed(4)),
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
    stats: {
      total: input.questions.length,
      uniqueMainSkills: skillIds.length,
      exactDuplicateCount: issues.filter((issue) =>
        issue.type === "exact_duplicate_live" || issue.type === "exact_duplicate_batch",
      ).length,
      nearDuplicateCount: issues.filter((issue) => issue.type === "near_duplicate_live").length,
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
