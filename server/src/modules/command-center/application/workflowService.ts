import { z } from "zod";
import { CommandCenterWorkflowModel } from "../../../models/CommandCenterWorkflow.js";
import type { CommandPrincipal } from "./commandAuthorization.js";
import { recordCommandAudit } from "./commandAudit.js";
import {
  executeSafeWorkflowTool,
  SAFE_WORKFLOW_TOOL_IDS,
  verifyWorkflowStepOutputs,
} from "./workflowExecutor.js";

export const workflowStepPlanSchema = z.object({
  id: z.string().trim().min(1).max(80),
  toolId: z.enum(SAFE_WORKFLOW_TOOL_IDS),
  title: z.string().trim().max(240).optional().default(""),
  input: z.record(z.any()).default({}),
});

export const workflowPlanSchema = z.object({
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

const accessDenied = () => Object.assign(new Error("Workflow access denied"), { statusCode: 403 });
const notFound = () => Object.assign(new Error("Workflow not found"), { statusCode: 404 });
const conflict = (message: string) => Object.assign(new Error(message), { statusCode: 409 });

const canAccessWorkflow = (
  workflow: { createdBy?: unknown },
  principal: CommandPrincipal,
) => principal.type !== "api_key" && principal.type !== "oauth"
  ? true
  : String(workflow.createdBy || "") === principal.id;

export async function planCommandWorkflow(
  rawInput: unknown,
  principal: CommandPrincipal,
) {
  const input = workflowPlanSchema.parse(rawInput);

  if (input.idempotencyKey) {
    const existing = await CommandCenterWorkflowModel.findOne({
      idempotencyKey: input.idempotencyKey,
    });
    if (existing) {
      if (!canAccessWorkflow(existing, principal)) throw accessDenied();
      return { workflow: existing, idempotentReplay: true };
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

  return { workflow, idempotentReplay: false };
}

export async function getCommandWorkflow(
  workflowId: string,
  principal: CommandPrincipal,
) {
  const workflow = await CommandCenterWorkflowModel.findById(workflowId);
  if (!workflow) throw notFound();
  if (!canAccessWorkflow(workflow, principal)) throw accessDenied();
  return workflow;
}

export async function executeCommandWorkflow(
  workflowId: string,
  principal: CommandPrincipal,
) {
  const existing = await getCommandWorkflow(workflowId, principal);
  if (existing.status === "completed") {
    return { workflow: existing, idempotentReplay: true };
  }
  if (existing.status === "running") {
    throw conflict("Workflow is already running");
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
  if (!claimed) throw conflict("Workflow could not be claimed safely");

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
    const verified = verification.ok && failedSteps === 0 && completedSteps === steps.length;

    claimed.verification = {
      ok: verified,
      checkedAt: Date.now(),
      completedSteps,
      failedSteps,
      missingDraftIds: verification.missingDraftIds,
    } as any;
    claimed.status = verified ? "completed" : "failed";
    claimed.currentStepId = "";
    claimed.completedAt = verified ? Date.now() : null;
    if (!verified && !claimed.lastError) claimed.lastError = "Workflow verification failed";
    await claimed.save();

    await recordCommandAudit({
      principal,
      action: "workflow.execute",
      toolId: "execute_workflow",
      requestId: String(claimed.requestId || ""),
      outcome: verified ? "success" : "failed",
      metadata: {
        workflowId: String(claimed._id),
        completedSteps,
        failedSteps,
        verified,
      },
    });

    return { workflow: claimed, idempotentReplay: false };
  } catch (error) {
    if (claimed.status !== "failed") {
      const message = error instanceof Error ? error.message : "Workflow execution failed";
      claimed.status = "failed";
      claimed.lastError = message.slice(0, 2000);
      await claimed.save();
    }
    throw error;
  }
}

export async function listCommandWorkflows(
  principal: CommandPrincipal,
  options: { limit?: number; status?: "planned" | "running" | "completed" | "failed" } = {},
) {
  const limit = Math.max(1, Math.min(100, Number(options.limit || 30)));
  return CommandCenterWorkflowModel.find({
    ...((principal.type === "api_key" || principal.type === "oauth")
      ? { createdBy: principal.id }
      : {}),
    ...(options.status ? { status: options.status } : {}),
  })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
}
