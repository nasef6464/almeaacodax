const runtimeEnv = (import.meta as ImportMeta & { env?: Record<string, string | boolean> }).env;
const runtimeHostname = (globalThis as { location?: { hostname?: string } }).location?.hostname || "";
const configuredApiBaseUrl =
  (globalThis as { __API_BASE_URL__?: string }).__API_BASE_URL__ ||
  (typeof runtimeEnv?.VITE_API_URL === "string" ? runtimeEnv.VITE_API_URL : "");
const defaultApiBaseUrl =
  runtimeHostname && !["localhost", "127.0.0.1"].includes(runtimeHostname)
    ? "/api"
    : "http://localhost:4000/api";

const API_BASE_URL = (configuredApiBaseUrl || defaultApiBaseUrl).replace(/\/$/, "");

type HttpMethod = "GET" | "POST" | "PATCH" | "DELETE";

interface RequestOptions {
  method?: HttpMethod;
  body?: unknown;
  token?: string | null;
  cache?: RequestCache;
  skipCsrf?: boolean;
}

interface PaginationOptions {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
  isActive?: boolean;
  pathId?: string;
  subjectId?: string;
}

interface QuizResultsPaginationOptions extends PaginationOptions {
  noTotal?: boolean;
  quizId?: string;
  studentId?: string;
  status?: "passed" | "failed";
  dateFrom?: string;
  dateTo?: string;
  sortBy?: "createdAt" | "score" | "quizTitle" | "date";
  sortOrder?: "asc" | "desc";
}

interface QuizResultsPageResponse<T = unknown> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

interface PaginatedResponseShape {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  items?: number;
}

interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

const PUBLIC_CACHE_PREFIX = "almeaa:public-api:";
const PUBLIC_CACHE_TTL_MS = 2 * 60 * 1000;
const BOOTSTRAP_CACHE_TTL_MS = 5 * 60 * 1000;

const SESSION_STORAGE_KEY = "the-hundred-auth-profile";
const CSRF_COOKIE_NAME = "almeaa_csrf_token";
const CSRF_HEADER_NAME = "x-csrf-token";
const CSRF_SESSION_STORAGE_KEY = "almeaa:csrf-token";
const COOKIE_FIRST_AUTH_ENABLED =
  runtimeEnv?.VITE_AUTH_COOKIE_FIRST !== "false";

const getPublicCacheStorage = (): Storage | null => {
  try {
    return typeof globalThis !== "undefined" && "sessionStorage" in globalThis ? globalThis.sessionStorage : null;
  } catch {
    return null;
  }
};

const getStoredSessionToken = (): string | null => {
  if (COOKIE_FIRST_AUTH_ENABLED) {
    return null;
  }

  try {
    const raw = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as { token?: string };
    return parsed.token || null;
  } catch {
    return null;
  }
};

