type ApiRequest = <T>(path: string, options?: {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  token?: string | null;
  cache?: RequestCache;
  skipCsrf?: boolean;
}) => Promise<T>;

export interface InterventionStudyPlanPayload {
  studentId: string;
  studentName?: string;
  pathId: string;
  subjectId?: string;
  skillId?: string;
  skillName?: string;
  dailyMinutes?: number;
  preferredStartTime?: string;
}

export const createStudyPlansApi = (request: ApiRequest) => ({
  createStudyPlan: (payload: unknown, token?: string | null) =>
    request<unknown>("/content/study-plans", {
      method: "POST",
      body: payload,
      token,
    }),

  createInterventionStudyPlan: (payload: InterventionStudyPlanPayload, token?: string | null) =>
    request<unknown>("/content/study-plans/intervention", {
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
});
