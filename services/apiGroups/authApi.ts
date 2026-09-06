import {
  extractList,
  withQuery,
  type PaginatedResponseShape,
  type PaginationOptions,
} from '../apiQueryUtilities';

type ApiRequest = <T>(path: string, options?: {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  token?: string | null;
  cache?: RequestCache;
  skipCsrf?: boolean;
}) => Promise<T>;

export const createAuthApi = (request: ApiRequest) => ({
  login: (email: string, password: string) =>
    request<{ token?: string; user: unknown }>("/auth/login", {
      method: "POST",
      body: { email, password },
    }),

  whatsappStartLogin: (phone: string) =>
    request<{ message: string; expiresInSeconds: number }>("/auth/whatsapp/start", {
      method: "POST",
      body: { phone },
    }),

  whatsappVerifyLogin: (phone: string, code: string) =>
    request<{ token?: string; user: unknown }>("/auth/whatsapp/verify", {
      method: "POST",
      body: { phone, code },
    }),

  nationalIdLogin: (nationalId: string, password: string) =>
    request<{ token?: string; user: unknown }>("/auth/login/national-id", {
      method: "POST",
      body: { nationalId, password },
    }),

  updateMyIdentity: (payload: { nationalId?: string | null; phone?: string | null }, token?: string | null) =>
    request<{ user: unknown }>("/auth/me/identity", {
      method: "PATCH",
      body: payload,
      token,
    }),

  parentLinkStudent: (payload: { nationalId?: string; phone?: string }) =>
    request<{ message: string; student: { id: string; name: string; role: string; schoolId?: string | null } }>(
      "/auth/parent/link-student",
      { method: "POST", body: payload },
    ),

  parentUnlinkStudent: (studentId: string) =>
    request<{ message: string }>(`/auth/parent/link-student/${studentId}`, { method: "DELETE" }),

  register: (name: string, email: string, password: string) =>
    request<{ token?: string; user: unknown }>("/auth/register", {
      method: "POST",
      body: { name, email, password },
    }),

  logout: () =>
    request<void>("/auth/logout", {
      method: "POST",
      token: null,
    }),

  forgotPassword: (email: string) =>
    request<{ message: string }>("/auth/forgot-password", {
      method: "POST",
      body: { email },
    }),

  resetPassword: (token: string, password: string) =>
    request<{ message: string }>("/auth/reset-password", {
      method: "POST",
      body: { token, password },
    }),

  verifyEmail: (token: string) =>
    request<{ user: unknown; message: string }>("/auth/email/verify", {
      method: "POST",
      body: { token },
    }),

  resendEmailVerification: (token?: string | null) =>
    request<{ message: string; user?: unknown }>("/auth/email/resend-verification", {
      method: "POST",
      body: {},
      token,
    }),

  createAdminUser: (payload: unknown, token?: string | null) =>
    request<{ user: unknown }>("/auth/admin/users", {
      method: "POST",
      body: payload,
      token,
    }),

  getAdminUsers: async (pagination: PaginationOptions = {}) => {
    const payload = await request<{ users: unknown[]; pagination?: PaginatedResponseShape }>(
      withQuery("/auth/admin/users", { limit: 100, ...pagination }),
    );

    return {
      ...payload,
      users: extractList(payload, "users"),
      pagination: payload.pagination || {
        page: 1,
        limit: 100,
        total: 0,
        totalPages: 0,
        items: 0,
      },
    };
  },

  updateAdminUser: (id: string, payload: unknown, token?: string | null) =>
    request<{ user: unknown }>(`/auth/admin/users/${id}`, {
      method: "PATCH",
      body: payload,
      token,
    }),

  deleteAdminUser: (id: string, token?: string | null) =>
    request<{ ok: boolean }>(`/auth/admin/users/${id}`, {
      method: "DELETE",
      token,
    }),

  getCurrentUser: () =>
    request<{ user: unknown }>("/auth/me"),

  updateMyProfile: (payload: { name?: string; avatar?: string }, token?: string | null) =>
    request<{ user: unknown }>("/auth/me/profile", {
      method: "PATCH",
      body: payload,
      token,
    }),

  updateMyPreferences: (payload: { favorites?: string[]; reviewLater?: string[]; enrolledPaths?: string[]; completedLessons?: string[]; interactiveVideoProgress?: Array<{ courseId: string; lessonId: string; positionSeconds: number; answeredQuestionIds: string[]; updatedAt: number }> }, token?: string | null) =>
    request<{ user: unknown }>("/auth/me/preferences", {
      method: "PATCH",
      body: payload,
      token,
    }),
});
