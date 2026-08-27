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

export const createPaymentsApi = (request: ApiRequest) => ({
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
});
