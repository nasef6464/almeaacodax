export type LocalAiProvider = "ollama" | "lmstudio";

export const estimateBase64DecodedBytes = (value: string) => {
  const normalized = String(value || "").replace(/\s+/g, "");
  if (!normalized) return 0;
  const padding = normalized.endsWith("==") ? 2 : normalized.endsWith("=") ? 1 : 0;
  return Math.max(0, Math.floor((normalized.length * 3) / 4) - padding);
};

export const isExplicitLocalProviderConfigured = (input: {
  provider: LocalAiProvider;
  source: "env" | "admin";
  enabled?: boolean;
  baseUrl?: string;
  model?: string;
}) => {
  if (!String(input.baseUrl || "").trim() || !String(input.model || "").trim()) return false;

  if (input.source === "admin") {
    return input.enabled === true;
  }

  const baseEnvName = input.provider === "ollama" ? "OLLAMA_BASE_URL" : "LM_STUDIO_BASE_URL";
  const modelEnvName = input.provider === "ollama" ? "OLLAMA_MODEL" : "LM_STUDIO_MODEL";
  return Boolean(String(process.env[baseEnvName] || "").trim() && String(process.env[modelEnvName] || "").trim());
};
