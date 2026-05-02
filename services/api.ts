const runtimeHostname = (globalThis as { location?: { hostname?: string } }).location?.hostname || "";
const defaultApiBaseUrl =
  runtimeHostname && !["localhost", "127.0.0.1"].includes(runtimeHostname)
    ? "https://almeaacodax-k2ux.onrender.com/api"
    : "http://localhost:4000/api";

const API_BASE_URL =
  (globalThis as { __API_BASE_URL__?: string }).__API_BASE_URL__ ||
  (import.meta as ImportMeta & { env?: Record<string, string> }).env?.VITE_API_URL ||
  defaultApiBaseUrl;

type HttpMethod = "GET" | "POST" | "PATCH" | "DELETE";

interface RequestOptions {
  method?: HttpMethod;
  body?: unknown;
  token?: string | null;
}

const AUTH_STORAGE_KEY = "the-hundred-auth-session";

const getStoredSessionToken = (): string | null => {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as { token?: string };
    return parsed.token || null;
  } catch {
    return null;
  }
};

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const resolvedToken = options.token === undefined ? getStoredSessionToken() : options.token;

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: options.method || "GET",
      headers: {
        "Content-Type": "application/json",
        ...(resolvedToken ? { Authorization: `Bearer ${resolvedToken}` } : {}),
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
  } catch (error) {
    console.warn(`API network error for ${path}:`, error);
    throw new Error("تعذر الاتصال بالخادم الآن. تحقق من الإنترنت أو جرّب مرة أخرى.");
  }

  if (!response.ok) {
    const rawError = await response.text().catch(() => "");
    let message = "تعذر تنفيذ الطلب الآن.";
    if (rawError) {
      try {
        const payload = JSON.parse(rawError) as { message?: string; error?: string };
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

export const api = {
  baseUrl: API_BASE_URL,
  health: () => request<{ status: string; database: string; timestamp: string }>("/health"),
  login: (email: string, password: string) =>
    request<{ token: string; user: unknown }>("/auth/login", {
      method: "POST",
      body: { email, password },
    }),
  register: (name: string, email: string, password: string) =>
    request<{ token: string; user: unknown }>("/auth/register", {
      method: "POST",
      body: { name, email, password },
    }),
  createAdminUser: (payload: unknown, token?: string | null) =>
    request<{ user: unknown }>("/auth/admin/users", {
      method: "POST",
      body: payload,
      token,
    }),
  getAdminUsers: () =>
    request<{ users: unknown[] }>("/auth/admin/users"),
  updateAdminUser: (id: string, payload: unknown, token?: string | null) =>
    request<{ user: unknown }>(`/auth/admin/users/${id}`, {
      method: "PATCH",
      body: payload,
      token,
    }),
  getCurrentUser: () =>
    request<{ user: unknown }>("/auth/me"),
  updateMyPreferences: (payload: { favorites?: string[]; reviewLater?: string[] }, token?: string | null) =>
    request<{ user: unknown }>("/auth/me/preferences", {
      method: "PATCH",
      body: payload,
      token,
    }),
  completePurchase: (
    payload: { courseId?: string; packageId?: string; includedCourseIds?: string[] },
    token?: string | null,
  ) =>
    request<{ user: unknown }>("/auth/me/purchase", {
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
  getPaymentRequests: (token?: string | null) =>
    request<{ requests: unknown[] }>("/payments/requests", {
      token,
    }),
  createPaymentRequest: (payload: unknown, token?: string | null) =>
    request<{ request: unknown }>("/payments/requests", {
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
  getTaxonomyBootstrap: () =>
    request<{ paths: unknown[]; levels: unknown[]; subjects: unknown[]; sections: unknown[]; skills: unknown[] }>("/taxonomy/bootstrap"),
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
    request<{
      topics: unknown[];
      lessons: unknown[];
      libraryItems: unknown[];
      groups: unknown[];
      b2bPackages: unknown[];
      accessCodes: unknown[];
      studyPlans: unknown[];
    }>("/content/bootstrap"),
  getHomepageSettings: (token?: string | null) =>
    request<unknown>("/content/homepage-settings", {
      token,
    }),
  updateHomepageSettings: (payload: unknown, token?: string | null) =>
    request<unknown>("/content/homepage-settings", {
      method: "PATCH",
      body: payload,
      token,
    }),
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
  getCourses: () => request<unknown[]>("/courses"),
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
  getQuestions: () => request<unknown[]>("/quizzes/questions"),
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
  getQuizzes: () => request<unknown[]>("/quizzes"),
  getQuizAnalyticsOverview: () => request<unknown>("/quizzes/analytics/overview"),
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
  submitQuiz: (id: string, payload: { answers: Record<string, number>; timeSpentSeconds?: number }, token?: string | null) =>
    request<unknown>(`/quizzes/${id}/submit`, {
      method: "POST",
      body: payload,
      token,
    }),
  getQuizResults: () => request<unknown[]>("/quizzes/results"),
  getLatestQuizResult: () => request<unknown>("/quizzes/results/latest"),
  getSkillProgress: () => request<unknown[]>("/quizzes/skill-progress"),
  getQuestionAttempts: () => request<unknown[]>("/quizzes/question-attempts"),
  createQuestionAttempt: (payload: unknown, token?: string | null) =>
    request<unknown>("/quizzes/question-attempts", {
      method: "POST",
      body: payload,
      token,
    }),
  createQuizResult: (payload: unknown, token?: string | null) =>
    request<unknown>("/quizzes/results", {
      method: "POST",
      body: payload,
      token,
    }),
  aiChat: (payload: { message: string }, token?: string | null) =>
    request<{ text: string }>("/ai/chat", {
      method: "POST",
      body: payload,
      token,
    }),
  aiStatus: (token?: string | null) =>
    request<{
      provider: "gemini" | "ollama" | "none";
      ollamaConfigured: boolean;
      geminiConfigured: boolean;
      model: string;
      timeoutMs: number;
    }>("/ai/status", { token }),
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
};

export { API_BASE_URL };
