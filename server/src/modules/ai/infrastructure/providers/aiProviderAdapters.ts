import type { AiProviderId } from "../../application/aiProviderRouter.js";

export type AiResponseMimeType = "application/json";

export type AiProviderRuntime = {
  apiKey?: string;
  apiKeys?: string[];
  model: string;
  baseUrl?: string;
};

export type AiProviderCallOptions = {
  timeoutMs?: number;
  maxOutputTokens?: number;
};

type ExternalProvider = Exclude<AiProviderId, "none">;
type OpenAiCompatibleProvider = Exclude<ExternalProvider, "gemini" | "ollama" | "lmstudio">;

type AdapterConfig = {
  getProviderRuntime: (provider: ExternalProvider) => AiProviderRuntime;
  defaultTimeoutMs: number;
  clientUrl: string;
  qwenBaseUrl: string;
  redactDiagnostic: (value: unknown) => string;
};

const uniqueNonEmpty = (values: unknown[]) =>
  [...new Set(values.map((value) => String(value || "").trim()).filter(Boolean))];

const isPrivateIpv4 = (hostname: string) => {
  const parts = hostname.split(".").map((part) => Number(part));
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return false;
  const [a, b] = parts;
  return a === 10
    || a === 127
    || (a === 169 && b === 254)
    || (a === 172 && b >= 16 && b <= 31)
    || (a === 192 && b === 168)
    || a === 0;
};

const assertSafeAiProviderUrl = (rawUrl: string) => {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error("AI provider URL is invalid");
  }

  const hostname = parsed.hostname.toLowerCase().replace(/\.$/, "");
  const isLocalHost = hostname === "localhost" || hostname.endsWith(".localhost");
  const isPrivateIpv6 = hostname === "::1"
    || hostname === "[::1]"
    || hostname.startsWith("fc")
    || hostname.startsWith("fd")
    || hostname.startsWith("fe8")
    || hostname.startsWith("fe9")
    || hostname.startsWith("fea")
    || hostname.startsWith("feb");

  if (parsed.protocol !== "https:" || isLocalHost || isPrivateIpv4(hostname) || isPrivateIpv6) {
    throw new Error("AI provider URL must use HTTPS and a public host");
  }
};

