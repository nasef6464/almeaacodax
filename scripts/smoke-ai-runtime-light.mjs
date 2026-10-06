import { mkdir, writeFile } from "node:fs/promises";

const base = String(
  process.env.AI_LIGHT_API_BASE_URL || "https://almeaacodax.vercel.app/api",
).replace(/\/$/, "");

const response = await fetch(`${base}/ai/status`, {
  headers: { accept: "application/json", "cache-control": "no-store" },
  signal: AbortSignal.timeout(12_000),
});
const body = await response.json().catch(() => ({}));
if (!response.ok) {
  throw new Error(`AI status returned ${response.status}`);
}

const configuredProviders = Array.isArray(body?.providers)
  ? body.providers.filter((item) => item && item.id !== "none" && item.configured)
  : [];

const evidence = {
  checkedAt: new Date().toISOString(),
  base,
  status: response.status,
  provider: String(body?.provider || "none"),
  routingMode: String(body?.routingMode || ""),
  providerOrderSource: String(body?.providerOrderSource || ""),
  configuredProviderCount: configuredProviders.length,
  providerIds: configuredProviders.map((item) => String(item.id || "")),
  providerCallPerformed: false,
  llmInferencePerformed: false,
};

if (evidence.providerOrderSource !== "admin") {
  throw new Error(`Unexpected providerOrderSource: ${evidence.providerOrderSource || "missing"}`);
}
if (evidence.configuredProviderCount < 1) {
  throw new Error("No configured AI provider is visible in runtime status");
}

await mkdir("audit-artifacts/ai-runtime-light", { recursive: true });
await writeFile(
  "audit-artifacts/ai-runtime-light/summary.json",
  JSON.stringify(evidence, null, 2) + "\n",
);
console.log(JSON.stringify(evidence, null, 2));
console.log("AI runtime light boundary smoke: PASS");
