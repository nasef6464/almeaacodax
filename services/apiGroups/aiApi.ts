type ApiRequest = <T>(path: string, options?: {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  token?: string | null;
  cache?: RequestCache;
  skipCsrf?: boolean;
}) => Promise<T>;

type AiProvider = "gemini" | "openrouter" | "deepseek" | "qwen" | "openai" | "ollama" | "lmstudio" | "none";

export const createAiApi = (request: ApiRequest) => ({
  aiChat: (payload: { message: string; image?: { data: string; mimeType: string } }, token?: string | null) =>
    request<{
      text: string;
      personalized?: boolean;
      weaknessesCount?: number;
      provider?: AiProvider;
      model?: string;
      usedFallback?: boolean;
      providerErrors?: string[];
      fallbackReason?: string;
    }>("/ai/chat", {
      method: "POST",
      body: payload,
      token,
    }),

  aiStatus: (token?: string | null) =>
    request<{
      provider: AiProvider;
      ollamaConfigured: boolean;
      lmStudioConfigured?: boolean;
      geminiConfigured: boolean;
      providers?: Array<{
        id: AiProvider;
        label: string;
        model: string;
        configured: boolean;
        source: "env" | "admin" | "runtime-local" | "fallback";
        category: "free-friendly" | "paid" | "local" | "fallback";
        envKeys: string[];
        note: string;
      }>;
      providerOrder?: string[];
      providerOrderSource?: "env" | "admin";
      routingMode?: "manual" | "auto";
      model: string;
      timeoutMs: number;
    }>("/ai/status", { token }),

  aiReadiness: (token?: string | null) =>
    request<{
      checkedAt: string;
      score: number;
      activeProvider: AiProvider;
      configuredProviders: Array<{ id: string; label: string; model: string }>;
      recommendedProviderOrder: string;
      studentAdvisor: {
        ready: boolean;
        studentCount: number;
        studentsWithResults: number;
        weakSkillSignals: number;
        studentChats24h: number;
        personalizedStudentChats7d: number;
        fallbackStudentChats24h: number;
      };
      adminAssistant: {
        ready: boolean;
        chats24h: number;
      };
      monitoring: {
        aiErrors24h: number;
        fallbackStudentChats24h: number;
      };
      nextActions: string[];
    }>("/ai/readiness", { token }),

  aiTestProvider: (payload: { provider: Exclude<AiProvider, "none"> }, token?: string | null) =>
    request<{ ok: boolean; provider: string; model?: string; latencyMs?: number; sample?: string; message?: string }>("/ai/providers/test", {
      method: "POST",
      body: payload,
      token,
    }),

  aiAdminAssistant: (payload: { message: string }, token?: string | null) =>
    request<{
      text: string;
      provider: AiProvider;
      audit: {
        score: number;
        totals: { checks: number; issues: number; critical: number; warnings: number; info: number };
        priorities: unknown[];
      };
    }>("/ai/admin-assistant", {
      method: "POST",
      body: payload,
      token,
    }),

  getAiInteractions: (limit = 20, token?: string | null) =>
    request<{
      summary: {
        total: number;
        last24h: number;
        fallbackCount: number;
        errorCount: number;
        byAudience: Array<{ audience: string; count: number }>;
        byProvider: Array<{ provider: string; count: number; avgLatencyMs: number }>;
      };
      items: Array<{
        _id: string;
        audience: string;
        endpoint: string;
        provider: AiProvider;
        model: string;
        status: "success" | "fallback" | "error";
        usedFallback: boolean;
        personalized: boolean;
        latencyMs: number;
        messagePreview: string;
        responsePreview: string;
        responseLength: number;
        error?: string;
        metadata?: {
          providerErrors?: string[];
          fallbackReason?: string;
          hasImage?: boolean;
          [key: string]: unknown;
        };
        userEmail?: string;
        role?: string;
        createdAt: string;
      }>;
    }>(`/ai/interactions?limit=${limit}`, { token }),

  aiStudyPlan: (payload: { weaknesses: string[] }, token?: string | null) =>
    request<{ steps: string[] }>("/ai/study-plan", {
      method: "POST",
      body: payload,
      token,
    }),

  aiLearningPath: (payload: { skills: unknown[] }, token?: string | null) =>
    request<unknown[]>("/ai/learning-path", {
      method: "POST",
      body: payload,
      token,
    }),

  aiRemediationPlan: (payload: { skills: unknown[]; ageBand?: "primary" | "middle" | "secondary" | "general" }, token?: string | null) =>
    request<{
      title?: string;
      summary?: string;
      steps?: Array<{ day?: string; skill?: string; action?: string; check?: string }>;
      parentNote?: string;
    }>("/ai/remediation-plan", {
      method: "POST",
      body: payload,
      token,
    }),

  aiQuestion: (payload: { topic: string }, token?: string | null) =>
    request<unknown>("/ai/question", {
      method: "POST",
      body: payload,
      token,
    }),

  aiCourseSummary: (payload: { courseTitle: string }, token?: string | null) =>
    request<{ text: string }>("/ai/course-summary", {
      method: "POST",
      body: payload,
      token,
    }),

  aiGenerateMockExam: (
    payload: { studentId?: string; examType: "qudurat" | "tahsili"; weakSkills?: string[] },
    token?: string | null,
  ) =>
    request<{
      ok: boolean;
      quizId: string;
      title: string;
      examType: "qudurat" | "tahsili";
      questionCount: number;
      weakSkillsUsed: string[];
      targetStudentId: string;
    }>("/ai/generate-mock-exam", {
      method: "POST",
      body: payload,
      token,
    }),
});
