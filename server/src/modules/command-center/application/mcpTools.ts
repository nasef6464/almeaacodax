import { CommandCenterDraftModel } from "../../../models/CommandCenterDraft.js";
import type { CommandPrincipal } from "./commandAuthorization.js";
import { executeSafeCommandTool } from "./workflowExecutor.js";
import {
  executeCommandWorkflow,
  getCommandWorkflow,
  planCommandWorkflow,
} from "./workflowService.js";

type ToolSecurity = { type: "oauth2"; scopes: string[] };

type McpToolDescriptor = {
  name: string;
  title: string;
  description: string;
  inputSchema: Record<string, unknown>;
  outputSchema?: Record<string, unknown>;
  annotations: {
    readOnlyHint: boolean;
    destructiveHint: boolean;
    openWorldHint: boolean;
    idempotentHint?: boolean;
  };
  securitySchemes: ToolSecurity[];
  _meta: Record<string, unknown>;
};

const oauth = (...scopes: string[]): ToolSecurity[] => [
  { type: "oauth2", scopes: ["almeaa:admin", ...scopes] },
];

const objectOutput = {
  type: "object",
  additionalProperties: true,
} as const;

const securedMeta = (schemes: ToolSecurity[], invoking: string, invoked: string) => ({
  securitySchemes: schemes,
  "openai/toolInvocation/invoking": invoking,
  "openai/toolInvocation/invoked": invoked,
});

const stringProperty = (description: string) => ({
  type: "string",
  description,
});

export const MCP_TOOL_SCOPES: Record<string, string[]> = {
  get_profile: [],
  get_skill_tree: ["taxonomy:read"],
  get_course_inventory: ["courses:read"],
  list_drafts: ["drafts:read"],
  create_question_drafts: ["drafts:write"],
  create_quiz_draft: ["drafts:write"],
  create_course_draft: ["drafts:write"],
  create_school_setup_draft: ["drafts:write"],
  plan_workflow: ["workflows:plan"],
  get_workflow: ["workflows:read"],
  execute_workflow: ["workflows:execute"],
};

