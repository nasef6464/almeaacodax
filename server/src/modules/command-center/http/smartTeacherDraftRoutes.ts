import { Router } from "express";
import { StatusCodes } from "http-status-codes";
import { CommandCenterDraftModel } from "../../../models/CommandCenterDraft.js";
import { asyncHandler } from "../../../utils/asyncHandler.js";
import {
  getCommandPrincipal,
  requireCommandScope,
} from "../application/commandAuthorization.js";
import { recordCommandAudit } from "../application/commandAudit.js";
import {
  smartTeacherSessionDraftSchema,
  validateSmartTeacherSessionDraft,
} from "../application/smartTeacherSessionDraftTools.js";

export const smartTeacherDraftRouter = Router();

smartTeacherDraftRouter.post(
  "/session/validate",
  requireCommandScope("drafts:write"),
  asyncHandler(async (req, res) => {
    const input = smartTeacherSessionDraftSchema.parse(req.body);
    const validation = await validateSmartTeacherSessionDraft(input);
    return res
      .status(validation.ok ? StatusCodes.OK : StatusCodes.UNPROCESSABLE_ENTITY)
      .json(validation);
  }),
);

smartTeacherDraftRouter.post(
  "/session/draft",
  requireCommandScope("drafts:write"),
  asyncHandler(async (req, res) => {
    const principal = getCommandPrincipal(res)!;
    const input = smartTeacherSessionDraftSchema.parse(req.body);
    const validation = await validateSmartTeacherSessionDraft(input);

    if (!validation.ok) {
      await recordCommandAudit({
        principal,
        action: "smart_teacher.session.validate",
        toolId: "prepare_smart_classroom_session",
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
      if (existing) {
        return res.json({
          draft: existing,
          validation,
          idempotentReplay: true,
        });
      }
    }

    const draft = await CommandCenterDraftModel.create({
      kind: "content",
      title: input.title,
      payload: validation.plan,
      source: principal.source,
      requiredScopes: ["smart_classroom:prepare"],
      createdBy: principal.id,
      createdByType: principal.type,
      requestId: input.requestId,
      idempotencyKey: input.idempotencyKey,
      status: "pending",
    });

    await recordCommandAudit({
      principal,
      action: "smart_teacher.session.draft.create",
      toolId: "prepare_smart_classroom_session",
      draftId: String(draft._id),
      requestId: input.requestId,
      outcome: "success",
      metadata: validation.stats,
    });

    return res.status(StatusCodes.CREATED).json({ draft, validation });
  }),
);
