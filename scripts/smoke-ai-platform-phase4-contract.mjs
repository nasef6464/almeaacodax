import { readFile } from "node:fs/promises";

const manager = await readFile(new URL("../dashboards/admin/AiAssistantManager.tsx", import.meta.url), "utf8");
const control = await readFile(new URL("../dashboards/admin/ai/AiControlCenterSettings.tsx", import.meta.url), "utf8");
const api = await readFile(new URL("../services/api.ts", import.meta.url), "utf8");
const runtime = await readFile(new URL("../server/src/modules/content/integrations/platformIntegrationRuntime.ts", import.meta.url), "utf8");

const checks = [];
const check = (name, pass) => checks.push({ name, status: pass ? "PASS" : "FAIL" });

check("AI manager exposes a dedicated control-center tab",
  manager.includes("AiControlCenterSettings") &&
  manager.includes("المفاتيح والحصص والتكلفة") &&
  manager.includes("activeTab === 'control'"));

check("control center reads and writes through server APIs only",
  control.includes("api.getPlatformIntegrations()") &&
  control.includes("api.updatePlatformIntegrations({ externalPlatforms: next })") &&
  !control.includes("fetch("));

check("control center models real quota-pool identity and free-first policy",
  control.includes("accountLabel") &&
  control.includes("projectLabel") &&
  control.includes("quotaScope") &&
  control.includes("freeOnly") &&
  control.includes("paidAllowed") &&
  control.includes("dailySpendCapUsd"));

check("multiple API keys are entered as a pool and are not re-rendered after save",
  control.includes("keysText") &&
  control.includes("apiKeys: keys") &&
  control.includes("externalPlatformSecretState") &&
  control.includes("مفتاح محفوظ"));

check("backend masking and merge semantics preserve secrets when admin leaves key fields blank",
  runtime.includes("SENSITIVE_EXTERNAL_PLATFORM_ARRAY_FIELDS") &&
  runtime.includes("platform[fieldKey] = []") &&
  runtime.includes("if (!hasIncoming && previousValues.length > 0)"));

check("test lab can validate one quota pool instead of only a whole provider",
  control.includes("quotaPoolId: poolId") &&
  control.includes("اختبر الحصة") &&
  api.includes("quotaPoolId?: string"));

check("existing platform integration endpoint remains the compatibility bridge",
  api.includes('request<unknown>("/content/platform-integrations"') &&
  api.includes('method: "PATCH"'));

const failed = checks.filter((item) => item.status === "FAIL");
console.log(JSON.stringify({ phase: "AI-4-control-center", status: failed.length ? "FAIL" : "PASS", checks }, null, 2));
if (failed.length) process.exit(1);
