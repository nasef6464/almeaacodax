import { Router } from "express";
import { StatusCodes } from "http-status-codes";
import { z } from "zod";
import { CommandCenterWorkflowModel } from "../../../models/CommandCenterWorkflow.js";
import { asyncHandler } from "../../../utils/asyncHandler.js";
import {
  getCommandPrincipal,
  requireCommandScope,
} from "../application/commandAuthorization.js";
import { recordCommandAudit } from "../application/commandAudit.js";
import {
  executeSafeWorkflowTool,
  SAFE_WORKFLOW_TOOL_IDS,
  verifyWorkflowStepOutputs,
} from "../application/workflowExecutor.js";

const workflowStepPlanSchema = z.object({
  id: z.string().trim().min(1).max(80),
  toolId: z.enum(SAFE_WORKFLOW_TOOL_IDS),
  title: z.string().trim().max(240).optional().default(""),
  input: z.record(z.any()).default({}),
});

const workflowPlanSchema = z.object({
  title: z.string().trim().min(1).max(240),
  steps: z.array(workflowStepPlanSchema).min(1).max(20),
  requestId: z.string().trim().max(160).optional().default(""),
  idempotencyKey: z.string().trim().min(8).max(240).optional(),
}).superRefine((value, ctx) => {
  const seen = new Set<string>();
  value.steps.forEach((step, index) => {
    if (seen.has(step.id)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["steps", index, "id"],
        message: "Workflow step IDs must be unique",
      });
    }
    seen.add(step.id);
  });
});

export const workflowRouter = Router();

workflowRouter.post(
  "/plan",
  requireCommandScope("workflows:plan"),
  asyncHandler(async (req, res) => {
    const principal = getCommandPrincipal(res)!;
    const input = workflowPlanSchema.parse(req.body);

    if (input.idempotencyKey) {
      const existing = await CommandCenterWorkflowModel.findOne({
        idempotencyKey: input.idempotencyKey,
      }).lean();
      if (existing) {
        return res.json({ workflow: existing, idempotentReplay: true });
      }
    }

    const workflow = await CommandCenterWorkflowModel.create({
      title: input.title,
      source: principal.source,
      createdBy: principal.id,
      createdByType: principal.type,
      status: "planned",
      steps: input.steps.map((step) => ({
        ...step,
        status: "planned",
        output: {},
        error: "",
      })),
      requestId: input.requestId,
      idempotencyKey: input.idempotencyKey,
      verification: {
        ok: false,
        completedSteps: 0,
        failedSteps: 0,
        missingDraftIds: [],
      },
    });

    await recordCommandAudit({
      principal,
      action: "workflow.plan",
      toolId: "plan_workflow",
      requestId: input.requestId,
      outcome: "success",
      metadata: {
        workflowId: String(workflow._id),
        steps: workflow.steps.length,
      },
    });

    return res.status(StatusCodes.CREATED).json({ workflow });
  }),
);

workflowRouter.get(
  "/",
  requireCommandScope("workflows:read"),
  asyncHandler(async (req, res) => {
    const principal = getCommandPrincipal(res)!;
    const limit = z.coerce.number().int().min(1).max(100).default(30).parse(req.query.limit);
    const status = z.enum(["planned", "running", "completed", "failed"]).optional().parse(req.query.status);
    const workflows = await CommandCenterWorkflowModel.find({
      ...(principal.type === "api_key" ? { createdBy: principal.id } : {}),
      ...(status ? { status } : {}),
    })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
    return res.json({ workflows });
  }),
);

workflowRouter.get(
  "/:id",
  requireCommandScope("workflows:read"),
  asyncHandler(async (req, res) => {
    const principal = getCommandPrincipal(res)!;
    const workflow = await CommandCenterWorkflowModel.findById(req.params.id).lean();
    if (!workflow) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: "Workflow not found" });
    }
    if (principal.type === "api_key" && String(workflow.createdBy) !== principal.id) {
      return res.status(StatusCodes.FORBIDDEN).json({ message: "Workflow access denied" });
    }
    return res.json({ workflow });
  }),
);

