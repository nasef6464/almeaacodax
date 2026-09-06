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

export interface CourseListOptions extends PaginationOptions {
  kind?: 'learning' | 'package' | 'all';
}

export interface CourseEnrollmentResponse {
  success: boolean;
  enrolled: boolean;
  alreadyEnrolled?: boolean;
  courseId: string;
  message?: string;
}

export const createCoursesApi = (
  request: ApiRequest,
  {
    requestCached,
    canUsePublicLearningCache,
    bootstrapCacheTtlMs,
  }: CoursesApiDependencies,
) => {
  const getCoursesByKind = async (pagination: CourseListOptions = {}) => {
    const query = { limit: 200, kind: 'all' as const, ...pagination };
    const path = withQuery("/courses", query);
    const cacheKey = [
      "courses",
      query.page || 1,
      query.limit,
      query.pathId || "all-paths",
      query.subjectId || "all-subjects",
      query.search || "",
      query.kind || "all",
    ].join(":");
    const payload = canUsePublicLearningCache()
      ? await requestCached<unknown>(path, cacheKey, bootstrapCacheTtlMs)
      : await request<unknown>(path);
    return extractList(payload, "courses");
  };

  return {
    // Compatibility: existing callers still receive both legacy Course-backed public packages and learning courses.
    getCourses: (pagination: CourseListOptions = {}) => getCoursesByKind(pagination),
    getLearningCourses: (pagination: PaginationOptions = {}) => getCoursesByKind({ ...pagination, kind: 'learning' }),
    getPublicPackageCourses: (pagination: PaginationOptions = {}) => getCoursesByKind({ ...pagination, kind: 'package' }),

    getCourseById: (id: string) => request<unknown>(`/courses/${id}`),

    enrollCourse: (id: string, token?: string | null) =>
      request<CourseEnrollmentResponse>(`/courses/${id}/enroll`, {
        method: "POST",
        body: {},
        token,
      }),

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
  };
};
