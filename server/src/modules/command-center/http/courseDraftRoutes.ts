import { Router } from "express";
import { StatusCodes } from "http-status-codes";
import { CommandCenterDraftModel } from "../../../models/CommandCenterDraft.js";
import { asyncHandler } from "../../../utils/asyncHandler.js";
import { getCommandPrincipal, requireCommandScope } from "../application/commandAuthorization.js";
import { recordCommandAudit } from "../application/commandAudit.js";
import {
  courseInventoryQuerySchema,
  courseReuseDraftSchema,
  getReusableCourseInventory,
  validateCourseReuseDraft,
} from "../application/courseReuseDraftTools.js";

export const courseDraftRouter = Router();

courseDraftRouter.get(
  "/inventory",
  requireCommandScope("courses:read"),
  asyncHandler(async (req, res) => {
    const input = courseInventoryQuerySchema.parse(req.query);
    const inventory = await getReusableCourseInventory(input);
    return res.json(inventory);
  }),
);

courseDraftRouter.post(
  "/validate",
  requireCommandScope("drafts:write"),
  asyncHandler(async (req, res) => {
    const input = courseReuseDraftSchema.parse(req.body);
    const validation = await validateCourseReuseDraft(input);
    return res.json(validation);
  }),
);

courseDraftRouter.post(
  "/draft",
  requireCommandScope("drafts:write"),
  asyncHandler(async (req, res) => {
    const principal = getCommandPrincipal(res)!;
    const input = courseReuseDraftSchema.parse(req.body);
    const validation = await validateCourseReuseDraft(input);

    if (!validation.ok) {
      await recordCommandAudit({
        principal,
        action: "course.reuse.validate",
        toolId: "create_course_draft",
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
      kind: "course",
      title: input.title,
      payload: {
        ...input,
        skillIds: validation.derivedSkillIds,
        strategy: "reuse_first",
        sourceOfTruth: "existing_platform_content",
        generationPolicy: "generate_only_when_missing",
        approvalStatus: "draft",
        isPublished: false,
        resolvedSummary: validation.stats,
      },
      source: principal.source,
      requiredScopes: ["courses:write"],
      createdBy: principal.id,
      createdByType: principal.type,
      requestId: input.requestId,
      idempotencyKey: input.idempotencyKey,
      status: "pending",
    });

    await recordCommandAudit({
      principal,
      action: "course.reuse.draft.create",
      toolId: "create_course_draft",
      draftId: String(draft._id),
      requestId: input.requestId,
      outcome: "success",
      metadata: validation.stats,
    });

    return res.status(StatusCodes.CREATED).json({ draft, validation });
  }),
);
