import assert from "node:assert/strict";
import { createAiProviderAdapters } from "../modules/ai/infrastructure/providers/aiProviderAdapters.js";
import {
  getAiProviderCircuitSnapshot,
  isAiProviderCircuitOpen,
  recordAiProviderFailure,
  recordAiProviderSuccess,
} from "../modules/ai/application/providerCircuitBreaker.js";

const originalFetch = globalThis.fetch;
const calls: Array<{ url: string; auth: string }> = [];

try {
  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input);
    const headers = new Headers(init?.headers);
    const auth = headers.get("authorization") || "";
    calls.push({ url, auth });

    if (url.includes("generativelanguage.googleapis.com")) {
      if (url.includes("key=free-key-1")) {
        return new Response(JSON.stringify({ error: { message: "quota exhausted" } }), {
          status: 429,
          headers: { "content-type": "application/json" },
        });
      }
      if (url.includes("key=free-key-2")) {
        return new Response(JSON.stringify({
          candidates: [{ content: { parts: [{ text: "pool-two-ok" }] } }],
          usageMetadata: {
            promptTokenCount: 11,
            candidatesTokenCount: 7,
            totalTokenCount: 18,
            cachedContentTokenCount: 2,
          },
        }), { status: 200, headers: { "content-type": "application/json" } });
      }
    }

    if (url.includes("openrouter.ai")) {
      return new Response(JSON.stringify({
        choices: [{ message: { content: "free-openrouter-ok" } }],
        usage: { prompt_tokens: 5, completion_tokens: 4, total_tokens: 9 },
      }), { status: 200, headers: { "content-type": "application/json" } });
    }

    throw new Error(`unexpected fetch ${url}`);
  }) as typeof fetch;

  const adapters = createAiProviderAdapters({
    defaultTimeoutMs: 1000,
    clientUrl: "https://example.test",
    qwenBaseUrl: "https://dashscope-intl.aliyuncs.com/compatible-mode/v1",
    redactDiagnostic: (value) => String(value || "").replace(/free-key-[12]/g, "[redacted]"),
    getProviderRuntime: (provider) => {
      if (provider === "gemini") {
        return {
          model: "gemini-2.5-flash",
          quotaPools: [
            {
              id: "free-primary",
              label: "Free primary",
              accountLabel: "a",
              projectLabel: "p1",
              plan: "free",
              quotaScope: "project",
              apiKeys: ["free-key-1"],
              model: "gemini-2.5-flash",
              priority: 1,
              freeOnly: true,
            },
            {
              id: "free-secondary",
              label: "Free secondary",
              accountLabel: "b",
              projectLabel: "p2",
              plan: "free",
              quotaScope: "project",
              apiKeys: ["free-key-2"],
              model: "gemini-2.5-flash",
              priority: 2,
              freeOnly: true,
            },
          ],
        };
      }
      if (provider === "openrouter") {
        return {
          model: "qwen/qwen3-235b-a22b:free",
          baseUrl: "https://openrouter.ai/api/v1",
          quotaPools: [
            {
              id: "free-or",
              label: "Free OR",
              accountLabel: "free",
              projectLabel: "free",
              plan: "free",
              quotaScope: "account",
              apiKeys: ["or-free"],
              model: "qwen/qwen3-235b-a22b:free",
              baseUrl: "https://openrouter.ai/api/v1",
              priority: 1,
              freeOnly: true,
            },
            {
              id: "paid-or",
              label: "Paid OR",
              accountLabel: "paid",
              projectLabel: "paid",
              plan: "paid",
              quotaScope: "account",
              apiKeys: ["or-paid"],
              model: "paid-model",
              baseUrl: "https://openrouter.ai/api/v1",
              priority: 2,
              freeOnly: false,
            },
          ],
        };
      }
      return { model: "" };
    },
  });

  const gemini = await adapters.callProvider("gemini", "hello", undefined, undefined, { allowPaid: false });
  assert.equal(gemini.text, "pool-two-ok");
  assert.equal(gemini.quotaPoolId, "free-secondary");
  assert.deepEqual(gemini.usage, {
    inputTokens: 11,
    outputTokens: 7,
    totalTokens: 18,
    cachedTokens: 2,
    estimated: false,
  });
  assert.equal(calls.filter((call) => call.url.includes("free-key-1")).length, 1);
  assert.equal(calls.filter((call) => call.url.includes("free-key-2")).length, 1);

  calls.length = 0;
  const openrouter = await adapters.callProvider("openrouter", "hello", undefined, undefined, { allowPaid: false });
  assert.equal(openrouter.text, "free-openrouter-ok");
  assert.equal(openrouter.quotaPoolId, "free-or");
  assert.equal(openrouter.usage.totalTokens, 9);
  assert.equal(calls.some((call) => call.auth.includes("or-paid")), false, "paid pool must not be called when allowPaid=false");

  recordAiProviderSuccess("plan7-test");
  const t0 = 1_000_000;
  recordAiProviderFailure("plan7-test", t0);
  recordAiProviderFailure("plan7-test", t0 + 1);
  assert.equal(isAiProviderCircuitOpen("plan7-test", t0 + 2), false);
  recordAiProviderFailure("plan7-test", t0 + 2);
  assert.equal(isAiProviderCircuitOpen("plan7-test", t0 + 3), true);
  const snapshot = getAiProviderCircuitSnapshot(t0 + 3).find((item) => item.provider === "plan7-test");
  assert.equal(snapshot?.failures, 3);
  assert.equal(snapshot?.open, true);
  assert.equal(isAiProviderCircuitOpen("plan7-test", t0 + 60_003), false);

  console.log(JSON.stringify({
    phase: "PLAN7",
    status: "PASS",
    checks: [
      "429 advances to next free quota pool",
      "provider usage metadata is preserved",
      "paid pool is excluded when paid usage is disabled",
      "circuit opens after three failures and resets after window",
    ],
  }, null, 2));
} finally {
  globalThis.fetch = originalFetch;
}
