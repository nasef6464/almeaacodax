import { Router } from "express";
import { StatusCodes } from "http-status-codes";
import { CommandCenterDraftModel } from "../../../models/CommandCenterDraft.js";
import { asyncHandler } from "../../../utils/asyncHandler.js";
import { getCommandPrincipal, requireCommandScope } from "../application/commandAuthorization.js";
import { recordCommandAudit } from "../application/commandAudit.js";
import {
  schoolSetupDraftSchema,
  validateSchoolSetupDraft,
} from "../application/schoolSetupDraftTools.js";

export const schoolDraftRouter = Router();

schoolDraftRouter.post(
  "/validate",
  requireCommandScope("drafts:write"),
  asyncHandler(async (req, res) => {
    const input = schoolSetupDraftSchema.parse(req.body);
    return res.json(await validateSchoolSetupDraft(input));
  }),
);

schoolDraftRouter.post(
  "/draft",
  requireCommandScope("drafts:write"),
  asyncHandler(async (req, res) => {
    const principal = getCommandPrincipal(res)!;
    const input = schoolSetupDraftSchema.parse(req.body);
    const validation = await validateSchoolSetupDraft(input);

    if (!validation.ok) {
      await recordCommandAudit({
        principal,
        action: "school.setup.validate",
        toolId: "create_school_setup_draft",
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
        return res.json({ draft: existing, idempotentReplay: true, validation });
      }
    }

    const draft = await CommandCenterDraftModel.create({
      kind: "school_setup",
      title: input.schoolName,
      payload: {
        ...validation.normalizedPlan,
        strategy: "validated_plan_first",
        applyPolicy: "reuse_existing_accounts",
        accountCreationPolicy: "explicit_only",
      },
      source: principal.source,
      requiredScopes: ["schools:write"],
      createdBy: principal.id,
      createdByType: principal.type,
      requestId: input.requestId,
      idempotencyKey: input.idempotencyKey,
      status: "pending",
    });

    await recordCommandAudit({
      principal,
      action: "school.setup.draft.create",
      toolId: "create_school_setup_draft",
      draftId: String(draft._id),
      requestId: input.requestId,
      outcome: "success",
      metadata: validation.stats,
    });

    return res.status(StatusCodes.CREATED).json({ draft, validation });
  }),
);
