export interface PaginationOptions {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
  isActive?: boolean;
  pathId?: string;
  subjectId?: string;
}

export interface QuizResultsPaginationOptions extends PaginationOptions {
  noTotal?: boolean;
  quizId?: string;
  studentId?: string;
  status?: "passed" | "failed";
  dateFrom?: string;
  dateTo?: string;
  sortBy?: "createdAt" | "score" | "quizTitle" | "date";
  sortOrder?: "asc" | "desc";
}

export interface QuizResultsPageResponse<T = unknown> {
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

export interface PaginatedResponseShape {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  items?: number;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export const extractList = <T = unknown>(payload: unknown, key: string): T[] => {
  if (Array.isArray(payload)) {
    return payload as T[];
  }

  if (payload && typeof payload === "object") {
    const value = (payload as Record<string, unknown>)[key];
    return Array.isArray(value) ? (value as T[]) : [];
  }

  return [];
};

export const withQuery = (path: string, query?: Record<string, string | number | boolean | undefined | null>) => {
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