const getCookieValue = (name: string): string | null => {
  if (typeof document === "undefined") {
    return null;
  }
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = document.cookie.match(new RegExp(`(?:^|; )${escapedName}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
};

const getStoredCsrfToken = (): string | null => {
  try {
    return typeof sessionStorage !== "undefined" ? sessionStorage.getItem(CSRF_SESSION_STORAGE_KEY) : null;
  } catch {
    return null;
  }
};

const storeCsrfToken = (token: string | null) => {
  try {
    if (typeof sessionStorage === "undefined") {
      return;
    }
    if (token) {
      sessionStorage.setItem(CSRF_SESSION_STORAGE_KEY, token);
    } else {
      sessionStorage.removeItem(CSRF_SESSION_STORAGE_KEY);
    }
  } catch {
    // Storage is best-effort; the API still returns a fresh token when needed.
  }
};

const isUnsafeMethod = (method: HttpMethod | undefined) => {
  const normalized = (method || "GET").toUpperCase();
  return normalized !== "GET" && normalized !== "HEAD" && normalized !== "OPTIONS";
};

const ensureCsrfToken = async () => {
  const storedToken = getStoredCsrfToken();
  if (storedToken) {
    return storedToken;
  }

  const existingToken = getCookieValue(CSRF_COOKIE_NAME);
  if (existingToken) {
    storeCsrfToken(existingToken);
    return existingToken;
  }

  const payload = await request<{ csrfToken: string }>("/auth/csrf-token", { skipCsrf: true, cache: "no-store" });
  const token = payload.csrfToken || getCookieValue(CSRF_COOKIE_NAME);
  storeCsrfToken(token);
  return token;
};

async function request<T>(path: string, options: RequestOptions = {}, retryingAfterCsrfRefresh = false): Promise<T> {
  const resolvedToken =
    options.token === undefined
      ? (COOKIE_FIRST_AUTH_ENABLED ? null : getStoredSessionToken())
      : options.token;
  const startedAt = performance.now();

  let csrfToken: string | null = null;
  if (!options.skipCsrf && isUnsafeMethod(options.method)) {
    csrfToken = await ensureCsrfToken();
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: options.method || "GET",
      cache: options.cache,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(csrfToken ? { [CSRF_HEADER_NAME]: csrfToken } : {}),
        ...(resolvedToken ? { Authorization: `Bearer ${resolvedToken}` } : {}),
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
  } catch (error) {
    console.warn(`API network error for ${path}:`, error);
    throw new Error("تعذر الاتصال بالخادم الآن. تحقق من الإنترنت أو جرّب مرة أخرى.");
  }

  const durationMs = Math.round(performance.now() - startedAt);
  const shouldLogPerf =
    durationMs > 1000 &&
    ((import.meta as ImportMeta & { env?: { DEV?: boolean } }).env?.DEV ||
      (globalThis as { __ALMEAA_PERF_DEBUG__?: boolean }).__ALMEAA_PERF_DEBUG__);
  if (shouldLogPerf) {
    console.info(`[almeaa:api] ${path} ${response.status} ${durationMs}ms`);
  }

  if (!response.ok) {
    const rawError = await response.text().catch(() => "");
    let message = "تعذر تنفيذ الطلب الآن.";
    const rawCsrfFailure =
      response.status === 403 && /csrf|invalid csrf token|CSRF_TOKEN_INVALID/i.test(String(rawError || ""));
    if (rawCsrfFailure && !options.skipCsrf && isUnsafeMethod(options.method) && !retryingAfterCsrfRefresh) {
      storeCsrfToken(null);
      await ensureCsrfToken();
      return request<T>(path, options, true);
    }
    if (rawError) {
      try {
        const payload = JSON.parse(rawError) as { message?: string; error?: string; code?: string };
        const isCsrfFailure =
          response.status === 403 &&
          (payload.code === "CSRF_TOKEN_INVALID" || /csrf/i.test(String(payload.message || payload.error || "")));
        if (isCsrfFailure && !options.skipCsrf && isUnsafeMethod(options.method) && !retryingAfterCsrfRefresh) {
          storeCsrfToken(null);
          await ensureCsrfToken();
          return request<T>(path, options, true);
        }
        message = payload.message || payload.error || message;
      } catch {
        message = rawError.slice(0, 240);
      }
    }
    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const raw = await response.text();
  if (!raw) {
    return undefined as T;
  }

  return JSON.parse(raw) as T;
}

const readPublicCache = <T>(key: string): T | null => {
  const storage = getPublicCacheStorage();
  if (!storage) {
    return null;
  }

  try {
    const raw = storage.getItem(`${PUBLIC_CACHE_PREFIX}${key}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { expiresAt?: number; value?: T };
    if (!parsed.expiresAt || parsed.expiresAt < Date.now()) {
      storage.removeItem(`${PUBLIC_CACHE_PREFIX}${key}`);
      return null;
    }
    return parsed.value ?? null;
  } catch {
    return null;
  }
};

const getStoredSessionRole = (): string | null => {
  try {
    const raw = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as { role?: string; user?: { role?: string } };
    return parsed.role || parsed.user?.role || null;
  } catch {
    return null;
  }
};

const canUsePublicLearningCache = () => !["admin", "teacher", "supervisor"].includes(getStoredSessionRole() || "");

const writePublicCache = <T>(key: string, value: T, ttlMs: number) => {
  const storage = getPublicCacheStorage();
  if (!storage) {
    return;
  }

  try {
    storage.setItem(
      `${PUBLIC_CACHE_PREFIX}${key}`,
      JSON.stringify({ expiresAt: Date.now() + ttlMs, value }),
    );
  } catch {
    // Cache is an optimization only; storage quota/private mode should never break the app.
  }
};

const clearPublicCache = (key?: string) => {
  const storage = getPublicCacheStorage();
  if (!storage) {
    return;
  }

  try {
    if (key) {
      storage.removeItem(`${PUBLIC_CACHE_PREFIX}${key}`);
      return;
    }

    const keysToRemove: string[] = [];
    for (let index = 0; index < storage.length; index += 1) {
      const itemKey = storage.key(index);
      if (itemKey?.startsWith(PUBLIC_CACHE_PREFIX)) {
        keysToRemove.push(itemKey);
      }
    }

    keysToRemove.forEach((itemKey) => storage.removeItem(itemKey));
  } catch {
    // Cache invalidation is best-effort and must never block a successful mutation.
  }
};

const requestCached = async <T>(path: string, cacheKey: string, ttlMs = PUBLIC_CACHE_TTL_MS): Promise<T> => {
  const cached = readPublicCache<T>(cacheKey);
  if (cached) {
    void request<T>(path)
      .then((fresh) => writePublicCache(cacheKey, fresh, ttlMs))
      .catch((error) => {
        console.warn(`Public cache refresh failed for ${path}:`, error);
      });
    return cached;
  }

  const fresh = await request<T>(path);
  writePublicCache(cacheKey, fresh, ttlMs);
  return fresh;
};

const extractList = <T = unknown>(payload: unknown, key: string): T[] => {
  if (Array.isArray(payload)) {
    return payload as T[];
  }

  if (payload && typeof payload === "object") {
    const value = (payload as Record<string, unknown>)[key];
    return Array.isArray(value) ? (value as T[]) : [];
  }

  return [];
};

const withQuery = (path: string, query?: Record<string, string | number | boolean | undefined | null>) => {
  const entries = Object.entries(query || {}).filter(([, value]) => value !== undefined && value !== null && value !== "");
  if (!entries.length) {
    return path;
  }

  const search = new URLSearchParams();
  entries.forEach(([key, value]) => {
    search.set(key, String(value));
  });
  return `${path}?${search.toString()}`;
};

export const api = {
  baseUrl: API_BASE_URL,
  health: () => request<{ status: string; database: string; timestamp: string }>("/health"),
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
      withQuery("/auth/admin/users", { limit: 200, ...pagination }),
    );

    return {
      ...payload,
      users: extractList(payload, "users"),
      pagination: payload.pagination || {
        page: 1,
        limit: 200,
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
  updateMyPreferences: (payload: { favorites?: string[]; reviewLater?: string[]; enrolledPaths?: string[] }, token?: string | null) =>
    request<{ user: unknown }>("/auth/me/preferences", {
      method: "PATCH",
      body: payload,
      token,
    }),
  createLearningBackup: () =>
    request<unknown>("/backups/learning"),
  getLearningBackupStatus: (token?: string | null) =>
    request<unknown>("/backups/learning/status", {
      token,
    }),
  createLearningBackupSnapshot: (payload?: { title?: string }, token?: string | null) =>
    request<unknown>("/backups/learning/snapshots", {
      method: "POST",
      body: payload || {},
      token,
    }),
  listLearningBackupSnapshots: (token?: string | null) =>
    request<{ snapshots: unknown[] }>("/backups/learning/snapshots", {
      token,
    }),
  listLearningBackupActivity: (token?: string | null) =>
    request<{ activities: unknown[] }>("/backups/learning/activity", {
      token,
    }),
  getLearningBackupSnapshot: (id: string, token?: string | null) =>
    request<{ snapshot: unknown; backup: unknown }>(`/backups/learning/snapshots/${id}`, {
      token,
    }),
  restoreLearningBackupSnapshot: (
    id: string,
    payload: { apply?: boolean; replace?: boolean; confirmText?: string },
    token?: string | null,
  ) =>
    request<unknown>(`/backups/learning/snapshots/${id}/restore`, {
      method: "POST",
      body: payload,
      token,
    }),
  deleteLearningBackupSnapshot: (id: string, token?: string | null) =>
    request<{ ok: boolean }>(`/backups/learning/snapshots/${id}`, {
      method: "DELETE",
      token,
    }),
  restoreLearningBackup: (
    payload: { backup: unknown; apply?: boolean; replace?: boolean; confirmText?: string },
    token?: string | null,
  ) =>
    request<unknown>("/backups/learning/restore", {
      method: "POST",
      body: payload,
      token,
    }),
  redeemAccessCode: (payload: { code: string }, token?: string | null) =>
    request<{ user: unknown; accessCode: unknown; package: unknown }>("/auth/me/redeem-access-code", {
      method: "POST",
      body: payload,
      token,
    }),
  getPaymentSettings: (token?: string | null) =>
    request<unknown>("/payments/settings", {
      token,
    }),
  updatePaymentSettings: (payload: unknown, token?: string | null) =>
    request<unknown>("/payments/settings", {
      method: "PATCH",
      body: payload,
      token,
    }),
  getPaymentCountryPresets: (token?: string | null) =>
    request<unknown>("/payments/settings/presets", {
      token,
    }),
  applyPaymentCountryPreset: (country: "SA" | "EG", token?: string | null) =>
    request<unknown>("/payments/settings/apply-country-preset", {
      method: "POST",
      body: { country },
      token,
    }),
  getPaymentRequests: async (
      token?: string | null,
      pagination: PaginationOptions & {
        status?: string;
        search?: string;
        paymentCountry?: string | "all";
        paymentMethod?: string | "all";
      } = {},
    ) => {
    const payload = await request<{ requests: unknown[]; pagination?: unknown }>(withQuery("/payments/requests", { limit: 50, ...pagination }), {
      token,
    });
    return { ...payload, requests: extractList(payload, "requests") };
  },
  createPaymentRequest: (payload: unknown, token?: string | null) =>
    request<{ request: unknown }>("/payments/requests", {
      method: "POST",
      body: payload,
      token,
    }),
  previewDiscountCode: (payload: unknown, token?: string | null) =>
    request<{ valid: boolean; code?: string; label?: string; originalAmount: number; discountAmount: number; finalAmount: number; message?: string }>("/payments/discount-codes/preview", {
      method: "POST",
      body: payload,
      token,
    }),
  reviewPaymentRequest: (id: string, payload: unknown, token?: string | null) =>
    request<{ request: unknown; user?: unknown }>(`/payments/requests/${id}/review`, {
      method: "PATCH",
      body: payload,
      token,
    }),
  updateMyPaymentRequest: (id: string, payload: unknown, token?: string | null) =>
    request<{ request: unknown }>(`/payments/requests/${id}`, {
      method: "PATCH",
      body: payload,
      token,
    }),
  getPaymentRequestsSummary: (token?: string | null) =>
    request<unknown>("/payments/requests/summary", {
      token,
    }),
  getDiscountCodes: async (
    token?: string | null,
    pagination: PaginationOptions & { status?: string; search?: string } = {},
  ) => {
    const payload = await request<{ codes: unknown[] }>(withQuery("/payments/discount-codes", { limit: 200, ...pagination }), {
      token,
    });
    return { ...payload, codes: extractList(payload, "codes") };
  },
  createDiscountCode: (payload: unknown, token?: string | null) =>
    request<{ code: unknown }>("/payments/discount-codes", {
      method: "POST",
      body: payload,
      token,
    }),
  updateDiscountCode: (code: string, payload: unknown, token?: string | null) =>
    request<{ code: unknown }>(`/payments/discount-codes/${encodeURIComponent(code)}`, {
      method: "PATCH",
      body: payload,
      token,
    }),
  getTaxonomyBootstrap: (phase: "full" | "core" = "full") =>
    requestCached<{ paths: unknown[]; levels: unknown[]; subjects: unknown[]; sections: unknown[]; skills: unknown[] }>(
      withQuery("/taxonomy/bootstrap", { phase }),
      `taxonomy-bootstrap:${phase}`,
      BOOTSTRAP_CACHE_TTL_MS,
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
    }>(withQuery("/content/bootstrap", { scope: "full" }), "content-bootstrap:full", BOOTSTRAP_CACHE_TTL_MS),
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
    }>(withQuery("/content/bootstrap", { scope, phase }), `content-bootstrap:${scope}:${phase}`, BOOTSTRAP_CACHE_TTL_MS),
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
    }>("/content/bootstrap/minimal", "content-bootstrap:minimal", BOOTSTRAP_CACHE_TTL_MS),
  getHomepageSettings: (token?: string | null) =>
    token
      ? request<unknown>("/content/homepage-settings", {
          token,
          cache: "no-store",
        })
      : requestCached<unknown>("/content/homepage-settings", "homepage-settings", PUBLIC_CACHE_TTL_MS),
  getPublicAnnouncementAds: () =>
    requestCached<{ announcementAds: unknown[] }>("/content/announcement-ads", "announcement-ads", PUBLIC_CACHE_TTL_MS),
  updateHomepageSettings: async (payload: unknown, token?: string | null) => {
    const response = await request<unknown>("/content/homepage-settings", {
      method: "PATCH",
      body: payload,
      token,
    });
    clearPublicCache("homepage-settings");
    writePublicCache("homepage-settings", response, PUBLIC_CACHE_TTL_MS);
    return response;
  },
  getPlatformFontSettings: (token?: string | null) =>
    request<unknown>("/content/platform-font-settings", {
      token,
      cache: "no-store",
    }),
  updatePlatformFontSettings: (payload: unknown, token?: string | null) =>
    request<unknown>("/content/platform-font-settings", {
      method: "PATCH",
      body: payload,
      token,
    }),
  getPlatformIntegrations: (token?: string | null) =>
    request<unknown>("/content/platform-integrations", {
      token,
      cache: "no-store",
    }),
  updatePlatformIntegrations: (payload: unknown, token?: string | null) =>
    request<unknown>("/content/platform-integrations", {
      method: "PATCH",
      body: payload,
      token,
    }),
  getPlatformIntegrationsHistory: (token?: string | null) =>
    request<{ history: Array<{ _id: string; updatedBy?: string; note?: string; createdAt?: string }> }>(
      "/content/platform-integrations/history",
      { token },
    ),
  restorePlatformIntegrationsHistory: (id: string, token?: string | null) =>
    request<{ settings: unknown; restoredFrom: string }>(`/content/platform-integrations/history/${id}/restore`, {
      method: "POST",
      body: {},
      token,
    }),
  getPlatformIntegrationsSetupChecklist: (token?: string | null) =>
    request<{
      publicBaseUrl: string;
      apiBaseUrl: string;
      summary: { total: number; enabled: number; configuredEnabled: number; blockers: string[] };
      checks: Array<{
        id: string;
        title: string;
        envKeys: string[];
        callbackUrl: string;
        webhookUrl: string;
        enabled: boolean;
        isConfigured: boolean;
        notes: string;
      }>;
    }>("/content/platform-integrations/setup-checklist", {
      token,
      cache: "no-store",
    }),
  getPlatformIntegrationsRuntimeAudit: (token?: string | null) =>
    request<{
      summary: { total: number; enabled: number; runtimeReady: number; blocked: string[] };
      items: Array<{
        id: string;
        title: string;
        enabled: boolean;
        dbConfigured: boolean;
        envConfigured: boolean;
        runtimeReady: boolean;
        health?: { ok: boolean; status: string; latencyMs: number | null; error: string };
      }>;
    }>("/content/platform-integrations/runtime-audit", {
      token,
      cache: "no-store",
    }),
  testIntegrationDelivery: (
    payload: {
      channel: "email" | "whatsapp";
      recipientEmail?: string;
      recipientPhone?: string;
      subject?: string;
      title?: string;
      body?: string;
    },
    token?: string | null,
  ) =>
    request<{ ok: boolean; provider: string; providerMessageId?: string; failureReason?: string }>(
      "/notifications/admin/test-delivery",
      {
        method: "POST",
        body: payload,
        token,
      },
    ),
  getMyNotifications: (pagination?: { page?: number; limit?: number }, token?: string | null) =>
    request<unknown>(withQuery("/notifications/me", pagination || {}), { token }),
  getMyActivities: (pagination?: { limit?: number }, token?: string | null) =>
    request<{ activities: unknown[] }>(withQuery("/activities/me", pagination || {}), { token, cache: "no-store" }),
  createMyActivity: (
    payload: {
      type: "course_view" | "lesson_complete" | "quiz_complete" | "skill_practice" | "session_booked";
      title: string;
      link?: string;
      targetLabel?: string;
      scheduledDate?: string;
      scheduledTime?: string;
      notes?: string;
    },
    token?: string | null,
  ) =>
    request<{ activity: unknown }>("/activities/me", {
      method: "POST",
      body: payload,
      token,
    }),
  getAdminSessionBookings: (params?: { status?: "all" | "pending" | "confirmed" | "cancelled"; limit?: number }, token?: string | null) =>
    request<{ bookings: unknown[] }>(withQuery("/activities/admin/session-bookings", params || {}), {
      token,
      cache: "no-store",
    }),
  updateAdminSessionBooking: (
    id: string,
    payload: {
      bookingStatus?: "pending" | "confirmed" | "cancelled";
      assignedTeacherName?: string;
      adminNotes?: string;
    },
    token?: string | null,
  ) =>
    request<{ booking: unknown }>(`/activities/admin/session-bookings/${id}`, {
      method: "PATCH",
      body: payload,
      token,
    }),
  markNotificationRead: (id: string, token?: string | null) =>
    request<unknown>(`/notifications/${id}/read`, {
      method: "PATCH",
      body: {},
      token,
    }),
  getNotificationTemplates: (pagination?: { page?: number; limit?: number }, token?: string | null) =>
    request<unknown>(withQuery("/notifications/admin/templates", pagination || {}), { token }),
  upsertNotificationTemplate: (payload: unknown, token?: string | null) =>
    request<unknown>("/notifications/admin/templates", {
      method: "POST",
      body: payload,
      token,
    }),
  getNotificationDeliveries: (
    params?: { page?: number; limit?: number; status?: "pending" | "sent" | "failed" | "retrying"; channel?: "in_app" | "email" | "whatsapp" },
    token?: string | null,
  ) => request<unknown>(withQuery("/notifications/admin/deliveries", params || {}), { token }),
  sendNotifications: (
    payload: {
      templateKey?: string;
      title?: string;
      subject?: string;
      body?: string;
      channels: Array<"in_app" | "email" | "whatsapp">;
      userIds?: string[];
      roles?: string[];
      variables?: Record<string, string | number | boolean | null>;
    },
    token?: string | null,
  ) =>
    request<unknown>("/notifications/admin/send", {
      method: "POST",
      body: payload,
      token,
    }),
  processPendingNotifications: (payload?: { limit?: number }, token?: string | null) =>
    request<unknown>("/notifications/admin/process-pending", {
      method: "POST",
      body: payload || {},
      token,
    }),
  getPublicContactWidget: () =>
    requestCached<{
      enabled: boolean;
      channel: "whatsapp" | "telegram" | "phone";
      whatsappNumber: string;
      whatsappMessage: string;
      openInNewTab: boolean;
      showOnPublicPages: boolean;
      showOnDashboardPages: boolean;
    }>("/content/public-contact-widget", "public-contact-widget", PUBLIC_CACHE_TTL_MS),
  createTopic: (payload: unknown, token?: string | null) =>
    request<unknown>("/content/topics", {
      method: "POST",
      body: payload,
      token,
    }),
  updateTopic: (id: string, payload: unknown, token?: string | null) =>
    request<unknown>(`/content/topics/${id}`, {
      method: "PATCH",
      body: payload,
      token,
    }),
  deleteTopic: (id: string, token?: string | null) =>
    request<{ success: boolean }>(`/content/topics/${id}`, {
      method: "DELETE",
      token,
    }),
  createLesson: (payload: unknown, token?: string | null) =>
    request<unknown>("/content/lessons", {
      method: "POST",
      body: payload,
      token,
    }),
  updateLesson: (id: string, payload: unknown, token?: string | null) =>
    request<unknown>(`/content/lessons/${id}`, {
      method: "PATCH",
      body: payload,
      token,
    }),
  deleteLesson: (id: string, token?: string | null) =>
    request<{ success: boolean }>(`/content/lessons/${id}`, {
      method: "DELETE",
      token,
    }),
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
  createGroup: (payload: unknown, token?: string | null) =>
    request<unknown>("/content/groups", {
      method: "POST",
      body: payload,
      token,
    }),
  updateGroup: (id: string, payload: unknown, token?: string | null) =>
    request<unknown>(`/content/groups/${id}`, {
      method: "PATCH",
      body: payload,
      token,
    }),
  deleteGroup: (id: string, token?: string | null) =>
    request<{ success: boolean }>(`/content/groups/${id}`, {
      method: "DELETE",
      token,
    }),
  createB2BPackage: (payload: unknown, token?: string | null) =>
    request<unknown>("/content/b2b-packages", {
      method: "POST",
      body: payload,
      token,
    }),
  updateB2BPackage: (id: string, payload: unknown, token?: string | null) =>
    request<unknown>(`/content/b2b-packages/${id}`, {
      method: "PATCH",
      body: payload,
      token,
    }),
  deleteB2BPackage: (id: string, token?: string | null) =>
    request<{ success: boolean }>(`/content/b2b-packages/${id}`, {
      method: "DELETE",
      token,
    }),
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
  getAccessCodes: (
    params?: {
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
    },
    token?: string | null,
  ) => {
    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(params || {})) {
      if (value !== undefined && value !== null && String(value).trim()) {
        searchParams.set(key, String(value));
      }
    }
    const query = searchParams.toString();
    return request<unknown>(`/content/access-codes${query ? `?${query}` : ""}`, { token });
  },
  getAccessCodeRedemptions: (
    params?: {
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
    },
    token?: string | null,
  ) => {
    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(params || {})) {
      if (value !== undefined && value !== null && String(value).trim()) {
        searchParams.set(key, String(value));
      }
    }
    const query = searchParams.toString();
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
  createStudyPlan: (payload: unknown, token?: string | null) =>
    request<unknown>("/content/study-plans", {
      method: "POST",
      body: payload,
      token,
    }),
  updateStudyPlan: (id: string, payload: unknown, token?: string | null) =>
    request<unknown>(`/content/study-plans/${id}`, {
      method: "PATCH",
      body: payload,
      token,
    }),
  deleteStudyPlan: (id: string, token?: string | null) =>
    request<{ success: boolean }>(`/content/study-plans/${id}`, {
      method: "DELETE",
      token,
    }),
  getSchoolReport: (id: string, token?: string | null) =>
    request<unknown>(`/content/schools/${id}/report`, {
      token,
    }),
  importSchoolStudents: (id: string, payload: unknown, token?: string | null) =>
    request<unknown>(`/content/schools/${id}/import-students`, {
      method: "POST",
      body: payload,
      token,
    }),
  applySchoolRelations: (id: string, payload: unknown, token?: string | null) =>
    request<unknown>(`/content/schools/${id}/relations`, {
      method: "POST",
      body: payload,
      token,
    }),
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
      ? await requestCached<unknown>(path, cacheKey, BOOTSTRAP_CACHE_TTL_MS)
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
  getQuestions: async (params?: { page?: number; limit?: number; ids?: string; pathId?: string; subject?: string; sectionId?: string; skillId?: string; search?: string; approvalStatus?: string; summary?: boolean; noTotal?: boolean }) => {
    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(params || {})) {
      if (value !== undefined && value !== null && String(value).trim()) {
        searchParams.set(key, String(value));
      }
    }
    const query = searchParams.toString();
    const payload = await request<unknown>(`/quizzes/questions${query ? `?${query}` : ""}`);
    return extractList(payload, "data");
  },
  getQuestionsPaginated: (params?: { page?: number; limit?: number; ids?: string; pathId?: string; subject?: string; sectionId?: string; skillId?: string; search?: string; approvalStatus?: string; summary?: boolean; noTotal?: boolean }) => {
    const query = withQuery("/quizzes/questions", { ...(params || {}), paginate: true });
    return request<{ data: unknown[]; pagination: PaginationMeta }>(query);
  },
  createQuestion: (payload: unknown, token?: string | null) =>
    request<unknown>("/quizzes/questions", {
      method: "POST",
      body: payload,
      token,
    }),
  updateQuestion: (id: string, payload: unknown, token?: string | null) =>
    request<unknown>(`/quizzes/questions/${id}`, {
      method: "PATCH",
      body: payload,
      token,
    }),
  deleteQuestion: (id: string, token?: string | null) =>
    request<{ success: boolean }>(`/quizzes/questions/${id}`, {
      method: "DELETE",
      token,
    }),
  getQuizzes: async (pagination: PaginationOptions = {}) =>
    extractList(await request<unknown>(withQuery("/quizzes", { limit: 200, ...pagination })), "quizzes"),
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
  submitQuiz: (id: string, payload: { answers: Record<string, number>; timeSpentSeconds?: number; source?: string }, token?: string | null) =>
    request<unknown>(`/quizzes/${id}/submit`, {
      method: "POST",
      body: payload,
      token,
    }),
  getQuizResults: async (pagination: QuizResultsPaginationOptions = {}) =>
    extractList(await request<unknown>(withQuery("/quizzes/results", { limit: 100, noTotal: true, ...pagination })), "results"),
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
  aiChat: (payload: { message: string; image?: { data: string; mimeType: string } }, token?: string | null) =>
    request<{
      text: string;
      personalized?: boolean;
      weaknessesCount?: number;
      provider?: "gemini" | "openrouter" | "deepseek" | "qwen" | "openai" | "ollama" | "lmstudio" | "none";
      model?: string;
      usedFallback?: boolean;
      providerErrors?: string[];
      fallbackReason?: string;
    }>("/ai/chat", {
      method: "POST",
      body: payload,
      token,
    }),
  aiStatus: (token?: string | null) =>
    request<{
      provider: "gemini" | "openrouter" | "deepseek" | "qwen" | "openai" | "ollama" | "lmstudio" | "none";
      ollamaConfigured: boolean;
      lmStudioConfigured?: boolean;
      geminiConfigured: boolean;
      providers?: Array<{
        id: "gemini" | "openrouter" | "deepseek" | "qwen" | "openai" | "ollama" | "lmstudio" | "none";
        label: string;
        model: string;
        configured: boolean;
        source: "env" | "admin" | "runtime-local" | "fallback";
        category: "free-friendly" | "paid" | "local" | "fallback";
        envKeys: string[];
        note: string;
      }>;
      providerOrder?: string[];
      providerOrderSource?: "env" | "admin";
      routingMode?: "manual" | "auto";
      model: string;
      timeoutMs: number;
    }>("/ai/status", { token }),
  aiReadiness: (token?: string | null) =>
    request<{
      checkedAt: string;
      score: number;
      activeProvider: "gemini" | "openrouter" | "deepseek" | "qwen" | "openai" | "ollama" | "lmstudio" | "none";
      configuredProviders: Array<{ id: string; label: string; model: string }>;
      recommendedProviderOrder: string;
      studentAdvisor: {
        ready: boolean;
        studentCount: number;
        studentsWithResults: number;
        weakSkillSignals: number;
        studentChats24h: number;
        personalizedStudentChats7d: number;
        fallbackStudentChats24h: number;
      };
      adminAssistant: {
        ready: boolean;
        chats24h: number;
      };
      monitoring: {
        aiErrors24h: number;
        fallbackStudentChats24h: number;
      };
      nextActions: string[];
    }>("/ai/readiness", { token }),
  aiTestProvider: (payload: { provider: "gemini" | "openrouter" | "deepseek" | "qwen" | "openai" | "ollama" | "lmstudio" }, token?: string | null) =>
    request<{ ok: boolean; provider: string; model?: string; latencyMs?: number; sample?: string; message?: string }>("/ai/providers/test", {
      method: "POST",
      body: payload,
      token,
    }),
  aiAdminAssistant: (payload: { message: string }, token?: string | null) =>
    request<{
      text: string;
      provider: "gemini" | "openrouter" | "deepseek" | "qwen" | "openai" | "ollama" | "lmstudio" | "none";
      audit: {
        score: number;
        totals: { checks: number; issues: number; critical: number; warnings: number; info: number };
        priorities: unknown[];
      };
    }>("/ai/admin-assistant", {
      method: "POST",
      body: payload,
      token,
    }),
  getAiInteractions: (limit = 20, token?: string | null) =>
    request<{
      summary: {
        total: number;
        last24h: number;
        fallbackCount: number;
        errorCount: number;
        byAudience: Array<{ audience: string; count: number }>;
        byProvider: Array<{ provider: string; count: number; avgLatencyMs: number }>;
      };
      items: Array<{
        _id: string;
        audience: string;
        endpoint: string;
        provider: "gemini" | "openrouter" | "deepseek" | "qwen" | "openai" | "ollama" | "lmstudio" | "none";
        model: string;
        status: "success" | "fallback" | "error";
        usedFallback: boolean;
        personalized: boolean;
        latencyMs: number;
        messagePreview: string;
        responsePreview: string;
        responseLength: number;
        error?: string;
        metadata?: {
          providerErrors?: string[];
          fallbackReason?: string;
          hasImage?: boolean;
          [key: string]: unknown;
        };
        userEmail?: string;
        role?: string;
        createdAt: string;
      }>;
    }>(`/ai/interactions?limit=${limit}`, { token }),
  getOperationalStatus: (token?: string | null) =>
    request<{
      checkedAt: string;
      database: { status: string; name: string };
      counts: Record<string, number>;
      visible: Record<string, number>;
      learningReadiness: {
        score: number;
        usableSpaces: number;
        emptySpaces: number;
        spaces: Array<{
          pathId: string;
          pathName?: string;
          subjectId: string;
          subjectName: string;
          total: number;
          topics: number;
          lessons: number;
          quizzes: number;
          courses: number;
          library: number;
          issueCount?: number;
          missingLessonRefs?: number;
          missingQuizRefs?: number;
          unplayableLinkedLessons?: number;
          status?: "ready" | "needs_attention" | "empty";
        }>;
        readySpaces?: number;
        spacesNeedingAttention?: number;
      };
      issues: {
        missingTopicSubjects: number;
        missingLessonRefs: number;
        missingQuizRefs: number;
        unplayableLinkedLessons: number;
      };
      deployment: {
        api: string;
        database: string;
        frontend: string;
        nodeEnv: string;
        clientUrl: string;
      };
    }>("/operations/status", { token }),
  getOperationsAudit: (token?: string | null) =>
    request<{
      checkedAt: string;
      score: number;
      totals: {
        checks: number;
        issues: number;
        critical: number;
        warnings: number;
        info: number;
      };
      inventory: Record<string, number>;
      areaSummary: Record<string, { total: number; issues: number; critical: number }>;
      checks: Array<{
        id: string;
        area: string;
        severity: "critical" | "warning" | "info" | "success";
        title: string;
        detail: string;
        count: number;
        action: string;
        owner: string;
        routeHint?: string;
        samples?: string[];
      }>;
      priorities: Array<{
        id: string;
        area: string;
        severity: "critical" | "warning" | "info" | "success";
        title: string;
        detail: string;
        count: number;
        action: string;
        owner: string;
        routeHint?: string;
        samples?: string[];
      }>;
    }>("/operations/audit", { token }),
  getDeliveryReadiness: (token?: string | null) =>
    request<{
      checkedAt: string;
      score: number;
      status: "ready" | "ready_with_notes" | "blocked";
      summary: {
        failed: number;
        warnings: number;
        passed: number;
        auditScore: number;
        latestBackupAt: string;
        backupAgeHours: number | null;
        clientErrors24h: number;
        aiErrors24h: number;
      };
      checks: Array<{
        id: string;
        title: string;
        status: "pass" | "warning" | "fail";
        detail: string;
        action: string;
        routeHint?: string;
      }>;
      nextActions: Array<{
        id: string;
        title: string;
        action: string;
        routeHint?: string;
      }>;
    }>("/operations/delivery-readiness", { token }),
  getIntegrationsReadiness: (token?: string | null) =>
    request<{
      checkedAt: string;
      score: number;
      status: "ready" | "ready_with_notes" | "blocked";
      checks: Array<{
        id: string;
        title: string;
        status: "pass" | "warning" | "fail";
        detail: string;
        requiredEnv: string[];
      }>;
      summary: {
        failed: number;
        warnings: number;
        passed: number;
      };
    }>("/operations/integrations-readiness", { token }),
  getAdminAuditLogs: (limit = 50, token?: string | null) =>
    request<{
      logs: Array<{
        _id: string;
        actorId?: string;
        actorEmail?: string;
        actorRole?: string;
        action: string;
        resourceType?: string;
        resourceId?: string;
        status: "success" | "blocked" | "failed";
        metadata?: Record<string, unknown>;
        createdAt: string;
      }>;
      summary: {
        blockedCount24h: number;
        failedCount24h: number;
      };
    }>(`/operations/admin-audit-logs?limit=${limit}`, { token }),
  getSeoStatus: (token?: string | null) =>
    request<{
      checkedAt: string;
      siteUrl: string;
      sitemapUrl: string;
      robotsUrl: string;
      manifestUrl: string;
      indexableRoutes: number;
      paths: number;
      subjects: number;
      warnings: string[];
      sampleRoutes: Array<{ title: string; loc: string }>;
    }>("/seo/status", { token }),
  runOperationsRepair: (
    payload: {
      action:
        | "hide-empty-published-quizzes"
        | "hide-empty-active-paths"
        | "unlink-unavailable-topic-lessons"
        | "unlink-unavailable-topic-quizzes";
      apply?: boolean;
    },
    token?: string | null,
  ) =>
    request<{
      action: string;
      applied: boolean;
      affected: number;
      message: string;
      samples: Array<{ id: string; title: string }>;
    }>("/operations/repair", {
      method: "POST",
      body: payload,
      token,
    }),
  recordClientEvent: (
    payload: {
      severity?: "info" | "warning" | "error";
      source?: "app" | "error-boundary" | "unhandled-error" | "unhandled-rejection" | "video-player" | "api" | "manual";
      message: string;
      stack?: string;
      path?: string;
      appVersion?: string;
      userAgent?: string;
      metadata?: Record<string, unknown>;
    },
    token?: string | null,
  ) =>
    request<{ ok: boolean }>("/operations/client-events", {
      method: "POST",
      body: payload,
      token,
    }),
  getClientEvents: (limit = 25, token?: string | null) =>
    request<{
      events: Array<{
        _id: string;
        severity: "info" | "warning" | "error";
        source: string;
        message: string;
        stack?: string;
        path?: string;
        appVersion?: string;
        userAgent?: string;
        userId?: string;
        userEmail?: string;
        role?: string;
        metadata?: Record<string, unknown>;
        resolved?: boolean;
        resolvedAt?: string | null;
        resolvedByEmail?: string;
        createdAt: string;
      }>;
      summary: {
        unresolvedCount: number;
        last24hCount: number;
      };
    }>(`/operations/client-events?limit=${limit}`, { token }),
  resolveClientEvent: (id: string, token?: string | null) =>
    request<{ ok: boolean; event: unknown }>(`/operations/client-events/${id}/resolve`, {
      method: "PATCH",
      token,
    }),
  resolveClientEvents: (
    payload?: {
      severity?: "info" | "warning" | "error";
      source?: "app" | "error-boundary" | "unhandled-error" | "unhandled-rejection" | "video-player" | "api" | "manual";
    },
    token?: string | null,
  ) =>
    request<{ ok: boolean; matchedCount: number; modifiedCount: number }>("/operations/client-events/resolve-all", {
      method: "POST",
      body: payload || {},
      token,
    }),
  aiStudyPlan: (payload: { weaknesses: string[] }, token?: string | null) =>
    request<{ steps: string[] }>("/ai/study-plan", {
      method: "POST",
      body: payload,
      token,
    }),
  aiLearningPath: (payload: { skills: unknown[] }, token?: string | null) =>
    request<unknown[]>("/ai/learning-path", {
      method: "POST",
      body: payload,
      token,
    }),
  aiRemediationPlan: (payload: { skills: unknown[]; ageBand?: "primary" | "middle" | "secondary" | "general" }, token?: string | null) =>
    request<{
      title?: string;
      summary?: string;
      steps?: Array<{ day?: string; skill?: string; action?: string; check?: string }>;
      parentNote?: string;
    }>("/ai/remediation-plan", {
      method: "POST",
      body: payload,
      token,
    }),
  aiQuestion: (payload: { topic: string }, token?: string | null) =>
    request<unknown>("/ai/question", {
      method: "POST",
      body: payload,
      token,
    }),
  aiCourseSummary: (payload: { courseTitle: string }, token?: string | null) =>
    request<{ text: string }>("/ai/course-summary", {
      method: "POST",
      body: payload,
      token,
    }),
  aiGenerateMockExam: (
    payload: { studentId?: string; examType: "qudurat" | "tahsili"; weakSkills?: string[] },
    token?: string | null,
  ) =>
    request<{
      ok: boolean;
      quizId: string;
      title: string;
      examType: "qudurat" | "tahsili";
      questionCount: number;
      weakSkillsUsed: string[];
      targetStudentId: string;
    }>("/ai/generate-mock-exam", {
      method: "POST",
      body: payload,
      token,
    }),
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
  getDiscussions: (entityType: "lesson" | "quiz" | "course", entityId: string, token?: string | null) =>
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
    entityType: "lesson" | "quiz" | "course",
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
};

export { API_BASE_URL };
