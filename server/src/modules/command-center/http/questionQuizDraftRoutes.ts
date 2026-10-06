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
