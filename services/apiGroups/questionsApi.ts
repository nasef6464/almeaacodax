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
  difficulty?: string;
  search?: string;
  approvalStatus?: string;
  summary?: boolean;
  noTotal?: boolean;
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
    return request<{ data: unknown[]; pagination: PaginationMeta }>(query);
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

  deleteQuestion: (id: string, token?: string | null) =>
    request<{ success: boolean }>(`/quizzes/questions/${id}`, {
      method: "DELETE",
      token,
    }),
});
