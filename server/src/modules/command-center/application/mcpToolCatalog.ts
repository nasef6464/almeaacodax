type ToolSecurity = { type: "oauth2"; scopes: string[] };

export type McpToolDescriptor = {
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

const meta = (schemes: ToolSecurity[], invoking: string, invoked: string, extra: Record<string, unknown> = {}) => ({
  securitySchemes: schemes,
  "openai/toolInvocation/invoking": invoking,
  "openai/toolInvocation/invoked": invoked,
  ...extra,
});

const completeObject = { type: "object", additionalProperties: true } as const;
const readAnnotations = {
  readOnlyHint: true,
  destructiveHint: false,
  openWorldHint: false,
  idempotentHint: true,
} as const;
const draftAnnotations = {
  readOnlyHint: false,
  destructiveHint: false,
  openWorldHint: false,
  idempotentHint: true,
} as const;

export const MCP_TOOL_SCOPES: Record<string, string[]> = {
  get_profile: [],
  get_skill_tree: ["taxonomy:read"],
  get_course_inventory: ["courses:read"],
  list_drafts: ["drafts:read"],
  create_question_drafts: ["drafts:write"],
  create_quiz_draft: ["drafts:write"],
  plan_quiz_question_update: ["drafts:write"],
  create_course_draft: ["drafts:write"],
  create_school_setup_draft: ["drafts:write"],
  prepare_smart_classroom_session: ["drafts:write"],
  plan_workflow: ["workflows:plan"],
  get_workflow: ["workflows:read"],
  execute_workflow: ["workflows:execute"],
};

const draftIdentityProperties = {
  idempotencyKey: {
    type: "string",
    minLength: 8,
    description: "Stable unique key for safe retries",
  },
  requestId: { type: "string", description: "Optional trace ID" },
};

export const mcpToolDescriptors: McpToolDescriptor[] = [
  {
    name: "get_profile",
    title: "Get ALMEAA profile",
    description: "Return the authenticated ALMEAA MCP profile.",
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
    annotations: readAnnotations,
    securitySchemes: oauth(),
    _meta: meta(oauth(), "Reading ALMEAA profile…", "Profile ready", { "openai/profile": true }),
  },
  {
    name: "get_skill_tree",
    title: "Read skill tree",
    description: "Read canonical ALMEAA skills, optionally scoped by path, subject, or section.",
    inputSchema: {
      type: "object",
      properties: {
        pathId: { type: "string" },
        subjectId: { type: "string" },
        sectionId: { type: "string" },
      },
      additionalProperties: false,
    },
    outputSchema: completeObject,
    annotations: readAnnotations,
    securitySchemes: oauth("taxonomy:read"),
    _meta: meta(oauth("taxonomy:read"), "Reading skills…", "Skills ready"),
  },
  {
    name: "get_course_inventory",
    title: "Read reusable course inventory",
    description: "Read existing lessons, videos, quizzes, files, and skills for reuse-first course composition.",
    inputSchema: {
      type: "object",
      properties: {
        pathId: { type: "string" },
        subjectId: { type: "string" },
        sectionId: { type: "string" },
        includeHidden: { type: "boolean" },
      },
      required: ["pathId", "subjectId"],
      additionalProperties: false,
    },
    outputSchema: completeObject,
    annotations: readAnnotations,
    securitySchemes: oauth("courses:read"),
    _meta: meta(oauth("courses:read"), "Reading course inventory…", "Inventory ready"),
  },
  {
    name: "list_drafts",
    title: "List Command Center drafts",
    description: "List reviewable drafts without applying or publishing anything.",
    inputSchema: {
      type: "object",
      properties: {
        status: { type: "string", enum: ["pending", "approved", "rejected"] },
        kind: { type: "string", enum: ["question_batch", "quiz", "course", "school_setup", "content", "workflow"] },
        limit: { type: "integer", minimum: 1, maximum: 100 },
      },
      additionalProperties: false,
    },
    outputSchema: completeObject,
    annotations: readAnnotations,
    securitySchemes: oauth("drafts:read"),
    _meta: meta(oauth("drafts:read"), "Reading drafts…", "Drafts ready"),
  },
  {
    name: "create_question_drafts",
    title: "Create question drafts",
    description: "Validate questions against ALMEAA taxonomy and duplicates, then create a reviewable draft only.",
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string" },
        questions: { type: "array", minItems: 1, maxItems: 500, items: { type: "object", additionalProperties: true } },
        ...draftIdentityProperties,
      },
      required: ["title", "questions", "idempotencyKey"],
      additionalProperties: false,
    },
    outputSchema: completeObject,
    annotations: draftAnnotations,
    securitySchemes: oauth("drafts:write"),
    _meta: meta(oauth("drafts:write"), "Validating question drafts…", "Question drafts ready"),
  },
  {
    name: "create_quiz_draft",
    title: "Create quiz draft",
    description: "Create an unpublished quiz draft from existing ALMEAA question IDs.",
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
        ...draftIdentityProperties,
      },
      required: ["title", "pathId", "subjectId", "questionIds", "idempotencyKey"],
      additionalProperties: false,
    },
    outputSchema: completeObject,
    annotations: draftAnnotations,
    securitySchemes: oauth("drafts:write"),
    _meta: meta(oauth("drafts:write"), "Building quiz draft…", "Quiz draft ready"),
  },
  {
    name: "plan_quiz_question_update",
    title: "Plan existing quiz question update",
    description: "Compare approved candidate questions with an existing quiz, skip exact/high-confidence near duplicates, and create a reviewable update draft without mutating the live quiz.",
    inputSchema: {
      type: "object",
      properties: {
        targetQuizId: { type: "string" },
        candidateQuestionIds: { type: "array", minItems: 1, maxItems: 1000, items: { type: "string" } },
        mode: { type: "string", enum: ["add", "replace"] },
        title: { type: "string" },
        ...draftIdentityProperties,
      },
      required: ["targetQuizId", "candidateQuestionIds", "idempotencyKey"],
      additionalProperties: false,
    },
    outputSchema: completeObject,
    annotations: draftAnnotations,
    securitySchemes: oauth("drafts:write"),
    _meta: meta(oauth("drafts:write"), "Comparing quiz questions…", "Quiz update draft ready"),
  },
  {
    name: "create_course_draft",
    title: "Create reuse-first course draft",
    description: "Create a course draft from existing ALMEAA content. Reuse first; generate only when genuinely missing.",
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string" },
        description: { type: "string" },
        instructor: { type: "string" },
        pathId: { type: "string" },
        subjectId: { type: "string" },
        sectionId: { type: "string" },
        modules: { type: "array", minItems: 1, maxItems: 100, items: { type: "object", additionalProperties: true } },
        finalQuizIds: { type: "array", maxItems: 20, items: { type: "string" } },
        libraryItemIds: { type: "array", maxItems: 100, items: { type: "string" } },
        skillIds: { type: "array", maxItems: 200, items: { type: "string" } },
        ...draftIdentityProperties,
      },
      required: ["title", "pathId", "subjectId", "modules", "idempotencyKey"],
      additionalProperties: false,
    },
    outputSchema: completeObject,
    annotations: draftAnnotations,
    securitySchemes: oauth("drafts:write"),
    _meta: meta(oauth("drafts:write"), "Building course draft…", "Course draft ready"),
  },
  {
    name: "create_school_setup_draft",
    title: "Create school setup draft",
    description: "Prepare school/classes/user assignments using existing ALMEAA accounts. No live school changes.",
    inputSchema: {
      type: "object",
      properties: {
        schoolId: { type: "string" },
        schoolName: { type: "string" },
        classes: { type: "array", minItems: 1, maxItems: 100, items: { type: "object", additionalProperties: true } },
        students: { type: "array", maxItems: 3000, items: { type: "object", additionalProperties: true } },
        teachers: { type: "array", maxItems: 500, items: { type: "object", additionalProperties: true } },
        supervisors: { type: "array", maxItems: 100, items: { type: "object", additionalProperties: true } },
        ...draftIdentityProperties,
      },
      required: ["schoolName", "classes", "idempotencyKey"],
      additionalProperties: false,
    },
    outputSchema: completeObject,
    annotations: draftAnnotations,
    securitySchemes: oauth("drafts:write"),
    _meta: meta(oauth("drafts:write"), "Validating school setup…", "School draft ready"),
  },
  {
    name: "prepare_smart_classroom_session",
    title: "Prepare Smart Classroom session",
    description: "Prepare a reviewable Smart Classroom session plan for an assigned teacher using approved visible questions. This tool cannot start a live classroom.",
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string" },
        schoolId: { type: "string" },
        classId: { type: "string" },
        teacherId: { type: "string" },
        questionIds: { type: "array", maxItems: 30, items: { type: "string" } },
        day: { type: "string" },
        period: { type: ["integer", "null"], minimum: 1, maximum: 12 },
        subjectName: { type: "string" },
        className: { type: "string" },
        publishedMode: { type: "string", enum: ["single", "batch"] },
        teachingGoal: { type: "string" },
        boardOpeningPrompt: { type: "string" },
        ...draftIdentityProperties,
      },
      required: ["title", "schoolId", "classId", "teacherId", "idempotencyKey"],
      additionalProperties: false,
    },
    outputSchema: completeObject,
    annotations: draftAnnotations,
    securitySchemes: oauth("drafts:write"),
    _meta: meta(oauth("drafts:write"), "Preparing Smart Classroom plan…", "Session plan ready"),
  },
  {
    name: "plan_workflow",
    title: "Plan ALMEAA workflow",
    description: "Create a resumable Plan → Execute → Verify workflow using safe read and draft-write tools only.",
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string" },
        steps: { type: "array", minItems: 1, maxItems: 20, items: { type: "object", additionalProperties: true } },
        ...draftIdentityProperties,
      },
      required: ["title", "steps", "idempotencyKey"],
      additionalProperties: false,
    },
    outputSchema: completeObject,
    annotations: draftAnnotations,
    securitySchemes: oauth("workflows:plan"),
    _meta: meta(oauth("workflows:plan"), "Planning workflow…", "Workflow planned"),
  },
  {
    name: "get_workflow",
    title: "Get ALMEAA workflow",
    description: "Read workflow progress, outputs, failure state, and verification.",
    inputSchema: {
      type: "object",
      properties: { workflowId: { type: "string" } },
      required: ["workflowId"],
      additionalProperties: false,
    },
    outputSchema: completeObject,
    annotations: readAnnotations,
    securitySchemes: oauth("workflows:read"),
    _meta: meta(oauth("workflows:read"), "Reading workflow…", "Workflow ready"),
  },
  {
    name: "execute_workflow",
    title: "Execute ALMEAA workflow",
    description: "Execute or resume a safe workflow. It cannot approve, apply, publish, delete, or alter permissions.",
    inputSchema: {
      type: "object",
      properties: { workflowId: { type: "string" } },
      required: ["workflowId"],
      additionalProperties: false,
    },
    outputSchema: completeObject,
    annotations: draftAnnotations,
    securitySchemes: oauth("workflows:execute"),
    _meta: meta(oauth("workflows:execute"), "Executing workflow…", "Workflow execution finished"),
  },
];
