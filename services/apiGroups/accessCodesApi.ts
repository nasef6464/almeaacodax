type ApiRequest = <T>(path: string, options?: {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  token?: string | null;
  cache?: RequestCache;
  skipCsrf?: boolean;
}) => Promise<T>;

export interface AccessCodesQuery {
  page?: number;
  limit?: number;
  search?: string;
  schoolId?: string;
  packageId?: string;
  status?: "active" | "expired" | "exhausted";
  dateFrom?: string;
  dateTo?: string;
  sortBy?: "createdAt" | "expiresAt" | "currentUses" | "maxUses" | "code";
  sortOrder?: "asc" | "desc";
}

export interface AccessCodeRedemptionsQuery {
  page?: number;
  limit?: number;
  accessCodeId?: string;
  userId?: string;
  schoolId?: string;
  status?: "active" | "revoked" | "expired";
  dateFrom?: string;
  dateTo?: string;
  sortBy?: "grantedAt" | "expiresAt" | "createdAt";
  sortOrder?: "asc" | "desc";
}

const toQueryString = (params?: Record<string, unknown>) => {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params || {})) {
    if (value !== undefined && value !== null && String(value).trim()) {
      searchParams.set(key, String(value));
    }
  }
  return searchParams.toString();
};

export const createAccessCodesApi = (request: ApiRequest) => ({
  getAccessCodes: (params?: AccessCodesQuery, token?: string | null) => {
    const query = toQueryString(params);
    return request<unknown>(`/content/access-codes${query ? `?${query}` : ""}`, { token });
  },

  getAccessCodeRedemptions: (params?: AccessCodeRedemptionsQuery, token?: string | null) => {
    const query = toQueryString(params);
    return request<unknown>(`/content/access-code-redemptions${query ? `?${query}` : ""}`, { token });
  },

  createAccessCode: (payload: unknown, token?: string | null) =>
    request<unknown>("/content/access-codes", {
      method: "POST",
      body: payload,
      token,
    }),

  updateAccessCode: (id: string, payload: unknown, token?: string | null) =>
    request<unknown>(`/content/access-codes/${id}`, {
      method: "PATCH",
      body: payload,
      token,
    }),

  deleteAccessCode: (id: string, token?: string | null) =>
    request<{ success: boolean }>(`/content/access-codes/${id}`, {
      method: "DELETE",
      token,
    }),
});
