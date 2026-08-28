import { withQuery } from '../apiQueryUtilities';

type ApiRequest = <T>(path: string, options?: {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  token?: string | null;
  cache?: RequestCache;
  skipCsrf?: boolean;
}) => Promise<T>;

interface TaxonomyContentDependencies {
  requestCached: <T>(path: string, cacheKey: string, ttlMs: number) => Promise<T>;
  request: ApiRequest;
  clearPublicCache: (key: string) => void;
  writePublicCache: <T>(key: string, value: T, ttlMs: number) => void;
  publicCacheTtlMs: number;
  bootstrapCacheTtlMs: number;
}

export const createTaxonomyContentApi = (
  {
    requestCached,
    request,
    clearPublicCache,
    writePublicCache,
    publicCacheTtlMs,
    bootstrapCacheTtlMs,
  }: TaxonomyContentDependencies,
) => ({
  getTaxonomyBootstrap: (phase: "full" | "core" = "full") =>
    requestCached<{ paths: unknown[]; levels: unknown[]; subjects: unknown[]; sections: unknown[]; skills: unknown[] }>(
      withQuery("/taxonomy/bootstrap", { phase }),
      `taxonomy-bootstrap:${phase}`,
      bootstrapCacheTtlMs,
    ),

  createPath: (payload: unknown, token?: string | null) =>
    request<unknown>("/taxonomy/paths", {
      method: "POST",
      body: payload,
      token,
    }),
  updatePath: (id: string, payload: unknown, token?: string | null) =>
    request<unknown>(`/taxonomy/paths/${id}`, {
      method: "PATCH",
      body: payload,
      token,
    }),
  deletePath: (id: string, token?: string | null) =>
    request<void>(`/taxonomy/paths/${id}`, {
      method: "DELETE",
      token,
    }),

  createLevel: (payload: unknown, token?: string | null) =>
    request<unknown>("/taxonomy/levels", {
      method: "POST",
      body: payload,
      token,
    }),
  updateLevel: (id: string, payload: unknown, token?: string | null) =>
    request<unknown>(`/taxonomy/levels/${id}`, {
      method: "PATCH",
      body: payload,
      token,
    }),
  deleteLevel: (id: string, token?: string | null) =>
    request<void>(`/taxonomy/levels/${id}`, {
      method: "DELETE",
      token,
    }),

  createSubject: (payload: unknown, token?: string | null) =>
    request<unknown>("/taxonomy/subjects", {
      method: "POST",
      body: payload,
      token,
    }),
  updateSubject: (id: string, payload: unknown, token?: string | null) =>
    request<unknown>(`/taxonomy/subjects/${id}`, {
      method: "PATCH",
      body: payload,
      token,
    }),
  deleteSubject: (id: string, token?: string | null) =>
    request<void>(`/taxonomy/subjects/${id}`, {
      method: "DELETE",
      token,
    }),

  createSection: (payload: unknown, token?: string | null) =>
    request<unknown>("/taxonomy/sections", {
      method: "POST",
      body: payload,
      token,
    }),
  updateSection: (id: string, payload: unknown, token?: string | null) =>
    request<unknown>(`/taxonomy/sections/${id}`, {
      method: "PATCH",
      body: payload,
      token,
    }),
  deleteSection: (id: string, token?: string | null) =>
    request<void>(`/taxonomy/sections/${id}`, {
      method: "DELETE",
      token,
    }),

  createSkill: (payload: unknown, token?: string | null) =>
    request<unknown>("/taxonomy/skills", {
      method: "POST",
      body: payload,
      token,
    }),
  updateSkill: (id: string, payload: unknown, token?: string | null) =>
    request<unknown>(`/taxonomy/skills/${id}`, {
      method: "PATCH",
      body: payload,
      token,
    }),
  deleteSkill: (id: string, token?: string | null) =>
    request<void>(`/taxonomy/skills/${id}`, {
      method: "DELETE",
      token,
    }),

  getContentBootstrap: () =>
    requestCached<{
      topics: unknown[];
      lessons: unknown[];
      libraryItems: unknown[];
      groups: unknown[];
      b2bPackages: unknown[];
      accessCodes: unknown[];
      announcementAds: unknown[];
      studyPlans: unknown[];
    }>(withQuery("/content/bootstrap", { scope: "full" }), "content-bootstrap:full", bootstrapCacheTtlMs),
  getContentBootstrapFresh: () => {
    clearPublicCache("content-bootstrap:full");
    return request<{
      topics: unknown[];
      lessons: unknown[];
      libraryItems: unknown[];
      groups: unknown[];
      b2bPackages: unknown[];
      accessCodes: unknown[];
      announcementAds: unknown[];
      studyPlans: unknown[];
    }>(withQuery("/content/bootstrap", { scope: "full" }), { cache: "no-store" });
  },
  getContentBootstrapByScope: (scope: "full" | "learning" = "full", phase: "full" | "core" = "full") =>
    requestCached<{
      topics: unknown[];
      lessons: unknown[];
      libraryItems: unknown[];
      groups: unknown[];
      b2bPackages: unknown[];
      accessCodes: unknown[];
      announcementAds: unknown[];
      studyPlans: unknown[];
    }>(withQuery("/content/bootstrap", { scope, phase }), `content-bootstrap:${scope}:${phase}`, bootstrapCacheTtlMs),
  getContentBootstrapMinimal: () =>
    requestCached<{
      topics: unknown[];
      lessons: unknown[];
      libraryItems: unknown[];
      groups: unknown[];
      b2bPackages: unknown[];
      accessCodes: unknown[];
      announcementAds: unknown[];
      studyPlans: unknown[];
    }>(withQuery("/content/bootstrap/minimal", {}), "content-bootstrap:minimal", bootstrapCacheTtlMs),
  getHomepageSettings: (token?: string | null) =>
    token
      ? request<unknown>("/content/homepage-settings", {
          token,
          cache: "no-store",
        })
      : requestCached<unknown>("/content/homepage-settings", "homepage-settings", publicCacheTtlMs),
  getPublicAnnouncementAds: () =>
    requestCached<{ announcementAds: unknown[] }>("/content/announcement-ads", "announcement-ads", publicCacheTtlMs),
  updateHomepageSettings: async (payload: unknown, token?: string | null) => {
    const response = await request<unknown>("/content/homepage-settings", {
      method: "PATCH",
      body: payload,
      token,
    });
    clearPublicCache("homepage-settings");
    writePublicCache("homepage-settings", response, publicCacheTtlMs);
    return response;
  },
});