workflowRouter.post(
  "/:id/execute",
  requireCommandScope("workflows:execute"),
  asyncHandler(async (req, res) => {
    const principal = getCommandPrincipal(res)!;
    const existing = await CommandCenterWorkflowModel.findById(req.params.id);
    if (!existing) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: "Workflow not found" });
    }
    if (principal.type === "api_key" && String(existing.createdBy) !== principal.id) {
      return res.status(StatusCodes.FORBIDDEN).json({ message: "Workflow execution denied" });
    }
    if (existing.status === "completed") {
      return res.json({ workflow: existing, idempotentReplay: true });
    }
    if (existing.status === "running") {
      return res.status(StatusCodes.CONFLICT).json({
        message: "Workflow is already running",
      });
    }

    const claimed = await CommandCenterWorkflowModel.findOneAndUpdate(
      {
        _id: existing._id,
        status: { $in: ["planned", "failed"] },
      },
      {
        $set: {
          status: "running",
          startedAt: existing.startedAt || Date.now(),
          completedAt: null,
          lastError: "",
        },
      },
      { new: true },
    );
    if (!claimed) {
      return res.status(StatusCodes.CONFLICT).json({
        message: "Workflow could not be claimed safely",
      });
    }

    const steps = claimed.steps as any[];
    try {
      for (const step of steps) {
        if (step.status === "completed" || step.status === "skipped") continue;

        step.status = "running";
        step.startedAt = Date.now();
        step.error = "";
        claimed.currentStepId = String(step.id);
        await claimed.save();

        try {
          const output = await executeSafeWorkflowTool({
            workflowId: String(claimed._id),
            stepId: String(step.id),
            toolId: step.toolId,
            toolInput: step.input || {},
            principal,
          });
          step.output = output;
          step.status = "completed";
          step.completedAt = Date.now();
          await claimed.save();
        } catch (stepError) {
          const message = stepError instanceof Error ? stepError.message : "Workflow step failed";
          step.status = "failed";
          step.error = message.slice(0, 2000);
          step.completedAt = Date.now();
          claimed.status = "failed";
          claimed.lastError = message.slice(0, 2000);
          claimed.currentStepId = String(step.id);
          await claimed.save();

          await recordCommandAudit({
            principal,
            action: "workflow.execute",
            toolId: String(step.toolId),
            requestId: String(claimed.requestId || ""),
            outcome: "failed",
            metadata: {
              workflowId: String(claimed._id),
              stepId: String(step.id),
              message: message.slice(0, 500),
            },
          });

          throw stepError;
        }
      }

      const completedOutputs = steps
        .filter((step) => step.status === "completed")
        .map((step) => (step.output || {}) as Record<string, unknown>);
      const verification = await verifyWorkflowStepOutputs(completedOutputs);
      const completedSteps = steps.filter((step) => step.status === "completed").length;
      const failedSteps = steps.filter((step) => step.status === "failed").length;

      claimed.verification = {
        ok: verification.ok && failedSteps === 0 && completedSteps === steps.length,
        checkedAt: Date.now(),
        completedSteps,
        failedSteps,
        missingDraftIds: verification.missingDraftIds,
      } as any;
      claimed.status = claimed.verification.ok ? "completed" : "failed";
      claimed.currentStepId = "";
      claimed.completedAt = claimed.status === "completed" ? Date.now() : null;
      if (!claimed.verification.ok && !claimed.lastError) {
        claimed.lastError = "Workflow verification failed";
      }
      await claimed.save();

      await recordCommandAudit({
        principal,
        action: "workflow.execute",
        toolId: "execute_workflow",
        requestId: String(claimed.requestId || ""),
        outcome: claimed.status === "completed" ? "success" : "failed",
        metadata: {
          workflowId: String(claimed._id),
          completedSteps,
          failedSteps,
          verified: Boolean(claimed.verification.ok),
        },
      });

      return res.json({ workflow: claimed });
    } catch (error) {
      if (claimed.status !== "failed") {
        const message = error instanceof Error ? error.message : "Workflow execution failed";
        claimed.status = "failed";
        claimed.lastError = message.slice(0, 2000);
        await claimed.save();
      }
      throw error;
    }
  }),
);
