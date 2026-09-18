import {
  extractList,
  withQuery,
  type PaginatedResponseShape,
  type PaginationOptions,
} from './apiQueryUtilities';
import { createAiApi } from './apiGroups/aiApi';
import { createAnnouncementAdsApi } from './apiGroups/announcementAdsApi';
import { createAccessCodesApi } from './apiGroups/accessCodesApi';
import { createAuthApi } from './apiGroups/authApi';
import { createCoursesApi } from './apiGroups/coursesApi';
import { createLearningSupportApi } from './apiGroups/learningSupportApi';
import { createLibraryItemsApi } from './apiGroups/libraryItemsApi';
import { createOperationsApi } from './apiGroups/operationsApi';
import { createPaymentsApi } from './apiGroups/paymentsApi';
import { createQuestionsApi } from './apiGroups/questionsApi';
import { createQuizzesApi } from './apiGroups/quizzesApi';
import { createTaxonomyContentApi } from './apiGroups/taxonomyContentApi';
import { createStudyPlansApi } from './apiGroups/studyPlansApi';

const runtimeEnv = (import.meta as ImportMeta & { env?: Record<string, string | boolean> }).env;
const runtimeHostname = (globalThis as { location?: { hostname?: string } }).location?.hostname || "";
const isLocalhost = ["localhost", "127.0.0.1"].includes(runtimeHostname);

// Explicit Environment Flag for Staging.
// Custom white-label production domains and production will not trigger staging behavior.
export const isStagingEnv = !isLocalhost && runtimeEnv?.VITE_APP_ENV === "staging";

const configuredApiBaseUrl =
  (globalThis as { __API_BASE_URL__?: string }).__API_BASE_URL__ ||
  (typeof runtimeEnv?.VITE_API_URL === "string" ? runtimeEnv.VITE_API_URL : "");
const defaultApiBaseUrl = isLocalhost ? "http://localhost:4000/api" : "/api";

// Staging environment uses relative "/api" through Vercel's rewrite proxy
// when VITE_APP_ENV=staging, guaranteeing same-origin transport.
// Localhost and production/custom production domains preserve their configured or default API URL.
const API_BASE_URL = (
  configuredApiBaseUrl || (isStagingEnv ? "/api" : defaultApiBaseUrl)
).replace(/\/$/, "");

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

interface RequestOptions {
  method?: HttpMethod;
  body?: unknown;
  token?: string | null;
  cache?: RequestCache;
  skipCsrf?: boolean;
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

async function downloadText(path: string, token?: string | null) {
  const resolvedToken = token === undefined ? (COOKIE_FIRST_AUTH_ENABLED ? null : getStoredSessionToken()) : token;
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "GET",
    cache: "no-store",
    credentials: "include",
    headers: resolvedToken ? { Authorization: `Bearer ${resolvedToken}` } : undefined,
  });
  if (!response.ok) {
    const raw = await response.text().catch(() => "");
    let message = raw || "تعذر تنزيل الملف.";
    try { const payload = JSON.parse(raw); message = payload.message || payload.error || message; } catch { /* plain-text response */ }
    throw new Error(message);
  }
  return { text: await response.text(), disposition: response.headers.get("content-disposition") || "" };
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

const canUsePublicLearningCache = () => !["admin", "teacher", "supervisor", "school_admin"].includes(getStoredSessionRole() || "");

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

