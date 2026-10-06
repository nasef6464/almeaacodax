type ApiRequest = <T>(path: string, options?: {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  token?: string | null;
  cache?: RequestCache;
  skipCsrf?: boolean;
}) => Promise<T>;

export const createAnnouncementAdsApi = (request: ApiRequest) => ({
  createAnnouncementAd: (payload: unknown, token?: string | null) =>
    request<unknown>("/content/announcement-ads", {
      method: "POST",
      body: payload,
      token,
    }),

  updateAnnouncementAd: (id: string, payload: unknown, token?: string | null) =>
    request<unknown>(`/content/announcement-ads/${id}`, {
      method: "PATCH",
      body: payload,
      token,
    }),

  deleteAnnouncementAd: (id: string, token?: string | null) =>
    request<{ success: boolean }>(`/content/announcement-ads/${id}`, {
      method: "DELETE",
      token,
    }),
});
