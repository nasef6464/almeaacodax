type ApiRequest = <T>(path: string, options?: {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  token?: string | null;
  cache?: RequestCache;
  skipCsrf?: boolean;
}) => Promise<T>;

type ClientEventSource =
  | "app"
  | "error-boundary"
  | "unhandled-error"
  | "unhandled-rejection"
  | "video-player"
  | "api"
  | "manual";

type ClientEventSeverity = "info" | "warning" | "error";

export const createOperationsApi = (request: ApiRequest) => ({
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
      severity?: ClientEventSeverity;
      source?: ClientEventSource;
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
        severity: ClientEventSeverity;
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
      severity?: ClientEventSeverity;
      source?: ClientEventSource;
    },
    token?: string | null,
  ) =>
    request<{ ok: boolean; matchedCount: number; modifiedCount: number }>("/operations/client-events/resolve-all", {
      method: "POST",
      body: payload || {},
      token,
    }),
});
