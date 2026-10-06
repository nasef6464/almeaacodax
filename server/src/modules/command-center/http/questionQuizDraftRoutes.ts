import { Router } from "express";
import { StatusCodes } from "http-status-codes";
import { CommandCenterDraftModel } from "../../../models/CommandCenterDraft.js";
import { asyncHandler } from "../../../utils/asyncHandler.js";
import { getCommandPrincipal, requireCommandScope } from "../application/commandAuthorization.js";
import { recordCommandAudit } from "../application/commandAudit.js";
import {
  questionDraftBatchSchema,
  quizDraftSchema,
  validateQuestionDraftBatch,
  validateQuizDraft,
} from "../application/questionQuizDraftTools.js";
import {
  buildQuizUpdateDiff,
  quizUpdateDraftSchema,
} from "../application/quizUpdateDraftTools.js";

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
  "/quizzes/:id/diff",
  requireCommandScope("quizzes:write"),
  asyncHandler(async (req, res) => {
    const input = quizUpdateDraftSchema.parse({
      ...req.body,
      targetQuizId: req.params.id,
    });
    const result = await buildQuizUpdateDiff(input);
    return res
      .status(result.ok ? StatusCodes.OK : StatusCodes.UNPROCESSABLE_ENTITY)
      .json(result);
  }),
);

questionQuizDraftRouter.post(
  "/quizzes/:id/update-draft",
  requireCommandScope("quizzes:write"),
  asyncHandler(async (req, res) => {
    const principal = getCommandPrincipal(res)!;
    const input = quizUpdateDraftSchema.parse({
      ...req.body,
      targetQuizId: req.params.id,
    });
    const result = await buildQuizUpdateDiff(input);
    if (!result.ok || !result.diff || !result.quiz) {
      return res.status(StatusCodes.UNPROCESSABLE_ENTITY).json(result);
    }

    if (input.idempotencyKey) {
      const existing = await CommandCenterDraftModel.findOne({
        idempotencyKey: input.idempotencyKey,
      }).lean();
      if (existing) return res.json({ draft: existing, idempotentReplay: true, diff: result.diff });
    }

    const draft = await CommandCenterDraftModel.create({
      kind: "quiz_update",
      title: `تحديث اختبار: ${result.quiz.title}`,
      payload: {
        targetQuizId: result.quiz.id,
        baselineQuestionIdsHash: result.diff.baselineQuestionIdsHash,
        beforeCount: result.diff.beforeCount,
        nextQuestionIds: result.diff.nextQuestionIds,
        nextSkillIds: result.diff.nextSkillIds,
        addedQuestionIds: result.diff.addedQuestionIds,
        removedQuestionIds: result.diff.removedQuestionIds,
        retainedQuestionIds: result.diff.retainedQuestionIds,
        exactDuplicateQuestionIds: result.diff.exactDuplicateQuestionIds,
        nearDuplicateMatches: result.diff.nearDuplicateMatches,
        mode: result.diff.mode,
        targetWasPublished: result.quiz.isPublished,
        targetShowOnPlatform: result.quiz.showOnPlatform,
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
      toolId: "plan_quiz_question_update",
      draftId: String(draft._id),
      requestId: input.requestId,
      outcome: "success",
      metadata: {
        targetQuizId: result.quiz.id,
        beforeCount: result.diff.beforeCount,
        afterCount: result.diff.afterCount,
        added: result.diff.addedQuestionIds.length,
        removed: result.diff.removedQuestionIds.length,
        exactDuplicatesSkipped: result.diff.exactDuplicateQuestionIds.length,
        nearDuplicatesSkipped: result.diff.nearDuplicateCount,
      },
    });

    return res.status(StatusCodes.CREATED).json({ draft, diff: result.diff });
  }),
);
