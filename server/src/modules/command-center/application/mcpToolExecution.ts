import { CommandCenterDraftModel } from "../../../models/CommandCenterDraft.js";
import type { CommandPrincipal } from "./commandAuthorization.js";
import { executeSafeCommandTool } from "./workflowExecutor.js";
import {
  executeCommandWorkflow,
  getCommandWorkflow,
  planCommandWorkflow,
} from "./workflowService.js";
import { MCP_TOOL_SCOPES } from "./mcpToolCatalog.js";
import { createDeveloperTaskDraft, getApprovedDeveloperTaskHandoff } from "./developerTaskTools.js";

const writeToolNames = new Set([
  "create_question_drafts",
  "create_quiz_draft",
  "plan_quiz_question_update",
  "create_course_draft",
  "create_school_setup_draft",
  "create_developer_task_draft",
]);

export async function executeMcpTool(input: {
  name: string;
  args: Record<string, unknown>;
  principal: CommandPrincipal;
  profile: { id: string; name?: string; email?: string };
}) {
  if (input.name === "get_profile") return input.profile;

  if (input.name === "list_drafts") {
    const limit = Math.max(1, Math.min(100, Number(input.args.limit || 30)));
    const drafts = await CommandCenterDraftModel.find({
      ...(input.args.status ? { status: String(input.args.status) } : {}),
      ...(input.args.kind ? { kind: String(input.args.kind) } : {}),
    })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
    return { drafts };
  }

  if (input.name === "create_developer_task_draft") {
    const rawKey = String(input.args.idempotencyKey || "").trim();
    if (rawKey.length < 8) {
      throw Object.assign(new Error("idempotencyKey of at least 8 characters is required"), {
        statusCode: 422,
      });
    }
    return createDeveloperTaskDraft(
      {
        ...input.args,
        idempotencyKey: `mcp:${input.principal.id}:${rawKey}`,
      },
      input.principal,
    );
  }

  if (input.name === "get_developer_task_handoff") {
    const draftId = String(input.args.draftId || "").trim();
    if (!draftId) {
      throw Object.assign(new Error("draftId is required"), { statusCode: 422 });
    }
    return getApprovedDeveloperTaskHandoff(draftId, input.principal);
  }

  if (input.name === "plan_workflow") {
    const result = await planCommandWorkflow(input.args, input.principal);
    return {
      workflowId: String(result.workflow._id),
      status: result.workflow.status,
      steps: result.workflow.steps,
      idempotentReplay: result.idempotentReplay,
    };
  }

  if (input.name === "get_workflow") {
    const workflowId = String(input.args.workflowId || "").trim();
    if (!workflowId) throw Object.assign(new Error("workflowId is required"), { statusCode: 422 });
    const workflow = await getCommandWorkflow(workflowId, input.principal);
    return { workflow };
  }

  if (input.name === "execute_workflow") {
    const workflowId = String(input.args.workflowId || "").trim();
    if (!workflowId) throw Object.assign(new Error("workflowId is required"), { statusCode: 422 });
    const result = await executeCommandWorkflow(workflowId, input.principal);
    return {
      workflow: result.workflow,
      idempotentReplay: result.idempotentReplay,
    };
  }

  if (
    MCP_TOOL_SCOPES[input.name] &&
    (input.name === "get_skill_tree" ||
      input.name === "get_course_inventory" ||
      input.name === "audit_course" ||
      (writeToolNames.has(input.name) && input.name !== "create_developer_task_draft"))
  ) {
    const rawKey = writeToolNames.has(input.name)
      ? String(input.args.idempotencyKey || "").trim()
      : `mcp-read:${input.name}`;
    if (writeToolNames.has(input.name) && rawKey.length < 8) {
      throw Object.assign(new Error("idempotencyKey of at least 8 characters is required"), {
        statusCode: 422,
      });
    }

    return executeSafeCommandTool({
      toolId: input.name as any,
      toolInput: input.args,
      principal: input.principal,
      idempotencyKey: writeToolNames.has(input.name)
        ? `mcp:${input.principal.id}:${rawKey}`
        : rawKey,
    });
  }

  throw Object.assign(new Error(`Unknown MCP tool: ${input.name}`), { statusCode: 404 });
}
