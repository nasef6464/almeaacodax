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

  return response.json() as Promise<T>;
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
  getTaxonomyBootstrap: () =>
    request<{ paths: unknown[]; levels: unknown[]; subjects: unknown[] }>("/taxonomy/bootstrap"),
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
  getContentBootstrap: () =>
    request<{ topics: unknown[]; lessons: unknown[]; libraryItems: unknown[]; groups: unknown[] }>("/content/bootstrap"),
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
  getQuizzes: () => request<unknown[]>("/quizzes"),
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