export const createAiProviderAdapters = (config: AdapterConfig) => {
  const fetchWithTimeout = async (url: string, init: RequestInit, timeoutMs = config.defaultTimeoutMs) => {
    assertSafeAiProviderUrl(url);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      return await fetch(url, { ...init, signal: controller.signal });
    } finally {
      clearTimeout(timeoutId);
    }
  };

  const responseFailureMessage = async (provider: string, response: Response) => {
    const body = await response.text().catch(() => "");
    return `${provider} request failed with status ${response.status}${body ? `: ${config.redactDiagnostic(body)}` : ""}`;
  };

  const providerKeys = (provider: ExternalProvider) => {
    const runtime = config.getProviderRuntime(provider);
    return uniqueNonEmpty([runtime.apiKey, ...(runtime.apiKeys || [])]);
  };

  const callGemini = async (
    prompt: string,
    responseMimeType?: AiResponseMimeType,
    image?: { data: string; mimeType: string },
    options: AiProviderCallOptions = {},
  ) => {
    const runtime = config.getProviderRuntime("gemini");
    const apiKeys = providerKeys("gemini");
    if (apiKeys.length === 0) return "";

    const parts: Array<Record<string, unknown>> = image
      ? [{ inlineData: { mimeType: image.mimeType, data: image.data } }, { text: prompt }]
      : [{ text: prompt }];

    const errors: string[] = [];
    for (const apiKey of apiKeys) {
      try {
        const response = await fetchWithTimeout(
          `https://generativelanguage.googleapis.com/v1beta/models/${runtime.model}:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts }],
              generationConfig: {
                ...(responseMimeType ? { responseMimeType } : {}),
                ...(options.maxOutputTokens ? { maxOutputTokens: options.maxOutputTokens } : {}),
              },
            }),
          },
          options.timeoutMs,
        );

        if (!response.ok) throw new Error(await responseFailureMessage("Gemini", response));
        const payload = (await response.json()) as {
          candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
        };
        const text = payload.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("\n").trim() || "";
        if (text) return text;
      } catch (error) {
        errors.push(error instanceof Error ? error.message : "Gemini request failed");
      }
    }

    if (errors.length) throw new Error(errors.join(" | "));
    return "";
  };

  const callOllama = async (prompt: string, responseMimeType?: AiResponseMimeType, options: AiProviderCallOptions = {}) => {
    const runtime = config.getProviderRuntime("ollama");
    const baseUrl = String(runtime.baseUrl || "").trim();
    if (!baseUrl || !runtime.model) return "";

    const response = await fetchWithTimeout(
      `${baseUrl.replace(/\/$/, "")}/api/generate`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: runtime.model,
          prompt,
          stream: false,
          format: responseMimeType === "application/json" ? "json" : undefined,
          ...(options.maxOutputTokens ? { options: { num_predict: options.maxOutputTokens } } : {}),
        }),
      },
      options.timeoutMs,
    );
    if (!response.ok) throw new Error(await responseFailureMessage("Ollama", response));
    const payload = (await response.json()) as { response?: string };
    return payload.response?.trim() || "";
  };

  const callLmStudio = async (prompt: string, responseMimeType?: AiResponseMimeType, options: AiProviderCallOptions = {}) => {
    const runtime = config.getProviderRuntime("lmstudio");
    const baseUrl = String(runtime.baseUrl || "").trim();
    if (!baseUrl || !runtime.model) return "";

    const response = await fetchWithTimeout(
      `${baseUrl.replace(/\/$/, "")}/chat/completions`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: runtime.model,
          messages: [{ role: "user", content: prompt }],
          temperature: 0.3,
          response_format: responseMimeType === "application/json" ? { type: "json_object" } : undefined,
          ...(options.maxOutputTokens ? { max_tokens: options.maxOutputTokens } : {}),
        }),
      },
      options.timeoutMs,
    );
    if (!response.ok) throw new Error(await responseFailureMessage("LM Studio", response));
    const payload = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
    return payload.choices?.[0]?.message?.content?.trim() || "";
  };

  const callOpenAiCompatible = async (
    provider: OpenAiCompatibleProvider,
    prompt: string,
    responseMimeType?: AiResponseMimeType,
    options: AiProviderCallOptions = {},
  ) => {
    const runtime = config.getProviderRuntime(provider);
    const settings: Record<OpenAiCompatibleProvider, { baseUrl: string; headers?: Record<string, string> }> = {
      openrouter: {
        baseUrl: runtime.baseUrl || "https://openrouter.ai/api/v1",
        headers: { "HTTP-Referer": config.clientUrl, "X-Title": "Almeaa Educational Platform" },
      },
      deepseek: { baseUrl: runtime.baseUrl || "https://api.deepseek.com" },
      qwen: { baseUrl: runtime.baseUrl || config.qwenBaseUrl },
      openai: { baseUrl: runtime.baseUrl || "https://api.openai.com/v1" },
    };
    const selected = settings[provider];
    const apiKeys = providerKeys(provider);
    if (apiKeys.length === 0) return "";

    const errors: string[] = [];
    for (const apiKey of apiKeys) {
      try {
        const response = await fetchWithTimeout(
          `${selected.baseUrl.replace(/\/$/, "")}/chat/completions`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${apiKey}`,
              ...(selected.headers || {}),
            },
            body: JSON.stringify({
              model: runtime.model,
              messages: [{ role: "user", content: prompt }],
              temperature: 0.25,
              response_format: responseMimeType === "application/json" ? { type: "json_object" } : undefined,
              ...(options.maxOutputTokens ? { max_tokens: options.maxOutputTokens } : {}),
            }),
          },
          options.timeoutMs,
        );
        if (!response.ok) throw new Error(await responseFailureMessage(provider, response));
        const payload = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
        const text = payload.choices?.[0]?.message?.content?.trim() || "";
        if (text) return text;
      } catch (error) {
        errors.push(error instanceof Error ? error.message : `${provider} request failed`);
      }
    }

    if (errors.length) throw new Error(errors.join(" | "));
    return "";
  };

  const callProvider = async (
    provider: ExternalProvider,
    prompt: string,
    responseMimeType?: AiResponseMimeType,
    image?: { data: string; mimeType: string },
    options: AiProviderCallOptions = {},
  ) => {
    if (provider === "gemini") return callGemini(prompt, responseMimeType, image, options);
    if (provider === "ollama") return callOllama(prompt, responseMimeType, options);
    if (provider === "lmstudio") return callLmStudio(prompt, responseMimeType, options);
    return callOpenAiCompatible(provider, prompt, responseMimeType, options);
  };

  return { callProvider };
};
