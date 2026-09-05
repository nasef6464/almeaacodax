import {
  extractList,
  withQuery,
  type PaginationOptions,
  type QuizResultsPageResponse,
  type QuizResultsPaginationOptions,
} from '../apiQueryUtilities';

type ApiRequest = <T>(path: string, options?: {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  token?: string | null;
  cache?: RequestCache;
  skipCsrf?: boolean;
}) => Promise<T>;

export interface SubmitQuizPayload {
  answers: Record<string, number>;
  timeSpentSeconds?: number;
  source?: string;
  sectionResults?: Array<{
    sectionId: string;
    sectionName: string;
    total: number;
    correct: number;
    wrong: number;
    unanswered: number;
    score: number;
  }>;
}

export const createQuizzesApi = (request: ApiRequest) => ({
  getQuizzes: async (pagination: PaginationOptions = {}) =>
    extractList(await request<unknown>(withQuery("/quizzes", { limit: 200, ...pagination })), "quizzes"),

  getQuiz: (id: string, token?: string | null) =>
    request<unknown>(`/quizzes/${encodeURIComponent(id)}`, { token }),

  getQuizAnalyticsOverview: (pagination: PaginationOptions = {}) =>
    request<unknown>(withQuery("/quizzes/analytics/overview", { studentLimit: 500, resultLimit: 2000, attemptLimit: 3000, ...pagination })),

  createQuiz: (payload: unknown, token?: string | null) =>
    request<unknown>("/quizzes", {
      method: "POST",
      body: payload,
      token,
    }),

  updateQuiz: (id: string, payload: unknown, token?: string | null) =>
    request<unknown>(`/quizzes/${id}`, {
      method: "PATCH",
      body: payload,
      token,
    }),

  deleteQuiz: (id: string, token?: string | null) =>
    request<{ success: boolean }>(`/quizzes/${id}`, {
      method: "DELETE",
      token,
    }),

  submitQuiz: (id: string, payload: SubmitQuizPayload, token?: string | null) =>
    request<unknown>(`/quizzes/${id}/submit`, {
      method: "POST",
      body: payload,
      token,
    }),

  getQuizResults: async (pagination: QuizResultsPaginationOptions = {}) =>
    extractList(await request<unknown>(withQuery("/quizzes/results", { limit: 100, noTotal: true, ...pagination })), "results"),

  getQuizSectionAnalytics: (quizId: string, token?: string | null) =>
    request<{
      quizId: string;
      quizTitle: string;
      totalAttempts: number;
      sections: Array<{ sectionId: string; sectionName: string; attempts: number; avgScore: number; passRate: number }>;
    }>(`/quizzes/results/section-analytics/${encodeURIComponent(quizId)}`, { token }),

  getMyQuizResultsPage: (pagination: QuizResultsPaginationOptions = {}) =>
    request<QuizResultsPageResponse>(withQuery("/quiz-results/my", { limit: 100, ...pagination })),

  getQuizResultDetails: (id: string, token?: string | null) =>
    request<{ result: unknown; analysis: { weakSkills: unknown[]; strongSkills: unknown[]; recommendations: unknown[] } }>(
      `/quiz-results/${encodeURIComponent(id)}`,
      { token },
    ),

  getAdminQuizResultsPage: (pagination: QuizResultsPaginationOptions = {}) =>
    request<QuizResultsPageResponse>(withQuery("/admin/quiz-results", { limit: 100, ...pagination })),

  getScopedQuizResults: (pagination: QuizResultsPaginationOptions = {}) =>
    request<unknown>(withQuery("/quizzes/results/scoped", { limit: 100, noTotal: true, ...pagination })),

  getLatestQuizResult: () => request<unknown>("/quizzes/results/latest"),

  getSkillProgress: async (pagination: PaginationOptions = {}) =>
    extractList(await request<unknown>(withQuery("/quizzes/skill-progress", { limit: 200, ...pagination })), "skillProgress"),

  getQuestionAttempts: async (pagination: PaginationOptions = {}) =>
    extractList(await request<unknown>(withQuery("/quizzes/question-attempts", { limit: 100, ...pagination })), "questionAttempts"),

  createQuestionAttempt: (payload: unknown, token?: string | null) =>
    request<unknown>("/quizzes/question-attempts", {
      method: "POST",
      body: payload,
      token,
    }),
});