export const api = {
  baseUrl: API_BASE_URL,
  get: <T = unknown>(path: string, token?: string | null) => request<T>(path, { token }),
  post: <T = unknown>(path: string, body: unknown, token?: string | null) => request<T>(path, { method: 'POST', body, token }),
  decideContentReview: (type: string, id: string, body: { decision: "approved" | "rejected"; reviewerNotes: string; publish: boolean }, token?: string | null) =>
    request<unknown>(`/content/review-queue/${encodeURIComponent(type)}/${encodeURIComponent(id)}`, { method: "PATCH", body, token }),
  clearContentBootstrapCache: () => {
    clearPublicCache("content-bootstrap:full");
    clearPublicCache("content-bootstrap:full:full");
    clearPublicCache("content-bootstrap:learning:full");
    clearPublicCache("content-bootstrap:learning:core");
    clearPublicCache("content-bootstrap:minimal");
    clearPublicCache("content-bootstrap:operations");
  },
  /** يمسح كاش bootstrap التصنيفات حتى يُجلب المسار/المادة الجديدة عند إعادة التحميل */
  clearTaxonomyBootstrapCache: () => {
    clearPublicCache("taxonomy-bootstrap:full");
    clearPublicCache("taxonomy-bootstrap:core");
  },
  health: () => request<{ status: string; database: string; timestamp: string }>("/health"),
  ...createAuthApi(request),
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
  ...createPaymentsApi(request),
  ...createTaxonomyContentApi({
    requestCached,
    request,
    clearPublicCache,
    writePublicCache,
    publicCacheTtlMs: PUBLIC_CACHE_TTL_MS,
    bootstrapCacheTtlMs: BOOTSTRAP_CACHE_TTL_MS,
  }),
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
  convertSessionBookingToLiveSession: (
    id: string,
    payload?: {
      provider?: "zoom" | "google_meet" | "teams" | "live_youtube";
      meetingUrl?: string;
      meetingDate?: string;
      duration?: string;
      pathId?: string;
      subjectId?: string;
    },
    token?: string | null,
  ) =>
    request<{ success: boolean; lessonId: string; booking: unknown }>(`/activities/admin/session-bookings/${id}/convert`, {
      method: "POST",
      body: payload || {},
      token,
    }),
  lookupBarcodeTestByPin: (pinCode: string) =>
    request<{ slug: string; title: string; testMode: string; isLiveActive: boolean; publicUrl: string }>(`/public-tests/pin/${pinCode}`),
  controlLiveBarcodeTest: (
    id: string,
    payload: {
      action: "toggle_live" | "next_question" | "prev_question" | "toggle_leaderboard";
      isLiveActive?: boolean;
      showLeaderboard?: boolean;
    },
    token?: string | null,
  ) =>
    request<{ success: boolean; test: unknown }>(`/public-tests/admin/tests/${id}/live-control`, {
      method: "POST",
      body: payload,
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
  sendInterventionAlert: (
    payload: {
      studentId: string;
      studentName?: string;
      skillName?: string;
      mastery?: number;
      title: string;
      body: string;
      channels?: Array<"in_app">;
    },
    token?: string | null,
  ) =>
    request<unknown>("/notifications/intervention-alert", {
      method: "POST",
      body: payload,
      token,
    }),
  sendStudentAlert: (
    payload: {
      studentIds: string[];
      title: string;
      body: string;
      channels?: Array<"in_app">;
    },
    token?: string | null,
  ) =>
    request<unknown>("/notifications/student-alert", {
      method: "POST",
      body: payload,
      token,
    }),
  requestParentWeeklyReport: (token?: string | null) =>
    request<{ ok: boolean; sent: number; studentsReported: number; message?: string }>(
      "/notifications/parent-weekly-report",
      { method: "POST", body: {}, token },
    ),
  processPendingNotifications: (payload?: { limit?: number }, token?: string | null) =>
    request<unknown>("/notifications/admin/process-pending", {
      method: "POST",
      body: payload || {},
      token,
    }),
  // ── إشعارات المستخدم ─────────────────────────────────────────────────────
  getMyNotifications: (params?: { page?: number; limit?: number }, token?: string | null) =>
    request<{ notifications: unknown[]; pagination: unknown }>(
      withQuery("/notifications/me", { limit: 20, ...params }),
      { token },
    ),
  getUnreadCount: (token?: string | null) =>
    request<{ unreadCount: number }>("/notifications/me/unread-count", { token }),
  markNotificationRead: (id: string, token?: string | null) =>
    request<{ notification: unknown }>(`/notifications/${id}/read`, { method: "PATCH", token }),
  markAllNotificationsRead: (token?: string | null) =>
    request<{ modifiedCount: number }>("/notifications/me/read-all", { method: "PATCH", token }),
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
  ...createLibraryItemsApi(request),
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
  getSchoolContract: (schoolId: string, token?: string | null) =>
    request<{ contract: { status: string; modules: string[] } | null }>(`/school-access/contracts/${encodeURIComponent(schoolId)}`, { token }),
  updateSchoolContract: (schoolId: string, payload: unknown, token?: string | null) =>
    request<{ contract: { status: string; modules: string[] } }>(`/school-access/contracts/${encodeURIComponent(schoolId)}`, { method: "PUT", body: payload, token }),
  updateTeachingAssignment: (payload: unknown, token?: string | null) =>
    request<unknown>("/school-access/assignments", { method: "PUT", body: payload, token }),
  getSchoolDirectors: (schoolId: string, token?: string | null) =>
    request<{
      permissions: string[];
      defaults: string[];
      directors: Array<{ userId: string; schoolId: string; status: "active" | "inactive"; permissions: string[]; user: { id?: string; _id?: string; name: string; email: string; role: string; isActive?: boolean } | null }>;
    }>(`/school-access/directors/${encodeURIComponent(schoolId)}`, { token, cache: "no-store" }),
  updateSchoolDirectorAccess: (schoolId: string, userId: string, payload: { status: "active" | "inactive"; permissions: string[] }, token?: string | null) =>
    request<{ membership: unknown }>(`/school-access/directors/${encodeURIComponent(schoolId)}/${encodeURIComponent(userId)}`, { method: "PUT", body: payload, token }),
  getSchoolDirectorWorkspace: (token?: string | null) =>
    request<{ schools: Array<{ schoolId: string; schoolName: string; permissions: string[]; modules: string[]; status: string; updatedAt: string | null }> }>("/school-access/director-workspace", { token, cache: "no-store" }),
  getSchoolDirectorOverview: (schoolId: string, token?: string | null) =>
    request<{ school: { schoolId: string; schoolName: string }; metrics: { students: number; classes: number; teachers: number; supervisors: number; schoolAssessments: number; completedSmartClasses: number }; classes: Array<{ classId: string; className: string }> }>(`/school-access/director/schools/${encodeURIComponent(schoolId)}/overview`, { token, cache: "no-store" }),
  getSchoolDirectorStudents: (schoolId: string, search = '', token?: string | null) =>
    request<{ students: Array<{ studentId: string; name: string; email: string; phone: string; isActive: boolean; classId: string | null; className: string | null }>; total: number }>(`/school-access/director/schools/${encodeURIComponent(schoolId)}/students${search ? `?search=${encodeURIComponent(search)}` : ''}`, { token, cache: "no-store" }),
  addSchoolDirectorStudent: (schoolId: string, payload: { name: string; email: string; password: string; classId: string }, token?: string | null) =>
    request<{ student: { studentId: string; name: string; email: string; phone: string; isActive: boolean; classId: string | null; className: string | null }; created: boolean }>(`/school-access/director/schools/${encodeURIComponent(schoolId)}/students`, { method: "POST", body: payload, token }),
  moveSchoolDirectorStudent: (schoolId: string, studentId: string, classId: string, token?: string | null) =>
    request<{ student: { studentId: string; name: string; email: string; phone: string; isActive: boolean; classId: string | null; className: string | null }; idempotent: boolean }>(`/school-access/director/schools/${encodeURIComponent(schoolId)}/students/${encodeURIComponent(studentId)}/class`, { method: "PUT", body: { classId }, token }),
  updateSchoolDirectorStudentBasic: (schoolId: string, studentId: string, payload: { name?: string; phone?: string }, token?: string | null) =>
    request<{ student: { studentId: string; name: string; email: string; phone: string; isActive: boolean; classId: string | null; className: string | null } }>(`/school-access/director/schools/${encodeURIComponent(schoolId)}/students/${encodeURIComponent(studentId)}`, { method: "PATCH", body: payload, token }),
  setSchoolDirectorStudentActive: (schoolId: string, studentId: string, isActive: boolean, token?: string | null) =>
    request<{ student: { studentId: string; name: string; email: string; phone: string; isActive: boolean; classId: string | null; className: string | null } }>(`/school-access/director/schools/${encodeURIComponent(schoolId)}/students/${encodeURIComponent(studentId)}/active`, { method: "PATCH", body: { isActive }, token }),
  createSchoolDirectorClass: (schoolId: string, name: string, token?: string | null) =>
    request<{ classroom: { classId: string; className: string } }>(`/school-access/director/schools/${encodeURIComponent(schoolId)}/classes`, { method: "POST", body: { name }, token }),
  updateSchoolDirectorClass: (schoolId: string, classId: string, name: string, token?: string | null) =>
    request<{ classroom: { classId: string; className: string } }>(`/school-access/director/schools/${encodeURIComponent(schoolId)}/classes/${encodeURIComponent(classId)}`, { method: "PATCH", body: { name }, token }),
  getSchoolDirectorTeachers: (schoolId: string, token?: string | null) =>
    request<{ teachers: Array<{ teacherId: string; name: string; email: string; isActive: boolean }>; assignments: Array<{ assignmentId: string; teacherId: string; classId: string; subjectId: string; status: string }> }>(`/school-access/director/schools/${encodeURIComponent(schoolId)}/teachers`, { token, cache: "no-store" }),
  updateSchoolDirectorTeachingAssignment: (schoolId: string, payload: { teacherId: string; classId: string; subjectId?: string; status: "active" | "inactive" }, token?: string | null) =>
    request<{ assignment: { assignmentId: string; teacherId: string; classId: string; subjectId: string; status: string } }>(`/school-access/director/schools/${encodeURIComponent(schoolId)}/assignments`, { method: "PUT", body: payload, token }),
  getSchoolDirectorDetailedReport: (schoolId: string, token?: string | null) =>
    request<{ school: { schoolId: string; schoolName: string }; intelligence: any }>(`/school-access/director/schools/${encodeURIComponent(schoolId)}/reports/detailed`, { token, cache: "no-store" }),
  downloadSchoolDirectorStudentsCsv: (schoolId: string, token?: string | null) =>
    downloadText(`/school-access/director/schools/${encodeURIComponent(schoolId)}/reports/students.csv`, token),
  getSchoolDirectorAcademicAssessments: (schoolId: string, token?: string | null) => request<any>(`/school-access/director/schools/${encodeURIComponent(schoolId)}/academic/assessments`, { token, cache: "no-store" }),
  createSchoolDirectorAssessment: (schoolId: string, payload: { title: string; classId: string; pathId?: string; subjectId?: string; questionIds: string[] }, token?: string | null) => request<any>(`/school-access/director/schools/${encodeURIComponent(schoolId)}/academic/assessments`, { method: "POST", body: payload, token }),
  getSchoolDirectorSmartClassrooms: (schoolId: string, token?: string | null) => request<any>(`/school-access/director/schools/${encodeURIComponent(schoolId)}/academic/smart-classrooms`, { token, cache: "no-store" }),
  getSchoolDirectorInterventions: (schoolId: string, token?: string | null) => request<any>(`/school-access/director/schools/${encodeURIComponent(schoolId)}/academic/interventions`, { token, cache: "no-store" }),
  createSchoolDirectorIntervention: (schoolId: string, payload: { classId: string; studentId: string; skillId: string; pathId: string }, token?: string | null) => request<any>(`/school-access/director/schools/${encodeURIComponent(schoolId)}/academic/interventions`, { method: "POST", body: payload, token }),
  transferSchoolDirectorStudent: (sourceSchoolId: string, studentId: string, payload: { targetSchoolId: string; targetClassId: string; confirmation: "TRANSFER" }, token?: string | null) => request<any>(`/school-access/director/schools/${encodeURIComponent(sourceSchoolId)}/students/${encodeURIComponent(studentId)}/transfer`, { method: "POST", body: payload, token }),
  getSchoolDirectorTransferTargetClasses: (schoolId: string, token?: string | null) => request<any>(`/school-access/director/schools/${encodeURIComponent(schoolId)}/transfer-target-classes`, { token, cache: "no-store" }),
  getSchoolTeacherWorkspace: (token?: string | null) =>
    request<{
      personas: { platformTrainer: boolean; schoolTeacher: boolean };
      schools: Array<{
        schoolId: string;
        schoolName: string;
        source: "membership" | "legacy";
        smartClassroomEnabled: boolean;
        assignments: Array<{
          assignmentId: string;
          classId: string;
          className: string;
          subjectId: string;
          studentCount: number;
          students: Array<{ studentId: string; name: string; isActive: boolean }>;
        }>;
        assessments: Array<{ assessmentId: string; title: string; subjectId: string; classIds: string[]; dueDate: string | null; quizKind: string }>;
      }>;
    }>("/school-access/teacher-workspace", { token, cache: "no-store" }),
  createClassroomSession: (
    payload: {
      schoolId: string;
      classId: string;
      questionIds: string[];
      day?: string;
      period?: number | null;
      subjectName?: string;
      className?: string;
      publishedMode?: 'single' | 'batch';
      autoStart?: boolean;
    },
    token?: string | null,
  ) => request<{ sessionId: string; pin: string; status: string }>("/classroom/sessions", { method: "POST", body: payload, token }),

  getClassroomQuestions: (schoolId: string, params?: { pathId?: string; subject?: string; sectionId?: string; skillId?: string; difficulty?: string; search?: string; page?: number; limit?: number }, token?: string | null) => {
    const query = new URLSearchParams({ schoolId });
    if (params?.pathId) query.set("pathId", params.pathId);
    if (params?.subject) query.set("subject", params.subject);
    if (params?.sectionId) query.set("sectionId", params.sectionId);
    if (params?.skillId) query.set("skillId", params.skillId);
    if (params?.difficulty) query.set("difficulty", params.difficulty);
    if (params?.search) query.set("search", params.search);
    if (params?.page) query.set("page", String(params.page));
    if (params?.limit) query.set("limit", String(params.limit));
    return request<{ page: number; limit: number; hasMore: boolean; questions: Array<{ questionId: string; text: string; options: string[]; type: string; skillIds?: string[]; pathId?: string; subject?: string; sectionId?: string; difficulty?: string }> }>(`/classroom/questions?${query.toString()}`, { token });
  },
  getStudentActiveClassroomSession: (token?: string | null) => request<{ hasActiveSession: boolean; session?: { sessionId: string; schoolId: string; classId: string; className: string; teacherName: string; status: string; activeQuestionIndex: number | null; totalQuestions: number; createdAt: string } }>("/classroom/student/active-session", { token, cache: "no-store" }),
  getTeacherActiveClassroomSession: (schoolId?: string, token?: string | null) => {
    const query = schoolId ? `?schoolId=${encodeURIComponent(schoolId)}` : "";
    return request<{ hasActiveSession: boolean; session?: { sessionId: string; schoolId: string; classId: string; className: string; status: string; activeQuestionIndex: number | null; totalQuestions: number; createdAt: string } }>(`/classroom/teacher/active-session${query}`, { token, cache: "no-store" });
  },
  joinClassroomSessionByPin: (pin: string, token?: string | null) => request<{ joined: boolean; sessionId: string; schoolId: string; classId: string }>("/classroom/sessions/join-by-pin", { method: "POST", body: { pin }, token }),
  instantJoinClassroomSession: (id: string, token?: string | null) => request<{ joined: boolean; sessionId: string; schoolId: string; classId: string }>(`/classroom/sessions/${id}/instant-join`, { method: "POST", token }),
  appendClassroomQuestions: (id: string, questionIds: string[], autoPublishFirst?: boolean, token?: string | null) => request<{ appendedCount: number; totalQuestions: number; activeQuestionIndex: number | null }>(`/classroom/sessions/${id}/append-questions`, { method: "POST", body: { questionIds, autoPublishFirst }, token }),
  joinClassroomSession: (id: string, pin: string, token?: string | null) => request<{ joined: boolean }>(`/classroom/sessions/${id}/join`, { method: "POST", body: { pin }, token }),
  getClassroomCurrentQuestion: (id: string, token?: string | null) => request<any>(`/classroom/sessions/${id}/current`, { token }),
  answerClassroomQuestion: (id: string, questionId: string, selectedOptionIndex: number, token?: string | null) => request<any>(`/classroom/sessions/${id}/answers/${questionId}`, { method: "PUT", body: { selectedOptionIndex }, token }),
  publishClassroomQuestion: (id: string, index: number, token?: string | null) => request<any>(`/classroom/sessions/${id}/publish/${index}`, { method: "POST", token }),
  endClassroomSession: (id: string, token?: string | null) => request<any>(`/classroom/sessions/${id}/end`, { method: "POST", token }),
  endClassroomBatch: (sessionId: string, batchId: string, token?: string | null) => request<{ ended: boolean; alreadyEnded?: boolean; endedAt?: string; miniReport: { batchId: string; label: string; questionCount: number; answered: number; correct: number; wrong: number; accuracy: number | null; skills: Array<{ skillId: string; answered: number; correct: number; accuracy: number | null }> } }>(`/classroom/sessions/${encodeURIComponent(sessionId)}/batches/${encodeURIComponent(batchId)}/end`, { method: "POST", token }),
  getClassroomAggregate: (id: string, token?: string | null) => request<any>(`/classroom/sessions/${id}/aggregate`, { token }),
  getSupervisorClassroomToday: (token?: string | null) => request<{ sessions: any[] }>("/classroom/supervisor/today", { token, cache: "no-store" }),
  getSupervisorClassroomHistory: (token?: string | null) => request<{ sessions: any[] }>("/classroom/supervisor/history", { token, cache: "no-store" }),
  getSupervisorClassroomTeachers: (token?: string | null) => request<{ teachers: any[] }>("/classroom/supervisor/teachers", { token, cache: "no-store" }),
  getSupervisorClassroomIntelligence: (token?: string | null) => request<{ intelligence: any }>("/classroom/supervisor/intelligence", { token, cache: "no-store" }),
  getSupervisorInterventions: (token?: string | null) => request<{ interventions: any[] }>("/classroom/supervisor/interventions", { token, cache: "no-store" }),
  createSupervisorIntervention: (payload: unknown, token?: string | null) => request<any>("/classroom/supervisor/interventions", { method: "POST", body: payload, token }),
  getSupervisorInterventionOutcome: (id: string, token?: string | null) => request<any>(`/classroom/supervisor/interventions/${encodeURIComponent(id)}/outcome`, { token, cache: "no-store" }),
  getSupervisorClassroomReport: (id: string, token?: string | null) => request<{ report: any }>(`/classroom/supervisor/sessions/${encodeURIComponent(id)}/report`, { token, cache: "no-store" }),
  getClassroomTeacherHistory: (schoolId?: string, token?: string | null) => {
    const query = schoolId ? `?schoolId=${encodeURIComponent(schoolId)}` : "";
    return request<{ sessions: any[] }>(`/classroom/teacher/history${query}`, { token, cache: "no-store" });
  },
  ...createAnnouncementAdsApi(request),
  ...createAccessCodesApi(request),
  ...createStudyPlansApi(request),
  createPublicBarcodeTest: (
    payload: {
      title: string;
      description?: string;
      pathId: string;
      subjectId: string;
      sectionId?: string;
      skillIds?: string[];
      questionIds: string[];
      testKind?: "quick" | "mock";
      audience?: "open" | "targeted";
      targetGroupIds?: string[];
      targetUserIds?: string[];
      status?: "draft" | "active" | "paused" | "archived";
      showResultToStudent?: boolean;
      collectSchool?: boolean;
      collectClassroom?: boolean;
      settings?: {
        showExplanations?: boolean;
        showAnswers?: boolean;
        showResultsReport?: boolean;
        maxAttempts?: number;
        passingScore?: number;
        timeLimit?: number;
        randomizeQuestions?: boolean;
        randomizeOptions?: boolean;
        showProgressBar?: boolean;
        requireAnswerBeforeNext?: boolean;
        allowQuestionReview?: boolean;
        optionLayout?: "auto" | "horizontal" | "two_columns";
      };
      startsAt?: number | null;
      endsAt?: number | null;
      maxSubmissions?: number | null;
    },
    token?: string | null,
  ) =>
    request<unknown>("/public-tests/admin", {
      method: "POST",
      body: payload,
      token,
    }),
  getPublicBarcodeTest: (slug: string, token?: string | null) =>
    request<unknown>(`/public-tests/${encodeURIComponent(slug)}`, { token }),
  listAssignedPublicBarcodeTests: (token?: string | null) =>
    request<unknown>("/public-tests/assigned", { token }),
  listPublicBarcodeTests: (
    params?: {
      pathId?: string;
      subjectId?: string;
      status?: "draft" | "active" | "paused" | "archived";
      testKind?: "quick" | "mock";
      limit?: number;
    },
    token?: string | null,
  ) => {
    const search = new URLSearchParams();
    Object.entries(params || {}).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        search.set(key, String(value));
      }
    });
    return request<unknown>(`/public-tests/admin${search.toString() ? `?${search.toString()}` : ""}`, { token });
  },
  submitPublicBarcodeTest: (
    slug: string,
    payload: {
      studentName: string;
      schoolName?: string;
      classroomName?: string;
      contact?: string;
      sessionFingerprint?: string;
      timeSpentSeconds?: number;
      answers: Array<{ questionId: string; selectedOptionIndex: number }>;
    },
    token?: string | null,
  ) =>
    request<unknown>(`/public-tests/${encodeURIComponent(slug)}/submit`, {
      method: "POST",
      body: payload,
      token,
    }),
  getPublicBarcodeTestReport: (id: string, token?: string | null) =>
    request<unknown>(`/public-tests/admin/${encodeURIComponent(id)}/report`, { token }),
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
  ...createCoursesApi(request, {
    requestCached,
    canUsePublicLearningCache,
    bootstrapCacheTtlMs: BOOTSTRAP_CACHE_TTL_MS,
  }),
  ...createQuestionsApi(request),
  ...createQuizzesApi(request),
  ...createAiApi(request),
  ...createOperationsApi(request),
  ...createLearningSupportApi(request),
  clearLiveExamsTestData: (token?: string | null) =>
    request<{ success: boolean; message: string }>("/live-exams/clear-test-data", {
      method: "DELETE",
      token,
    }),
  getSupervisorLiveExams: (token?: string | null) =>
    request<any[]>("/live-exams/supervisor", {
      token,
    }),
  startLiveExam: (payload: { quizId: string; quizTitle: string; totalQuestions: number }, token?: string | null) =>
    request<any>("/live-exams/start", {
      method: "POST",
      body: payload,
      token,
    }),
  getLiveExamSession: (quizId: string, token?: string | null) =>
    request<any>(`/live-exams/session/${encodeURIComponent(quizId)}`, { token }),
  updateLiveExamProgress: (payload: { quizId: string; answeredQuestions: number; totalQuestions: number; answers?: Record<string, unknown> }, token?: string | null) =>
    request<{ success: boolean }>("/live-exams/progress", {
      method: "POST",
      body: payload,
      token,
    }),
  endLiveExam: (payload: { quizId: string }, token?: string | null) =>
    request<{ success: boolean }>("/live-exams/end", {
      method: "POST",
      body: payload,
      token,
    }),
};

export { API_BASE_URL };
