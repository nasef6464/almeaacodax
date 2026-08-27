import {
  extractList,
  withQuery,
  type PaginationOptions,
} from '../apiQueryUtilities';

type ApiRequest = <T>(path: string, options?: {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  token?: string | null;
  cache?: RequestCache;
  skipCsrf?: boolean;
}) => Promise<T>;

type CachedRequest = <T>(path: string, cacheKey: string, ttlMs: number) => Promise<T>;

interface CoursesApiDependencies {
  requestCached: CachedRequest;
  canUsePublicLearningCache: () => boolean;
  bootstrapCacheTtlMs: number;
}

export const createCoursesApi = (
  request: ApiRequest,
  {
    requestCached,
    canUsePublicLearningCache,
    bootstrapCacheTtlMs,
  }: CoursesApiDependencies,
) => ({
  getCourses: async (pagination: PaginationOptions = {}) => {
    const query = { limit: 200, ...pagination };
    const path = withQuery("/courses", query);
    const cacheKey = [
      "courses",
      query.page || 1,
      query.limit,
      query.pathId || "all-paths",
      query.subjectId || "all-subjects",
      query.search || "",
    ].join(":");
    const payload = canUsePublicLearningCache()
      ? await requestCached<unknown>(path, cacheKey, bootstrapCacheTtlMs)
      : await request<unknown>(path);
    return extractList(payload, "courses");
  },

  getCourseById: (id: string) => request<unknown>(`/courses/${id}`),

  createCourse: (payload: unknown, token?: string | null) =>
    request<unknown>("/courses", {
      method: "POST",
      body: payload,
      token,
    }),

  updateCourse: (id: string, payload: unknown, token?: string | null) =>
    request<unknown>(`/courses/${id}`, {
      method: "PATCH",
      body: payload,
      token,
    }),

  deleteCourse: (id: string, token?: string | null) =>
    request<void>(`/courses/${id}`, {
      method: "DELETE",
      token,
    }),
});
