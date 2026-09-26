import type { AiPricingHint } from "./aiCostEstimator.js";

export type AiQuotaPlan = "free" | "trial" | "paid" | "unknown";
export type AiQuotaScope = "project" | "account" | "organization" | "workspace" | "model" | "unknown";

export type AiQuotaPoolRuntime = {
  id: string;
  label: string;
  accountLabel: string;
  projectLabel: string;
  plan: AiQuotaPlan;
  quotaScope: AiQuotaScope;
  apiKeys: string[];
  model: string;
  baseUrl?: string;
  priority: number;
  freeOnly: boolean;
  pricing?: AiPricingHint;
};

const planRank: Record<AiQuotaPlan, number> = {
  free: 0,
  trial: 1,
  unknown: 2,
  paid: 3,
};

export const normalizeAiQuotaPlan = (value: unknown): AiQuotaPlan => {
  const normalized = String(value || "").trim().toLowerCase();
  return normalized === "free" || normalized === "trial" || normalized === "paid" ? normalized : "unknown";
};

export const normalizeAiQuotaScope = (value: unknown): AiQuotaScope => {
  const normalized = String(value || "").trim().toLowerCase();
  return ["project", "account", "organization", "workspace", "model"].includes(normalized)
    ? normalized as AiQuotaScope
    : "unknown";
};

export const sortAiQuotaPools = (pools: AiQuotaPoolRuntime[]) =>
  [...pools].sort((left, right) =>
    planRank[left.plan] - planRank[right.plan]
    || left.priority - right.priority
    || left.id.localeCompare(right.id),
  );

export const quotaPoolIsFreeFirst = (pool: AiQuotaPoolRuntime) =>
  pool.freeOnly || pool.plan === "free" || pool.plan === "trial";

export const shouldAdvanceQuotaPool = (status: number | undefined) => status === 429;
