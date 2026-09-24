export type AiProviderId =
  | "gemini"
  | "openrouter"
  | "deepseek"
  | "qwen"
  | "openai"
  | "ollama"
  | "lmstudio"
  | "none";

export const DEFAULT_AI_PROVIDER_ORDER: AiProviderId[] = [
  "gemini",
  "openrouter",
  "qwen",
  "deepseek",
  "openai",
  "ollama",
  "lmstudio",
  "none",
];

export const buildProviderPriority = (input: {
  preferred?: AiProviderId;
  configuredOrder?: string;
  availableProviders: AiProviderId[];
}) => {
  const configured = String(input.configuredOrder || "")
    .split(",")
    .map((value) => value.trim().toLowerCase() as AiProviderId)
    .filter(Boolean);

  const preferred = input.preferred ? [input.preferred] : [];
  const available = new Set(input.availableProviders);
  return [...new Set([...preferred, ...configured, ...DEFAULT_AI_PROVIDER_ORDER])].filter((provider) => available.has(provider));
};
