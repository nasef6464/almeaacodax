import type { AiProviderId } from "../../application/aiProviderRouter.js";
import { sortAiQuotaPools, type AiQuotaPoolRuntime } from "../../application/aiQuotaPools.js";
export type AiResponseMimeType = "application/json";
export type AiProviderRuntime = {
  apiKey?: string;
  apiKeys?: string[];
  model: string;
  baseUrl?: string;
  quotaPools?: AiQuotaPoolRuntime[];
};
export type AiProviderCallOptions = {
  singleAttempt?: boolean;
  onImageDispatch?: () => void;
  disableThinking?: boolean;
  jsonSchema?: Record<string, unknown>;
  timeoutMs?: number;
  maxOutputTokens?: number;
  allowPaid?: boolean;
  quotaPoolId?: string;
};
export type AiProviderUsage = {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  cachedTokens: number;
  estimated: boolean;
};
export type AiProviderResponse = {
  text: string;
  usage: AiProviderUsage;
  quotaPoolId?: string;
  model?: string;
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
const emptyUsage = (): AiProviderUsage => ({
  inputTokens: 0,
  outputTokens: 0,
  totalTokens: 0,
  cachedTokens: 0,
  estimated: false,
});
const normalizeUsage = (
  raw: Partial<AiProviderUsage> | undefined,
  prompt: string,
  text: string,
): AiProviderUsage => {
  const inputTokens = Math.max(0, Number(raw?.inputTokens || 0));
  const outputTokens = Math.max(0, Number(raw?.outputTokens || 0));
  const totalTokens = Math.max(0, Number(raw?.totalTokens || inputTokens + outputTokens));
  const cachedTokens = Math.max(0, Number(raw?.cachedTokens || 0));
  if (totalTokens > 0) {
    return { inputTokens, outputTokens, totalTokens, cachedTokens, estimated: Boolean(raw?.estimated) };
  }
  const estimatedInput = Math.max(1, Math.ceil(String(prompt || "").length / 3));
  const estimatedOutput = Math.max(1, Math.ceil(String(text || "").length / 3));
  return {
    inputTokens: estimatedInput,
    outputTokens: estimatedOutput,
    totalTokens: estimatedInput + estimatedOutput,
    cachedTokens: 0,
    estimated: true,
  };
};
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
  const fetchWithTimeout = async (url: string, init: RequestInit, timeoutMs = config.defaultTimeoutMs, boundedBody = false) => {
    assertSafeAiProviderUrl(url);
    const controller = new AbortController();
    let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
    let timeoutId: ReturnType<typeof setTimeout>;
    const deadline = new Promise<never>((_, reject) => { timeoutId = setTimeout(() => { controller.abort(); reject(new Error('AI request deadline exceeded')); }, timeoutMs); });
    try {
      const read = async () => {
        const response = await fetch(url, { ...init, signal: controller.signal });
        if (!boundedBody || !response.body) return response;
        reader = response.body.getReader(); const chunks: Uint8Array[] = []; let count = 0;
        while (true) {
          const { done, value } = await reader.read(); if (done) break;
          count += value.byteLength; if (count > 131072) throw new Error('AI response exceeds bounded size');
          chunks.push(value);
        }
        return new Response(Buffer.concat(chunks, count), { status: response.status, headers: response.headers });
      };
      return await Promise.race([read(), deadline]);
    } finally {
      clearTimeout(timeoutId!);
      if (boundedBody) { controller.abort(); void reader?.cancel().catch(() => {}); }
    }
  };
  const responseFailureMessage = async (provider: string, response: Response) => {
    const body = await response.text().catch(() => "");
    return `${provider} request failed with status ${response.status}${body ? `: ${config.redactDiagnostic(body)}` : ""}`;
  };
  const providerPools = (provider: ExternalProvider, allowPaid = true, quotaPoolId?: string) => {
    const runtime = config.getProviderRuntime(provider);
    if (runtime.quotaPools?.length) {
      return sortAiQuotaPools(runtime.quotaPools)
        .filter((pool) => allowPaid || pool.plan !== "paid")
        .filter((pool) => !quotaPoolId || pool.id === quotaPoolId);
    }
    const apiKeys = uniqueNonEmpty([runtime.apiKey, ...(runtime.apiKeys || [])]);
    return [{
      id: `${provider}:legacy`,
      label: "Legacy provider pool",
      accountLabel: "",
      projectLabel: "",
      plan: "unknown" as const,
      quotaScope: "unknown" as const,
      apiKeys,
      model: runtime.model,
      baseUrl: runtime.baseUrl,
      priority: 100,
      freeOnly: false,
    }];
  };
  const callGemini = async (
    prompt: string,
    responseMimeType?: AiResponseMimeType,
    image?: { data: string; mimeType: string },
    options: AiProviderCallOptions = {},
  ) => {
    const availablePools = providerPools("gemini", options.allowPaid !== false, options.quotaPoolId);
    const pools = options.singleAttempt ? availablePools.filter(pool => pool.apiKeys.length).slice(0, 1) : availablePools;
    if (pools.every((pool) => pool.apiKeys.length === 0)) return { text: "", usage: emptyUsage() };
    const parts: Array<Record<string, unknown>> = image
      ? [{ inlineData: { mimeType: image.mimeType, data: image.data } }, { text: prompt }]
      : [{ text: prompt }];
    const errors: string[] = [];
    let attempted = false;
    for (const pool of pools) {
      let poolRateLimited = false;
      for (const apiKey of pool.apiKeys) {
        if (options.singleAttempt && attempted) break;
        attempted = true;
        try {
          const requestGeminiModel = (model: string) => {
            if (image) options.onImageDispatch?.();
            return fetchWithTimeout(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                contents: [{ parts }],
                generationConfig: {
                  ...(responseMimeType ? { responseMimeType } : {}),
                  ...(responseMimeType && options.jsonSchema ? { responseJsonSchema: options.jsonSchema } : {}),
                  // 3.8 cannot disable thinking: reserve a bounded combined budget for
                  // reasoning plus the short board JSON instead of silently truncating it.
                  ...(options.maxOutputTokens ? { maxOutputTokens: !options.singleAttempt && options.disableThinking && model === 'gemini-3.8-flash'
                    ? 1024 : options.maxOutputTokens } : {}),
                  ...(options.disableThinking && /^gemini-2\.5-flash(?:$|-)/.test(model)
                    ? { thinkingConfig: { thinkingBudget: 0 } }
                    : options.disableThinking && model === 'gemini-3.8-flash'
                      ? { thinkingConfig: { thinkingLevel: 'low' } } : {}),
                },
              }),
            },
            options.timeoutMs,
            options.singleAttempt,
          );
          };
          let actualModel = pool.model;
          let response = await requestGeminiModel(actualModel);
          if (!options.singleAttempt && !response.ok && (response.status === 404 || response.status === 429)) {
            if (pool.model === "gemini-4-argon" || pool.model === "gemini-argon") {
              actualModel = "gemini-2.5-flash";
              response = await requestGeminiModel("gemini-2.5-flash");
            } else if (pool.model === "gemini-2.5-flash" && response.status === 404) {
              actualModel = 'gemini-3.8-flash';
              response = await requestGeminiModel("gemini-3.8-flash");
            }
          }
          if (!response.ok) {
            const message = await responseFailureMessage("Gemini", response);
            if (response.status === 429) poolRateLimited = true;
            throw new Error(message);
          }
          const payload = (await response.json()) as {
            candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
            usageMetadata?: {
              promptTokenCount?: number;
              candidatesTokenCount?: number;
              totalTokenCount?: number;
              cachedContentTokenCount?: number;
            };
          };
          const text = payload.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("\n").trim() || "";
          if (text) {
            return {
              text,
              quotaPoolId: pool.id,
              model: actualModel,
              usage: normalizeUsage({
                inputTokens: payload.usageMetadata?.promptTokenCount,
                outputTokens: payload.usageMetadata?.candidatesTokenCount,
                totalTokens: payload.usageMetadata?.totalTokenCount,
                cachedTokens: payload.usageMetadata?.cachedContentTokenCount,
              }, prompt, text),
            };
          }
        } catch (error) {
          errors.push(`${pool.id}: ${error instanceof Error ? error.message : "Gemini request failed"}`);
          if (poolRateLimited) break;
        }
      }
    }
    if (errors.length) throw new Error(errors.join(" | "));
    return { text: "", usage: emptyUsage() };
  };
  const callOllama = async (prompt: string, responseMimeType?: AiResponseMimeType, options: AiProviderCallOptions = {}) => {
    const runtime = config.getProviderRuntime("ollama");
    const baseUrl = String(runtime.baseUrl || "").trim();
    if (!baseUrl || !runtime.model) return { text: "", usage: emptyUsage() };
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
    const payload = (await response.json()) as { response?: string; prompt_eval_count?: number; eval_count?: number };
    const text = payload.response?.trim() || "";
    return {
      text,
      usage: text
        ? normalizeUsage({
            inputTokens: payload.prompt_eval_count,
            outputTokens: payload.eval_count,
            totalTokens: Number(payload.prompt_eval_count || 0) + Number(payload.eval_count || 0),
          }, prompt, text)
        : emptyUsage(),
    };
  };
  const callLmStudio = async (prompt: string, responseMimeType?: AiResponseMimeType, options: AiProviderCallOptions = {}) => {
    const runtime = config.getProviderRuntime("lmstudio");
    const baseUrl = String(runtime.baseUrl || "").trim();
    if (!baseUrl || !runtime.model) return { text: "", usage: emptyUsage() };
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
    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
      usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number; prompt_tokens_details?: { cached_tokens?: number } };
    };
    const text = payload.choices?.[0]?.message?.content?.trim() || "";
    return {
      text,
      usage: text
        ? normalizeUsage({
            inputTokens: payload.usage?.prompt_tokens,
            outputTokens: payload.usage?.completion_tokens,
            totalTokens: payload.usage?.total_tokens,
            cachedTokens: payload.usage?.prompt_tokens_details?.cached_tokens,
          }, prompt, text)
        : emptyUsage(),
    };
  };
  const callOpenAiCompatible = async (
    provider: OpenAiCompatibleProvider,
    prompt: string,
    responseMimeType?: AiResponseMimeType,
    options: AiProviderCallOptions = {},
  ) => {
    const pools = providerPools(provider, options.allowPaid !== false, options.quotaPoolId);
    if (pools.every((pool) => pool.apiKeys.length === 0)) return { text: "", usage: emptyUsage() };
    const errors: string[] = [];
    for (const pool of pools) {
      const runtime = config.getProviderRuntime(provider);
      const defaults: Record<OpenAiCompatibleProvider, { baseUrl: string; headers?: Record<string, string> }> = {
        openrouter: {
          baseUrl: runtime.baseUrl || "https://openrouter.ai/api/v1",
          headers: { "HTTP-Referer": config.clientUrl, "X-Title": "Almeaa Educational Platform" },
        },
        deepseek: { baseUrl: runtime.baseUrl || "https://api.deepseek.com" },
        qwen: { baseUrl: runtime.baseUrl || config.qwenBaseUrl },
        openai: { baseUrl: runtime.baseUrl || "https://api.openai.com/v1" },
      };
      const selected = { ...defaults[provider], ...(pool.baseUrl ? { baseUrl: pool.baseUrl } : {}) };
      let poolRateLimited = false;
      for (const apiKey of pool.apiKeys) {
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
                model: pool.model,
                messages: [{ role: "user", content: prompt }],
                temperature: 0.25,
                response_format: responseMimeType === "application/json" ? { type: "json_object" } : undefined,
                ...(options.maxOutputTokens ? { max_tokens: options.maxOutputTokens } : {}),
              }),
            },
            options.timeoutMs,
          );
          if (!response.ok) {
            const message = await responseFailureMessage(provider, response);
            if (response.status === 429) poolRateLimited = true;
            throw new Error(message);
          }
          const payload = (await response.json()) as {
            choices?: Array<{ message?: { content?: string } }>;
            usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number; prompt_tokens_details?: { cached_tokens?: number } };
          };
          const text = payload.choices?.[0]?.message?.content?.trim() || "";
          if (text) {
            return {
              text,
              quotaPoolId: pool.id,
              usage: normalizeUsage({
                inputTokens: payload.usage?.prompt_tokens,
                outputTokens: payload.usage?.completion_tokens,
                totalTokens: payload.usage?.total_tokens,
                cachedTokens: payload.usage?.prompt_tokens_details?.cached_tokens,
              }, prompt, text),
            };
          }
        } catch (error) {
          errors.push(`${pool.id}: ${error instanceof Error ? error.message : `${provider} request failed`}`);
          if (poolRateLimited) break;
        }
      }
    }
    if (errors.length) throw new Error(errors.join(" | "));
    return { text: "", usage: emptyUsage() };
  };
  const callProvider = async (
    provider: ExternalProvider,
    prompt: string,
    responseMimeType?: AiResponseMimeType,
    image?: { data: string; mimeType: string },
    options: AiProviderCallOptions = {},
  ): Promise<AiProviderResponse> => {
    if (image && provider !== 'gemini') throw new Error('Selected provider does not support image input');
    if (provider === "gemini") return callGemini(prompt, responseMimeType, image, options);
    if (provider === "ollama") return callOllama(prompt, responseMimeType, options);
    if (provider === "lmstudio") return callLmStudio(prompt, responseMimeType, options);
    return callOpenAiCompatible(provider, prompt, responseMimeType, options);
  };
  const callProviderText = async (
    provider: ExternalProvider,
    prompt: string,
    responseMimeType?: AiResponseMimeType,
    image?: { data: string; mimeType: string },
    options: AiProviderCallOptions = {},
  ) => (await callProvider(provider, prompt, responseMimeType, image, options)).text;
  return { callProvider, callProviderText };
};
