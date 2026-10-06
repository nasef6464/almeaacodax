import { Router } from "express";
import { StatusCodes } from "http-status-codes";
import { CommandCenterDraftModel } from "../../../models/CommandCenterDraft.js";
import { asyncHandler } from "../../../utils/asyncHandler.js";
import { getCommandPrincipal, requireCommandScope } from "../application/commandAuthorization.js";
import { recordCommandAudit } from "../application/commandAudit.js";
import {
  buildQuizUpdatePlan,
  questionDraftBatchSchema,
  quizDraftSchema,
  quizUpdateDraftSchema,
  quizUpdatePreviewSchema,
  validateQuestionDraftBatch,
  validateQuizDraft,
} from "../application/questionQuizDraftTools.js";

export const questionQuizDraftRouter = Router();

questionQuizDraftRouter.post(
  "/questions/validate",
  requireCommandScope("drafts:write"),
  asyncHandler(async (req, res) => {
    const input = questionDraftBatchSchema.parse(req.body);
    const validation = await validateQuestionDraftBatch(input);
    return res.json(validation);
  }),
);

questionQuizDraftRouter.post(
  "/questions/draft",
  requireCommandScope("drafts:write"),
  asyncHandler(async (req, res) => {
    const principal = getCommandPrincipal(res)!;
    const input = questionDraftBatchSchema.parse(req.body);
    const validation = await validateQuestionDraftBatch(input);

    if (!validation.ok) {
      await recordCommandAudit({
        principal,
        action: "question_batch.validate",
        toolId: "create_question_drafts",
        requestId: input.requestId,
        outcome: "rejected",
        metadata: { issues: validation.issues.length },
      });
      return res.status(StatusCodes.UNPROCESSABLE_ENTITY).json({ validation });
    }

    if (input.idempotencyKey) {
      const existing = await CommandCenterDraftModel.findOne({
        idempotencyKey: input.idempotencyKey,
      }).lean();
      if (existing) return res.json({ draft: existing, idempotentReplay: true, validation });
    }

    const draft = await CommandCenterDraftModel.create({
      kind: "question_batch",
      title: input.title,
      payload: {
        questions: input.questions.map((question) => ({
          ...question,
          subSkillId: question.subSkillIds[0],
          skillIds: [question.skillId, ...question.subSkillIds],
          approvalStatus: "draft",
          aiGenerated: true,
        })),
        validation,
      },
      source: principal.source,
      requiredScopes: ["questions:write"],
      createdBy: principal.id,
      createdByType: principal.type,
      requestId: input.requestId,
      idempotencyKey: input.idempotencyKey,
      status: "pending",
    });

    await recordCommandAudit({
      principal,
      action: "question_batch.draft.create",
      toolId: "create_question_drafts",
      draftId: String(draft._id),
      requestId: input.requestId,
      outcome: "success",
      metadata: validation.stats,
    });

    return res.status(StatusCodes.CREATED).json({ draft, validation });
  }),
);

questionQuizDraftRouter.post(
  "/quizzes/draft",
  requireCommandScope("drafts:write"),
  asyncHandler(async (req, res) => {
    const principal = getCommandPrincipal(res)!;
    const input = quizDraftSchema.parse(req.body);
    const validation = await validateQuizDraft(input);
    if (!validation.ok) {
      return res.status(StatusCodes.UNPROCESSABLE_ENTITY).json({ validation });
    }

    if (input.idempotencyKey) {
      const existing = await CommandCenterDraftModel.findOne({
        idempotencyKey: input.idempotencyKey,
      }).lean();
      if (existing) return res.json({ draft: existing, idempotentReplay: true, validation });
    }

    const draft = await CommandCenterDraftModel.create({
      kind: "quiz",
      title: input.title,
      payload: {
        ...input,
        skillIds: input.skillIds.length ? input.skillIds : validation.skillIds,
        approvalStatus: "draft",
      },
      source: principal.source,
      requiredScopes: ["quizzes:write"],
      createdBy: principal.id,
      createdByType: principal.type,
      requestId: input.requestId,
      idempotencyKey: input.idempotencyKey,
      status: "pending",
    });

    await recordCommandAudit({
      principal,
      action: "quiz.draft.create",
      toolId: "create_quiz_draft",
      draftId: String(draft._id),
      requestId: input.requestId,
      outcome: "success",
      metadata: { questionCount: validation.questionCount },
    });

    return res.status(StatusCodes.CREATED).json({ draft, validation });
  }),
);


questionQuizDraftRouter.post(
  "/quizzes/update-preview",
  requireCommandScope("drafts:write"),
  asyncHandler(async (req, res) => {
    const input = quizUpdatePreviewSchema.parse(req.body);
    const plan = await buildQuizUpdatePlan(input);
    return res.status(plan.ok ? StatusCodes.OK : StatusCodes.UNPROCESSABLE_ENTITY).json({ plan });
  }),
);

questionQuizDraftRouter.post(
  "/quizzes/update-draft",
  requireCommandScope("drafts:write"),
  asyncHandler(async (req, res) => {
    const principal = getCommandPrincipal(res)!;
    const input = quizUpdateDraftSchema.parse(req.body);
    const plan = await buildQuizUpdatePlan(input);
    if (!plan.ok || !plan.target || !plan.diff) {
      await recordCommandAudit({
        principal,
        action: "quiz.update.validate",
        toolId: "update_quiz_questions",
        requestId: input.requestId,
        outcome: "rejected",
        metadata: { issues: Array.isArray(plan.issues) ? plan.issues.length : 1 },
      });
      return res.status(StatusCodes.UNPROCESSABLE_ENTITY).json({ plan });
    }

    if (input.idempotencyKey) {
      const existing = await CommandCenterDraftModel.findOne({
        idempotencyKey: input.idempotencyKey,
      }).lean();
      if (existing) return res.json({ draft: existing, idempotentReplay: true, plan });
    }

    const draft = await CommandCenterDraftModel.create({
      kind: "quiz_update",
      title: input.title || `تحديث ${plan.target.title}`,
      payload: {
        targetQuizId: plan.target.quizId,
        targetTitle: plan.target.title,
        targetPathId: plan.target.pathId,
        targetSubjectId: plan.target.subjectId,
        targetSectionId: plan.target.sectionId,
        targetWasPublished: plan.target.isPublished,
        expectedQuestionIdsHash: plan.target.currentQuestionIdsHash,
        mode: input.mode,
        requestedQuestionIds: input.questionIds,
        finalQuestionIds: plan.diff.finalQuestionIds,
        finalSkillIds: plan.diff.finalSkillIds,
        diff: plan.diff,
        policy: "create_unpublished_revision",
      },
      source: principal.source,
      requiredScopes: ["quizzes:write"],
      createdBy: principal.id,
      createdByType: principal.type,
      requestId: input.requestId,
      idempotencyKey: input.idempotencyKey,
      status: "pending",
    });

    await recordCommandAudit({
      principal,
      action: "quiz.update.draft.create",
      toolId: "update_quiz_questions",
      draftId: String(draft._id),
      requestId: input.requestId,
      outcome: "success",
      metadata: {
        targetQuizId: plan.target.quizId,
        mode: input.mode,
        additions: plan.diff.additions.length,
        removals: plan.diff.removals.length,
        skippedSimilar: plan.diff.highSimilarityMatches.length,
      },
    });

    return res.status(StatusCodes.CREATED).json({ draft, plan });
  }),
);
