import { Router } from "express";
import { StatusCodes } from "http-status-codes";
import { z } from "zod";
import { SkillModel } from "../../../models/Skill.js";
import {
  CommandCenterDraftModel,
  COMMAND_DRAFT_KINDS,
} from "../../../models/CommandCenterDraft.js";
import { asyncHandler } from "../../../utils/asyncHandler.js";
import {
  getCommandPrincipal,
  requireCommandPrincipal,
  requireCommandScope,
} from "../application/commandAuthorization.js";
import { recordCommandAudit } from "../application/commandAudit.js";
import { commandToolRegistry } from "../application/commandToolRegistry.js";
import { applyApprovedCommandDraft } from "../application/draftApplyService.js";
import { questionQuizDraftRouter } from "./questionQuizDraftRoutes.js";
import { courseDraftRouter } from "./courseDraftRoutes.js";
import { schoolDraftRouter } from "./schoolDraftRoutes.js";
import { workflowRouter } from "./workflowRoutes.js";
import { mcpRouter } from "./mcpRoutes.js";
import { developerDraftRouter } from "./developerDraftRoutes.js";

const draftSchema = z.object({
  kind: z.enum(COMMAND_DRAFT_KINDS),
  title: z.string().trim().min(1).max(240),
  payload: z.record(z.any()),
  toolId: z.string().trim().min(1).max(120).optional(),
  requiredScopes: z.array(z.string().trim().min(1)).max(20).optional().default([]),
  source: z.enum(["admin_ui", "mcp", "external_agent"]).optional(),
  requestId: z.string().trim().max(160).optional().default(""),
  idempotencyKey: z.string().trim().min(8).max(240).optional(),
});

const reviewSchema = z.object({
  decision: z.enum(["approved", "rejected"]),
  notes: z.string().trim().max(2000).optional().default(""),
});

const applySchema = z.object({
  confirmation: z.literal("APPLY"),
});

const skillQuerySchema = z.object({
  pathId: z.string().trim().optional(),
  subjectId: z.string().trim().optional(),
  sectionId: z.string().trim().optional(),
});

export const commandCenterRouter = Router();

// MCP performs its own OAuth/API-key authentication and must be mounted before
// the browser/admin Command Center principal middleware.
commandCenterRouter.use("/mcp", mcpRouter);

commandCenterRouter.use(requireCommandPrincipal);
commandCenterRouter.use("/authoring", questionQuizDraftRouter);
commandCenterRouter.use("/courses", courseDraftRouter);
commandCenterRouter.use("/schools", schoolDraftRouter);
commandCenterRouter.use("/workflows", workflowRouter);
commandCenterRouter.use("/developer", developerDraftRouter);

commandCenterRouter.get(
  "/health",
  asyncHandler(async (_req, res) => {
    const principal = getCommandPrincipal(res)!;
    return res.json({
      ok: true,
      service: "almeaa-command-center",
      principalType: principal.type,
      draftFirst: true,
      liveWritesEnabled: false,
    });
  }),
);

commandCenterRouter.get(
  "/tools",
  requireCommandScope("taxonomy:read"),
  asyncHandler(async (_req, res) => {
    return res.json({
      tools: commandToolRegistry,
      policy: {
        draftFirst: true,
        directDatabaseAccess: false,
        externalPublishEnabled: false,
      },
    });
  }),
);

commandCenterRouter.get(
  "/skills",
  requireCommandScope("taxonomy:read"),
  asyncHandler(async (req, res) => {
    const query = skillQuerySchema.parse(req.query);
    const filter = {
      ...(query.pathId ? { pathId: query.pathId } : {}),
      ...(query.subjectId ? { subjectId: query.subjectId } : {}),
      ...(query.sectionId ? { sectionId: query.sectionId } : {}),
    };
    const skills = await SkillModel.find(filter)
      .select("id pathId subjectId sectionId name description order subSkills")
      .sort({ pathId: 1, subjectId: 1, sectionId: 1, order: 1 })
      .lean();
    return res.json({ skills });
  }),
);

commandCenterRouter.post(
  "/drafts",
  requireCommandScope("drafts:write"),
  asyncHandler(async (req, res) => {
    const principal = getCommandPrincipal(res)!;
    const input = draftSchema.parse(req.body);
    if (principal.type !== "admin_session") {
      await recordCommandAudit({
        principal,
        action: "draft.generic.create",
        toolId: input.toolId,
        requestId: input.requestId,
        outcome: "rejected",
        metadata: { reason: "validated_tool_required" },
      });
      return res.status(StatusCodes.FORBIDDEN).json({
        message: "External agents must use a validated Command Center tool endpoint",
      });
    }
    const source = principal.source;

    if (input.idempotencyKey) {
      const existing = await CommandCenterDraftModel.findOne({
        idempotencyKey: input.idempotencyKey,
      }).lean();
      if (existing) {
        return res.status(StatusCodes.OK).json({
          draft: existing,
          idempotentReplay: true,
        });
      }
    }

    const draft = await CommandCenterDraftModel.create({
      kind: input.kind,
      title: input.title,
      payload: input.payload,
      source,
      requiredScopes: input.requiredScopes,
      createdBy: principal.id,
      createdByType: principal.type,
      requestId: input.requestId,
      idempotencyKey: input.idempotencyKey,
      status: "pending",
    });

    await recordCommandAudit({
      principal,
      action: "draft.create",
      toolId: input.toolId,
      draftId: String(draft._id),
      requestId: input.requestId,
      outcome: "success",
      metadata: { kind: input.kind, title: input.title },
    });

    return res.status(StatusCodes.CREATED).json({ draft });
  }),
);

