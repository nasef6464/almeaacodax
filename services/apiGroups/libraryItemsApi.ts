type ApiRequest = <T>(path: string, options?: {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  token?: string | null;
  cache?: RequestCache;
  skipCsrf?: boolean;
}) => Promise<T>;

export const createLibraryItemsApi = (request: ApiRequest) => ({
  createLibraryItem: (payload: unknown, token?: string | null) =>
    request<unknown>("/content/library-items", {
      method: "POST",
      body: payload,
      token,
    }),

  updateLibraryItem: (id: string, payload: unknown, token?: string | null) =>
    request<unknown>(`/content/library-items/${id}`, {
      method: "PATCH",
      body: payload,
      token,
    }),

  deleteLibraryItem: (id: string, token?: string | null) =>
    request<{ success: boolean }>(`/content/library-items/${id}`, {
      method: "DELETE",
      token,
    }),
});
