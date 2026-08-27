import { withQuery } from '../apiQueryUtilities';

type ApiRequest = <T>(path: string, options?: {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  token?: string | null;
  cache?: RequestCache;
  skipCsrf?: boolean;
}) => Promise<T>;

type DiscussionEntityType = "lesson" | "quiz" | "course";

export const createLearningSupportApi = (request: ApiRequest) => ({
  generateCertificate: (payload: { courseId: string }, token?: string | null) =>
    request<any>("/certificates/generate", {
      method: "POST",
      body: payload,
      token,
    }),

  getMyCertificates: (token?: string | null) =>
    request<{ certificates: any[] }>("/certificates/mine", { token }),

  getCertificateByCode: (verificationCode: string) =>
    request<any>(`/certificates/${encodeURIComponent(verificationCode)}`),

  getReviewDue: (limit = 20, token?: string | null) =>
    request<{ dueCount: number; items: any[] }>(withQuery("/review/due", { limit }), { token }),

  answerReviewCard: (cardId: string, quality: number, token?: string | null) =>
    request<{ success: boolean; card: any }>(`/review/${encodeURIComponent(cardId)}/answer`, {
      method: "POST",
      body: { quality },
      token,
    }),

  getReviewStats: (token?: string | null) =>
    request<{ dueToday: number; dueThisWeek: number; totalCards: number }>("/review/stats", { token }),

  search: (
    params: { q: string; type?: "all" | "lesson" | "question" | "course"; limit?: number },
    token?: string | null,
  ) =>
    request<{
      q: string;
      type: "all" | "lesson" | "question" | "course";
      results: {
        courses: Array<{ id: string; title: string; subtitle: string; route: string }>;
        lessons: Array<{ id: string; title: string; subtitle: string; route: string }>;
        questions: Array<{ id: string; title: string; subtitle: string; route: string }>;
      };
    }>(withQuery("/search", params), { token }),

  getLeaderboard: (
    params: { scope?: "global" | "group" | "school"; period?: "week" | "month" | "all"; limit?: number } = {},
    token?: string | null,
  ) =>
    request<{
      scope: "global" | "group" | "school";
      period: "week" | "month" | "all";
      total: number;
      top: Array<{
        rank: number;
        userId: string;
        name: string;
        avatar: string;
        role: string;
        avgScore: number;
        attempts: number;
        bestScore: number;
        completedLessons: number;
        points: number;
        compositeScore: number;
      }>;
      currentUserRank: null | {
        rank: number;
        userId: string;
        name: string;
        avatar: string;
        role: string;
        avgScore: number;
        attempts: number;
        bestScore: number;
        completedLessons: number;
        points: number;
        compositeScore: number;
      };
    }>(withQuery("/leaderboard", params), { token }),

  getDiscussions: (entityType: DiscussionEntityType, entityId: string, token?: string | null) =>
    request<{ threads: any[] }>(`/discussions/${entityType}/${encodeURIComponent(entityId)}`, { token }),

  getParentChildrenProgress: (token?: string | null) =>
    request<{
      children: Array<{
        id: string;
        name: string;
        weeklyStudyMinutes: number;
        lastQuizScore: number;
        weakSkills: string[];
        coursesInProgress: string[];
      }>;
      summary: { count: number; weakSkills: number };
    }>("/parent/children-progress", { token }),

  sendParentWeeklyReport: (token?: string | null) =>
    request<{ ok: boolean; campaignId: string; recipients: number; created: number }>("/parent/weekly-report/send", {
      method: "POST",
      body: {},
      token,
    }),

  createDiscussion: (
    entityType: DiscussionEntityType,
    entityId: string,
    payload: { title: string; body: string },
    token?: string | null,
  ) =>
    request<any>(`/discussions/${entityType}/${encodeURIComponent(entityId)}`, {
      method: "POST",
      body: payload,
      token,
    }),

  getDiscussionReplies: (threadId: string, token?: string | null) =>
    request<{ replies: any[] }>(`/discussions/${encodeURIComponent(threadId)}/replies`, { token }),

  createDiscussionReply: (threadId: string, payload: { body: string }, token?: string | null) =>
    request<any>(`/discussions/${encodeURIComponent(threadId)}/replies`, {
      method: "POST",
      body: payload,
      token,
    }),

  resolveDiscussionThread: (threadId: string, token?: string | null) =>
    request<any>(`/discussions/${encodeURIComponent(threadId)}/resolve`, {
      method: "POST",
      body: {},
      token,
    }),
});
