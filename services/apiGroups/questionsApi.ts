import {
  extractList,
  withQuery,
  type PaginationMeta,
} from '../apiQueryUtilities';

type ApiRequest = <T>(path: string, options?: {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  token?: string | null;
  cache?: RequestCache;
  skipCsrf?: boolean;
}) => Promise<T>;

export interface QuestionQuery {
  page?: number;
  limit?: number;
  ids?: string;
  pathId?: string;
  subject?: string;
  sectionId?: string;
  skillId?: string;
  skillIds?: string;
  skillLinkStatus?: "linked" | "unlinked";
  difficulty?: string;
  type?: "mcq" | "true_false" | "essay";
  search?: string;
  approvalStatus?: string;
  hasExplanationVideo?: boolean;
  videoStatus?: "with" | "without";
  explanationStatus?: "with" | "without";
  includeCoverage?: boolean;
  summary?: boolean;
  noTotal?: boolean;
}

export interface QuestionBankCoverage {
  total: number;
  mainSkillCount: number;
  subSkillCount: number;
  pendingCount: number;
  approvedCount: number;
  skillQuestionCounts: Record<string, number>;
  sectionQuestionCounts: Record<string, number>;
}

export interface QuestionUsageMetric {
  questionId: string;
  aliases: string[];
  attempts: number;
  correctAnswers: number;
  accuracyPercent: number | null;
  averageTimeSeconds: number | null;
  uniqueStudents: number;
  lastAttemptAt: string | null;
}

const toQueryString = <T extends object>(params?: T | null) => {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries((params || {}) as Record<string, unknown>)) {
    if (value !== undefined && value !== null && String(value).trim()) {
      searchParams.set(key, String(value));
    }
  }
  return searchParams.toString();
};

export const createQuestionsApi = (request: ApiRequest) => ({
  getQuestions: async (params?: QuestionQuery) => {
    const query = toQueryString(params);
    const payload = await request<unknown>(`/quizzes/questions${query ? `?${query}` : ""}`);
    return extractList(payload, "data");
  },

  getQuestionsPaginated: (params?: QuestionQuery) => {
    const query = withQuery("/quizzes/questions", { ...(params || {}), paginate: true });
    return request<{ data: unknown[]; pagination: PaginationMeta; coverage?: QuestionBankCoverage }>(query);
  },

  getQuestionUsageAnalytics: (ids: string[], token?: string | null) => {
    const boundedIds = Array.from(new Set(ids.map((id) => String(id || "").trim()).filter(Boolean))).slice(0, 100);
    if (boundedIds.length === 0) {
      return Promise.resolve({ data: [] as QuestionUsageMetric[] });
    }
    return request<{ data: QuestionUsageMetric[] }>(`/question-analytics?ids=${encodeURIComponent(boundedIds.join(","))}`, {
      token,
      cache: "no-store",
    });
  },

  getQuestionForEditing: (id: string, token?: string | null) =>
    request<unknown>(`/quizzes/questions/${encodeURIComponent(id)}`, {
      token,
      cache: "no-store",
    }),

  createQuestionImageUploadIntent: (payload: { contentType: string; sizeBytes: number }, token?: string | null) =>
    request<{
      uploadUrl: string;
      publicUrl: string;
      key: string;
      method: "PUT";
      headers: { "Content-Type": string };
      expiresIn: number;
      maxBytes: number;
    }>("/media/question-images/presign", {
      method: "POST",
      body: payload,
      token,
    }),

  uploadQuestionImage: async (file: File, token?: string | null) => {
    const intent = await request<{
      uploadUrl: string;
      publicUrl: string;
      key: string;
      method: "PUT";
      headers: { "Content-Type": string };
      expiresIn: number;
      maxBytes: number;
    }>("/media/question-images/presign", {
      method: "POST",
      body: { contentType: file.type, sizeBytes: file.size },
      token,
    });
    const response = await fetch(intent.uploadUrl, {
      method: intent.method,
      headers: intent.headers,
      body: file,
    });
    if (!response.ok) {
      throw new Error(`تعذر رفع الصورة إلى التخزين الخارجي (HTTP ${response.status}).`);
    }
    return { publicUrl: intent.publicUrl, key: intent.key };
  },

  createQuestion: (payload: unknown, token?: string | null) =>
    request<unknown>("/quizzes/questions", {
      method: "POST",
      body: payload,
      token,
    }),

  updateQuestion: (id: string, payload: unknown, token?: string | null) =>
    request<unknown>(`/quizzes/questions/${id}`, {
      method: "PATCH",
      body: payload,
      token,
    }),

  updateQuestionVideosByCode: (
    items: Array<{ questionCode: string; videoUrl: string }>,
    token?: string | null,
  ) =>
    request<{ requested: number; matched: number; modified: number; missingCodes: string[] }>("/quizzes/questions/video-links", {
      method: "PATCH",
      body: { items },
      token,
    }),

  deleteQuestion: (id: string, token?: string | null) =>
    request<{ success: boolean }>(`/quizzes/questions/${id}`, {
      method: "DELETE",
      token,
    }),
});
