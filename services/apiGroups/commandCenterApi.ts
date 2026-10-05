type ApiRequest = <T>(path: string, options?: {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  token?: string | null;
  cache?: RequestCache;
  skipCsrf?: boolean;
}) => Promise<T>;

export type CommandCenterTool = {
  id: string;
  capability: "taxonomy" | "questions" | "quizzes" | "courses" | "schools" | "operations";
  description: string;
  requiredScope: string;
  risk: "read" | "draft_write" | "sensitive";
  approvalRequired: boolean;
  availability: "active" | "planned";
};

export type CommandCenterDraft = {
  _id: string;
  kind: "question_batch" | "quiz" | "course" | "school_setup" | "content" | "workflow";
  title: string;
  payload: Record<string, unknown>;
  source: "admin_ui" | "mcp" | "external_agent" | "system";
  status: "pending" | "approved" | "rejected";
  createdAt?: string;
  updatedAt?: string;
};

export type CourseInventory = {
  policy: {
    strategy: "reuse_first";
    generateOnlyWhenMissing: boolean;
    sourceOfTruth: "existing_platform_content";
  };
  counts: {
    lessons: number;
    videoLessons: number;
    quizzes: number;
    libraryItems: number;
    skills: number;
  };
  lessons: unknown[];
  quizzes: unknown[];
  libraryItems: unknown[];
  skills: unknown[];
};

const query = (input: Record<string, string | undefined>) => {
  const params = new URLSearchParams();
  Object.entries(input).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });
  const serialized = params.toString();
  return serialized ? `?${serialized}` : "";
};

export const createCommandCenterApi = (request: ApiRequest) => ({
  commandCenterHealth: (token?: string | null) =>
    request<{
      ok: boolean;
      service: string;
      principalType: "admin_session" | "api_key";
      draftFirst: boolean;
      liveWritesEnabled: boolean;
    }>("/command-center/health", { token }),

  getCommandCenterTools: (token?: string | null) =>
    request<{
      tools: CommandCenterTool[];
      policy: {
        draftFirst: boolean;
        directDatabaseAccess: boolean;
        externalPublishEnabled: boolean;
      };
    }>("/command-center/tools", { token }),

  getCommandCenterDrafts: (
    options: { status?: "pending" | "approved" | "rejected"; kind?: CommandCenterDraft["kind"]; limit?: number } = {},
    token?: string | null,
  ) => {
    const params = new URLSearchParams();
    if (options.status) params.set("status", options.status);
    if (options.kind) params.set("kind", options.kind);
    if (options.limit) params.set("limit", String(options.limit));
    const suffix = params.toString() ? `?${params.toString()}` : "";
    return request<{ drafts: CommandCenterDraft[] }>(`/command-center/drafts${suffix}`, { token });
  },

  getCourseCommandInventory: (
    input: { pathId: string; subjectId: string; sectionId?: string },
    token?: string | null,
  ) =>
    request<CourseInventory>(
      `/command-center/courses/inventory${query(input)}`,
      { token },
    ),

  validateCourseCommandDraft: (payload: Record<string, unknown>, token?: string | null) =>
    request<Record<string, unknown>>("/command-center/courses/validate", {
      method: "POST",
      body: payload,
      token,
    }),

  createCourseCommandDraft: (payload: Record<string, unknown>, token?: string | null) =>
    request<{ draft: CommandCenterDraft; validation: Record<string, unknown> }>(
      "/command-center/courses/draft",
      {
        method: "POST",
        body: payload,
        token,
      },
    ),

  createQuestionBatchCommandDraft: (payload: Record<string, unknown>, token?: string | null) =>
    request<{ draft: CommandCenterDraft; validation: Record<string, unknown> }>(
      "/command-center/authoring/questions/draft",
      {
        method: "POST",
        body: payload,
        token,
      },
    ),

  createQuizCommandDraft: (payload: Record<string, unknown>, token?: string | null) =>
    request<{ draft: CommandCenterDraft; validation: Record<string, unknown> }>(
      "/command-center/authoring/quizzes/draft",
      {
        method: "POST",
        body: payload,
        token,
      },
    ),

  validateSchoolSetupCommandDraft: (payload: Record<string, unknown>, token?: string | null) =>
    request<Record<string, unknown>>("/command-center/schools/validate", {
      method: "POST",
      body: payload,
      token,
    }),

  createSchoolSetupCommandDraft: (payload: Record<string, unknown>, token?: string | null) =>
    request<{ draft: CommandCenterDraft; validation: Record<string, unknown> }>(
      "/command-center/schools/draft",
      {
        method: "POST",
        body: payload,
        token,
      },
    ),

  reviewCommandCenterDraft: (
    draftId: string,
    payload: { decision: "approved" | "rejected"; notes?: string },
    token?: string | null,
  ) =>
    request<{ draft: CommandCenterDraft }>(
      `/command-center/drafts/${encodeURIComponent(draftId)}/review`,
      {
        method: "POST",
        body: payload,
        token,
      },
    ),
});
