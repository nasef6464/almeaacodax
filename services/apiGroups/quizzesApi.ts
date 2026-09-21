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
    extractList(await request<unknown>(withQuery("/quizzes", { limit: 200, noTotal: true, ...pagination })), "quizzes"),

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

  getMasteryGoals: (scope: { userId?: string; pathId?: string; subjectId?: string; status?: string } = {}) =>
    request<{ goals: Array<{
      id: string;
      userId: string;
      pathId: string;
      subjectId?: string;
      targetType: "topic" | "section" | "path";
      targetId: string;
      title: string;
      targetMastery: number;
      horizon: "short" | "long";
      dueDate?: string;
      status: "active" | "achieved" | "archived";
    }> }>(withQuery("/quizzes/mastery-goals", scope)),

  createMasteryGoal: (payload: {
    userId?: string;
    pathId: string;
    subjectId?: string;
    targetType: "topic" | "section" | "path";
    targetId: string;
    title: string;
    targetMastery?: number;
    horizon?: "short" | "long";
    dueDate?: string;
  }) => request<unknown>("/quizzes/mastery-goals", { method: "POST", body: payload }),

  updateMasteryGoal: (goalId: string, payload: {
    title?: string;
    targetMastery?: number;
    dueDate?: string;
    status?: "active" | "achieved" | "archived";
  }) => request<unknown>(`/quizzes/mastery-goals/${encodeURIComponent(goalId)}`, { method: "PATCH", body: payload }),

  getMasteryReadiness: (scope: { pathId: string; subjectId?: string }) =>
    request<{
      scope: { pathId: string; subjectId?: string };
      readiness: {
        score: number;
        status: "needs_measurement" | "ready_to_advance" | "ready_for_recheck" | "building";
        mastery: number;
        coverage: number;
        evidenceConfidence: number;
        recency: number;
        totalSkills: number;
        reliableSkills: number;
        totalEvidence: number;
        explanation: string;
      };
    }>(withQuery("/quizzes/mastery-readiness", scope)),

  getNextBestAction: (scope: { pathId: string; subjectId?: string }) =>
    request<{
      version: string;
      fingerprint: string;
      scope: { pathId: string; subjectId?: string };
      nextAction: null | {
        skillId: string;
        skill: string;
        pathId: string;
        subjectId: string;
        sectionId: string;
        mastery: number;
        evidenceCount: number;
        status: string;
        trend: "improving" | "stable" | "declining";
        action: string;
      };
      candidates: Array<{
        skillId: string;
        skill: string;
        pathId: string;
        subjectId: string;
        sectionId: string;
        mastery: number;
        evidenceCount: number;
        status: string;
        trend: "improving" | "stable" | "declining";
        action: string;
      }>;
    }>(withQuery("/quizzes/next-best-action", scope)),

  getSkillProgress: async (pagination: PaginationOptions & { noTotal?: boolean } = {}) =>
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
