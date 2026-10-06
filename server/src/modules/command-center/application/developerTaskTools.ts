import { z } from "zod";
import { CommandCenterDraftModel } from "../../../models/CommandCenterDraft.js";
import type { CommandPrincipal } from "./commandAuthorization.js";
import { recordCommandAudit } from "./commandAudit.js";

export const ALMEAA_CODE_REPOSITORY = "nasef6464/almeaacodax" as const;

export const developerTaskDraftSchema = z.object({
  repository: z.literal(ALMEAA_CODE_REPOSITORY).default(ALMEAA_CODE_REPOSITORY),
  title: z.string().trim().min(1).max(240),
  problem: z.string().trim().min(1).max(8000),
  baseRef: z.string().trim().min(1).max(160).default("main"),
  sourceIssue: z.number().int().positive().optional(),
  targetPaths: z.array(z.string().trim().min(1).max(300)).max(100).optional().default([]),
  requestedActions: z.array(
    z.enum(["investigate", "patch", "test", "pull_request"]),
  ).min(1).max(4),
  acceptanceCriteria: z.array(z.string().trim().min(1).max(1000)).min(1).max(50),
  requestId: z.string().trim().max(160).optional().default(""),
  idempotencyKey: z.string().trim().min(8).max(240),
}).superRefine((value, ctx) => {
  for (const [index, path] of value.targetPaths.entries()) {
    if (
      path.startsWith("/") ||
      path.includes("\\") ||
      path.split("/").includes("..") ||
      path === ".git" ||
      path.startsWith(".git/")
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["targetPaths", index],
        message: "targetPaths must be safe repository-relative paths",
      });
    }
  }
});

export type DeveloperTaskDraftInput = z.infer<typeof developerTaskDraftSchema>;

export const validateDeveloperTaskDraft = (rawInput: unknown) => {
  const input = developerTaskDraftSchema.parse(rawInput);
  return {
    ok: true as const,
    repository: input.repository,
    policy: {
      domain: "source_code" as const,
      contentMutation: false,
      mergeAllowed: false,
      deployAllowed: false,
      directDatabaseAccess: false,
      requiresReviewBeforeExecution: true,
      allowedActions: ["investigate", "patch", "test", "pull_request"] as const,
    },
  };
};

export async function createDeveloperTaskDraft(
  rawInput: unknown,
  principal: CommandPrincipal,
) {
  const input = developerTaskDraftSchema.parse(rawInput);
  const validation = validateDeveloperTaskDraft(input);

  const existing = await CommandCenterDraftModel.findOne({
    idempotencyKey: input.idempotencyKey,
  }).lean();
  if (existing) {
    return { draft: existing, validation, idempotentReplay: true };
  }

  const draft = await CommandCenterDraftModel.create({
    kind: "developer_task",
    title: input.title,
    payload: {
      repository: input.repository,
      domain: "source_code",
      problem: input.problem,
      baseRef: input.baseRef,
      sourceIssue: input.sourceIssue,
      targetPaths: input.targetPaths,
      requestedActions: input.requestedActions,
      acceptanceCriteria: input.acceptanceCriteria,
      executionPolicy: validation.policy,
    },
    source: principal.source,
    requiredScopes: ["developer:write"],
    createdBy: principal.id,
    createdByType: principal.type,
    requestId: input.requestId,
    idempotencyKey: input.idempotencyKey,
    status: "pending",
  });

  await recordCommandAudit({
    principal,
    action: "developer_task.draft.create",
    toolId: "create_developer_task_draft",
    draftId: String(draft._id),
    requestId: input.requestId,
    outcome: "success",
    metadata: {
      repository: input.repository,
      sourceIssue: input.sourceIssue || null,
      requestedActions: input.requestedActions,
      targetPathCount: input.targetPaths.length,
      contentMutation: false,
      mergeAllowed: false,
      deployAllowed: false,
    },
  });

  return { draft, validation, idempotentReplay: false };
}