export const mcpToolDescriptors: McpToolDescriptor[] = [
  {
    name: "get_profile",
    title: "Get ALMEAA profile",
    description: "Return the authenticated ALMEAA MCP profile represented by the current OAuth credentials.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    outputSchema: {
      type: "object",
      properties: {
        id: { type: "string" },
        name: { type: "string" },
        email: { type: "string" },
      },
      required: ["id"],
      additionalProperties: false,
    },
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: false,
      idempotentHint: true,
    },
    securitySchemes: oauth(),
    _meta: {
      ...securedMeta(oauth(), "Reading ALMEAA profile…", "Profile ready"),
      "openai/profile": true,
    },
  },
  {
    name: "get_skill_tree",
    title: "Read skill tree",
    description: "Read the canonical ALMEAA skill tree. Filter by path, subject, or section when possible.",
    inputSchema: {
      type: "object",
      properties: {
        pathId: stringProperty("Optional path ID"),
        subjectId: stringProperty("Optional subject ID"),
        sectionId: stringProperty("Optional section ID"),
      },
      additionalProperties: false,
    },
    outputSchema: objectOutput,
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: false,
      idempotentHint: true,
    },
    securitySchemes: oauth("taxonomy:read"),
    _meta: securedMeta(oauth("taxonomy:read"), "Reading skills…", "Skills ready"),
  },
  {
    name: "get_course_inventory",
    title: "Read reusable course inventory",
    description: "Read existing ALMEAA lessons, videos, quizzes, files, and skills for reuse-first course composition.",
    inputSchema: {
      type: "object",
      properties: {
        pathId: stringProperty("Path ID"),
        subjectId: stringProperty("Subject ID"),
        sectionId: stringProperty("Optional section ID"),
        includeHidden: { type: "boolean", description: "Include hidden platform content" },
      },
      required: ["pathId", "subjectId"],
      additionalProperties: false,
    },
    outputSchema: objectOutput,
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: false,
      idempotentHint: true,
    },
    securitySchemes: oauth("courses:read"),
    _meta: securedMeta(oauth("courses:read"), "Reading course inventory…", "Inventory ready"),
  },
  {
    name: "list_drafts",
    title: "List Command Center drafts",
    description: "List recent reviewable drafts. This does not apply or publish anything.",
    inputSchema: {
      type: "object",
      properties: {
        status: {
          type: "string",
          enum: ["pending", "approved", "rejected"],
        },
        kind: {
          type: "string",
          enum: ["question_batch", "quiz", "course", "school_setup", "content", "workflow"],
        },
        limit: { type: "integer", minimum: 1, maximum: 100 },
      },
      additionalProperties: false,
    },
    outputSchema: objectOutput,
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: false,
      idempotentHint: true,
    },
    securitySchemes: oauth("drafts:read"),
    _meta: securedMeta(oauth("drafts:read"), "Reading drafts…", "Drafts ready"),
  },
  {
    name: "create_question_drafts",
    title: "Create question drafts",
    description: "Validate a batch of questions against ALMEAA skills and exact duplicates, then create a reviewable draft. Never writes live questions.",
    inputSchema: {
      type: "object",
      properties: {
        title: stringProperty("Draft batch title"),
        idempotencyKey: stringProperty("Stable unique key for safe retries"),
        requestId: stringProperty("Optional request trace ID"),
        questions: {
          type: "array",
          minItems: 1,
          maxItems: 500,
          items: {
            type: "object",
            properties: {
              text: stringProperty("Question text"),
              options: { type: "array", minItems: 2, maxItems: 8, items: { type: "string" } },
              correctOptionIndex: { type: "integer", minimum: 0 },
              explanation: { type: "string" },
              hint: { type: "string" },
              solvingStrategy: { type: "string" },
              pathId: { type: "string" },
              subjectId: { type: "string" },
              sectionId: { type: "string" },
              skillId: { type: "string" },
              subSkillIds: { type: "array", minItems: 1, maxItems: 20, items: { type: "string" } },
              difficulty: { type: "string", enum: ["Easy", "Medium", "Hard"] },
              type: { type: "string", enum: ["mcq", "true_false", "essay"] },
              imageUrl: { type: "string" },
              videoUrl: { type: "string" },
              sourceMeta: { type: "object", additionalProperties: true },
            },
            required: [
              "text",
              "options",
              "correctOptionIndex",
              "pathId",
              "subjectId",
              "sectionId",
              "skillId",
              "subSkillIds"
            ],
            additionalProperties: false,
          },
        },
      },
      required: ["title", "idempotencyKey", "questions"],
      additionalProperties: false,
    },
    outputSchema: objectOutput,
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      openWorldHint: false,
      idempotentHint: true,
    },
    securitySchemes: oauth("drafts:write"),
    _meta: securedMeta(oauth("drafts:write"), "Validating question drafts…", "Question drafts ready"),
  },
  {
    name: "create_quiz_draft",
    title: "Create quiz draft",
    description: "Build an unpublished reviewable quiz draft from existing question IDs.",
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string" },
        description: { type: "string" },
        pathId: { type: "string" },
        subjectId: { type: "string" },
        questionIds: { type: "array", minItems: 1, maxItems: 500, items: { type: "string" } },
        skillIds: { type: "array", maxItems: 100, items: { type: "string" } },
        settings: { type: "object", additionalProperties: true },
        idempotencyKey: stringProperty("Stable unique key for safe retries"),
        requestId: { type: "string" },
      },
      required: ["title", "pathId", "subjectId", "questionIds", "idempotencyKey"],
      additionalProperties: false,
    },
    outputSchema: objectOutput,
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      openWorldHint: false,
      idempotentHint: true,
    },
    securitySchemes: oauth("drafts:write"),
    _meta: securedMeta(oauth("drafts:write"), "Building quiz draft…", "Quiz draft ready"),
  },
  {
    name: "create_course_draft",
    title: "Create reuse-first course draft",
    description: "Build a course draft from existing ALMEAA lessons/videos/quizzes/files. Content is reused first and generation is only for missing content.",
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string" },
        description: { type: "string" },
        instructor: { type: "string" },
        pathId: { type: "string" },
        subjectId: { type: "string" },
        sectionId: { type: "string" },
        modules: {
          type: "array",
          minItems: 1,
          maxItems: 100,
          items: {
            type: "object",
            properties: {
              id: { type: "string" },
              title: { type: "string" },
              order: { type: "integer", minimum: 0 },
              lessons: {
                type: "array",
                minItems: 1,
                maxItems: 100,
                items: {
                  type: "object",
                  properties: {
                    lessonId: { type: "string" },
                    trainingQuizIds: { type: "array", maxItems: 10, items: { type: "string" } },
                    order: { type: "integer", minimum: 0 },
                  },
                  required: ["lessonId", "order"],
                  additionalProperties: false,
                },
              },
              assessmentQuizIds: { type: "array", maxItems: 20, items: { type: "string" } },
            },
            required: ["id", "title", "order", "lessons"],
            additionalProperties: false,
          },
        },
        finalQuizIds: { type: "array", maxItems: 20, items: { type: "string" } },
        libraryItemIds: { type: "array", maxItems: 100, items: { type: "string" } },
        skillIds: { type: "array", maxItems: 200, items: { type: "string" } },
        idempotencyKey: stringProperty("Stable unique key for safe retries"),
        requestId: { type: "string" },
      },
      required: ["title", "pathId", "subjectId", "modules", "idempotencyKey"],
      additionalProperties: false,
    },
    outputSchema: objectOutput,
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      openWorldHint: false,
      idempotentHint: true,
    },
    securitySchemes: oauth("drafts:write"),
    _meta: securedMeta(oauth("drafts:write"), "Building course draft…", "Course draft ready"),
  },
  {
    name: "create_school_setup_draft",
    title: "Create school setup draft",
    description: "Validate and prepare school, classes, students, teachers, and supervisors using existing ALMEAA accounts. No live school changes.",
    inputSchema: {
      type: "object",
      properties: {
        schoolId: { type: "string" },
        schoolName: { type: "string" },
        classes: {
          type: "array",
          minItems: 1,
          maxItems: 100,
          items: {
            type: "object",
            properties: { key: { type: "string" }, name: { type: "string" } },
            required: ["key", "name"],
            additionalProperties: false,
          },
        },
        students: {
          type: "array",
          maxItems: 3000,
          items: {
            type: "object",
            properties: {
              userId: { type: "string" },
              email: { type: "string" },
              name: { type: "string" },
              classKey: { type: "string" },
            },
            required: ["classKey"],
            additionalProperties: false,
          },
        },
        teachers: {
          type: "array",
          maxItems: 500,
          items: {
            type: "object",
            properties: {
              userId: { type: "string" },
              email: { type: "string" },
              name: { type: "string" },
              classKey: { type: "string" },
              subjectId: { type: "string" },
            },
            required: ["classKey"],
            additionalProperties: false,
          },
        },
        supervisors: {
          type: "array",
          maxItems: 100,
          items: {
            type: "object",
            properties: {
              userId: { type: "string" },
              email: { type: "string" },
              name: { type: "string" },
            },
            additionalProperties: false,
          },
        },
        idempotencyKey: stringProperty("Stable unique key for safe retries"),
        requestId: { type: "string" },
      },
      required: ["schoolName", "classes", "idempotencyKey"],
      additionalProperties: false,
    },
    outputSchema: objectOutput,
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      openWorldHint: false,
      idempotentHint: true,
    },
    securitySchemes: oauth("drafts:write"),
    _meta: securedMeta(oauth("drafts:write"), "Validating school setup…", "School draft ready"),
  },
  {
    name: "plan_workflow",
    title: "Plan ALMEAA workflow",
    description: "Create a resumable Plan → Execute → Verify workflow using only safe read and draft-write tools.",
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string" },
        idempotencyKey: stringProperty("Stable unique key for safe retries"),
        requestId: { type: "string" },
        steps: {
          type: "array",
          minItems: 1,
          maxItems: 20,
          items: {
            type: "object",
            properties: {
              id: { type: "string" },
              toolId: {
                type: "string",
                enum: [
                  "get_skill_tree",
                  "get_course_inventory",
                  "create_question_drafts",
                  "create_quiz_draft",
                  "create_course_draft",
                  "create_school_setup_draft"
                ],
              },
              title: { type: "string" },
              input: { type: "object", additionalProperties: true },
            },
            required: ["id", "toolId", "input"],
            additionalProperties: false,
          },
        },
      },
      required: ["title", "steps", "idempotencyKey"],
      additionalProperties: false,
    },
    outputSchema: objectOutput,
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      openWorldHint: false,
      idempotentHint: true,
    },
    securitySchemes: oauth("workflows:plan"),
    _meta: securedMeta(oauth("workflows:plan"), "Planning workflow…", "Workflow planned"),
  },
  {
    name: "get_workflow",
    title: "Get ALMEAA workflow",
    description: "Read workflow status, steps, outputs, failures, and verification results.",
    inputSchema: {
      type: "object",
      properties: { workflowId: { type: "string" } },
      required: ["workflowId"],
      additionalProperties: false,
    },
    outputSchema: objectOutput,
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: false,
      idempotentHint: true,
    },
    securitySchemes: oauth("workflows:read"),
    _meta: securedMeta(oauth("workflows:read"), "Reading workflow…", "Workflow ready"),
  },
  {
    name: "execute_workflow",
    title: "Execute ALMEAA workflow",
    description: "Execute or resume a previously planned safe workflow. It can read platform data and create drafts, but cannot approve, apply, publish, or delete live content.",
    inputSchema: {
      type: "object",
      properties: { workflowId: { type: "string" } },
      required: ["workflowId"],
      additionalProperties: false,
    },
    outputSchema: objectOutput,
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      openWorldHint: false,
      idempotentHint: true,
    },
    securitySchemes: oauth("workflows:execute"),
    _meta: securedMeta(oauth("workflows:execute"), "Executing workflow…", "Workflow execution finished"),
  },
];

const writeToolNames = new Set([
  "create_question_drafts",
  "create_quiz_draft",
  "create_course_draft",
  "create_school_setup_draft",
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

  if (MCP_TOOL_SCOPES[input.name] && (input.name === "get_skill_tree" || input.name === "get_course_inventory" || writeToolNames.has(input.name))) {
    const idempotencyKey = writeToolNames.has(input.name)
      ? String(input.args.idempotencyKey || "").trim()
      : `mcp-read:${input.name}`;
    if (writeToolNames.has(input.name) && idempotencyKey.length < 8) {
      throw Object.assign(new Error("idempotencyKey of at least 8 characters is required"), {
        statusCode: 422,
      });
    }

    return executeSafeCommandTool({
      toolId: input.name as any,
      toolInput: input.args,
      principal: input.principal,
      idempotencyKey: writeToolNames.has(input.name)
        ? `mcp:${input.principal.id}:${idempotencyKey}`
        : idempotencyKey,
    });
  }

  throw Object.assign(new Error(`Unknown MCP tool: ${input.name}`), { statusCode: 404 });
}
