import { readFile } from "node:fs/promises";

const aiRouteSource = await readFile(new URL("../server/src/routes/ai.routes.ts", import.meta.url), "utf8");
const integrationsSource = await readFile(new URL("../dashboards/admin/PlatformIntegrationsManager.tsx", import.meta.url), "utf8");
const assistantSource = await readFile(new URL("../dashboards/admin/AiAssistantManager.tsx", import.meta.url), "utf8");
const apiSource = await readFile(new URL("../services/api.ts", import.meta.url), "utf8");
const contentRouteSource = await readFile(new URL("../server/src/routes/content.routes.ts", import.meta.url), "utf8");
const packageJsonSource = await readFile(new URL("../package.json", import.meta.url), "utf8");

const checks = [];

function check(name, assertion) {
  try {
    assertion();
    checks.push({ name, status: "PASS" });
  } catch (error) {
    checks.push({ name, status: "FAIL", message: error.message });
  }
}

function assertIncludes(source, fragment) {
  if (!source.includes(fragment)) {
    throw new Error(`Missing fragment: ${fragment}`);
  }
}

check("ai route supports admin runtime config load", () => {
  assertIncludes(aiRouteSource, "loadRuntimeAiConfig");
  assertIncludes(aiRouteSource, 'providerOrderSource: "env" | "admin"');
  assertIncludes(aiRouteSource, "providerOrderSource: runtimeAiConfig.providerOrderSource");
  assertIncludes(aiRouteSource, 'routingMode: "manual" | "auto"');
  assertIncludes(aiRouteSource, "routingMode: runtimeAiConfig.routingMode");
});

check("ai route exposes provider source metadata", () => {
  assertIncludes(aiRouteSource, 'source: "env" | "admin" | "runtime-local" | "fallback"');
  assertIncludes(aiRouteSource, "source: runtimeAiConfig.providers.gemini.source");
  assertIncludes(aiRouteSource, 'source: "fallback"');
});

check("integrations manager has AI templates, routing, and multi-key setup", () => {
  assertIncludes(integrationsSource, "aiExternalTemplates");
  assertIncludes(integrationsSource, "setupFreeAiStack");
  assertIncludes(integrationsSource, "ai-global");
  assertIncludes(integrationsSource, "aiProviderOptions");
  assertIncludes(integrationsSource, "writeAiNote");
  assertIncludes(integrationsSource, "aiProviderOrder");
  assertIncludes(integrationsSource, "apiKeys");
  assertIncludes(integrationsSource, "routingMode");
  assertIncludes(integrationsSource, "externalPlatformSecretState");
});

check("integrations manager warns/fixes invalid AI config", () => {
  assertIncludes(integrationsSource, "aiConfigWarnings");
  assertIncludes(integrationsSource, "autoFixAiConfig");
  assertIncludes(integrationsSource, "إصلاح تلقائي للتنبيهات");
});

check("backend enforces unique non-empty external platform ids", () => {
  assertIncludes(contentRouteSource, "sanitizeAndValidateExternalPlatforms");
  assertIncludes(contentRouteSource, "externalPlatforms contains duplicate ids");
});

check("backend preserves and masks external AI secrets", () => {
  assertIncludes(contentRouteSource, "SENSITIVE_EXTERNAL_PLATFORM_FIELDS");
  assertIncludes(contentRouteSource, "SENSITIVE_EXTERNAL_PLATFORM_ARRAY_FIELDS");
  assertIncludes(contentRouteSource, "externalPlatformSecretState");
});

check("assistant manager shows source and bridges to integrations", () => {
  assertIncludes(assistantSource, "providerOrderSource");
  assertIncludes(assistantSource, "فتح إدارة التكاملات");
  assertIncludes(assistantSource, "نسخ AI ID");
  assertIncludes(assistantSource, "sourceLabel");
});

check("api typing includes provider source fields", () => {
  assertIncludes(apiSource, 'source: "env" | "admin" | "runtime-local" | "fallback"');
  assertIncludes(apiSource, 'providerOrderSource?: "env" | "admin"');
  assertIncludes(apiSource, 'routingMode?: "manual" | "auto"');
});

check("package script exposes smoke:ai-config-bridge", () => {
  assertIncludes(packageJsonSource, '"smoke:ai-config-bridge": "node scripts/smoke-ai-config-bridge-contract.mjs"');
});

const failed = checks.filter((item) => item.status === "FAIL");
if (failed.length > 0) {
  console.error(JSON.stringify({ total: checks.length, failed }, null, 2));
  process.exit(1);
}

console.log(`AI config bridge contract passed (${checks.length} checks).`);