commandCenterRouter.get(
  "/drafts",
  requireCommandScope("drafts:read"),
  asyncHandler(async (req, res) => {
    const status = z.enum(["pending", "approved", "rejected"]).optional().parse(req.query.status);
    const kind = z.enum(COMMAND_DRAFT_KINDS).optional().parse(req.query.kind);
    const limit = z.coerce.number().int().min(1).max(100).default(50).parse(req.query.limit);
    const drafts = await CommandCenterDraftModel.find({
      ...(status ? { status } : {}),
      ...(kind ? { kind } : {}),
    })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
    return res.json({ drafts });
  }),
);

commandCenterRouter.post(
  "/drafts/:id/review",
  requireCommandScope("drafts:review"),
  asyncHandler(async (req, res) => {
    const principal = getCommandPrincipal(res)!;
    if (principal.type !== "admin_session") {
      await recordCommandAudit({
        principal,
        action: "draft.review",
        draftId: req.params.id,
        outcome: "rejected",
        metadata: { reason: "human_approval_required" },
      });
      return res.status(StatusCodes.FORBIDDEN).json({
        message: "Human admin approval is required for draft review",
      });
    }

    const input = reviewSchema.parse(req.body);
    const draft = await CommandCenterDraftModel.findByIdAndUpdate(
      req.params.id,
      {
        status: input.decision,
        reviewedBy: principal.id,
        reviewedAt: Date.now(),
        reviewNotes: input.notes,
      },
      { new: true },
    );
    if (!draft) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: "Draft not found" });
    }

    await recordCommandAudit({
      principal,
      action: "draft.review",
      draftId: String(draft._id),
      outcome: "success",
      metadata: { decision: input.decision },
    });

    return res.json({ draft });
  }),
);


commandCenterRouter.post(
  "/drafts/:id/apply",
  requireCommandScope("drafts:apply"),
  asyncHandler(async (req, res) => {
    const principal = getCommandPrincipal(res)!;
    applySchema.parse(req.body);

    if (principal.type !== "admin_session") {
      await recordCommandAudit({
        principal,
        action: "draft.apply",
        draftId: req.params.id,
        outcome: "rejected",
        metadata: { reason: "human_apply_required" },
      });
      return res.status(StatusCodes.FORBIDDEN).json({
        message: "Human admin execution is required for applying approved drafts",
      });
    }

    const current = await CommandCenterDraftModel.findById(req.params.id);
    if (!current) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: "Draft not found" });
    }
    if (current.kind === "developer_task") {
      await recordCommandAudit({
        principal,
        action: "draft.apply",
        draftId: String(current._id),
        outcome: "rejected",
        metadata: { reason: "developer_task_is_not_content_apply" },
      });
      return res.status(StatusCodes.CONFLICT).json({
        message: "Developer tasks use the reviewed code-agent handoff and cannot be applied as platform content",
      });
    }
    if (current.status !== "approved") {
      return res.status(StatusCodes.CONFLICT).json({
        message: "Draft must be approved before it can be applied",
        status: current.status,
      });
    }
    if (current.applyStatus === "applied") {
      return res.json({
        draft: current,
        idempotentReplay: true,
        result: current.applyResult || {},
      });
    }
    if (current.applyStatus === "applying") {
      return res.status(StatusCodes.CONFLICT).json({
        message: "Draft application is already in progress",
      });
    }

    const claimed = await CommandCenterDraftModel.findOneAndUpdate(
      {
        _id: current._id,
        status: "approved",
        applyStatus: { $in: ["not_applied", "failed"] },
      },
      {
        $set: {
          applyStatus: "applying",
          applyError: "",
          appliedBy: principal.id,
        },
      },
      { new: true },
    );
    if (!claimed) {
      const refreshed = await CommandCenterDraftModel.findById(current._id);
      if (refreshed?.applyStatus === "applied") {
        return res.json({
          draft: refreshed,
          idempotentReplay: true,
          result: refreshed.applyResult || {},
        });
      }
      return res.status(StatusCodes.CONFLICT).json({
        message: "Draft application could not be claimed safely",
      });
    }

    try {
      const result = await applyApprovedCommandDraft(claimed, principal.id);
      const applied = await CommandCenterDraftModel.findByIdAndUpdate(
        claimed._id,
        {
          $set: {
            applyStatus: "applied",
            appliedResourceType: result.resourceType,
            appliedResourceId: result.resourceId,
            appliedAt: Date.now(),
            appliedBy: principal.id,
            applyError: "",
            applyResult: result.summary,
          },
        },
        { new: true },
      );

      await recordCommandAudit({
        principal,
        action: "draft.apply",
        draftId: String(claimed._id),
        outcome: "success",
        metadata: {
          resourceType: result.resourceType,
          resourceId: result.resourceId,
          ...result.summary,
        },
      });

      return res.json({ draft: applied, result });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Draft application failed";
      await CommandCenterDraftModel.findByIdAndUpdate(claimed._id, {
        $set: {
          applyStatus: "failed",
          applyError: message.slice(0, 2000),
        },
      });
      await recordCommandAudit({
        principal,
        action: "draft.apply",
        draftId: String(claimed._id),
        outcome: "failed",
        metadata: { message: message.slice(0, 500) },
      });
      throw error;
    }
  }),
);
