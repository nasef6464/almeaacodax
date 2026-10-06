import type { AiProviderId } from "./aiProviderRouter.js";

export type AiCapabilityId =
  | "student_chat"
  | "vision_chat"
  | "question_tutor"
  | "admin_copilot"
  | "study_plan"
  | "learning_path"
  | "remediation"
  | "authoring"
  | "course_summary";

export type AiRouteProfile = {
  providerOrder?: AiProviderId[];
  paidAllowed?: boolean;
  maxOutputTokens?: number;
};

const capabilityIds: AiCapabilityId[] = [
  "student_chat",
  "vision_chat",
  "question_tutor",
  "admin_copilot",
  "study_plan",
  "learning_path",
  "remediation",
  "authoring",
  "course_summary",
];

const providerIds: AiProviderId[] = [
  "gemini",
  "openrouter",
  "qwen",
  "deepseek",
  "openai",
  "ollama",
  "lmstudio",
  "none",
];

const normalizeProviderOrder = (value: unknown) => {
  if (!Array.isArray(value)) return undefined;
  const allowed = new Set(providerIds);
  const normalized = [...new Set(
    value
      .map((item) => String(item || "").trim().toLowerCase() as AiProviderId)
      .filter((item) => allowed.has(item)),
  )];
  return normalized.length ? normalized : undefined;
};

export const parseAiRouteProfiles = (raw: unknown): Partial<Record<AiCapabilityId, AiRouteProfile>> => {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const source = raw as Record<string, unknown>;
  const result: Partial<Record<AiCapabilityId, AiRouteProfile>> = {};

  for (const capability of capabilityIds) {
    const value = source[capability];
    if (!value || typeof value !== "object" || Array.isArray(value)) continue;
    const row = value as Record<string, unknown>;
    const providerOrder = normalizeProviderOrder(row.providerOrder);
    const maxOutputRaw = Number(row.maxOutputTokens);
    const maxOutputTokens = Number.isFinite(maxOutputRaw)
      ? Math.max(64, Math.min(4000, Math.round(maxOutputRaw)))
      : undefined;

    result[capability] = {
      ...(providerOrder ? { providerOrder } : {}),
      ...(typeof row.paidAllowed === "boolean" ? { paidAllowed: row.paidAllowed } : {}),
      ...(maxOutputTokens ? { maxOutputTokens } : {}),
    };
  }

  return result;
};

export const applyCapabilityProviderOrder = (
  baseOrder: AiProviderId[],
  profile?: AiRouteProfile,
) => {
  if (!profile?.providerOrder?.length) return baseOrder;
  return [...new Set([...profile.providerOrder, ...baseOrder])];
};

export const capabilityPaidAllowed = (
  globalPaidAllowed: boolean,
  profile?: AiRouteProfile,
) => globalPaidAllowed && profile?.paidAllowed !== false;

export const isPaidByDefaultProvider = (provider: AiProviderId) =>
  provider === "openai" || provider === "deepseek";
