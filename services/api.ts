const API_BASE_URL =
  (globalThis as { __API_BASE_URL__?: string }).__API_BASE_URL__ ||
  (import.meta as ImportMeta & { env?: Record<string, string> }).env?.VITE_API_URL ||
  "http://localhost:4000/api";

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

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method || "GET",
    headers: {
      "Content-Type": "application/json",
      ...(resolvedToken ? { Authorization: `Bearer ${resolvedToken}` } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({ message: "Request failed" }));
    throw new Error(payload.message || "Request failed");
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
  getCurrentUser: () =>
    request<{ user: unknown }>("/auth/me"),
  updateMyPreferences: (payload: { favorites?: string[]; reviewLater?: string[] }, token?: string | null) =>
    request<{ user: unknown }>("/auth/me/preferences", {
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
    request<{ topics: unknown[]; lessons: unknown[]; libraryItems: unknown[]; groups: unknown[] }>("/content/bootstrap"),
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
  getQuizResults: () => request<unknown[]>("/quizzes/results"),
  getLatestQuizResult: () => request<unknown>("/quizzes/results/latest"),
  createQuizResult: (payload: unknown, token?: string | null) =>
    request<unknown>("/quizzes/results", {
      method: "POST",
      body: payload,
      token,
    }),
};

export { API_BASE_URL };
